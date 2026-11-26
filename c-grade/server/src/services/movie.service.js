import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Comment } from '../models/Comment.js';
import { DiaryItem } from '../models/DiaryItem.js';
import { Movie } from '../models/Movie.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import {
  dedupeAndFilterTmdbResults,
  mergePaginatedCatalog,
  parseTmdbSlug,
} from '../utils/hybridSearch.js';
import { slugify } from '../utils/ratingStats.js';
import { importTmdbMovie, searchTmdbCatalog } from './tmdb.service.js';

/**
 * Escapes user search strings before compiling RegExp filters.
 * @param {string} str
 */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Lists movies with multi-faceted filtering (genre, industry, language, year range, minRating, sort) & pagination.
 */
export async function listMovies(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(48, Math.max(1, Number(query.limit) || 12));
  const filter = {};

  if (query.q && String(query.q).trim()) {
    const safePattern = new RegExp(escapeRegex(String(query.q).trim()), 'i');
    filter.$or = [
      { title: safePattern },
      { director: safePattern },
      { 'cast.name': safePattern },
      { genres: safePattern },
    ];
  }

  if (query.genre && query.genre !== 'All') {
    filter.genres = String(query.genre);
  }

  if (query.industry && query.industry !== 'All') {
    filter.industry = String(query.industry);
  }

  if (query.language && query.language !== 'All') {
    filter.language = String(query.language);
  }

  if (query.minRating) {
    const min = Number(query.minRating);
    if (Number.isFinite(min) && min > 0) {
      filter.averageRating = { $gte: min };
    }
  }

  const yearFrom = Number(query.yearFrom);
  const yearTo = Number(query.yearTo);
  if (Number.isFinite(yearFrom) || Number.isFinite(yearTo)) {
    filter.releaseDate = {};
    if (Number.isFinite(yearFrom) && yearFrom > 1880) {
      filter.releaseDate.$gte = new Date(`${yearFrom}-01-01T00:00:00.000Z`);
    }
    if (Number.isFinite(yearTo) && yearTo <= 2100) {
      filter.releaseDate.$lte = new Date(`${yearTo}-12-31T23:59:59.999Z`);
    }
    if (Object.keys(filter.releaseDate).length === 0) {
      delete filter.releaseDate;
    }
  }

  const sortMap = {
    popular: { ratingsCount: -1, averageRating: -1, releaseDate: -1 },
    'top-rated': { averageRating: -1, ratingsCount: -1 },
    newest: { releaseDate: -1, createdAt: -1 },
    oldest: { releaseDate: 1 },
  };
  const sortOption = sortMap[query.sort] || sortMap.popular;

  const [localMovies, localTotal, userMatches] = await Promise.all([
    Movie.find(filter)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Movie.countDocuments(filter),
    query.includeUsers === 'true' && query.q && String(query.q).trim()
      ? User.find({
          $or: [
            { username: new RegExp(escapeRegex(String(query.q).trim()), 'i') },
            { name: new RegExp(escapeRegex(String(query.q).trim()), 'i') },
          ],
        })
          .select('name username avatarUrl role')
          .limit(5)
          .lean()
      : Promise.resolve([]),
  ]);

  let movies = localMovies;
  let total = localTotal;
  let totalPages = Math.max(1, Math.ceil(total / limit));

  const searchQuery = query.q ? String(query.q).trim() : '';
  const hasMinRatingFilter = Number(query.minRating) > 0;

  if (searchQuery && env.TMDB_API_KEY && !hasMinRatingFilter) {
    try {
      const { results: tmdbResults } = await searchTmdbCatalog(searchQuery, { page: 1 });
      if (tmdbResults.length > 0) {
        const candidateTmdbIds = tmdbResults.map((r) => r.tmdbId).filter(Boolean);
        const existingForDedupe = await Movie.find({
          $or: [{ tmdbId: { $in: candidateTmdbIds } }, filter],
        })
          .select('tmdbId title releaseDate')
          .lean();

        const tmdbStubs = dedupeAndFilterTmdbResults(tmdbResults, existingForDedupe, query);
        const merged = mergePaginatedCatalog({
          localMovies,
          localTotal,
          tmdbStubs,
          page,
          limit,
        });
        movies = merged.movies;
        total = merged.total;
        totalPages = merged.totalPages;
      }
    } catch (err) {
      console.warn('[TMDB] Global search fallback skipped:', err.message);
    }
  }

  return {
    movies,
    users: userMatches,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Returns spotlight featured films for the Hero banner.
 */
export async function getFeaturedMovies() {
  let featured = await Movie.find({ featured: true }).sort({ averageRating: -1, releaseDate: -1 }).limit(5).lean();
  if (featured.length === 0) {
    featured = await Movie.find().sort({ averageRating: -1 }).limit(5).lean();
  }
  return featured;
}

/**
 * Returns trending films weighted by recent review engagement and rating score.
 */
export async function getTrendingMovies() {
  return Movie.find().sort({ ratingsCount: -1, averageRating: -1, createdAt: -1 }).limit(12).lean();
}

/**
 * Resolves a movie by canonical slug, MongoDB ObjectId, or synthetic `tmdb-<id>` slug
 * (auto-importing & caching from TMDB on first visit).
 */
export async function resolveMovieBySlugOrId(slugOrId) {
  const key = String(slugOrId || '').trim();
  if (!key) {
    throw new AppError('Film not found.', 404);
  }

  const tmdbId = parseTmdbSlug(key);
  if (tmdbId) {
    let movie = await Movie.findOne({ tmdbId }).lean();
    if (!movie && env.TMDB_API_KEY) {
      const imported = await importTmdbMovie(tmdbId);
      movie = imported.toObject ? imported.toObject() : imported;
    }
    if (!movie) {
      throw new AppError('Film not found.', 404);
    }
    return movie;
  }

  const isObjectId = mongoose.Types.ObjectId.isValid(key);
  const query = isObjectId ? { $or: [{ _id: key }, { slug: key }] } : { slug: key.toLowerCase() };

  const movie = await Movie.findOne(query).lean();
  if (!movie) {
    throw new AppError('Film not found.', 404);
  }
  return movie;
}

/**
 * Fetches a single movie by slug, ObjectId, or `tmdb-<id>` along with the caller's diary status & review if signed in.
 */
export async function getMovieBySlugOrId(slugOrId, currentUserId = null) {
  const movie = await resolveMovieBySlugOrId(slugOrId);

  let userDiary = null;
  let userReview = null;
  if (currentUserId) {
    [userDiary, userReview] = await Promise.all([
      DiaryItem.findOne({ user: currentUserId, movie: movie._id }).lean(),
      Review.findOne({ movie: movie._id, author: currentUserId }).lean(),
    ]);
  }

  return { movie, userDiary, userReview };
}

/**
 * Admin: Creates a manual movie record with unique slug generation.
 */
export async function createMovie(payload) {
  const year = payload.releaseDate ? new Date(payload.releaseDate).getFullYear() : '';
  const baseSlug = slugify(`${payload.title}${year && !Number.isNaN(year) ? `-${year}` : ''}`) || `film-${Date.now()}`;

  let slug = baseSlug;
  let suffix = 1;
  while (await Movie.exists({ slug })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const movie = await Movie.create({
    ...payload,
    slug,
    releaseDate: new Date(payload.releaseDate),
  });

  return movie;
}

/**
 * Admin: Updates an existing movie record.
 */
export async function updateMovie(id, payload) {
  const updates = { ...payload };
  if (updates.releaseDate) {
    updates.releaseDate = new Date(updates.releaseDate);
  }

  const movie = await Movie.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
  if (!movie) {
    throw new AppError('Film not found.', 404);
  }
  return movie;
}

/**
 * Admin: Deletes a movie and cleans up associated reviews, comments, and diary items.
 */
export async function deleteMovie(id) {
  const movie = await Movie.findByIdAndDelete(id);
  if (!movie) {
    throw new AppError('Film not found.', 404);
  }

  const reviews = await Review.find({ movie: movie._id }).select('_id').lean();
  const reviewIds = reviews.map((r) => r._id);

  await Promise.all([
    Comment.deleteMany({ review: { $in: reviewIds } }),
    Review.deleteMany({ movie: movie._id }),
    DiaryItem.deleteMany({ movie: movie._id }),
  ]);

  return { deleted: true, id: movie._id };
}
