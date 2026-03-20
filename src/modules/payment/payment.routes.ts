import { Router } from 'express';
import {
  initializePayment,
  verifyPayment,
  paystackWebhook,
  getMyPayouts,
} from './payment.controller.js';
import { authenticate, authorize } from '../../middlewares/authenticate.js';
import { Role } from '../../generated/prisma/client.js';
import { paymentLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();

router.post('/initialize', authenticate, paymentLimiter, initializePayment);
router.get('/verify/:reference', authenticate, paymentLimiter, verifyPayment);
router.post('/webhook', paystackWebhook);
router.get('/payouts', authenticate, authorize(Role.VENDOR), getMyPayouts);

export default router;
