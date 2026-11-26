import { getUserDiary, markMovieWatched, toggleWatchlist } from '../services/diary.service.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/diary/me
 */
export const getMyDiary = asyncHandler(async (req, res) => {
  const data = await getUserDiary(req.user._id);
  return sendSuccess(res, 200, 'Watchlist and diary retrieved.', data);
});

/**
 * POST /api/v1/diary/:movieId/watchlist
 */
export const toggleMovieWatchlist = asyncHandler(async (req, res) => {
  const result = await toggleWatchlist(req.user._id, req.params.movieId);
  return sendSuccess(
    res,
    200,
    result.inWatchlist ? 'Added to your watchlist.' : 'Removed from your watchlist.',
    result
  );
});

/**
 * POST /api/v1/diary/:movieId/watched
 */
export const logMovieWatched = asyncHandler(async (req, res) => {
  const result = await markMovieWatched(req.user._id, req.params.movieId, req.body || {});
  return sendSuccess(
    res,
    200,
    result.watched ? 'Logged to your Watch Diary.' : 'Removed from Watch Diary.',
    result
  );
});
