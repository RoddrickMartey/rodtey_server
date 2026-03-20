import { Router } from 'express';
import { register, login, logout, refreshToken, getMe,getToken } from './auth.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.post('/refresh', authLimiter, refreshToken);
router.get('/me', authenticate, getMe);
router.get('/token', authenticate, getToken);

export default router;
