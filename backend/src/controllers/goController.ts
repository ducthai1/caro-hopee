/**
 * Go (Cờ Vây) REST Controller
 * Handles HTTP endpoints for room creation, joining, listing, and game state.
 * Follows wordChainController.ts pattern with optional auth (guest support).
 */
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import GoGame from '../models/GoGame';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import { generateGoRoomCode } from '../services/go-engine';
import { io } from '../server';

// ─── Helper: extract userId from token (optional auth) ──────────

async function extractUserId(req: Request): Promise<string | null> {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const { verifyToken } = await import('../utils/jwt');
      const decoded = verifyToken(token);
      return decoded.userId;
    }
  } catch {
    // Token invalid or not provided
  }
  const authReq = req as AuthRequest;
  return authReq.user?.userId || null;
}

// ─── Helper: resolve player display name ────────────────────────

async function resolvePlayerName(
  userId?: string | null,
  guestId?: string | null,
  guestName?: string | null
): Promise<string> {
  if (userId) {
    const user = await User.findById(userId).select('username').lean();
    return user?.username || 'Player';
  }
  return guestName || (guestId ? `Guest ${guestId.slice(-6)}` : 'Player');
}

// ─── POST /api/go/create ─────────────────────────────────────────

export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rules = {}, password, guestId, guestName } = req.body;

    const userId = await extractUserId(req);
    const hostPlayerId = userId || guestId;

    if (!hostPlayerId) {
      res.status(400).json({ message: 'Must provide userId (via token) or guestId' });
      return;
    }

    const roomId = uuidv4();
    const roomCode = await generateGoRoomCode();

    let hashedPassword: string | null = null;
    if (password && password.trim()) {
      const trimmed = password.trim();
      if (trimmed.length < 4 || trimmed.length > 50) {
        res.status(400).json({ message: 'Password must be between 4 and 50 characters' });
        return;
      }
      hashedPassword = await bcrypt.hash(trimmed, 10);
    }

    const settings = {
      boardSize: rules.boardSize || 19,
      komi: rules.komi ?? 6.5,
      handicap: rules.handicap || 0,
      mainTime: rules.mainTime || 0,
      byoyomiPeriods: rules.byoyomiPeriods ?? 3,
      byoyomiTime: rules.byoyomiTime || 30,
    };

    const game = new GoGame({
      roomId,
      roomCode,
      gameType: 'go',
      hostPlayerId,
      settings,
      password: hashedPassword,
      players: [{
        slot: 1,
        userId: userId || undefined,
        guestId: userId ? undefined : guestId,
        guestName: userId ? undefined : guestName,
        color: 'black',
        captures: 0,
        mainTimeLeft: settings.mainTime,
        byoyomiPeriodsLeft: settings.byoyomiPeriods,
        passed: false,
        scoringAgreed: false,
        isConnected: true,
      }],
      gameStatus: 'waiting',
    });

    await game.save();

    const hostName = await resolvePlayerName(userId, guestId, guestName);

    io.emit('go:room-created', {
      roomId: game.roomId,
      roomCode: game.roomCode,
      playerCount: 1,
      hostName,
      settings: game.settings,
      hasPassword: !!hashedPassword,
      createdAt: game.createdAt.toISOString(),
    });

    res.status(201).json({
      roomId: game.roomId,
      roomCode: game.roomCode,
      settings: game.settings,
      players: game.players,
      gameStatus: game.gameStatus,
      hasPassword: !!hashedPassword,
      createdAt: game.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[go:createRoom] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to create room' });
  }
};

// ─── POST /api/go/join ───────────────────────────────────────────

export const joinRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomCode, password, guestId, guestName } = req.body;

    if (!roomCode) {
      res.status(400).json({ message: 'roomCode is required' });
      return;
    }

    const userId = await extractUserId(req);
    const playerId = userId || guestId;

    if (!playerId) {
      res.status(400).json({ message: 'Must provide userId (via token) or guestId' });
      return;
    }

    const game = await GoGame.findOne({
      roomCode: roomCode.toUpperCase(),
    }).select('+password');

    if (!game) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    if (game.gameStatus !== 'waiting') {
      res.status(400).json({ message: 'Room is not available for joining' });
      return;
    }

    // Already in room
    const existingPlayer = game.players.find(p =>
      (userId && p.userId?.toString() === userId) ||
      (guestId && p.guestId === guestId)
    );
    if (existingPlayer) {
      res.json({
        roomId: game.roomId,
        roomCode: game.roomCode,
        settings: game.settings,
        players: game.players,
        gameStatus: game.gameStatus,
        createdAt: game.createdAt.toISOString(),
      });
      return;
    }

    if (game.players.length >= 2) {
      res.status(400).json({ message: 'Room is full (2/2)' });
      return;
    }

    if ((game as any).password) {
      if (!password) {
        res.status(401).json({ message: 'Password required', requiresPassword: true });
        return;
      }
      const isValid = await bcrypt.compare(password, (game as any).password);
      if (!isValid) {
        res.status(401).json({ message: 'Incorrect password', requiresPassword: true });
        return;
      }
    }

    const newPlayer = {
      slot: 2,
      userId: userId || undefined,
      guestId: userId ? undefined : guestId,
      guestName: userId ? undefined : guestName,
      color: 'white',
      captures: 0,
      mainTimeLeft: game.settings.mainTime,
      byoyomiPeriodsLeft: game.settings.byoyomiPeriods,
      passed: false,
      scoringAgreed: false,
      isConnected: true,
    };

    game.players.push(newPlayer as any);
    await game.save();

    const playerName = await resolvePlayerName(userId, guestId, guestName);

    io.to(`go:${game.roomId}`).emit('go:player-joined', {
      player: { ...newPlayer, name: playerName },
      playerCount: game.players.length,
    });

    io.emit('go:room-updated', {
      roomId: game.roomId,
      roomCode: game.roomCode,
      playerCount: game.players.length,
      gameStatus: game.gameStatus,
    });

    res.json({
      roomId: game.roomId,
      roomCode: game.roomCode,
      settings: game.settings,
      players: game.players,
      gameStatus: game.gameStatus,
      createdAt: game.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[go:joinRoom] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to join room' });
  }
};

