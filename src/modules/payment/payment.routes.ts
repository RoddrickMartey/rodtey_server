import { Router } from 'express';
import {
  initializePayment,
  verifyPayment,
  paystackWebhook,
  getMyPayouts,
} from './payment.controller.js';
import { authenticate, authorize } from '../../middlewares/authenticate.js';
import { Role } from '../../generated/prisma/client.js';

const router = Router();

router.post('/initialize', authenticate, initializePayment);
router.get('/verify/:reference', authenticate, verifyPayment);
router.post('/webhook', paystackWebhook);
router.get('/payouts', authenticate, authorize(Role.VENDOR), getMyPayouts);

export default router;
