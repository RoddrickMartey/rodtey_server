import { Router } from 'express';
import {
  createProduct,
  getAllProducts,
  getProductBySlug,
  getMyProducts,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
} from './product.controller.js';
import { authenticate, authorize } from '../../middlewares/authenticate.js';
import { Role } from '../../generated/prisma/client.js';

const router = Router();

router.get('/', getAllProducts);
router.get('/me', authenticate, authorize(Role.VENDOR), getMyProducts);
router.get('/:slug', getProductBySlug);
router.post('/', authenticate, authorize(Role.VENDOR), createProduct);
router.patch('/:id', authenticate, authorize(Role.VENDOR), updateProduct);
router.patch('/:id/toggle', authenticate, authorize(Role.VENDOR), toggleProductStatus);
router.delete('/:id', authenticate, authorize(Role.VENDOR), deleteProduct);

export default router;
