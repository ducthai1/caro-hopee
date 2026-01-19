import { Router } from 'express';
import { createGame, getGame, getGameByCode, joinGame, getUserGames, leaveGame, getWaitingGames, getGameHistory, updateMarker } from '../controllers/gameController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/create', createGame);
router.get('/waiting', getWaitingGames);
router.get('/code/:roomCode', getGameByCode);
router.post('/history', authMiddleware, getGameHistory); // Require authentication for history
router.get('/:roomId', getGame);
router.post('/:roomId/join', joinGame);
router.post('/:roomId/leave', leaveGame);
router.post('/:roomId/marker', updateMarker);
router.get('/user/:userId', authMiddleware, getUserGames);

export default router;

