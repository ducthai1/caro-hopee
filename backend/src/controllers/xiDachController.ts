/**
 * Xi Dach Session Controller
 * Handles CRUD operations for Xi Dach score tracking sessions
 */
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import XiDachSession from '../models/XiDachSession';
import { AuthRequest } from '../middleware/authMiddleware';
import { io } from '../server';

// Generate unique 6-character session code
const generateSessionCode = async (): Promise<string> => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  let exists = true;

  while (exists) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const existingSession = await XiDachSession.findOne({ sessionCode: code });
    exists = !!existingSession;
  }

  return code!;
};

/**
 * Create a new Xi Dach session
 */
export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, password, settings, guestId } = req.body;
    const authReq = req as AuthRequest;

    // Get user ID if authenticated
    let userId: string | null = null;
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const { verifyToken } = await import('../utils/jwt');
        const decoded = verifyToken(token);
        userId = decoded.userId;
      }
    } catch {
      // Continue as guest
    }

    const finalUserId = userId || authReq.user?.userId || null;
    const sessionCode = await generateSessionCode();

    // Hash password if provided
    let hashedPassword: string | null = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const session = new XiDachSession({
      sessionCode,
      name: name || `Session ${sessionCode}`,
      password: hashedPassword,
      creatorId: finalUserId || null,
      creatorGuestId: finalUserId ? null : guestId || null,
      settings: settings || {},
      status: 'setup',
    });

    await session.save();

    // Emit socket event for new session
    io.emit('xi-dach-session-created', {
      sessionCode: session.sessionCode,
      name: session.name,
      hasPassword: !!session.password,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
    });

    res.status(201).json({
      id: session._id.toString(),
      sessionCode: session.sessionCode,
      name: session.name,
      hasPassword: !!hashedPassword,
      players: session.players,
      matches: session.matches,
      currentDealerId: session.currentDealerId,
      settings: session.settings,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[xiDach.createSession] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to create session' });
  }
};

/**
 * Get session by code (requires password if set)
 */
export const getSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionCode } = req.params;
    const { password } = req.query;

    const session = await XiDachSession.findOne({
      sessionCode: sessionCode.toUpperCase(),
    }).select('+password');

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    // Check password if set
    if (session.password) {
      if (!password) {
        res.status(401).json({
          message: 'Password required',
          requiresPassword: true,
          hasPassword: true,
        });
        return;
      }

      const isValid = await bcrypt.compare(password as string, session.password);
      if (!isValid) {
        res.status(401).json({ message: 'Invalid password' });
        return;
      }
    }

    res.json({
      id: session._id.toString(),
      sessionCode: session.sessionCode,
      name: session.name,
      hasPassword: !!session.password,
      players: session.players,
      matches: session.matches,
      currentDealerId: session.currentDealerId,
      settings: session.settings,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[xiDach.getSession] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to get session' });
  }
};

/**
 * Join session with password
 */
export const joinSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionCode } = req.params;
    const { password } = req.body;

    const session = await XiDachSession.findOne({
      sessionCode: sessionCode.toUpperCase(),
    }).select('+password');

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    // Check password if set
    if (session.password) {
      if (!password) {
        res.status(401).json({
          message: 'Password required',
          requiresPassword: true,
        });
        return;
      }

      const isValid = await bcrypt.compare(password, session.password);
      if (!isValid) {
        res.status(401).json({ message: 'Invalid password' });
        return;
      }
    }

    res.json({
      id: session._id.toString(),
      sessionCode: session.sessionCode,
      name: session.name,
      hasPassword: !!session.password,
      players: session.players,
      matches: session.matches,
      currentDealerId: session.currentDealerId,
      settings: session.settings,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[xiDach.joinSession] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to join session' });
  }
};

/**
 * Update session (players, matches, settings, etc.)
 */
export const updateSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionCode } = req.params;
    const updates = req.body;

    // Fields that can be updated
    const allowedUpdates = [
      'name',
      'players',
      'matches',
      'currentDealerId',
      'settings',
      'status',
    ];

    const updateData: Record<string, any> = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    }

    const session = await XiDachSession.findOneAndUpdate(
      { sessionCode: sessionCode.toUpperCase() },
      { $set: updateData },
      { new: true }
    );

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    // Emit socket event for session update
    io.to(`xi-dach-${sessionCode.toUpperCase()}`).emit('xi-dach-session-updated', {
      sessionCode: session.sessionCode,
      players: session.players,
      matches: session.matches,
      currentDealerId: session.currentDealerId,
      settings: session.settings,
      status: session.status,
      updatedAt: session.updatedAt.toISOString(),
    });

    res.json({
      id: session._id.toString(),
      sessionCode: session.sessionCode,
      name: session.name,
      hasPassword: !!session.password,
      players: session.players,
      matches: session.matches,
      currentDealerId: session.currentDealerId,
      settings: session.settings,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[xiDach.updateSession] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to update session' });
  }
};

/**
 * Set/change session password
 */
export const setPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionCode } = req.params;
    const { password } = req.body;

    let hashedPassword: string | null = null;
    if (password && password.length >= 4) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const session = await XiDachSession.findOneAndUpdate(
      { sessionCode: sessionCode.toUpperCase() },
      { $set: { password: hashedPassword } },
      { new: true }
    );

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    res.json({
      message: hashedPassword ? 'Password set successfully' : 'Password removed',
      hasPassword: !!hashedPassword,
    });
  } catch (error: any) {
    console.error('[xiDach.setPassword] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to set password' });
  }
};

/**
 * Delete session
 */
export const deleteSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionCode } = req.params;

    const session = await XiDachSession.findOneAndDelete({
      sessionCode: sessionCode.toUpperCase(),
    });

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    // Emit socket event for session deletion
    io.emit('xi-dach-session-deleted', {
      sessionCode: session.sessionCode,
    });

    res.json({ message: 'Session deleted successfully' });
  } catch (error: any) {
    console.error('[xiDach.deleteSession] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to delete session' });
  }
};

/**
 * Get all public sessions (for session list)
 */
export const getSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 50, status } = req.query;

    const query: Record<string, any> = {};
    if (status) {
      query.status = status;
    }

    const sessions = await XiDachSession.find(query)
      .select('-password')
      .sort({ updatedAt: -1 })
      .limit(Number(limit));

    res.json({
      sessions: sessions.map((s) => ({
        id: s._id.toString(),
        sessionCode: s.sessionCode,
        name: s.name,
        hasPassword: !!s.password,
        playerCount: s.players.filter((p) => p.isActive).length,
        matchCount: s.matches.length,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('[xiDach.getSessions] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to get sessions' });
  }
};
