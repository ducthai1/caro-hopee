/**
 * Game Cleanup Service
 * Automatically deletes inactive game rooms (Caro, Xi Dach, Word Chain) after 24 hours of inactivity
 */
import Game from '../models/Game';
import XiDachSession from '../models/XiDachSession';
import WordChainGame from '../models/WordChainGame';
import { io } from '../server';

const INACTIVE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Delete Caro game rooms inactive for more than 24 hours
 * Any room without activity for 24h is considered dead/buggy
 */
export const cleanupInactiveCaroGames = async (): Promise<number> => {
  try {
    const cutoffDate = new Date(Date.now() - INACTIVE_THRESHOLD_MS);
    const result = await Game.deleteMany({ updatedAt: { $lt: cutoffDate } });
    return result.deletedCount || 0;
  } catch (error) {
    console.error('[GameCleanup] Error cleaning up Caro games:', error);
    return 0;
  }
};

/**
 * Delete Xi Dach sessions inactive for more than 24 hours
 * Any session without activity for 24h is considered dead/buggy
 */
export const cleanupInactiveXiDachSessions = async (): Promise<number> => {
  try {
    const cutoffDate = new Date(Date.now() - INACTIVE_THRESHOLD_MS);

    // Find sessions to delete (for socket notification)
    const sessionsToDelete = await XiDachSession.find({
      updatedAt: { $lt: cutoffDate },
    }).select('sessionCode');

    if (sessionsToDelete.length === 0) {
      return 0;
    }

    // Notify connected clients about deletions
    for (const session of sessionsToDelete) {
      io.emit('xi-dach-session-deleted', {
        sessionCode: session.sessionCode,
        reason: 'inactive',
      });
    }

    const result = await XiDachSession.deleteMany({ updatedAt: { $lt: cutoffDate } });
    return result.deletedCount || 0;
  } catch (error) {
    console.error('[GameCleanup] Error cleaning up Xi Dach sessions:', error);
    return 0;
  }
};

/**
 * Cleanup Word Chain games inactive for more than 24 hours
 * Also marks stale 'waiting'/'playing' rooms as 'abandoned' after 30 min
 */
export const cleanupInactiveWordChainGames = async (): Promise<number> => {
  try {
    const cutoffDate = new Date(Date.now() - INACTIVE_THRESHOLD_MS);
    const staleCutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 min

    // Mark stale waiting/playing rooms as abandoned (30 min inactive)
    await WordChainGame.updateMany(
      {
        gameStatus: { $in: ['waiting', 'playing'] },
        updatedAt: { $lt: staleCutoff },
      },
      { $set: { gameStatus: 'abandoned' } }
    );

    // Delete games inactive > 24h (finished/abandoned)
    const result = await WordChainGame.deleteMany({ updatedAt: { $lt: cutoffDate } });
    return result.deletedCount || 0;
  } catch (error) {
    console.error('[GameCleanup] Error cleaning up Word Chain games:', error);
    return 0;
  }
};

/**
 * Run all game cleanup tasks
 */
export const cleanupAllInactiveGames = async (): Promise<void> => {
  const caroCount = await cleanupInactiveCaroGames();
  const xiDachCount = await cleanupInactiveXiDachSessions();
  const wordChainCount = await cleanupInactiveWordChainGames();

  if (caroCount > 0 || xiDachCount > 0 || wordChainCount > 0) {
    console.log(`[GameCleanup] Deleted ${caroCount} Caro, ${xiDachCount} Xi Dach, ${wordChainCount} Word Chain (inactive > 24h)`);
  }
};
