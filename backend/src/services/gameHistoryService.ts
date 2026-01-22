import { IGame } from '../models/Game';
import GameHistory from '../models/GameHistory';
import mongoose from 'mongoose';

/**
 * Save game history immediately when game finishes
 * This ensures history is saved right away, not waiting for players to leave
 */
export const saveGameHistoryIfFinished = async (game: IGame): Promise<boolean> => {
  try {
    console.log(`[saveGameHistoryIfFinished] Called for roomId: ${game.roomId}, gameStatus: ${game.gameStatus}, finishedAt: ${game.finishedAt}`);
    
    // Only save if game is finished
    if (game.gameStatus !== 'finished' || !game.finishedAt) {
      console.log(`[saveGameHistoryIfFinished] Game not finished, skipping. gameStatus: ${game.gameStatus}, finishedAt: ${game.finishedAt}`);
      return false;
    }

    // Check if history already exists
    const existingHistory = await GameHistory.findOne({ roomId: game.roomId });
    if (existingHistory) {
      console.log(`[saveGameHistoryIfFinished] History already exists for roomId: ${game.roomId}`);
      return true; // History already saved
    }

    // Only save to database if at least one player is authenticated
    // Guest history is handled on frontend with localStorage
    const hasAuthenticatedPlayer = !!(game.player1 || game.player2);
    
    console.log(`[saveGameHistoryIfFinished] Checking players - player1: ${game.player1}, player2: ${game.player2}, hasAuthenticatedPlayer: ${hasAuthenticatedPlayer}`);
    
    if (!hasAuthenticatedPlayer) {
      console.log(`[saveGameHistoryIfFinished] No authenticated players for roomId: ${game.roomId}, skipping database save (guest history handled on frontend)`);
      return false; // Guest history handled on frontend
    }

    // Ensure player1 and player2 are ObjectId (not populated objects)
    let player1Id: mongoose.Types.ObjectId | null = null;
    let player2Id: mongoose.Types.ObjectId | null = null;
    
    if (game.player1) {
      // If player1 is already an ObjectId, use it; if it's a populated object, get the _id
      if (game.player1 instanceof mongoose.Types.ObjectId) {
        player1Id = game.player1;
      } else if (typeof game.player1 === 'object' && (game.player1 as any)._id) {
        player1Id = (game.player1 as any)._id;
      } else if (typeof game.player1 === 'string') {
        player1Id = new mongoose.Types.ObjectId(game.player1);
      }
    }
    
    if (game.player2) {
      // If player2 is already an ObjectId, use it; if it's a populated object, get the _id
      if (game.player2 instanceof mongoose.Types.ObjectId) {
        player2Id = game.player2;
      } else if (typeof game.player2 === 'object' && (game.player2 as any)._id) {
        player2Id = (game.player2 as any)._id;
      } else if (typeof game.player2 === 'string') {
        player2Id = new mongoose.Types.ObjectId(game.player2);
      }
    }

    console.log(`[saveGameHistoryIfFinished] Saving history with player1Id: ${player1Id?.toString()}, player2Id: ${player2Id?.toString()}`);

    // Save history to database
    const historyRecord = new GameHistory({
      originalGameId: game._id.toString(),
      roomId: game.roomId,
      roomCode: game.roomCode,
      gameType: game.gameType,
      player1: player1Id, // Ensure it's ObjectId
      player2: player2Id, // Ensure it's ObjectId
      player1GuestId: null, // Don't save guest IDs to database
      player2GuestId: null,
      boardSize: game.boardSize,
      board: game.board,
      winner: game.winner,
      winningLine: (game as any).winningLine,
      score: game.score,
      rules: game.rules,
      finishedAt: game.finishedAt,
      createdAt: game.createdAt,
      savedAt: new Date(),
    });

    await historyRecord.save();
    console.log(`[saveGameHistoryIfFinished] History saved immediately for roomId: ${game.roomId}, player1: ${game.player1}, player2: ${game.player2}`);

    // FIX HIGH-2: Run cleanup in background (non-blocking) to not block game finish events
    // Using setImmediate to defer cleanup to next event loop iteration
    setImmediate(() => {
      cleanupOldHistory(game.player1, null, game.player2, null).catch(err => {
        console.error('[saveGameHistoryIfFinished] Background cleanup error:', err);
      });
    });

    return true;
  } catch (error: any) {
    console.error(`[saveGameHistoryIfFinished] Error saving history for roomId: ${game.roomId}:`, error.message);
    return false;
  }
};

/**
 * Clean up old history records - keep only last 50 for each player
 */
const cleanupOldHistory = async (
  player1: mongoose.Types.ObjectId | null,
  player1GuestId: string | null,
  player2: mongoose.Types.ObjectId | null,
  player2GuestId: string | null
): Promise<void> => {
  try {
    // Only cleanup for authenticated users (not guests)
    // Guest history is handled on frontend with localStorage
    
    // Clean up for player1 (authenticated only)
    if (player1) {
      const player1History = await GameHistory.find({ player1 })
        .sort({ finishedAt: -1 })
        .select('_id')
        .lean();
      // Keep last 50 games for authenticated users
      if (player1History.length > 50) {
        const idsToDelete = player1History.slice(50).map(h => h._id);
        await GameHistory.deleteMany({ _id: { $in: idsToDelete } });
      }
    }
    
    // Clean up for player2 (authenticated only)
    if (player2) {
      const player2History = await GameHistory.find({ player2 })
        .sort({ finishedAt: -1 })
        .select('_id')
        .lean();
      // Keep last 50 games for authenticated users
      if (player2History.length > 50) {
        const idsToDelete = player2History.slice(50).map(h => h._id);
        await GameHistory.deleteMany({ _id: { $in: idsToDelete } });
      }
    }
  } catch (error: any) {
    console.error('[cleanupOldHistory] Error cleaning up old history:', error);
    // Don't throw - this is cleanup, shouldn't block the main operation
  }
};
