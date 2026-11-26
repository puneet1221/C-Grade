import { Router } from 'express';
import {
  createMovieHandler,
  deleteMovieHandler,
  getFeatured,
  getMovieDetail,
  getMovies,
  getTrending,
  importFromTmdb,
  searchTmdb,
  syncFromTmdb,
  updateMovieHandler,
} from '../controllers/movie.controller.js';
import { listMovieReviews, postMovieReview } from '../controllers/review.controller.js';
import { optionalAuth, protect } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleGuard.js';
import { validateBody } from '../middlewares/validate.js';
import { createMovieSchema, updateMovieSchema } from '../validators/movie.validator.js';
import { createReviewSchema } from '../validators/review.validator.js';

const router = Router();

/**
 * Movie catalog, TMDB hybrid admin importer, and movie-scoped reviews routes.
 */
router.get('/', getMovies);
router.get('/featured', getFeatured);
router.get('/trending', getTrending);
router.get('/search/tmdb', protect, requireRole('admin'), searchTmdb);
router.post('/import/tmdb/:tmdbId', protect, requireRole('admin'), importFromTmdb);
router.post('/sync/tmdb', protect, requireRole('admin'), syncFromTmdb);
router.get('/:slugOrId', optionalAuth, getMovieDetail);
router.post('/', protect, requireRole('admin'), validateBody(createMovieSchema), createMovieHandler);
router.patch('/:id', protect, requireRole('admin'), validateBody(updateMovieSchema), updateMovieHandler);
router.delete('/:id', protect, requireRole('admin'), deleteMovieHandler);

router.get('/:movieId/reviews', listMovieReviews);
router.post('/:movieId/reviews', protect, validateBody(createReviewSchema), postMovieReview);

export default router;
