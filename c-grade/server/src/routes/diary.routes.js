import { Router } from 'express';
import { getMyDiary, logMovieWatched, toggleMovieWatchlist } from '../controllers/diary.controller.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

/**
 * Authenticated Watchlist and Watch Diary routes.
 */
router.get('/me', protect, getMyDiary);
router.post('/:movieId/watchlist', protect, toggleMovieWatchlist);
router.post('/:movieId/watched', protect, logMovieWatched);

export default router;
