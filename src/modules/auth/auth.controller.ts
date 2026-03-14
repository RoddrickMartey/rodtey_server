import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/token.js';
import { registerSchema, loginSchema } from './auth.validator.js';

const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─── Register ────────────────────────────────────────────
export const register = async (req: Request, res: Response) => {
  const { name, email, password, role } = registerSchema.parse(req.body);

  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: { name, email, password: hashed, role },
  });

  res.status(201).json({ success: true });
};

// ─── Login ───────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      avatar: {
        select: {
          url: true,
        },
      },
    },
  });
  if (!user) throw new AppError('Invalid credentials', 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role });

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  res.cookie('accessToken', accessToken, accessCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar?.url,
    },
  });
};

// ─── Refresh token ───────────────────────────────────────
export const refreshToken = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) throw new AppError('No refresh token', 401, { logout: true });

  const payload = verifyRefreshToken(token);

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.refreshToken !== token) {
    throw new AppError('Invalid refresh token', 401, { logout: true });
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });

  res.cookie('accessToken', accessToken, accessCookieOptions);
  res.json({ success: true });
};

// ─── Logout ──────────────────────────────────────────────
export const logout = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;

  if (token) {
    const user = await prisma.user.findFirst({ where: { refreshToken: token } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null },
      });
    }
  }

  res.clearCookie('accessToken', accessCookieOptions);
  res.clearCookie('refreshToken', refreshCookieOptions);
  res.json({ success: true, message: 'Logged out successfully' });
};

// ─── Get me ──────────────────────────────────────────────
export const getMe = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      avatar: {
        select: { url: true, publicId: true },
      },
    },
  });

  if (!user) throw new AppError('User not found', 404);

  res.json({ success: true, data: user });
};
