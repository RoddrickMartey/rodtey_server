import rateLimit from 'express-rate-limit';

// ─── Global limiter (already in app.ts) ─────────────────
// 100 requests per 15 minutes — applied to all routes

// ─── Auth limiter ────────────────────────────────────────
// strict — prevents brute force on login/register
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Upload limiter ──────────────────────────────────────
// base64 uploads are heavy — limit to prevent abuse
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { success: false, message: 'Upload limit reached, please try again in an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Payment limiter ─────────────────────────────────────
// prevent payment endpoint abuse
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { success: false, message: 'Too many payment requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
