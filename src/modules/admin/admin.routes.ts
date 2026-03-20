import { Router } from 'express';
import {
  getDashboardStats,
  getAllVendors,
  updateVendorStatus,
  getAllOrders,
  getAllUsers,
  getAllPayouts,
  updatePayoutStatus,
  deleteUser,
} from './admin.controller.js';
import { authenticate, authorize } from '../../middlewares/authenticate.js';
import { Role } from '../../generated/prisma/client.js';

const router = Router();

// all admin routes require ADMIN role
router.use(authenticate, authorize(Role.ADMIN));

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.get('/vendors', getAllVendors);
router.patch('/vendors/:id/status', updateVendorStatus);
router.get('/orders', getAllOrders);
router.get('/payouts', getAllPayouts);
router.patch('/payouts/:id/status', updatePayoutStatus);

export default router;
