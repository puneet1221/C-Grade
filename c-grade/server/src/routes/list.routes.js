import { Router } from 'express';
import {
  getCuratedList,
  likeCuratedList,
  listCuratedLists,
  patchCuratedList,
  postCuratedList,
  removeCuratedList,
} from '../controllers/list.controller.js';
import { optionalAuth, protect } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { createListSchema, updateListSchema } from '../validators/list.validator.js';

const router = Router();

/**
 * Curated movie list routes.
 */
router.get('/', optionalAuth, listCuratedLists);
router.get('/:slug', optionalAuth, getCuratedList);
router.post('/', protect, validateBody(createListSchema), postCuratedList);
router.patch('/:id', protect, validateBody(updateListSchema), patchCuratedList);
router.delete('/:id', protect, removeCuratedList);
router.post('/:id/like', protect, likeCuratedList);

export default router;
