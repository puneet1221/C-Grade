import {
  createMovie,
  deleteMovie,
  getFeaturedMovies,
  getMovieBySlugOrId,
  getTrendingMovies,
  listMovies,
  updateMovie,
} from '../services/movie.service.js';
import {
  enrichCatalogFromTmdb,
  importTmdbMovie,
  searchTmdbMovies,
} from '../services/tmdb.service.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/movies
 * Lists movies with multi-faceted filters, sorting, and pagination.
 */
export const getMovies = asyncHandler(async (req, res) => {
  const { movies, users, meta } = await listMovies(req.query);
  return sendSuccess(res, 200, 'Movies retrieved.', { movies, users }, meta);
});

/**
 * GET /api/v1/movies/featured
 * Returns spotlight featured films for the Hero banner.
 */
export const getFeatured = asyncHandler(async (_req, res) => {
  const movies = await getFeaturedMovies();
  return sendSuccess(res, 200, 'Featured movies retrieved.', { movies });
});

/**
 * GET /api/v1/movies/trending
 * Returns trending films weighted by community reviews and rating scores.
 */
export const getTrending = asyncHandler(async (_req, res) => {
  const movies = await getTrendingMovies();
  return sendSuccess(res, 200, 'Trending movies retrieved.', { movies });
});

/**
 * GET /api/v1/movies/search/tmdb (Admin)
 * Proxies search queries to TMDB API keeping TMDB_API_KEY server-side.
 */
export const searchTmdb = asyncHandler(async (req, res) => {
  const results = await searchTmdbMovies(req.query.q || '');
  return sendSuccess(res, 200, 'TMDB search results retrieved.', { results });
});

/**
 * POST /api/v1/movies/import/tmdb/:tmdbId (Admin)
 * Imports and caches a TMDB movie (with cast and trailer) into MongoDB.
 */
export const importFromTmdb = asyncHandler(async (req, res) => {
  const movie = await importTmdbMovie(req.params.tmdbId);
  return sendSuccess(res, 201, `"${movie.title}" imported into C-Grade catalog.`, { movie });
});

/**
 * POST /api/v1/movies/sync/tmdb (Admin)
 * Enriches existing catalog artwork/cast and imports curated world-cinema titles from TMDB.
 */
export const syncFromTmdb = asyncHandler(async (_req, res) => {
  const result = await enrichCatalogFromTmdb({ force: true });
  if (result.skipped) {
    return sendSuccess(res, 200, 'TMDB_API_KEY is not configured; skipped sync.', result);
  }
  return sendSuccess(
    res,
    200,
    `Synced TMDB catalog: enriched ${result.enrichedCount} films and imported ${result.importedCount} titles.`,
    result
  );
});

/**
 * GET /api/v1/movies/:slugOrId
 * Fetches full details for a film by slug or ObjectId.
 */
export const getMovieDetail = asyncHandler(async (req, res) => {
  const data = await getMovieBySlugOrId(req.params.slugOrId, req.user?._id || null);
  return sendSuccess(res, 200, 'Film details retrieved.', data);
});

/**
 * POST /api/v1/movies (Admin)
 * Manually creates a film in the catalog.
 */
export const createMovieHandler = asyncHandler(async (req, res) => {
  const movie = await createMovie(req.body);
  return sendSuccess(res, 201, `"${movie.title}" added to catalog.`, { movie });
});

/**
 * PATCH /api/v1/movies/:id (Admin)
 * Updates an existing film record.
 */
export const updateMovieHandler = asyncHandler(async (req, res) => {
  const movie = await updateMovie(req.params.id, req.body);
  return sendSuccess(res, 200, `"${movie.title}" updated.`, { movie });
});

/**
 * DELETE /api/v1/movies/:id (Admin)
 * Deletes a film and its associated reviews, comments, and diary items.
 */
export const deleteMovieHandler = asyncHandler(async (req, res) => {
  const result = await deleteMovie(req.params.id);
  return sendSuccess(res, 200, 'Film removed from catalog.', result);
});
