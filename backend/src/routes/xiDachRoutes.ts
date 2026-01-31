/**
 * Xi Dach Session Routes
 * API endpoints for Xi Dach score tracking multiplayer sessions
 */
import { Router } from 'express';
import {
  createSession,
  getSession,
  getSessions,
  joinSession,
  updateSession,
  setPassword,
  deleteSession,
} from '../controllers/xiDachController';

const router = Router();

// Create new session
router.post('/sessions', createSession);

// Get all sessions (for listing)
router.get('/sessions', getSessions);

// Get session by code (requires password if set)
router.get('/sessions/:sessionCode', getSession);

// Join session with password
router.post('/sessions/:sessionCode/join', joinSession);

// Update session (players, matches, settings, etc.)
router.put('/sessions/:sessionCode', updateSession);

// Set/change session password
router.post('/sessions/:sessionCode/password', setPassword);

// Delete session
router.delete('/sessions/:sessionCode', deleteSession);

export default router;
