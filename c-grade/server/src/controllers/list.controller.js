import {
  createList,
  deleteList,
  getListBySlug,
  getLists,
  toggleListLike,
  updateList,
} from '../services/list.service.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/v1/lists
 */
export const listCuratedLists = asyncHandler(async (req, res) => {
  const { lists, meta } = await getLists({
    page: req.query.page,
    limit: req.query.limit,
    ownerId: req.query.mine === 'true' && req.user ? req.user._id : null,
    currentUserId: req.user?._id || null,
  });
  return sendSuccess(res, 200, 'Curated lists retrieved.', { lists }, meta);
});

/**
 * GET /api/v1/lists/:slug
 */
export const getCuratedList = asyncHandler(async (req, res) => {
  const list = await getListBySlug(req.params.slug, req.user?._id || null);
  return sendSuccess(res, 200, 'Curated list retrieved.', { list });
});

/**
 * POST /api/v1/lists
 */
export const postCuratedList = asyncHandler(async (req, res) => {
  const list = await createList(req.user._id, req.body);
  return sendSuccess(res, 201, 'Curated list created.', { list });
});

/**
 * PATCH /api/v1/lists/:id
 */
export const patchCuratedList = asyncHandler(async (req, res) => {
  const list = await updateList(req.params.id, req.user, req.body);
  return sendSuccess(res, 200, 'Curated list updated.', { list });
});

/**
 * DELETE /api/v1/lists/:id
 */
export const removeCuratedList = asyncHandler(async (req, res) => {
  const result = await deleteList(req.params.id, req.user);
  return sendSuccess(res, 200, 'Curated list deleted.', result);
});

/**
 * POST /api/v1/lists/:id/like
 */
export const likeCuratedList = asyncHandler(async (req, res) => {
  const result = await toggleListLike(req.params.id, req.user._id);
  return sendSuccess(res, 200, result.liked ? 'List liked.' : 'Like removed.', result);
});
