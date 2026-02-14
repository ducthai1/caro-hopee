import { Router } from 'express';
import {
  getWaitingRooms,
  getGameByCode,
  getGameState,
} from '../controllers/tinhTuyController';

const router = Router();

router.get('/rooms', getWaitingRooms);
router.get('/code/:roomCode', getGameByCode);
router.get('/:roomId', getGameState);

export default router;
