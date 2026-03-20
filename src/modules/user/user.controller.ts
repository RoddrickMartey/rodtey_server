import { Request, Response } from 'express';
import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .trim()
    .optional(),

  email: z.string().email('Invalid email address').toLowerCase().trim().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string({ error: 'Current password is required' }),

  newPassword: z
    .string({ error: 'New password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ─── Get profile ─────────────────────────────────────────
export const getProfile = async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      avatar: { select: { id: true, url: true, publicId: true } },
      vendor: {
        select: {
          id: true,
          storeName: true,
          status: true,
          logo: { select: { url: true } },
        },
      },
      _count: { select: { orders: true, reviews: true } },
    },
  });

  if (!user) throw new AppError('User not found', 404);

  res.json({ success: true, data: user });
};

// ─── Update profile ──────────────────────────────────────
export const updateProfile = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { name, email } = updateProfileSchema.parse(req.body);

  // if email is changing check it's not already taken
  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      throw new AppError('Email is already in use', 409);
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(email && { email }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      updatedAt: true,
    },
  });

  res.json({ success: true, data: updated });
};

// ─── Change password ─────────────────────────────────────
export const changePassword = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });
  if (!user) throw new AppError('User not found', 404);

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new AppError('Current password is incorrect', 401);

  if (currentPassword === newPassword) {
    throw new AppError('New password must be different from current password', 400);
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, refreshToken: null },
  });

  res.json({ success: true, message: 'Password changed. Please login again.' });
};

// ─── Delete account ──────────────────────────────────────
export const deleteAccount = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { password } = z
    .object({ password: z.string({ error: 'Password is required' }) })
    .parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true, role: true },
  });
  if (!user) throw new AppError('User not found', 404);
  if (user.role === 'ADMIN') throw new AppError('Admin accounts cannot be deleted', 403);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError('Incorrect password', 401);

  await prisma.user.delete({ where: { id: userId } });

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.json({ success: true, message: 'Account deleted' });
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, avatar: { select: { url: true } } },
  });
  if (!user) throw new AppError('User not found', 404);
  res.json({ success: true, data: user });
};
