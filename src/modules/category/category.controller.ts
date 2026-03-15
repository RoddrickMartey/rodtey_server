import { Request, Response } from 'express';
import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { createCategorySchema, updateCategorySchema } from './category.validator.js';
import { generateSlug } from '../../utils/slugGenerate.js';

// ─── Create category (admin only) ───────────────────────
export const createCategory = async (req: Request, res: Response) => {
  const { name } = createCategorySchema.parse(req.body);

  const slug = generateSlug(name);

  const category = await prisma.category.create({
    data: { name, slug },
    select: { id: true, name: true, slug: true, createdAt: true },
  });

  res.status(201).json({ success: true, data: category });
};

// ─── Get all categories (public) ────────────────────────
export const getAllCategories = async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      image: { select: { url: true } },
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: categories });
};

// ─── Get category by slug (public) ──────────────────────
export const getCategoryBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params as { slug: string };

  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      image: { select: { url: true } },
      _count: { select: { products: true } },
    },
  });

  if (!category) throw new AppError('Category not found', 404);

  res.json({ success: true, data: category });
};

// ─── Update category (admin only) ───────────────────────
export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { name } = updateCategorySchema.parse(req.body);

  // regenerate slug if name changed
  const data = {
    ...(name && { name, slug: generateSlug(name) }),
  };

  const category = await prisma.category.update({
    where: { id },
    data,
    select: { id: true, name: true, slug: true, updatedAt: true },
  });

  res.json({ success: true, data: category });
};

// ─── Delete category (admin only) ───────────────────────
export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  await prisma.category.delete({ where: { id } });

  res.json({ success: true, message: 'Category deleted' });
};
