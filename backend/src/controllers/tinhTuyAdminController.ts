import { Request, Response } from 'express';
import TinhTuyGame from '../models/TinhTuyGame';

/**
 * List active TinhTuy rooms (gameStatus = 'playing')
 */
export const listActiveRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const query = { gameStatus: 'playing' };
    const games = await TinhTuyGame.find(query)
      .sort({ gameStartedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await TinhTuyGame.countDocuments(query);

    const rooms = games.map((game) => ({
      roomId: game.roomId,
      roomCode: game.roomCode,
      round: game.round,
      currentPlayerSlot: game.currentPlayerSlot,
      playerCount: game.players.filter((p) => !p.isBankrupt).length,
      players: game.players.map((p) => ({
        slot: p.slot,
        character: p.character,
        displayName: p.guestName || (p.userId ? String(p.userId) : 'Unknown'),
        position: p.position,
        points: p.points,
        isBankrupt: p.isBankrupt,
      })),
      diceOverrides: game.diceOverrides || {},
      gameStartedAt: game.gameStartedAt,
    }));

    res.json({
      rooms,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to list active rooms' });
  }
};

/**
 * Get room config (full player details + diceOverrides)
 */
export const getRoomConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const game = await TinhTuyGame.findOne({ roomId }).lean();

    if (!game) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    res.json({
      roomId: game.roomId,
      roomCode: game.roomCode,
      gameStatus: game.gameStatus,
      round: game.round,
      currentPlayerSlot: game.currentPlayerSlot,
      players: game.players.map((p) => ({
        slot: p.slot,
        character: p.character,
        displayName: p.guestName || (p.userId ? String(p.userId) : 'Unknown'),
        position: p.position,
        points: p.points,
        properties: p.properties,
        isBankrupt: p.isBankrupt,
        isConnected: p.isConnected,
      })),
      diceOverrides: game.diceOverrides || {},
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to get room config' });
  }
};

/**
 * Update dice overrides for a room
 * Body: { overrides: Record<string, { dice1: number; dice2: number } | null> }
 */
export const updateDiceOverrides = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { overrides } = req.body;

    if (!overrides || typeof overrides !== 'object') {
      res.status(400).json({ message: 'overrides must be an object' });
      return;
    }

    const game = await TinhTuyGame.findOne({ roomId });
    if (!game) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    if (game.gameStatus !== 'playing') {
      res.status(400).json({ message: 'Game is not active' });
      return;
    }

    const validSlots = new Set(game.players.map((p) => String(p.slot)));

    // Validate each override entry
    for (const [slot, value] of Object.entries(overrides)) {
      if (!validSlots.has(slot)) {
        res.status(400).json({ message: `Invalid slot: ${slot}` });
        return;
      }
      if (value !== null) {
        const v = value as { dice1: number; dice2: number };
        if (
          typeof v.dice1 !== 'number' || typeof v.dice2 !== 'number' ||
          v.dice1 < 1 || v.dice1 > 6 || v.dice2 < 1 || v.dice2 > 6 ||
          !Number.isInteger(v.dice1) || !Number.isInteger(v.dice2)
        ) {
          res.status(400).json({ message: `Invalid dice values for slot ${slot}: dice must be integers 1-6` });
          return;
        }
      }
    }

    // Apply overrides
    const current = game.diceOverrides || {};
    for (const [slot, value] of Object.entries(overrides)) {
      if (value === null) {
        delete current[slot];
      } else {
        current[slot] = value as { dice1: number; dice2: number };
      }
    }
    game.diceOverrides = current;
    game.markModified('diceOverrides');
    await game.save();

    res.json({
      message: 'Dice overrides updated',
      diceOverrides: game.diceOverrides,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update dice overrides' });
  }
};
