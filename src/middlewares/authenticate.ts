import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/token.js';
import { AppError } from '../utils/AppError.js';

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

export const authorize =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError('Forbidden: insufficient permissions', 403);
    }
    next();
  };
