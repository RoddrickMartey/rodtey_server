import { Router } from 'express';
import {
  createVendor,
  getMyVendor,
  getVendorById,
  updateVendor,
  getAllVendors,
} from './vendor.controller.js';
import { authenticate, authorize } from '../../middlewares/authenticate.js';
import { Role } from '../../generated/prisma/client.js';

const router = Router();

router.get('/', getAllVendors);
router.get('/me', authenticate, getMyVendor);
router.get('/:id', getVendorById);
router.post('/', authenticate, createVendor);
router.patch('/me', authenticate, authorize(Role.VENDOR), updateVendor);

export default router;
