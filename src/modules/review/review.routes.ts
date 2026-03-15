import { Router } from 'express';
import {
  createReview,
  getProductReviews,
  getMyReviews,
  updateReview,
  deleteReview,
} from './review.controller.js';
import { authenticate, authorize } from '../../middlewares/authenticate.js';
import { Role } from '../../generated/prisma/client.js';

const router = Router();

router.get('/product/:productId', getProductReviews);
router.get('/me', authenticate, authorize(Role.USER), getMyReviews);
router.post('/', authenticate, authorize(Role.USER), createReview);
router.patch('/:id', authenticate, authorize(Role.VENDOR), updateReview);
router.delete('/:id', authenticate, deleteReview);

export default router;
