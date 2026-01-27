import { Router } from 'express';
import {
  listLuckyWheelUsers,
  getUserConfig,
  updateUserConfig,
} from '../controllers/adminController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// List all users with lucky wheel configs
router.get('/lucky-wheel/users', listLuckyWheelUsers);

// Get detailed config for a specific user
router.get('/lucky-wheel/users/:userId', getUserConfig);

// Update config for a specific user
router.put('/lucky-wheel/users/:userId/config', updateUserConfig);

export default router;
