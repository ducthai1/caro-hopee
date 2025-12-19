import { Request, Response } from 'express';
import GameStats from '../models/GameStats';
import GameType from '../models/GameType';
import Leaderboard from '../models/Leaderboard';
import User from '../models/User';
import { IRanking } from '../models/Leaderboard';

/**
 * Get leaderboard for a specific game
 * Supports daily, weekly, and all-time periods
 */
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId } = req.params;
    const period = (req.query.period as string) || 'all-time';
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!['daily', 'weekly', 'all-time'].includes(period)) {
      res.status(400).json({ message: 'Invalid period. Must be daily, weekly, or all-time' });
      return;
    }

    // Verify game exists
    const gameType = await GameType.findOne({ gameId, isActive: true });
    if (!gameType) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    let leaderboardData;

    if (period === 'all-time') {
      // Query directly from GameStats for all-time
      const stats = await GameStats.find({ gameId })
        .populate('userId', 'username')
        .sort({ totalScore: -1, wins: -1 })
        .limit(limit)
        .skip(offset);

      leaderboardData = stats.map((stat, index) => ({
        rank: offset + index + 1,
        userId: stat.userId,
        username: (stat.userId as any)?.username || 'Unknown',
        score: stat.totalScore,
        wins: stat.wins,
        losses: stat.losses,
        draws: stat.draws,
      }));
    } else {
      // For daily/weekly, try to get from cache first
      const periodStart = getPeriodStart(period);
      let leaderboard = await Leaderboard.findOne({
        gameId,
        period,
        periodStart,
      });

      if (!leaderboard || isPeriodExpired(period, leaderboard.updatedAt)) {
        // Rebuild leaderboard cache
        leaderboard = await rebuildLeaderboardCache(gameId, period, periodStart);
      }

      if (!leaderboard) {
        res.status(500).json({ message: 'Failed to load leaderboard' });
        return;
      }

      leaderboardData = leaderboard.rankings
        .slice(offset, offset + limit)
        .map((ranking) => ({
          rank: ranking.rank,
          userId: ranking.userId,
          score: ranking.score,
          wins: ranking.wins,
        }));

      // Populate usernames
      const userIds = leaderboardData.map((item) => item.userId);
      const users = await User.find({ _id: { $in: userIds } }).select('username');
      const userMap = new Map(users.map((u) => [u._id.toString(), u.username]));

      leaderboardData = leaderboardData.map((item) => ({
        ...item,
        username: userMap.get(item.userId.toString()) || 'Unknown',
      }));
    }

    res.json({
      gameId,
      period,
      rankings: leaderboardData,
      limit,
      offset,
      total: leaderboardData.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get user's rank for a specific game
 */
export const getUserRank = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId, userId } = req.params;
    const period = (req.query.period as string) || 'all-time';

    if (!['daily', 'weekly', 'all-time'].includes(period)) {
      res.status(400).json({ message: 'Invalid period. Must be daily, weekly, or all-time' });
      return;
    }

    // Verify game exists
    const gameType = await GameType.findOne({ gameId, isActive: true });
    if (!gameType) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    const userStats = await GameStats.findOne({ userId, gameId });
    if (!userStats) {
      res.json({
        rank: null,
        totalPlayers: 0,
        userStats: null,
      });
      return;
    }

    let rank: number | null;
    let totalPlayers: number;

    if (period === 'all-time') {
      // Count users with better stats
      rank = await GameStats.countDocuments({
        gameId,
        $or: [
          { totalScore: { $gt: userStats.totalScore } },
          { totalScore: userStats.totalScore, wins: { $gt: userStats.wins } },
        ],
      }) + 1;

      totalPlayers = await GameStats.countDocuments({ gameId });
    } else {
      // Get from cached leaderboard
      const periodStart = getPeriodStart(period);
      const leaderboard = await Leaderboard.findOne({
        gameId,
        period,
        periodStart,
      });

      if (!leaderboard) {
        // Rebuild cache
        const rebuiltLeaderboard = await rebuildLeaderboardCache(gameId, period, periodStart);
        if (!rebuiltLeaderboard) {
          res.status(500).json({ message: 'Failed to load leaderboard' });
          return;
        }
        const ranking = rebuiltLeaderboard.rankings.find(
          (r: IRanking) => r.userId.toString() === userId.toString()
        );
        rank = ranking?.rank || null;
        totalPlayers = rebuiltLeaderboard.rankings.length;
      } else {
        const ranking = leaderboard.rankings.find(
          (r: IRanking) => r.userId.toString() === userId.toString()
        );
        rank = ranking?.rank || null;
        totalPlayers = leaderboard.rankings.length;
      }
    }

    res.json({
      rank,
      totalPlayers,
      userStats: {
        wins: userStats.wins,
        losses: userStats.losses,
        draws: userStats.draws,
        totalScore: userStats.totalScore,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get players around a user's rank (+-5 players)
 */
export const getRankAroundUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { gameId, userId } = req.params;
    const period = (req.query.period as string) || 'all-time';
    const range = parseInt(req.query.range as string) || 5;

    if (!['daily', 'weekly', 'all-time'].includes(period)) {
      res.status(400).json({ message: 'Invalid period. Must be daily, weekly, or all-time' });
      return;
    }

    // Verify game exists
    const gameType = await GameType.findOne({ gameId, isActive: true });
    if (!gameType) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    const userStats = await GameStats.findOne({ userId, gameId });
    if (!userStats) {
      res.json({
        rankings: [],
        userRank: null,
      });
      return;
    }

    let rankings: any[];
    let userRank: number | null = null;

    if (period === 'all-time') {
      // Find user's rank
      userRank = await GameStats.countDocuments({
        gameId,
        $or: [
          { totalScore: { $gt: userStats.totalScore } },
          { totalScore: userStats.totalScore, wins: { $gt: userStats.wins } },
        ],
      }) + 1;

      // Get players around user's rank
      const startRank = Math.max(1, userRank - range);
      const endRank = userRank + range;

      const stats = await GameStats.find({ gameId })
        .populate('userId', 'username')
        .sort({ totalScore: -1, wins: -1 })
        .skip(startRank - 1)
        .limit(endRank - startRank + 1);

      rankings = stats.map((stat, index) => ({
        rank: startRank + index,
        userId: stat.userId,
        username: (stat.userId as any)?.username || 'Unknown',
        score: stat.totalScore,
        wins: stat.wins,
        isCurrentUser: stat.userId.toString() === userId,
      }));
    } else {
      // Get from cached leaderboard
      const periodStart = getPeriodStart(period);
      let leaderboard = await Leaderboard.findOne({
        gameId,
        period,
        periodStart,
      });

      if (!leaderboard || isPeriodExpired(period, leaderboard.updatedAt)) {
        leaderboard = await rebuildLeaderboardCache(gameId, period, periodStart);
      }

      if (!leaderboard) {
        res.status(500).json({ message: 'Failed to load leaderboard' });
        return;
      }

      const userRanking = leaderboard.rankings.find(
        (r: IRanking) => r.userId.toString() === userId.toString()
      );
      userRank = userRanking?.rank || null;

      if (userRank) {
        const startRank = Math.max(1, userRank - range);
        const endRank = Math.min(leaderboard.rankings.length, userRank + range);

        rankings = leaderboard.rankings
          .slice(startRank - 1, endRank)
          .map((ranking) => ({
            rank: ranking.rank,
            userId: ranking.userId,
            score: ranking.score,
            wins: ranking.wins,
            isCurrentUser: ranking.userId.toString() === userId,
          }));

        // Populate usernames
        const userIds = rankings.map((item) => item.userId);
        const users = await User.find({ _id: { $in: userIds } }).select('username');
        const userMap = new Map(users.map((u) => [u._id.toString(), u.username]));

        rankings = rankings.map((item) => ({
          ...item,
          username: userMap.get(item.userId.toString()) || 'Unknown',
        }));
      } else {
        rankings = [];
      }
    }

    res.json({
      rankings,
      userRank,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Helper functions

/**
 * Get period start date
 */
function getPeriodStart(period: string): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (period === 'daily') {
    return now;
  } else if (period === 'weekly') {
    // Start of week (Monday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(now.setDate(diff));
  } else {
    // All-time: use a very old date
    return new Date(0);
  }
}

/**
 * Check if period has expired and needs refresh
 */
function isPeriodExpired(period: string, lastUpdated: Date): boolean {
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

  if (period === 'daily') {
    return hoursSinceUpdate > 1; // Refresh if older than 1 hour
  } else if (period === 'weekly') {
    return hoursSinceUpdate > 6; // Refresh if older than 6 hours
  }
  return false;
}

/**
 * Rebuild leaderboard cache for a period
 */
async function rebuildLeaderboardCache(
  gameId: string,
  period: string,
  periodStart: Date
): Promise<any> {
  let query: any = { gameId };

  // Filter by period if not all-time
  if (period === 'daily') {
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 1);
    query.lastPlayed = { $gte: periodStart, $lt: periodEnd };
  } else if (period === 'weekly') {
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 7);
    query.lastPlayed = { $gte: periodStart, $lt: periodEnd };
  }

  const stats = await GameStats.find(query)
    .sort({ totalScore: -1, wins: -1 })
    .limit(1000); // Limit to top 1000

  const rankings = stats.map((stat, index) => ({
    userId: stat.userId,
    rank: index + 1,
    score: stat.totalScore,
    wins: stat.wins,
    updatedAt: new Date(),
  }));

  const periodEnd = period === 'all-time' ? null : getPeriodEnd(period, periodStart);

  // Update or create leaderboard
  const leaderboard = await Leaderboard.findOneAndUpdate(
    { gameId, period, periodStart },
    {
      gameId,
      period,
      periodStart,
      periodEnd,
      rankings,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return leaderboard;
}

/**
 * Get period end date
 */
function getPeriodEnd(period: string, periodStart: Date): Date {
  const end = new Date(periodStart);
  if (period === 'daily') {
    end.setDate(end.getDate() + 1);
  } else if (period === 'weekly') {
    end.setDate(end.getDate() + 7);
  }
  return end;
}

// Legacy function for backward compatibility
export const getTopPlayers = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const gameId = (req.query.gameId as string) || 'caro';

    const stats = await GameStats.find({ gameId })
      .populate('userId', 'username')
      .sort({ totalScore: -1, wins: -1 })
      .limit(limit);

    const players = stats.map((stat) => ({
      _id: (stat.userId as any)?._id,
      username: (stat.userId as any)?.username,
      wins: stat.wins,
      losses: stat.losses,
      draws: stat.draws,
      totalScore: stat.totalScore,
    }));

    res.json(players);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
