import {
  getActivityFeed,
  getPublicProfile,
  toggleFollowUser,
  updateMyProfile,
} from '../services/user.service.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/users/:username
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const data = await getPublicProfile(req.params.username, req.user?._id || null);
  return sendSuccess(res, 200, 'User profile retrieved.', data);
});

/**
 * PATCH /api/v1/users/me
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await updateMyProfile(req.user._id, req.body);
  return sendSuccess(res, 200, 'Profile updated successfully.', { user });
});

/**
 * POST /api/v1/users/:id/follow
 */
export const followUser = asyncHandler(async (req, res) => {
  const result = await toggleFollowUser(req.user._id, req.params.id);
  return sendSuccess(res, 200, result.following ? 'Following user.' : 'Unfollowed user.', result);
});

/**
 * GET /api/v1/feed
 */
export const getMyFeed = asyncHandler(async (req, res) => {
  const data = await getActivityFeed(req.user._id);
  return sendSuccess(res, 200, 'Activity feed retrieved.', data);
});
