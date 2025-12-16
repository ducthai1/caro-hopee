import { Router } from 'express';
import { getTopPlayers, getUserRank } from '../controllers/leaderboardController';

const router = Router();

router.get('/', getTopPlayers);
router.get('/user/:userId', getUserRank);

export default router;

