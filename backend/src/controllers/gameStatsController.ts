import { Request, Response } from 'express';
import GameStats from '../models/GameStats';
import GameType from '../models/GameType';
import { AuthRequest } from '../middleware/authMiddleware';
import { createSessionAfterSubmission } from '../middleware/validateScore';

/**
 * Get stats for a specific user and game
 */
export const getUserGameStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId, userId } = req.params;

    // Verify game exists
    const gameType = await GameType.findOne({ gameId, isActive: true });
    if (!gameType) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    const stats = await GameStats.findOne({
      userId,
      gameId,
    }).populate('userId', 'username');

    if (!stats) {
      // Return default stats if not found
      res.json({
        userId,
        gameId,
        wins: 0,
        losses: 0,
        draws: 0,
        totalScore: 0,
        customStats: {},
        lastPlayed: null,
      });
      return;
    }

    res.json({
      _id: stats._id,
      userId: stats.userId,
      gameId: stats.gameId,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      totalScore: stats.totalScore,
      customStats: Object.fromEntries(stats.customStats || new Map()),
      lastPlayed: stats.lastPlayed,
      createdAt: stats.createdAt,
      updatedAt: stats.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get current user's stats for a game
 */
export const getMyGameStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { gameId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Verify game exists
    const gameType = await GameType.findOne({ gameId, isActive: true });
    if (!gameType) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    let stats = await GameStats.findOne({
      userId,
      gameId,
    });

    if (!stats) {
      // Create default stats if not exists
      stats = new GameStats({
        userId,
        gameId,
        wins: 0,
        losses: 0,
        draws: 0,
        totalScore: 0,
      });
      await stats.save();
    }

    res.json({
      _id: stats._id,
      userId: stats.userId,
      gameId: stats.gameId,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      totalScore: stats.totalScore,
      customStats: Object.fromEntries(stats.customStats || new Map()),
      lastPlayed: stats.lastPlayed,
      createdAt: stats.createdAt,
      updatedAt: stats.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Submit game result and update stats
 * This should be called after a game finishes
 */
export const submitGameResult = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { gameId } = req.params;
    const userId = req.user?.userId;
    const { result, score, customStats } = req.body; // result: 'win' | 'loss' | 'draw'

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!['win', 'loss', 'draw'].includes(result)) {
      res.status(400).json({ message: 'Invalid result. Must be win, loss, or draw' });
      return;
    }

    // Verify game exists
    const gameType = await GameType.findOne({ gameId, isActive: true });
    if (!gameType) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    // Find or create stats
    let stats = await GameStats.findOne({
      userId,
      gameId,
    });

    if (!stats) {
      stats = new GameStats({
        userId,
        gameId,
        wins: 0,
        losses: 0,
        draws: 0,
        totalScore: 0,
      });
    }

    // Update stats based on result
    if (result === 'win') {
      stats.wins += 1;
    } else if (result === 'loss') {
      stats.losses += 1;
    } else if (result === 'draw') {
      stats.draws += 1;
    }

    // Update total score (can be customized per game)
    if (typeof score === 'number') {
      stats.totalScore += score;
    } else {
      // Default scoring: win = +10, loss = -5, draw = +2
      if (result === 'win') {
        stats.totalScore += 10;
      } else if (result === 'loss') {
        stats.totalScore = Math.max(0, stats.totalScore - 5);
      } else if (result === 'draw') {
        stats.totalScore += 2;
      }
    }

    // Update custom stats if provided
    if (customStats && typeof customStats === 'object') {
      for (const [key, value] of Object.entries(customStats)) {
        stats.customStats.set(key, value);
      }
    }

    stats.lastPlayed = new Date();
    await stats.save();

    // Create game session record for audit trail
    const { gameData, guestId } = req.body;
    await createSessionAfterSubmission(
      gameId,
      userId || null,
      guestId || null,
      result,
      stats.totalScore,
      gameData || {}
    );

    res.json({
      _id: stats._id,
      userId: stats.userId,
      gameId: stats.gameId,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      totalScore: stats.totalScore,
      customStats: Object.fromEntries(stats.customStats || new Map()),
      lastPlayed: stats.lastPlayed,
      updatedAt: stats.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

