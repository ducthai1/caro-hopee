import { Request, Response } from 'express';
import User from '../models/User';
import GameStats from '../models/GameStats';
import GameType from '../models/GameType';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * Get user profile
 */
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      // Legacy fields for backward compatibility
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      totalScore: user.totalScore,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all game stats for a user
 */
export const getUserGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const stats = await GameStats.find({ userId })
      .populate('userId', 'username')
      .sort({ lastPlayed: -1 });

    // Get game type info
    const gameIds = [...new Set(stats.map((s) => s.gameId))];
    const gameTypes = await GameType.find({ gameId: { $in: gameIds } });

    const gameMap = new Map(gameTypes.map((gt) => [gt.gameId, gt]));

    const gameStats = stats.map((stat) => ({
      _id: stat._id,
      gameId: stat.gameId,
      gameName: gameMap.get(stat.gameId)?.name || stat.gameId,
      wins: stat.wins,
      losses: stat.losses,
      draws: stat.draws,
      totalScore: stat.totalScore,
      customStats: Object.fromEntries(stat.customStats || new Map()),
      lastPlayed: stat.lastPlayed,
      createdAt: stat.createdAt,
      updatedAt: stat.updatedAt,
    }));

    res.json({
      userId,
      games: gameStats,
      totalGames: gameStats.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get user stats for a specific game
 */
export const getUserGameStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, gameId } = req.params;

    // Verify game exists
    const gameType = await GameType.findOne({ gameId, isActive: true });
    if (!gameType) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    const stats = await GameStats.findOne({ userId, gameId });

    if (!stats) {
      res.json({
        userId,
        gameId,
        gameName: gameType.name,
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
      gameName: gameType.name,
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
 * Get current user's profile
 */
export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      // Legacy fields for backward compatibility
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      totalScore: user.totalScore,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
