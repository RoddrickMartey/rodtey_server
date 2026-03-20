import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middlewares/errorHandler';
import prisma from './config/prisma';

import authRoutes from './modules/auth/auth.routes.js';
import vendorRoutes from './modules/vendor/vendor.routes.js';
import categoryRoutes from './modules/category/category.routes.js';
import productRoutes from './modules/product/product.routes.js';
import orderRoutes from './modules/order/order.routes.js';
import reviewRoutes from './modules/review/review.routes.js';
import uploadRoutes from './modules/upload/upload.routes.js';
import paymentRoutes from './modules/payment/payment.routes.js';
import messageRoutes from './modules/message/message.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import userRoutes from './modules/user/user.routes.js';

const app = express();

// ─── Security ───────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);

// ─── Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Logging ────────────────────────────────────────────
app.use(morgan('dev'));

// ─── Health check ───────────────────────────────────────
app.get('/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({
    status: 'ok',
    app: 'rodtey-server',
    db: 'connected',
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/users', userRoutes);

// ─── 404 handler ────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global error handler ───────────────────────────────
app.use(errorHandler);

export default app;
