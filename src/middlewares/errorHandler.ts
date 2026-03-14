import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // ─── AppError (already normalized) ────────────────────
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...err.meta,
    });
  }

  // ─── Zod validation error ──────────────────────────────
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    err.issues.forEach((e: ZodIssue) => {
      const key = e.path.join('.');
      fields[key] = e.message;
    });
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      validationError: true,
      fields,
    });
  }

  // ─── Prisma known errors ───────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.[0] ?? 'field';
      return res.status(409).json({
        success: false,
        message: `${field} is already taken`,
        validationError: true,
        fields: { [field]: `${field} is already taken` },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found',
      });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Related record not found',
      });
    }
  }

  // ─── Prisma validation error ───────────────────────────
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data sent to database',
    });
  }

  // ─── JWT errors ────────────────────────────────────────
  if (err instanceof jwt.TokenExpiredError) {
    return res.status(401).json({
      success: false,
      message: 'Session expired',
      refresh: true,
    });
  }

  if (err instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      logout: true,
    });
  }

  // ─── Unknown / unhandled errors ────────────────────────
  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong on our end',
  });
};
