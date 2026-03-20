import { Request, Response } from 'express';
import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { createVendorSchema, updateVendorSchema } from './vendor.validator.js';
import { paginate } from '../../utils/paginate.js';

// ─── Create vendor store ─────────────────────────────────
export const createVendor = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const existing = await prisma.vendor.findUnique({ where: { userId } });
  if (existing) throw new AppError('You already have a store', 409);

  const { storeName, description } = createVendorSchema.parse(req.body);

  const vendor = await prisma.vendor.create({
    data: { userId, storeName, description },
    select: {
      id: true,
      storeName: true,
      description: true,
      status: true,
      createdAt: true,
    },
  });

  // update user role to VENDOR
  await prisma.user.update({
    where: { id: userId },
    data: { role: 'VENDOR' },
  });

  res.status(201).json({ success: true, data: vendor });
};

// ─── Get my store ────────────────────────────────────────
export const getMyVendor = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: {
      id: true,
      storeName: true,
      description: true,
      status: true,
      createdAt: true,
      logo: { select: { url: true, publicId: true } },
      banner: { select: { url: true, publicId: true } },
      _count: { select: { products: true } },
    },
  });

  if (!vendor) throw new AppError('Store not found', 404);

  res.json({ success: true, data: vendor });
};

// ─── Get vendor by id (public) ───────────────────────────
export const getVendorById = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      storeName: true,
      description: true,
      status: true,
      createdAt: true,
      logo: { select: { url: true } },
      banner: { select: { url: true } },
      _count: { select: { products: true } },
      products: {
        where: { isActive: true },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          images: { take: 1, select: { url: true } },
        },
      },
    },
  });

  if (!vendor) throw new AppError('Store not found', 404);
  if (vendor.status !== 'APPROVED') throw new AppError('Store not found', 404);

  res.json({ success: true, data: vendor });
};

// ─── Update my store ─────────────────────────────────────
export const updateVendor = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new AppError('Store not found', 404);

  const data = updateVendorSchema.parse(req.body);

  const updated = await prisma.vendor.update({
    where: { userId },
    data,
    select: {
      id: true,
      storeName: true,
      description: true,
      status: true,
      updatedAt: true,
    },
  });

  res.json({ success: true, data: updated });
};

// ─── Get all vendors (public) ────────────────────────────
export const getAllVendors = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const search = req.query.search as string | undefined;

  const where = {
    status: 'APPROVED' as const,
    ...(search && { storeName: { contains: search, mode: 'insensitive' as const } }),
  };

  const [vendors, total] = await prisma.$transaction([
    prisma.vendor.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        storeName: true,
        description: true,
        createdAt: true,
        logo: { select: { url: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.vendor.count({ where: { status: 'APPROVED' } }),
  ]);

  res.json({
    success: true,
    data: vendors,
    pagination: paginate(total, page, limit),
  });
};
