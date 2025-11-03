import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config/index.js';
import HttpError from '../../config/handler/HttpError/HttpError.js';
import { prisma } from '../../lib/prisma.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        username: string;
      };
    }
  }
}

interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError('No token provided', 401, 'unauthorized',null);
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        emailVerified: true,
        username: true
      },
    });

    if (!user) {
      throw new HttpError('User not found', 401, 'unauthorized',null);
    }

    if (!user.isActive) {
      throw new HttpError('Account has been disabled', 403, 'forbidden',null);
    }

    if (!user.emailVerified) {
      throw new HttpError('Email not verified', 403, 'forbidden',null);
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      username: user.username
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new HttpError('Invalid token', 401, 'unauthorized',null));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new HttpError('Token expired', 401, 'unauthorized',null));
    } else {
      next(error);
    }
  }
};

export default authMiddleware;