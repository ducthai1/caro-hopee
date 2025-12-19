import { Router } from 'express';
import {
  getUserGameStats,
  getMyGameStats,
  submitGameResult,
} from '../controllers/gameStatsController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateScore } from '../middleware/validateScore';
import { scoreSubmissionLimiter } from '../middleware/rateLimiter';

const router = Router();

// Get stats for a specific user and game (public)
router.get('/:gameId/stats/:userId', getUserGameStats);

// Get current user's stats for a game (protected)
router.get('/:gameId/stats/my-stats', authMiddleware, getMyGameStats);

// Submit game result (protected with validation and rate limiting)
router.post(
  '/:gameId/stats/submit',
  authMiddleware,
  scoreSubmissionLimiter,
  validateScore,
  submitGameResult
);

export default router;

