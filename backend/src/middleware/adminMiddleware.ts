import { Response, NextFunction } from 'express';
import User from '../models/User';
import { AuthRequest } from './authMiddleware';

/**
 * Middleware to check if user is admin
 * Must be used after authMiddleware
 */
export const adminMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    next();
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
