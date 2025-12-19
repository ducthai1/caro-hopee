import { Router } from 'express';
import {
  getUserProfile,
  getUserGames,
  getUserGameStats,
  getMyProfile,
} from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Get user profile
router.get('/:userId/profile', getUserProfile);

// Get all game stats for a user
router.get('/:userId/games', getUserGames);

// Get user stats for a specific game
router.get('/:userId/games/:gameId', getUserGameStats);

// Get current user's profile (protected)
router.get('/me/profile', authMiddleware, getMyProfile);

export default router;
