import { Request, Response } from 'express';
import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { emitToUser } from '../../socket/index.js';
import { z } from 'zod';
import { paginate } from '../../utils/paginate.js';
import { PayoutStatus } from '../../generated/prisma/client.js';

const updateVendorStatusSchema = z.object({
  status: z.enum(['APPROVED', 'SUSPENDED']),
});

const updatePayoutStatusSchema = z.object({
  status: z.enum([PayoutStatus.PROCESSING, PayoutStatus.COMPLETED, PayoutStatus.FAILED]),
});
// ─── Get dashboard stats ─────────────────────────────────
export const getDashboardStats = async (_req: Request, res: Response) => {
  const [
    totalUsers,
    totalVendors,
    totalProducts,
    totalOrders,
    pendingVendors,
    pendingPayouts,
    recentOrders,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.vendor.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.vendor.count({ where: { status: 'PENDING' } }),
    prisma.payout.count({ where: { status: 'PENDING' } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        buyer: { select: { name: true, email: true } },
      },
    }),
  ]);

  const revenue = await prisma.order.aggregate({
    where: { status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] } },
    _sum: { total: true },
  });

  res.json({
    success: true,
    data: {
      totalUsers,
      totalVendors,
      totalProducts,
      totalOrders,
      pendingVendors,
      pendingPayouts,
      totalRevenue: revenue._sum.total ?? 0,
      recentOrders,
    },
  });
};

// ─── Get all vendors ─────────────────────────────────────
export const getAllVendors = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  const where = {
    ...(status && { status: status as never }),
    ...(search && { storeName: { contains: search, mode: 'insensitive' as const } }),
  };

  const [vendors, total] = await prisma.$transaction([
    prisma.vendor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        storeName: true,
        description: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { products: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  res.json({
    success: true,
    data: vendors,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
};

// ─── Update vendor status ────────────────────────────────
export const updateVendorStatus = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { status } = updateVendorStatusSchema.parse(req.body);

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    select: { id: true, storeName: true, user: { select: { id: true } } },
  });
  if (!vendor) throw new AppError('Vendor not found', 404);

  const updated = await prisma.vendor.update({
    where: { id },
    data: { status },
    select: { id: true, storeName: true, status: true },
  });

  // notify vendor of status change
  emitToUser(vendor.user.id, 'notification:vendor', {
    type: status === 'APPROVED' ? 'STORE_APPROVED' : 'STORE_SUSPENDED',
    message:
      status === 'APPROVED'
        ? 'Your store has been approved. You can now list products.'
        : 'Your store has been suspended. Please contact support.',
  });

  res.json({ success: true, data: updated });
};

// ─── Get all orders ──────────────────────────────────────
export const getAllOrders = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const where = {
    ...(status && { status: status as never }),
  };

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        paymentReference: true,
        buyer: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: paginate(total, page, limit),
  });
};

// ─── Get all users ───────────────────────────────────────
export const getAllUsers = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        avatar: { select: { url: true } },
        vendor: { select: { id: true, storeName: true, status: true } },
        _count: { select: { orders: true, reviews: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: paginate(total, page, limit),
  });
};

// ─── Get all payouts ─────────────────────────────────────
export const getAllPayouts = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const status = req.query.status as PayoutStatus | undefined;

  const where = {
    ...(status && { status }),
  };

  const [payouts, total] = await prisma.$transaction([
    prisma.payout.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        vendor: { select: { id: true, storeName: true } },
        order: { select: { id: true, total: true } },
      },
    }),
    prisma.payout.count({ where }),
  ]);

  res.json({
    success: true,
    data: payouts,
    pagination: paginate(total, page, limit),
  });
};

// ─── Update payout status ────────────────────────────────
export const updatePayoutStatus = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { status } = updatePayoutStatusSchema.parse(req.body);

  const payout = await prisma.payout.findUnique({
    where: { id },
    select: {
      id: true,
      amount: true,
      vendor: { select: { userId: true, storeName: true } },
    },
  });
  if (!payout) throw new AppError('Payout not found', 404);

  const updated = await prisma.payout.update({
    where: { id },
    data: { status },
    select: { id: true, amount: true, status: true, updatedAt: true },
  });

  // notify vendor of payout status
  if (status === 'COMPLETED') {
    emitToUser(payout.vendor.userId, 'notification:payment', {
      type: 'PAYOUT_COMPLETED',
      amount: payout.amount,
      message: `Your payout of GHS ${payout.amount} has been completed`,
    });
  }

  res.json({ success: true, data: updated });
};

// ─── Delete user (ban) ───────────────────────────────────
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('User not found', 404);
  if (user.role === 'ADMIN') throw new AppError('Cannot delete an admin', 403);

  await prisma.user.delete({ where: { id } });

  res.json({ success: true, message: 'User deleted' });
};
