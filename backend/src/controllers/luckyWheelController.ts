import { Request, Response } from 'express';
import LuckyWheelConfig, { IWheelItem } from '../models/LuckyWheelConfig';
import { AuthRequest } from '../middleware/authMiddleware';

// Default items nếu user chưa có config
const defaultItems: IWheelItem[] = [
  { label: 'Nhất 🏆', weight: 1 },
  { label: 'Nhì 🥈', weight: 0 },
  { label: 'Ba 🥉', weight: 0 },
  { label: 'Jackpot 💎', weight: 0 },
  { label: 'Bonus 💰', weight: 0 },
  { label: 'Chúc may mắn 🍀', weight: 0 },
  { label: 'Thử lại 🔄', weight: 0 },
  { label: 'Khuyến khích 🎖️', weight: 0 },
];

interface SaveConfigRequest extends Request {
  body: {
    items: IWheelItem[];
    guestId?: string;
    guestName?: string;
  };
}

/**
 * Save lucky wheel config for current user (authenticated or guest)
 */
export const saveConfig = async (req: SaveConfigRequest, res: Response): Promise<void> => {
  try {
    const { items, guestId, guestName } = req.body;
    const authReq = req as AuthRequest;

    // Validate items
    if (!Array.isArray(items) || items.length < 2 || items.length > 12) {
      res.status(400).json({ message: 'Items must be an array with 2-12 items' });
      return;
    }

    // Validate each item
    for (const item of items) {
      if (!item.label || typeof item.label !== 'string' || item.label.trim().length === 0) {
        res.status(400).json({ message: 'Each item must have a valid label' });
        return;
      }
      if (typeof item.weight !== 'number' || item.weight < 0 || item.weight > 100) {
        res.status(400).json({ message: 'Each item weight must be between 0 and 100' });
        return;
      }
    }

    // Determine if authenticated or guest
    const userId = authReq.user?.userId;
    const finalGuestId = guestId || (userId ? undefined : req.body.guestId);

    if (!userId && !finalGuestId) {
      res.status(400).json({ message: 'Either userId (authenticated) or guestId must be provided' });
      return;
    }

    // Find existing config
    const query = userId 
      ? { userId }
      : { guestId: finalGuestId };

    const existingConfig = await LuckyWheelConfig.findOne(query);

    if (existingConfig) {
      // Update existing config
      existingConfig.items = items;
      if (finalGuestId && guestName) {
        existingConfig.guestId = finalGuestId;
        existingConfig.guestName = guestName;
      }
      existingConfig.updatedAt = new Date();
      existingConfig.lastActivityAt = new Date();
      await existingConfig.save();
      res.json({
        message: 'Config updated successfully',
        config: existingConfig,
      });
    } else {
      // Create new config
      const newConfig = new LuckyWheelConfig({
        userId: userId || undefined,
        guestId: finalGuestId || undefined,
        guestName: guestName || undefined,
        items,
      });
      await newConfig.save();
      res.status(201).json({
        message: 'Config saved successfully',
        config: newConfig,
      });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to save config' });
  }
};

/**
 * Get lucky wheel config for current user (authenticated or guest)
 */
export const getMyConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const guestId = req.query.guestId as string;

    if (!userId && !guestId) {
      // Return default config if no user/guest
      res.json({
        config: null,
        items: defaultItems,
        isDefault: true,
      });
      return;
    }

    const query = userId 
      ? { userId }
      : { guestId };

    const config = await LuckyWheelConfig.findOne(query);

    if (!config) {
      // Return default if no config found
      res.json({
        config: null,
        items: defaultItems,
        isDefault: true,
      });
      return;
    }

    // Update lastActivityAt when config is accessed (for guest users)
    if (config.guestId) {
      config.lastActivityAt = new Date();
      await config.save();
    }

    res.json({
      config: {
        _id: config._id,
        userId: config.userId,
        guestId: config.guestId,
        guestName: config.guestName,
        items: config.items,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
      items: config.items,
      isDefault: false,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to get config' });
  }
};

/**
 * Delete guest config (called when tab closes)
 */
export const deleteGuestConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { guestId } = req.body;

    if (!guestId) {
      res.status(400).json({ message: 'guestId is required' });
      return;
    }

    const result = await LuckyWheelConfig.deleteOne({ guestId });

    if (result.deletedCount === 0) {
      res.status(404).json({ message: 'Config not found' });
      return;
    }

    res.json({ message: 'Config deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete config' });
  }
};

/**
 * Update last activity time for guest config
 */
export const updateActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const guestId = req.body.guestId || req.query.guestId as string;

    if (!userId && !guestId) {
      res.status(400).json({ message: 'Either userId or guestId is required' });
      return;
    }

    const query = userId 
      ? { userId }
      : { guestId };

    const config = await LuckyWheelConfig.findOne(query);
    
    if (config) {
      config.lastActivityAt = new Date();
      await config.save();
      res.json({ message: 'Activity updated successfully' });
    } else {
      res.status(404).json({ message: 'Config not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update activity' });
  }
};

/**
 * Cleanup inactive guest configs (24 hours without activity)
 */
export const cleanupInactiveGuests = async (): Promise<number> => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await LuckyWheelConfig.deleteMany({
      guestId: { $ne: null },
      lastActivityAt: { $lt: twentyFourHoursAgo },
    });
    return result.deletedCount;
  } catch (error: any) {
    console.error('Error cleaning up inactive guest configs:', error);
    return 0;
  }
};

/**
 * Get config for a specific user (admin only)
 */
export const getUserConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ message: 'UserId is required' });
      return;
    }

    const config = await LuckyWheelConfig.findOne({ userId });

    if (!config) {
      res.status(404).json({ message: 'Config not found for this user' });
      return;
    }

    res.json({
      config: {
        _id: config._id,
        userId: config.userId,
        guestId: config.guestId,
        guestName: config.guestName,
        items: config.items,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
      items: config.items,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to get user config' });
  }
};
