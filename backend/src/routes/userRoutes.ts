import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/:userId', getProfile);
router.put('/:userId', authMiddleware, updateProfile);

export default router;

