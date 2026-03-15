import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getVendorOrders,
  updateOrderStatus,
  cancelOrder,
} from './order.controller.js';
import { authenticate, authorize } from '../../middlewares/authenticate.js';
import { Role } from '../../generated/prisma/client.js';

const router = Router();

router.post('/', authenticate, authorize(Role.USER), createOrder);
router.get('/me', authenticate, authorize(Role.USER), getMyOrders);
router.get('/vendor', authenticate, authorize(Role.VENDOR), getVendorOrders);
router.get('/:id', authenticate, getOrderById);
router.patch('/:id/status', authenticate, authorize(Role.VENDOR), updateOrderStatus);
router.patch('/:id/cancel', authenticate, authorize(Role.USER), cancelOrder);

export default router;
