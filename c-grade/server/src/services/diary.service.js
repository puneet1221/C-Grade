import { DiaryItem } from '../models/DiaryItem.js';
import { resolveMovieBySlugOrId } from './movie.service.js';

/**
 * Returns the authenticated user's Watchlist and chronological Watch Diary.
 */
export async function getUserDiary(userId) {
  const items = await DiaryItem.find({ user: userId })
    .populate('movie', 'title slug posterUrl backdropUrl releaseDate runtime genres industry language averageRating director')
    .sort({ watchedAt: -1, updatedAt: -1 })
    .lean();

  const watchlist = items.filter((item) => item.status === 'watchlist' && item.movie);
  const watched = items.filter((item) => item.status === 'watched' && item.movie);

  return { watchlist, watched, items };
}

/**
 * Toggles a film in or out of the user's Watchlist.
 */
export async function toggleWatchlist(userId, movieId) {
  const movie = await resolveMovieBySlugOrId(movieId);
  const resolvedMovieId = movie._id;

  const existing = await DiaryItem.findOne({ user: userId, movie: resolvedMovieId });
  if (existing && existing.status === 'watchlist') {
    await DiaryItem.findByIdAndDelete(existing._id);
    return { inWatchlist: false, status: null, item: null };
  }

  if (existing && existing.status === 'watched') {
    existing.status = 'watchlist';
    await existing.save();
    return { inWatchlist: true, status: 'watchlist', item: existing };
  }

  const created = await DiaryItem.create({
    user: userId,
    movie: resolvedMovieId,
    status: 'watchlist',
  });

  return { inWatchlist: true, status: 'watchlist', item: created };
}

/**
 * Marks a film as Watched in the Watch Diary, or logs a rewatch when already watched.
 */
export async function markMovieWatched(userId, movieId, { watchedAt, isRewatch = false } = {}) {
  const movie = await resolveMovieBySlugOrId(movieId);
  const resolvedMovieId = movie._id;

  const existing = await DiaryItem.findOne({ user: userId, movie: resolvedMovieId });
  const targetDate = watchedAt ? new Date(watchedAt) : new Date();

  if (existing) {
    if (existing.status === 'watched' && isRewatch) {
      existing.rewatchCount += 1;
      existing.watchedAt = targetDate;
      await existing.save();
      return { watched: true, item: existing };
    }
    if (existing.status === 'watched' && !isRewatch) {
      await DiaryItem.findByIdAndDelete(existing._id);
      return { watched: false, item: null };
    }
    existing.status = 'watched';
    existing.watchedAt = targetDate;
    await existing.save();
    return { watched: true, item: existing };
  }

  const created = await DiaryItem.create({
    user: userId,
    movie: movieId,
    status: 'watched',
    watchedAt: targetDate,
    rewatchCount: 0,
  });

  return { watched: true, item: created };
}
