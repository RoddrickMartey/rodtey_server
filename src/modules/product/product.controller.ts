import { Request, Response } from 'express';
import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { createProductSchema, updateProductSchema } from './product.validator.js';
import { generateSlug } from '../../utils/slugGenerate.js';

// ─── Create product ──────────────────────────────────────
export const createProduct = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new AppError('Store not found', 404);
  if (vendor.status !== 'APPROVED') throw new AppError('Your store is not approved yet', 403);

  const { name, description, price, stock, categoryId } = createProductSchema.parse(req.body);

  const slug = generateSlug(name);

  const product = await prisma.product.create({
    data: {
      vendorId: vendor.id,
      categoryId,
      name,
      slug,
      description,
      price,
      stock,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      price: true,
      stock: true,
      isActive: true,
      createdAt: true,
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  res.status(201).json({ success: true, data: product });
};

// ─── Get all products (public) ───────────────────────────
export const getAllProducts = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 12;
  const skip = (page - 1) * limit;
  const categoryId = req.query.categoryId as string | undefined;
  const vendorId = req.query.vendorId as string | undefined;
  const search = req.query.search as string | undefined;
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

  const where = {
    isActive: true,
    ...(categoryId && { categoryId }),
    ...(vendorId && { vendorId }),
    ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    ...((minPrice !== undefined || maxPrice !== undefined) && {
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    }),
  };

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        stock: true,
        createdAt: true,
        images: { take: 1, select: { url: true } },
        category: { select: { name: true, slug: true } },
        vendor: { select: { id: true, storeName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    success: true,
    data: products,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
};

// ─── Get single product by slug (public) ─────────────────
export const getProductBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params as { slug: string };

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      price: true,
      stock: true,
      isActive: true,
      createdAt: true,
      images: { select: { id: true, url: true } },
      category: { select: { id: true, name: true, slug: true } },
      vendor: {
        select: {
          id: true,
          storeName: true,
          logo: { select: { url: true } },
        },
      },
      reviews: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              avatar: { select: { url: true } },
            },
          },
        },
      },
      _count: { select: { reviews: true } },
    },
  });

  if (!product || !product.isActive) throw new AppError('Product not found', 404);

  res.json({ success: true, data: product });
};

// ─── Get my products (vendor) ────────────────────────────
export const getMyProducts = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new AppError('Store not found', 404);

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where: { vendorId: vendor.id },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        stock: true,
        isActive: true,
        createdAt: true,
        images: { take: 1, select: { url: true } },
        category: { select: { name: true, slug: true } },
        _count: { select: { reviews: true, orderItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where: { vendorId: vendor.id } }),
  ]);

  res.json({
    success: true,
    data: products,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
};

// ─── Update product ──────────────────────────────────────
export const updateProduct = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params as { id: string };

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new AppError('Store not found', 404);

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found', 404);
  if (product.vendorId !== vendor.id) throw new AppError('Forbidden', 403);

  const data = updateProductSchema.parse(req.body);

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...data,
      ...(data.name && { slug: generateSlug(data.name) }),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      stock: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return res.json({ success: true, data: updated });
};

// ─── Toggle product active status ───────────────────────
export const toggleProductStatus = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params as { id: string };

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new AppError('Store not found', 404);

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found', 404);
  if (product.vendorId !== vendor.id) throw new AppError('Forbidden', 403);

  const updated = await prisma.product.update({
    where: { id },
    data: { isActive: !product.isActive },
    select: { id: true, isActive: true },
  });

  res.json({ success: true, data: updated });
};

// ─── Delete product ──────────────────────────────────────
export const deleteProduct = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params as { id: string };

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new AppError('Store not found', 404);

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found', 404);
  if (product.vendorId !== vendor.id) throw new AppError('Forbidden', 403);

  await prisma.product.delete({ where: { id } });

  res.json({ success: true, message: 'Product deleted' });
};
