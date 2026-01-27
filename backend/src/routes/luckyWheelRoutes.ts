import { Router, Request, Response, NextFunction } from 'express';
import { saveConfig, getMyConfig, getUserConfig, deleteGuestConfig, updateActivity } from '../controllers/luckyWheelController';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

// Optional auth middleware - doesn't fail if no token
const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const { verifyToken } = require('../utils/jwt');
      const decoded = verifyToken(token);
      (req as AuthRequest).user = {
        userId: decoded.userId,
        username: decoded.username,
      };
    } catch (error) {
      // Ignore invalid token, continue as guest
    }
  }
  next();
};

// Save config - optional auth (works for both authenticated and guest)
router.post('/config', optionalAuth, saveConfig);

// Get my config - optional auth
router.get('/config', optionalAuth, getMyConfig);

// Delete guest config (when tab closes)
router.delete('/config', optionalAuth, deleteGuestConfig);

// Update activity timestamp
router.post('/activity', optionalAuth, updateActivity);

// Admin routes - get config for specific user
router.get('/config/:userId', authMiddleware, adminMiddleware, getUserConfig);

export default router;
