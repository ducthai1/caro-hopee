/**
 * Initialize game types in database
 * Run this once after deploying new models
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import GameType from '../models/GameType';

dotenv.config();

const initGameTypes = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const gameTypes = [
      {
        gameId: 'caro',
        name: 'Caro',
        description: 'Classic strategy game',
        isActive: true,
      },
      // Add more games here in the future
    ];

    for (const gameTypeData of gameTypes) {
      const existing = await GameType.findOne({ gameId: gameTypeData.gameId });
      if (!existing) {
        const gameType = new GameType(gameTypeData);
        await gameType.save();
        console.log(`Created game type: ${gameTypeData.gameId}`);
      } else {
        console.log(`Game type already exists: ${gameTypeData.gameId}`);
      }
    }

    console.log('\nGame types initialization complete!');
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  initGameTypes()
    .then(() => {
      console.log('Initialization script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Initialization script failed:', error);
      process.exit(1);
    });
}

export default initGameTypes;

