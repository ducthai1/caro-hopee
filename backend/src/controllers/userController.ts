import { Request, Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    if (req.user?.userId !== userId) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

