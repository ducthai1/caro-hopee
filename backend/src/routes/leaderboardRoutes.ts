import { Router } from 'express';
import {
  getLeaderboard,
  getUserRank,
  getRankAroundUser,
  getTopPlayers, // Legacy endpoint
} from '../controllers/leaderboardController';

const router = Router();

// New endpoints with gameId support
router.get('/:gameId', getLeaderboard);
router.get('/:gameId/rank/:userId', getUserRank);
router.get('/:gameId/around/:userId', getRankAroundUser);

// Legacy endpoint for backward compatibility
router.get('/top', getTopPlayers);

export default router;
