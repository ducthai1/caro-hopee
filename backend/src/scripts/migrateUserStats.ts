/**
 * Migration script to move user stats from User model to GameStats model
 * Run this once after deploying new models
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import GameStats from '../models/GameStats';
import GameType from '../models/GameType';

dotenv.config();

const migrateUserStats = async (): Promise<void> => {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Ensure 'caro' game type exists
    let caroGameType = await GameType.findOne({ gameId: 'caro' });
    if (!caroGameType) {
      caroGameType = new GameType({
        gameId: 'caro',
        name: 'Caro',
        description: 'Classic strategy game',
        isActive: true,
      });
      await caroGameType.save();
      console.log('Created caro game type');
    }

    // Get all users with stats
    const users = await User.find({
      $or: [
        { wins: { $gt: 0 } },
        { losses: { $gt: 0 } },
        { draws: { $gt: 0 } },
        { totalScore: { $gt: 0 } },
      ],
    });

    console.log(`Found ${users.length} users with stats to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const user of users) {
      // Check if GameStats already exists for this user and game
      const existingStats = await GameStats.findOne({
        userId: user._id,
        gameId: 'caro',
      });

      if (existingStats) {
        console.log(`Skipping user ${user.username} - stats already exist`);
        skipped++;
        continue;
      }

      // Create GameStats from User stats
      const gameStats = new GameStats({
        userId: user._id,
        gameId: 'caro',
        wins: user.wins || 0,
        losses: user.losses || 0,
        draws: user.draws || 0,
        totalScore: user.totalScore || 0,
        lastPlayed: user.lastLogin || new Date(),
      });

      await gameStats.save();
      migrated++;
      console.log(`Migrated stats for user ${user.username}`);
    }

    console.log(`\nMigration complete!`);
    console.log(`Migrated: ${migrated} users`);
    console.log(`Skipped: ${skipped} users`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateUserStats()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateUserStats;

