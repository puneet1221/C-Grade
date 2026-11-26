import { getAdminStats, getFlaggedReviews, moderateReview } from '../services/admin.service.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/admin/stats
 */
export const adminStats = asyncHandler(async (_req, res) => {
  const stats = await getAdminStats();
  return sendSuccess(res, 200, 'Platform metrics retrieved.', { stats });
});

/**
 * GET /api/v1/admin/reports
 */
export const adminReports = asyncHandler(async (_req, res) => {
  const reports = await getFlaggedReviews();
  return sendSuccess(res, 200, 'Moderation queue retrieved.', { reports });
});

/**
 * PATCH /api/v1/admin/reviews/:id/moderate
 */
export const adminModerateReview = asyncHandler(async (req, res) => {
  const review = await moderateReview(req.params.id, req.body.action);
  return sendSuccess(
    res,
    200,
    req.body.action === 'dismiss' ? 'Report dismissed and review restored.' : 'Review removed.',
    { review }
  );
});
