import { Request, Response } from 'express';
import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { createReviewSchema } from './review.validator.js';
import { emitToUser } from '../../socket/index.js';

// ─── Create review ───────────────────────────────────────
export const createReview = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { productId, rating, comment } = createReviewSchema.parse(req.body);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      isActive: true,
      vendor: { select: { userId: true } },
    },
  });
  if (!product || !product.isActive) throw new AppError('Product not found', 404);

  const hasPurchased = await prisma.order.findFirst({
    where: {
      buyerId: userId,
      status: 'DELIVERED',
      items: { some: { productId } },
    },
  });
  if (!hasPurchased) {
    throw new AppError('You can only review products you have purchased', 403);
  }

  const review = await prisma.review.create({
    data: { userId, productId, rating, comment },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      user: { select: { name: true, avatar: { select: { url: true } } } },
    },
  });

  // notify vendor their product got a new review
  emitToUser(product.vendor.userId, 'notification:review', {
    type: 'NEW_REVIEW',
    productId,
    productName: product.name,
    rating,
    message: `Your product "${product.name}" received a ${rating}-star review`,
  });

  res.status(201).json({ success: true, data: review });
};

// ─── Get reviews by product ──────────────────────────────
export const getProductReviews = async (req: Request, res: Response) => {
  const { productId } = req.params as { productId: string };
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) throw new AppError('Product not found', 404);

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { productId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: { select: { name: true, avatar: { select: { url: true } } } },
      },
    }),
    prisma.review.count({ where: { productId } }),
  ]);

  const aggregate = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
  });

  res.json({
    success: true,
    data: reviews,
    meta: { averageRating: aggregate._avg.rating ?? 0 },
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
};

// ─── Get my reviews ──────────────────────────────────────
export const getMyReviews = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { take: 1, select: { url: true } },
          },
        },
      },
    }),
    prisma.review.count({ where: { userId } }),
  ]);

  res.json({
    success: true,
    data: reviews,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
};

// ─── Update review ───────────────────────────────────────
export const updateReview = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params as { id: string };

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new AppError('Review not found', 404);
  if (review.userId !== userId) throw new AppError('Forbidden', 403);

  const { rating, comment } = createReviewSchema
    .pick({ rating: true, comment: true })
    .partial()
    .parse(req.body);

  const updated = await prisma.review.update({
    where: { id },
    data: { rating, comment },
    select: { id: true, rating: true, comment: true, createdAt: true },
  });

  res.json({ success: true, data: updated });
};

// ─── Delete review ───────────────────────────────────────
export const deleteReview = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  const { id } = req.params as { id: string };

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new AppError('Review not found', 404);

  if (review.userId !== userId && role !== 'ADMIN') {
    throw new AppError('Forbidden', 403);
  }

  await prisma.review.delete({ where: { id } });

  res.json({ success: true, message: 'Review deleted' });
};
