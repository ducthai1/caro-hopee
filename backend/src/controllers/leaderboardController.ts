import { Request, Response } from 'express';
import User from '../models/User';

export const getTopPlayers = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const players = await User.find()
      .select('-password')
      .sort({ totalScore: -1, wins: -1 })
      .limit(limit);

    res.json(players);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserRank = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const rank = await User.countDocuments({
      $or: [
        { totalScore: { $gt: user.totalScore } },
        { totalScore: user.totalScore, wins: { $gt: user.wins } },
      ],
    }) + 1;

    res.json({ rank, user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

