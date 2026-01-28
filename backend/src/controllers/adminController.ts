import { Request, Response } from 'express';
import LuckyWheelConfig from '../models/LuckyWheelConfig';
import User from '../models/User';
import { IWheelItem } from '../models/LuckyWheelConfig';
import { getIO } from '../config/socket.io';

/**
 * List all users (authenticated and guests) who have lucky wheel configs
 */
export const listLuckyWheelUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    // Build query
    const query: any = {};
    
    // Filter: Only show active guests (lastActivityAt or updatedAt within 24 hours) or authenticated users
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    query.$or = [
      { userId: { $ne: null } }, // Authenticated users (always show)
      { 
        guestId: { $ne: null },
        $or: [
          { lastActivityAt: { $gte: twentyFourHoursAgo } }, // Has recent activity
          { 
            lastActivityAt: { $exists: false }, // Old configs without lastActivityAt
            updatedAt: { $gte: twentyFourHoursAgo } // Use updatedAt as fallback
          }
        ]
      }
    ];
    
    if (search) {
      // Add search conditions
      const searchConditions: any[] = [
        { guestName: { $regex: search, $options: 'i' } },
      ];
      // Also search by username if userId exists
      const users = await User.find({ username: { $regex: search, $options: 'i' } }).select('_id');
      const userIds = users.map(u => u._id);
      if (userIds.length > 0) {
        searchConditions.push({ userId: { $in: userIds } });
      }
      
      // Combine with existing $or conditions
      query.$and = [
        { $or: query.$or },
        { $or: searchConditions }
      ];
      delete query.$or; // Remove $or from root level
    }

    // Get configs with pagination
    const configs = await LuckyWheelConfig.find(query)
      .populate('userId', 'username email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await LuckyWheelConfig.countDocuments(query);

    // Format response
    const users = configs.map(config => {
      const user = config.userId as any;
      return {
        id: config.userId ? config.userId.toString() : config.guestId,
        userId: config.userId ? config.userId.toString() : null,
        guestId: config.guestId || null,
        username: user?.username || null,
        guestName: config.guestName || null,
        displayName: user?.username || config.guestName || 'Unknown',
        userType: config.userId ? 'authenticated' : 'guest',
        itemCount: config.items.length,
        lastUpdated: config.updatedAt,
        createdAt: config.createdAt,
      };
    });

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to list users' });
  }
};

/**
 * Get detailed config for a specific user (by userId or guestId)
 */
export const getUserConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId: paramUserId } = req.params;
    const guestId = req.query.guestId as string;

    if (!paramUserId && !guestId) {
      res.status(400).json({ message: 'Either userId or guestId must be provided' });
      return;
    }

    // Determine if paramUserId is a MongoDB ObjectId (authenticated user) or guestId
    // MongoDB ObjectId is 24 hex characters
    const isObjectId = paramUserId && /^[0-9a-fA-F]{24}$/.test(paramUserId);
    
    // If guestId is provided in query params, use it (for guest users)
    // Otherwise, if paramUserId is not an ObjectId, treat it as guestId
    // If paramUserId is an ObjectId, treat it as userId
    const query = guestId 
      ? { guestId }
      : isObjectId
      ? { userId: paramUserId }
      : { guestId: paramUserId };

    const config = await LuckyWheelConfig.findOne(query).populate('userId', 'username email');

    if (!config) {
      res.status(404).json({ message: 'Config not found' });
      return;
    }

    const user = config.userId as any;

    res.json({
      id: config.userId ? config.userId.toString() : config.guestId,
      userId: config.userId ? config.userId.toString() : null,
      guestId: config.guestId || null,
      username: user?.username || null,
      guestName: config.guestName || null,
      displayName: user?.username || config.guestName || 'Unknown',
      userType: config.userId ? 'authenticated' : 'guest',
      items: config.items,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to get user config' });
  }
};

/**
 * Update weights for a specific user's config
 */
export const updateUserConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId: paramUserId } = req.params;
    const { items, guestId: bodyGuestId } = req.body;
    const queryGuestId = req.query.guestId as string;
    const guestId = bodyGuestId || queryGuestId;

    if (!paramUserId && !guestId) {
      res.status(400).json({ message: 'Either userId or guestId must be provided' });
      return;
    }

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

    // Determine if paramUserId is a MongoDB ObjectId (authenticated user) or guestId
    const isObjectId = paramUserId && /^[0-9a-fA-F]{24}$/.test(paramUserId);
    
    // If guestId is provided, use it (for guest users)
    // Otherwise, if paramUserId is not an ObjectId, treat it as guestId
    // If paramUserId is an ObjectId, treat it as userId
    const query = guestId 
      ? { guestId }
      : isObjectId
      ? { userId: paramUserId }
      : { guestId: paramUserId };

    const config = await LuckyWheelConfig.findOne(query);

    if (!config) {
      res.status(404).json({ message: 'Config not found' });
      return;
    }

    // Update weights (keep labels, only update weights)
    // Match items by index or label
    const updatedItems = config.items.map((existingItem, index) => {
      const newItem = items[index];
      if (newItem && newItem.label === existingItem.label) {
        return {
          label: existingItem.label,
          weight: newItem.weight,
        };
      }
      return existingItem;
    });

    // If items array length changed, update all items
    if (items.length === config.items.length) {
      config.items = updatedItems;
    } else {
      // If admin changed the items array, update it completely
      config.items = items.map((item: IWheelItem) => ({
        label: item.label,
        weight: item.weight,
      }));
    }

    config.updatedAt = new Date();
    await config.save();

    // Emit realtime update to user's socket
    // User can be identified by either guestId or userId
    const targetId = config.guestId || config.userId?.toString();
    if (targetId) {
      getIO().emit('lucky-wheel-config-updated', {
        targetId,
        targetType: config.guestId ? 'guest' : 'user',
        items: config.items,
        updatedAt: config.updatedAt,
      });
    }

    res.json({
      message: 'Config updated successfully',
      config: {
        _id: config._id,
        userId: config.userId,
        guestId: config.guestId,
        guestName: config.guestName,
        items: config.items,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update config' });
  }
};
