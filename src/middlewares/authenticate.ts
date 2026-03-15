import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/token.js';
import { AppError } from '../utils/AppError.js';
import { Role } from '../generated/prisma/client.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.accessToken as string | undefined;
  if (!token) throw new AppError('No token provided', 401, { refresh: true });

  req.user = verifyAccessToken(token);
  next();
};

const roleHierarchy: Record<Role, number> = {
  [Role.USER]: 1,
  [Role.VENDOR]: 2,
  [Role.ADMIN]: 3,
};

export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError('Unauthorized', 401, { refresh: true });

    const userLevel = roleHierarchy[req.user.role as Role];
    const requiredLevel = Math.min(...roles.map((r) => roleHierarchy[r]));

    if (userLevel < requiredLevel) {
      throw new AppError('Forbidden: insufficient permissions', 403);
    }
    next();
  };