// ─── GET /api/go/rooms ───────────────────────────────────────────

export const getWaitingRooms = async (_req: Request, res: Response): Promise<void> => {
  try {
    const games = await GoGame.find({
      gameStatus: 'waiting',
      'players.0': { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('roomId roomCode settings players gameStatus createdAt password')
      .lean();

    // Batch-fetch user names
    const userIds = games.flatMap(g =>
      (g.players || []).map(p => p.userId).filter(Boolean)
    );
    const users = userIds.length > 0
      ? await User.find({ _id: { $in: userIds } }).select('_id username').lean()
      : [];
    const userMap = new Map(users.map(u => [u._id.toString(), u.username]));

    const rooms = games.map(game => {
      const playerCount = game.players?.length || 0;
      const host = game.players?.[0];
      let hostName = 'Player';
      if (host?.userId) {
        hostName = userMap.get(host.userId.toString()) || 'Player';
      } else if (host?.guestName) {
        hostName = host.guestName;
      } else if (host?.guestId) {
        hostName = `Guest ${host.guestId.slice(-6)}`;
      }

      return {
        roomId: game.roomId,
        roomCode: game.roomCode,
        playerCount,
        isFull: playerCount >= 2,
        canJoin: game.gameStatus === 'waiting' && playerCount < 2,
        hostName,
        settings: game.settings,
        gameStatus: game.gameStatus,
        hasPassword: !!(game as any).password,
        createdAt: (game as any).createdAt?.toISOString?.() || '',
      };
    });

    res.json(rooms);
  } catch (error: any) {
    console.error('[go:getWaitingRooms] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to get rooms' });
  }
};

// ─── GET /api/go/code/:roomCode ──────────────────────────────────

export const getGameByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomCode } = req.params;
    const game = await GoGame.findOne({ roomCode: roomCode.toUpperCase() }).lean();

    if (!game) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    const userIds = (game.players || []).map(p => p.userId).filter(Boolean);
    const users = userIds.length > 0
      ? await User.find({ _id: { $in: userIds } }).select('_id username').lean()
      : [];
    const userMap = new Map(users.map(u => [u._id.toString(), u.username]));

    const playersWithNames = (game.players || []).map(p => ({
      ...p,
      name: p.userId
        ? userMap.get(p.userId.toString()) || 'Player'
        : p.guestName || (p.guestId ? `Guest ${p.guestId.slice(-6)}` : 'Player'),
    }));

    res.json({
      roomId: game.roomId,
      roomCode: game.roomCode,
      gameType: game.gameType,
      hostPlayerId: game.hostPlayerId,
      settings: game.settings,
      players: playersWithNames,
      gameStatus: game.gameStatus,
      phase: game.phase,
      currentColor: game.currentColor,
      moveCount: game.moveCount,
      board: game.board,
      hasPassword: !!(game as any).password,
      createdAt: (game as any).createdAt?.toISOString?.() || '',
      updatedAt: (game as any).updatedAt?.toISOString?.() || '',
      startedAt: game.startedAt?.toISOString() || null,
      finishedAt: game.finishedAt?.toISOString() || null,
    });
  } catch (error: any) {
    console.error('[go:getGameByCode] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to get game' });
  }
};

// ─── GET /api/go/:roomId ─────────────────────────────────────────

export const getGameState = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const game = await GoGame.findOne({ roomId }).lean();

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    const userIds = (game.players || []).map(p => p.userId).filter(Boolean);
    const users = userIds.length > 0
      ? await User.find({ _id: { $in: userIds } }).select('_id username').lean()
      : [];
    const userMap = new Map(users.map(u => [u._id.toString(), u.username]));

    const playersWithNames = (game.players || []).map(p => ({
      ...p,
      name: p.userId
        ? userMap.get(p.userId.toString()) || 'Player'
        : p.guestName || (p.guestId ? `Guest ${p.guestId.slice(-6)}` : 'Player'),
    }));

    res.json({
      roomId: game.roomId,
      roomCode: game.roomCode,
      gameType: game.gameType,
      hostPlayerId: game.hostPlayerId,
      settings: game.settings,
      players: playersWithNames,
      gameStatus: game.gameStatus,
      phase: game.phase,
      currentColor: game.currentColor,
      board: game.board,
      moveCount: game.moveCount,
      consecutivePasses: game.consecutivePasses,
      koPoint: game.koPoint,
      deadStones: game.deadStones,
      territory: game.territory,
      moveHistory: game.moveHistory,
      winner: game.winner,
      winReason: game.winReason,
      finalScore: game.finalScore,
      createdAt: (game as any).createdAt?.toISOString?.() || '',
      updatedAt: (game as any).updatedAt?.toISOString?.() || '',
      startedAt: game.startedAt?.toISOString() || null,
      finishedAt: game.finishedAt?.toISOString() || null,
    });
  } catch (error: any) {
    console.error('[go:getGameState] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to get game state' });
  }
};
