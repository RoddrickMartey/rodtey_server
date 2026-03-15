import { Router } from 'express';
import {
  createCategory,
  getAllCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
} from './category.controller.js';
import { authenticate, authorize } from '../../middlewares/authenticate.js';
import { Role } from '../../generated/prisma/client.js';

const router = Router();

router.get('/', getAllCategories);
router.get('/:slug', getCategoryBySlug);
router.post('/', authenticate, authorize(Role.ADMIN), createCategory);
router.patch('/:id', authenticate, authorize(Role.ADMIN), updateCategory);
router.delete('/:id', authenticate, authorize(Role.ADMIN), deleteCategory);

export default router;
