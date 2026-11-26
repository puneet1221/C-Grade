import { DiaryItem } from '../models/DiaryItem.js';
import { MovieList } from '../models/MovieList.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { sanitizeUser } from './auth.service.js';

/**
 * Returns public cinephile profile, Top 4 favorite films, viewing analytics,
 * reviews, watch diary, watchlist, and curated lists.
 */
export async function getPublicProfile(username, currentUserId = null) {
  const profile = await User.findOne({ username: username.toLowerCase() })
    .populate('favoriteMovies', 'title slug posterUrl backdropUrl releaseDate averageRating director industry')
    .lean();

  if (!profile) {
    throw new AppError('Cinephile profile not found.', 404);
  }

  const isOwnProfile = Boolean(currentUserId && profile._id.toString() === currentUserId.toString());

  const [reviews, diaryItems, lists] = await Promise.all([
    Review.find({ author: profile._id, status: { $ne: 'removed' } })
      .populate('movie', 'title slug posterUrl releaseDate director genres industry averageRating')
      .sort({ createdAt: -1 })
      .lean(),
    DiaryItem.find({ user: profile._id })
      .populate('movie', 'title slug posterUrl releaseDate director genres industry averageRating')
      .sort({ watchedAt: -1, updatedAt: -1 })
      .lean(),
    MovieList.find(isOwnProfile ? { owner: profile._id } : { owner: profile._id, isPublic: true })
      .populate('movies', 'title slug posterUrl')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const watched = diaryItems.filter((item) => item.status === 'watched' && item.movie);
  const watchlist = diaryItems.filter((item) => item.status === 'watchlist' && item.movie);

  const avgRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

  // Build genre distribution analytics from watched films and reviewed films
  const genreCounter = new Map();
  const seenMovieIds = new Set();
  for (const item of watched) {
    if (!item.movie) continue;
    seenMovieIds.add(item.movie._id.toString());
    for (const g of item.movie.genres || []) {
      genreCounter.set(g, (genreCounter.get(g) || 0) + 1);
    }
  }
  for (const rev of reviews) {
    if (!rev.movie || seenMovieIds.has(rev.movie._id.toString())) continue;
    seenMovieIds.add(rev.movie._id.toString());
    for (const g of rev.movie.genres || []) {
      genreCounter.set(g, (genreCounter.get(g) || 0) + 1);
    }
  }

  const genreDistribution = Array.from(genreCounter.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const isFollowing = Boolean(
    currentUserId && profile.followers?.some((id) => id.toString() === currentUserId.toString())
  );

  return {
    user: {
      ...sanitizeUser(profile),
      followersCount: profile.followers?.length || 0,
      followingCount: profile.following?.length || 0,
      isFollowing,
    },
    stats: {
      totalWatched: Math.max(watched.length, seenMovieIds.size),
      totalReviews: reviews.length,
      watchlistCount: watchlist.length,
      averageRating: avgRating,
      genreDistribution,
    },
    reviews,
    watched,
    watchlist,
    lists,
  };
}

/**
 * Updates the authenticated user's profile info, bio, avatar, and Top 4 favorite films.
 */
export async function updateMyProfile(userId, payload) {
  const updates = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.bio !== undefined) updates.bio = payload.bio;
  if (payload.avatarUrl !== undefined) updates.avatarUrl = payload.avatarUrl;
  if (payload.favoriteMovies !== undefined) {
    updates.favoriteMovies = payload.favoriteMovies.slice(0, 4);
  }

  const updated = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true })
    .populate('favoriteMovies', 'title slug posterUrl releaseDate averageRating')
    .lean();

  if (!updated) {
    throw new AppError('User not found.', 404);
  }

  return sanitizeUser(updated);
}

/**
 * Toggles follow/unfollow relationship between the authenticated user and targetUserId.
 */
export async function toggleFollowUser(currentUserId, targetUserId) {
  if (currentUserId.toString() === targetUserId.toString()) {
    throw new AppError('You cannot follow yourself.', 400);
  }

  const [currentUser, targetUser] = await Promise.all([
    User.findById(currentUserId),
    User.findById(targetUserId),
  ]);

  if (!currentUser || !targetUser) {
    throw new AppError('User not found.', 404);
  }

  const isAlreadyFollowing = currentUser.following.some((id) => id.toString() === targetUserId.toString());

  if (isAlreadyFollowing) {
    currentUser.following = currentUser.following.filter((id) => id.toString() !== targetUserId.toString());
    targetUser.followers = targetUser.followers.filter((id) => id.toString() !== currentUserId.toString());
  } else {
    currentUser.following.push(targetUser._id);
    targetUser.followers.push(currentUser._id);
  }

  await Promise.all([currentUser.save(), targetUser.save()]);

  return {
    following: !isAlreadyFollowing,
    followersCount: targetUser.followers.length,
  };
}

/**
 * Returns a chronological activity feed of reviews and watch logs from followed users
 * (with a fallback flag indicating community highlights when following nobody yet).
 */
export async function getActivityFeed(userId) {
  const user = await User.findById(userId).select('following').lean();
  const followingIds = user?.following || [];
  const hasFollowing = followingIds.length > 0;

  const authorFilter = hasFollowing ? { $in: followingIds } : { $ne: userId };

  const [recentReviews, recentLogs] = await Promise.all([
    Review.find({ author: authorFilter, status: 'active' })
      .populate('author', 'name username avatarUrl role')
      .populate('movie', 'title slug posterUrl releaseDate industry director')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    DiaryItem.find({ user: hasFollowing ? { $in: followingIds } : { $ne: userId }, status: 'watched' })
      .populate('user', 'name username avatarUrl role')
      .populate('movie', 'title slug posterUrl releaseDate industry director')
      .sort({ watchedAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const events = [
    ...recentReviews
      .filter((r) => r.movie && r.author)
      .map((r) => ({
        id: `review-${r._id}`,
        type: 'review',
        createdAt: r.createdAt,
        actor: r.author,
        movie: r.movie,
        review: {
          _id: r._id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          containsSpoilers: r.containsSpoilers,
          tags: r.tags,
          likesCount: r.likesCount,
        },
      })),
    ...recentLogs
      .filter((l) => l.movie && l.user)
      .map((l) => ({
        id: `watch-${l._id}`,
        type: 'watch',
        createdAt: l.watchedAt || l.updatedAt,
        actor: l.user,
        movie: l.movie,
        rewatchCount: l.rewatchCount,
      })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);

  return {
    isCommunityFallback: !hasFollowing,
    followingCount: followingIds.length,
    events,
  };
}
