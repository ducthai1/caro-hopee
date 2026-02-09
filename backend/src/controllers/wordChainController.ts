/**
 * Word Chain REST Controller
 * Handles HTTP endpoints for room creation, joining, listing, and game state.
 * Follows existing gameController.ts pattern with optional auth (guest support).
 */
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import WordChainGame from '../models/WordChainGame';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import { generateWordChainRoomCode } from '../services/word-chain-engine';
import { io } from '../server';

// ─── Helper: extract userId from token (optional auth) ──────

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

// ─── Helper: resolve player display name ────────────────────

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

// ─── POST /api/word-chain/create ────────────────────────────

export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      maxPlayers = 2,
      rules = {},
      password,
      guestId,
      guestName,
    } = req.body;

    const userId = await extractUserId(req);
    const hostPlayerId = userId || guestId;

    if (!hostPlayerId) {
      res.status(400).json({ message: 'Must provide userId (via token) or guestId' });
      return;
    }

    const roomId = uuidv4();
    const roomCode = await generateWordChainRoomCode();

    // Hash password if provided
    let hashedPassword: string | null = null;
    if (password && password.trim()) {
      const trimmed = password.trim();
      if (trimmed.length < 4 || trimmed.length > 50) {
        res.status(400).json({ message: 'Password must be between 4 and 50 characters' });
        return;
      }
      hashedPassword = await bcrypt.hash(trimmed, 10);
    }

    // Create game with host as first player (slot 1)
    const livesFromRules = rules.lives || 3;
    const game = new WordChainGame({
      roomId,
      roomCode,
      gameType: 'word-chain',
      hostPlayerId,
      maxPlayers: Math.min(Math.max(maxPlayers, 2), 8),
      rules: {
        wordType: rules.wordType || '2+',
        allowProperNouns: rules.allowProperNouns || false,
        allowSlang: rules.allowSlang || false,
        turnDuration: rules.turnDuration || 60,
        lives: livesFromRules,
        gameMode: rules.gameMode || 'classic',
        allowRepeat: rules.allowRepeat || false,
        showHint: rules.showHint !== undefined ? rules.showHint : true,
      },
      password: hashedPassword,
      players: [{
        slot: 1,
        userId: userId || undefined,
        guestId: userId ? undefined : guestId,
        guestName: userId ? undefined : guestName,
        lives: livesFromRules,
        score: 0,
        wordsPlayed: 0,
        isEliminated: false,
        isConnected: true,
      }],
      gameStatus: 'waiting',
    });

    await game.save();

    // Resolve host name for lobby notification
    const hostName = await resolvePlayerName(userId, guestId, guestName);

    // Notify lobby about new room
    io.emit('word-chain:room-created', {
      roomId: game.roomId,
      roomCode: game.roomCode,
      maxPlayers: game.maxPlayers,
      playerCount: 1,
      hostName,
      rules: game.rules,
      hasPassword: !!hashedPassword,
      createdAt: game.createdAt.toISOString(),
    });

    res.status(201).json({
      roomId: game.roomId,
      roomCode: game.roomCode,
      maxPlayers: game.maxPlayers,
      rules: game.rules,
      players: game.players,
      gameStatus: game.gameStatus,
      hasPassword: !!hashedPassword,
      createdAt: game.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[wordChain:createRoom] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to create room' });
  }
};

