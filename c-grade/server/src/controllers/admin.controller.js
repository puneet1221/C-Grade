import {
  createPrivilegedUser,
  deleteUserAccount,
  getAdminStats,
  getFlaggedReviews,
  listUsers,
  moderateReview,
  updateUserStatus,
} from '../services/admin.service.js';
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

/**
 * GET /api/v1/admin/users
 */
export const adminListUsers = asyncHandler(async (req, res) => {
  const result = await listUsers({
    q: req.query.q,
    role: req.query.role,
    status: req.query.status,
    page: req.query.page,
    limit: req.query.limit,
  });
  return sendSuccess(res, 200, 'Users retrieved.', result);
});

/**
 * POST /api/v1/admin/users
 */
export const adminCreateUser = asyncHandler(async (req, res) => {
  const user = await createPrivilegedUser(req.body);
  return sendSuccess(res, 201, `${user.role === 'admin' ? 'Admin' : 'User'} account created.`, { user });
});

/**
 * PATCH /api/v1/admin/users/:id/status
 */
export const adminUpdateUserStatus = asyncHandler(async (req, res) => {
  const user = await updateUserStatus({
    targetUserId: req.params.id,
    actingAdminId: req.user._id,
    status: req.body.status,
    suspendDays: req.body.suspendDays,
    reason: req.body.reason,
  });

  const msg =
    req.body.status === 'active'
      ? `Account @${user.username} restored to active.`
      : req.body.status === 'suspended'
        ? `Account @${user.username} suspended.`
        : `Account @${user.username} blocked.`;

  return sendSuccess(res, 200, msg, { user });
});

/**
 * DELETE /api/v1/admin/users/:id
 */
export const adminDeleteUser = asyncHandler(async (req, res) => {
  const result = await deleteUserAccount({
    targetUserId: req.params.id,
    actingAdminId: req.user._id,
  });
  return sendSuccess(res, 200, `Account @${result.username} permanently deleted.`, result);
});
