/**
 * Tinh Tuy Dai Chien — REST Controller
 * Handles HTTP endpoints for room listing, game lookup, and state retrieval.
 */
import { Request, Response } from 'express';
import TinhTuyGame from '../models/TinhTuyGame';
import User from '../models/User';

// ─── Helper: batch resolve user names ────────────────────────

async function resolveUserNames(userIds: (any)[]): Promise<Map<string, string>> {
  const filtered = userIds.filter(Boolean);
  if (filtered.length === 0) return new Map();
  const users = await User.find({ _id: { $in: filtered } }).select('_id username').lean();
  return new Map(users.map(u => [u._id.toString(), u.username]));
}

function resolvePlayerName(
  player: any, userMap: Map<string, string>
): string {
  if (player.userId) return userMap.get(player.userId.toString()) || 'Player';
  return player.guestName || (player.guestId ? `Guest ${player.guestId.slice(-6)}` : 'Player');
}

// ─── GET /api/tinh-tuy/rooms ──────────────────────────────────

export const getWaitingRooms = async (_req: Request, res: Response): Promise<void> => {
  try {
    const games = await TinhTuyGame.find({
      gameStatus: { $in: ['waiting', 'playing'] },
      'players.0': { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('roomId roomCode settings players gameStatus createdAt')
      .lean();

    const userIds = games.flatMap(g => (g.players || []).map(p => p.userId).filter(Boolean));
    const userMap = await resolveUserNames(userIds);

    const rooms = games.map(game => {
      const playerCount = game.players?.length || 0;
      const host = game.players?.[0];
      const hostName = host ? resolvePlayerName(host, userMap) : 'Player';

      return {
        roomId: game.roomId,
        roomCode: game.roomCode,
        maxPlayers: game.settings?.maxPlayers || 4,
        playerCount,
        isFull: playerCount >= (game.settings?.maxPlayers || 4),
        canJoin: game.gameStatus === 'waiting' && playerCount < (game.settings?.maxPlayers || 4),
        hostName,
        settings: { ...game.settings, password: undefined },
        gameStatus: game.gameStatus,
        hasPassword: !!(game.settings as any)?.password,
        createdAt: game.createdAt,
      };
    });

    res.json(rooms);
  } catch (error: any) {
    console.error('[tinhTuy:getWaitingRooms]', error.message);
    res.status(500).json({ message: 'Failed to get rooms' });
  }
};

// ─── GET /api/tinh-tuy/code/:roomCode ─────────────────────────

export const getGameByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomCode } = req.params;
    const game = await TinhTuyGame.findOne({ roomCode: roomCode.toUpperCase() }).lean();
    if (!game) { res.status(404).json({ message: 'Room not found' }); return; }

    const userIds = (game.players || []).map(p => p.userId).filter(Boolean);
    const userMap = await resolveUserNames(userIds);

    const playersWithNames = (game.players || []).map(p => ({
      ...p, name: resolvePlayerName(p, userMap),
    }));

    res.json({
      roomId: game.roomId, roomCode: game.roomCode,
      settings: { ...game.settings, password: undefined },
      players: playersWithNames, gameStatus: game.gameStatus,
      hasPassword: !!(game.settings as any)?.password,
      createdAt: game.createdAt,
    });
  } catch (error: any) {
    console.error('[tinhTuy:getGameByCode]', error.message);
    res.status(500).json({ message: 'Failed to get game' });
  }
};

// ─── GET /api/tinh-tuy/:roomId ────────────────────────────────

export const getGameState = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const game = await TinhTuyGame.findOne({ roomId }).lean();
    if (!game) { res.status(404).json({ message: 'Game not found' }); return; }

    const userIds = (game.players || []).map(p => p.userId).filter(Boolean);
    const userMap = await resolveUserNames(userIds);

    const playersWithNames = (game.players || []).map(p => ({
      ...p, name: resolvePlayerName(p, userMap),
    }));

    res.json({
      roomId: game.roomId, roomCode: game.roomCode,
      gameType: game.gameType, hostPlayerId: game.hostPlayerId,
      settings: { ...game.settings, password: undefined },
      players: playersWithNames, gameStatus: game.gameStatus,
      currentPlayerSlot: game.currentPlayerSlot,
      turnPhase: game.turnPhase, turnStartedAt: game.turnStartedAt,
      lastDiceResult: game.lastDiceResult, round: game.round,
      winner: game.winner,
      createdAt: game.createdAt, updatedAt: game.updatedAt,
      gameStartedAt: game.gameStartedAt, finishedAt: game.finishedAt,
    });
  } catch (error: any) {
    console.error('[tinhTuy:getGameState]', error.message);
    res.status(500).json({ message: 'Failed to get game state' });
  }
};