// ─── POST /api/word-chain/join ──────────────────────────────

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

    const game = await WordChainGame.findOne({
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

    // Check if player is already in room
    const existingPlayer = game.players.find(p =>
      (userId && p.userId?.toString() === userId) ||
      (guestId && p.guestId === guestId)
    );
    if (existingPlayer) {
      // Already in room, return current state
      res.json({
        roomId: game.roomId,
        roomCode: game.roomCode,
        maxPlayers: game.maxPlayers,
        rules: game.rules,
        players: game.players,
        gameStatus: game.gameStatus,
        createdAt: game.createdAt.toISOString(),
      });
      return;
    }

    // Check if room is full
    if (game.players.length >= game.maxPlayers) {
      res.status(400).json({ message: `Room is full (${game.players.length}/${game.maxPlayers})` });
      return;
    }

    // Check password
    if (game.password) {
      if (!password) {
        res.status(401).json({ message: 'Password required', requiresPassword: true });
        return;
      }
      const isValid = await bcrypt.compare(password, game.password);
      if (!isValid) {
        res.status(401).json({ message: 'Incorrect password', requiresPassword: true });
        return;
      }
    }

    // Assign next available slot
    const usedSlots = new Set(game.players.map(p => p.slot));
    let newSlot = 1;
    while (usedSlots.has(newSlot) && newSlot <= 8) newSlot++;

    const newPlayer = {
      slot: newSlot,
      userId: userId || undefined,
      guestId: userId ? undefined : guestId,
      guestName: userId ? undefined : guestName,
      lives: game.rules.lives,
      score: 0,
      wordsPlayed: 0,
      isEliminated: false,
      isConnected: true,
    };

    game.players.push(newPlayer as any);
    await game.save();

    // Resolve name for notification
    const playerName = await resolvePlayerName(userId, guestId, guestName);

    // Notify room about new player
    io.to(game.roomId).emit('word-chain:player-joined', {
      player: { ...newPlayer, name: playerName },
      playerCount: game.players.length,
      maxPlayers: game.maxPlayers,
    });

    // Notify lobby about room status update
    io.emit('word-chain:room-updated', {
      roomId: game.roomId,
      roomCode: game.roomCode,
      playerCount: game.players.length,
      maxPlayers: game.maxPlayers,
      gameStatus: game.gameStatus,
    });

    res.json({
      roomId: game.roomId,
      roomCode: game.roomCode,
      maxPlayers: game.maxPlayers,
      rules: game.rules,
      players: game.players,
      gameStatus: game.gameStatus,
      createdAt: game.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[wordChain:joinRoom] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to join room' });
  }
};

// ─── GET /api/word-chain/rooms ──────────────────────────────

export const getWaitingRooms = async (_req: Request, res: Response): Promise<void> => {
  try {
    const games = await WordChainGame.find({
      gameStatus: { $in: ['waiting', 'playing'] },
      'players.0': { $exists: true }, // At least 1 player
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('roomId roomCode maxPlayers rules players gameStatus createdAt password')
      .lean();

    // Batch-fetch user names
    const userIds = games
      .flatMap(g => (g.players || []).map(p => p.userId).filter(Boolean));
    const users = userIds.length > 0
      ? await User.find({ _id: { $in: userIds } }).select('_id username').lean()
      : [];
    const userMap = new Map(users.map(u => [u._id.toString(), u.username]));

    const rooms = games.map(game => {
      const playerCount = game.players?.length || 0;
      const isFull = playerCount >= game.maxPlayers;

      // Resolve host name (first player)
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
        maxPlayers: game.maxPlayers,
        playerCount,
        isFull,
        canJoin: game.gameStatus === 'waiting' && !isFull,
        hostName,
        rules: game.rules,
        gameStatus: game.gameStatus,
        hasPassword: !!(game as any).password,
        createdAt: game.createdAt.toISOString(),
      };
    });

    res.json(rooms);
  } catch (error: any) {
    console.error('[wordChain:getWaitingRooms] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to get rooms' });
  }
};

// ─── GET /api/word-chain/:roomId ────────────────────────────

export const getGameState = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const game = await WordChainGame.findOne({ roomId }).lean();

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    // Batch-fetch user names for all players
    const userIds = (game.players || [])
      .map(p => p.userId)
      .filter(Boolean);
    const users = userIds.length > 0
      ? await User.find({ _id: { $in: userIds } }).select('_id username').lean()
      : [];
    const userMap = new Map(users.map(u => [u._id.toString(), u.username]));

    // Enrich players with display names
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
      maxPlayers: game.maxPlayers,
      rules: game.rules,
      players: playersWithNames,
      gameStatus: game.gameStatus,
      currentPlayerSlot: game.currentPlayerSlot,
      wordChain: game.wordChain,
      currentWord: game.currentWord,
      turnStartedAt: game.turnStartedAt,
      roundNumber: game.roundNumber,
      winner: game.winner,
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
      startedAt: game.startedAt?.toISOString() || null,
      finishedAt: game.finishedAt?.toISOString() || null,
    });
  } catch (error: any) {
    console.error('[wordChain:getGameState] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to get game state' });
  }
};

// ─── GET /api/word-chain/code/:roomCode ─────────────────────

export const getGameByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomCode } = req.params;
    const game = await WordChainGame.findOne({
      roomCode: roomCode.toUpperCase(),
    }).lean();

    if (!game) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    // Batch-fetch user names
    const userIds = (game.players || [])
      .map(p => p.userId)
      .filter(Boolean);
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
      maxPlayers: game.maxPlayers,
      rules: game.rules,
      players: playersWithNames,
      gameStatus: game.gameStatus,
      currentPlayerSlot: game.currentPlayerSlot,
      wordChain: game.wordChain,
      currentWord: game.currentWord,
      turnStartedAt: game.turnStartedAt,
      roundNumber: game.roundNumber,
      winner: game.winner,
      hasPassword: !!(game as any).password,
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
      startedAt: game.startedAt?.toISOString() || null,
      finishedAt: game.finishedAt?.toISOString() || null,
    });
  } catch (error: any) {
    console.error('[wordChain:getGameByCode] Error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to get game' });
  }
};
