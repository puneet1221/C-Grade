import { MovieList } from '../models/MovieList.js';
import { AppError } from '../utils/AppError.js';
import { slugify } from '../utils/ratingStats.js';

/**
 * Lists public curated lists (or user's own private lists when mine=true).
 */
export async function getLists({ page = 1, limit = 12, ownerId = null, currentUserId = null } = {}) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(36, Math.max(1, Number(limit) || 12));

  const filter = {};
  if (ownerId) {
    filter.owner = ownerId;
    if (!currentUserId || ownerId.toString() !== currentUserId.toString()) {
      filter.isPublic = true;
    }
  } else if (currentUserId) {
    filter.$or = [{ isPublic: true }, { owner: currentUserId }];
  } else {
    filter.isPublic = true;
  }

  const [lists, total] = await Promise.all([
    MovieList.find(filter)
      .populate('owner', 'name username avatarUrl role')
      .populate('movies', 'title slug posterUrl releaseDate averageRating industry')
      .sort({ likesCount: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    MovieList.countDocuments(filter),
  ]);

  return {
    lists,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    },
  };
}

/**
 * Fetches a single curated list by slug, enforcing private visibility checks.
 */
export async function getListBySlug(slug, currentUserId = null) {
  const list = await MovieList.findOne({ slug: slug.toLowerCase() })
    .populate('owner', 'name username avatarUrl role bio')
    .populate('movies')
    .lean();

  if (!list) {
    throw new AppError('Curated list not found.', 404);
  }

  if (!list.isPublic && (!currentUserId || list.owner._id.toString() !== currentUserId.toString())) {
    throw new AppError('This list is private.', 403);
  }

  return list;
}

/**
 * Creates a new curated movie list with a unique slug.
 */
export async function createList(ownerId, payload) {
  const baseSlug = slugify(payload.title) || `list-${Date.now()}`;
  let slug = baseSlug;
  let count = 1;
  while (await MovieList.exists({ slug })) {
    slug = `${baseSlug}-${count}`;
    count += 1;
  }

  const created = await MovieList.create({
    title: payload.title,
    slug,
    description: payload.description || '',
    owner: ownerId,
    movies: payload.movies || [],
    isPublic: payload.isPublic !== undefined ? Boolean(payload.isPublic) : true,
  });

  return MovieList.findById(created._id)
    .populate('owner', 'name username avatarUrl role')
    .populate('movies', 'title slug posterUrl releaseDate averageRating industry')
    .lean();
}

/**
 * Updates a curated list (owner or admin only).
 */
export async function updateList(listId, user, payload) {
  const list = await MovieList.findById(listId);
  if (!list) {
    throw new AppError('List not found.', 404);
  }

  if (list.owner.toString() !== user._id.toString() && user.role !== 'admin') {
    throw new AppError('You can only edit your own lists.', 403);
  }

  if (payload.title !== undefined) list.title = payload.title;
  if (payload.description !== undefined) list.description = payload.description;
  if (payload.movies !== undefined) list.movies = payload.movies;
  if (payload.isPublic !== undefined) list.isPublic = payload.isPublic;

  await list.save();

  return MovieList.findById(list._id)
    .populate('owner', 'name username avatarUrl role')
    .populate('movies', 'title slug posterUrl releaseDate averageRating industry')
    .lean();
}

/**
 * Deletes a curated list (owner or admin only).
 */
export async function deleteList(listId, user) {
  const list = await MovieList.findById(listId);
  if (!list) {
    throw new AppError('List not found.', 404);
  }

  if (list.owner.toString() !== user._id.toString() && user.role !== 'admin') {
    throw new AppError('You can only delete your own lists.', 403);
  }

  await MovieList.findByIdAndDelete(listId);
  return { deleted: true, id: listId };
}

/**
 * Toggles like status on a curated movie list.
 */
export async function toggleListLike(listId, userId) {
  const list = await MovieList.findById(listId);
  if (!list) {
    throw new AppError('List not found.', 404);
  }

  const alreadyLiked = list.likes.some((id) => id.toString() === userId.toString());
  if (alreadyLiked) {
    list.likes = list.likes.filter((id) => id.toString() !== userId.toString());
  } else {
    list.likes.push(userId);
  }
  list.likesCount = list.likes.length;
  await list.save();

  return { liked: !alreadyLiked, likesCount: list.likesCount };
}
