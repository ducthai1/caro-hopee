import { Router } from 'express';
import {
  createRoom,
  joinRoom,
  getWaitingRooms,
  getGameState,
  getGameByCode,
} from '../controllers/wordChainController';

const router = Router();

router.post('/create', createRoom);
router.post('/join', joinRoom);
router.get('/rooms', getWaitingRooms);
router.get('/code/:roomCode', getGameByCode);
router.get('/:roomId', getGameState);

export default router;
