import { Router } from 'express';
import {
  listLuckyWheelUsers,
  getUserConfig,
  updateUserConfig,
} from '../controllers/adminController';
import {
  listActiveRooms,
  getRoomConfig,
  updateDiceOverrides,
} from '../controllers/tinhTuyAdminController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Lucky Wheel admin
router.get('/lucky-wheel/users', listLuckyWheelUsers);
router.get('/lucky-wheel/users/:userId', getUserConfig);
router.put('/lucky-wheel/users/:userId/config', updateUserConfig);

// TinhTuy admin — dice control
router.get('/tinh-tuy/rooms', listActiveRooms);
router.get('/tinh-tuy/rooms/:roomId', getRoomConfig);
router.put('/tinh-tuy/rooms/:roomId/dice', updateDiceOverrides);

export default router;
