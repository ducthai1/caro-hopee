import { Router } from 'express';
import { createGame, getGame, getGameByCode, joinGame, getUserGames, leaveGame, getWaitingGames } from '../controllers/gameController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/create', createGame);
router.get('/waiting', getWaitingGames);
router.get('/code/:roomCode', getGameByCode);
router.get('/:roomId', getGame);
router.post('/:roomId/join', joinGame);
router.post('/:roomId/leave', leaveGame);
router.get('/user/:userId', authMiddleware, getUserGames);

export default router;

