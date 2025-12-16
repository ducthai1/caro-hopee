import { Router } from 'express';
import { createGame, getGame, getGameByCode, joinGame, getUserGames } from '../controllers/gameController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/create', createGame);
router.get('/code/:roomCode', getGameByCode);
router.get('/:roomId', getGame);
router.post('/:roomId/join', joinGame);
router.get('/user/:userId', authMiddleware, getUserGames);

export default router;

