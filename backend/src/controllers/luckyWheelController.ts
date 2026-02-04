import { Request, Response } from 'express';
import mongoose from 'mongoose';
import LuckyWheelConfig, { IWheelItem } from '../models/LuckyWheelConfig';
import { AuthRequest } from '../middleware/authMiddleware';

// Default items nếu user chưa có config
// Tất cả weight = 1 để xác suất bằng nhau (random ngẫu nhiên)
const defaultItems: IWheelItem[] = [
  { label: 'Giải 1 🎁', weight: 1 },
  { label: 'Giải 2 🎁', weight: 1 },
  { label: 'Giải 3 🎁', weight: 1 },
  { label: 'Giải 4 🎁', weight: 1 },
  { label: 'Giải 5 🎁', weight: 1 },
  { label: 'Giải 6 🎁', weight: 1 },
  { label: 'Giải 7 🎁', weight: 1 },
  { label: 'Giải 8 🎁', weight: 1 },
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

    // Emit socket event to notify admin that guest has left
    try {
      const { getIO } = require('../config/socket.io');
      getIO().emit('lucky-wheel-guest-left', { guestId });
    } catch {
      // Socket not initialized yet, ignore
    }

    res.json({ message: 'Config deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete config' });
  }
};

// Maximum number of guest configs allowed
const MAX_GUEST_CONFIGS = 10;

/**
 * Update last activity time for guest config
 * Creates new config with default items if not exists (upsert)
 * Auto-cleanup: keeps only MAX_GUEST_CONFIGS most recent guest configs
 */
export const updateActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const guestId = req.body.guestId || req.query.guestId as string;
    const guestName = req.body.guestName as string | undefined;

    if (!userId && !guestId) {
      res.status(400).json({ message: 'Either userId or guestId is required' });
      return;
    }

    const query = userId
      ? { userId }
      : { guestId };

    // Use findOneAndUpdate with upsert to create config if not exists
    const updateData: any = {
      lastActivityAt: new Date(),
    };

    // Set default items only when creating new config (using $setOnInsert)
    const config = await LuckyWheelConfig.findOneAndUpdate(
      query,
      {
        $set: updateData,
        $setOnInsert: {
          items: defaultItems,
          ...(guestId && { guestId }),
          ...(guestName && { guestName }),
          ...(userId && { userId }),
        },
      },
      { upsert: true, new: true }
    );

    // Auto-cleanup: If this is a guest config, ensure max 10 guest configs exist
    // Delete oldest ones if exceeded (non-blocking, run in background)
    if (guestId) {
      setImmediate(async () => {
        try {
          await enforceMaxGuestConfigs();
        } catch (err) {
          console.error('[updateActivity] Background cleanup error:', err);
        }
      });
    }

    res.json({
      message: config ? 'Activity updated successfully' : 'Config created',
      isNew: !config?.createdAt || (Date.now() - config.createdAt.getTime() < 1000),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update activity' });
  }
};

/**
 * Enforce maximum guest configs limit
 * Deletes oldest guest configs when count exceeds MAX_GUEST_CONFIGS
 */
const enforceMaxGuestConfigs = async (): Promise<number> => {
  try {
    // Count guest configs
    const guestCount = await LuckyWheelConfig.countDocuments({ guestId: { $ne: null } });

    if (guestCount <= MAX_GUEST_CONFIGS) {
      return 0;
    }

    // Find oldest guest configs to delete
    const excessCount = guestCount - MAX_GUEST_CONFIGS;
    const oldestConfigs = await LuckyWheelConfig.find({ guestId: { $ne: null } })
      .sort({ lastActivityAt: 1, createdAt: 1 }) // Oldest first
      .limit(excessCount)
      .select('_id guestId');

    if (oldestConfigs.length === 0) {
      return 0;
    }

    // Delete oldest configs
    const idsToDelete = oldestConfigs.map(c => c._id);
    const result = await LuckyWheelConfig.deleteMany({ _id: { $in: idsToDelete } });

    // Emit socket events for deleted guests
    try {
      const { getIO } = require('../config/socket.io');
      oldestConfigs.forEach(config => {
        if (config.guestId) {
          getIO().emit('lucky-wheel-guest-left', { guestId: config.guestId });
        }
      });
    } catch {
      // Socket not initialized yet, ignore
    }

    console.log(`[enforceMaxGuestConfigs] Deleted ${result.deletedCount} old guest configs`);
    return result.deletedCount;
  } catch (error: any) {
    console.error('[enforceMaxGuestConfigs] Error:', error);
    return 0;
  }
};

/**
 * Cleanup inactive guest configs (24 hours without activity).
 * Skips if DB is disconnected; swallows connection/timeout errors to avoid noise.
 */
export const cleanupInactiveGuests = async (): Promise<number> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return 0;
    }
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await LuckyWheelConfig.deleteMany({
      guestId: { $ne: null },
      lastActivityAt: { $lt: twentyFourHoursAgo },
    });
    return result.deletedCount;
  } catch (error: any) {
    const name = error?.name || '';
    const isConnectionError =
      name === 'MongoNetworkTimeoutError' ||
      name === 'MongoPoolClearedError' ||
      name === 'MongoServerSelectionError' ||
      (error?.message && typeof error.message === 'string' && error.message.includes('timed out'));
    if (isConnectionError) {
      return 0;
    }
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
