import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Game from '../models/Game';
import GameHistory from '../models/GameHistory';
import { initializeBoard, generateRoomCode } from '../services/gameEngine';
import { AuthRequest } from '../middleware/authMiddleware';
import { io } from '../server';
import User from '../models/User';

export const createGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { boardSize = 15, rules = {}, guestId, guestName } = req.body;
    const authReq = req as AuthRequest;
    
    // Try to get user from token (optional auth - allow both authenticated and guest)
    let userId: string | null = null;
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const { verifyToken } = await import('../utils/jwt');
        const decoded = verifyToken(token);
        userId = decoded.userId;
      }
    } catch (error) {
      // Token invalid or not provided - continue as guest
    }
    
    // Use userId from token or from authReq.user (fallback)
    const finalUserId = userId || authReq.user?.userId || null;

    const roomId = uuidv4();
    const roomCode = await generateRoomCode();
    const board = initializeBoard(boardSize);

    const game = new Game({
      roomId,
      roomCode,
      gameType: 'caro', // Set game type
      player1: finalUserId ? (finalUserId as any) : null,
      player1GuestId: finalUserId ? null : guestId || null,
      player1GuestName: finalUserId ? null : (guestName || null),
      boardSize,
      board,
      rules: {
        blockTwoEnds: rules.blockTwoEnds || false,
        allowUndo: rules.allowUndo !== undefined ? rules.allowUndo : true,
        maxUndoPerGame: rules.maxUndoPerGame || 3,
        timeLimit: rules.timeLimit || null,
      },
      gameStatus: 'waiting',
    });

    await game.save();

    // Emit socket event to notify all users in lobby about new game
    // Get player1 username for the event
    let player1Username: string | null = null;
    if (finalUserId) {
      const user1 = await User.findById(finalUserId).select('username').lean();
      player1Username = user1?.username || 'Player 1';
    } else if (guestId) {
      player1Username = guestName || `Guest ${guestId.slice(-6)}`;
    }

    io.emit('game-created', {
      roomId: game.roomId,
      roomCode: game.roomCode,
      boardSize: game.boardSize,
      gameStatus: game.gameStatus,
      player1Username,
      createdAt: game.createdAt.toISOString(),
    });

    res.status(201).json({
      _id: game._id.toString(),
      roomId: game.roomId,
      roomCode: game.roomCode,
      player1: game.player1?.toString() || null,
      player2: game.player2?.toString() || null,
      player1GuestId: game.player1GuestId,
      player2GuestId: game.player2GuestId,
      player1GuestName: game.player1GuestName,
      player2GuestName: game.player2GuestName,
      player1Marker: game.player1Marker,
      player2Marker: game.player2Marker,
      boardSize: game.boardSize,
      board: game.board,
      currentPlayer: game.currentPlayer,
      gameStatus: game.gameStatus,
      winner: game.winner,
      rules: game.rules,
      score: game.score,
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
      finishedAt: game.finishedAt?.toISOString() || null,
    });
  } catch (error: any) {
    console.error('[createGame] Error:', error.message);
    res.status(500).json({
      message: error.message || 'Failed to create game',
    });
  }
};

export const getGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const game = await Game.findOne({ roomId })
      .populate('player1', 'username')
      .populate('player2', 'username');

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    res.json({
      _id: game._id.toString(),
      roomId: game.roomId,
      roomCode: game.roomCode,
      player1: game.player1?.toString() || null,
      player2: game.player2?.toString() || null,
      player1GuestId: game.player1GuestId,
      player2GuestId: game.player2GuestId,
      player1GuestName: game.player1GuestName,
      player2GuestName: game.player2GuestName,
      player1Marker: game.player1Marker,
      player2Marker: game.player2Marker,
      boardSize: game.boardSize,
      board: game.board,
      currentPlayer: game.currentPlayer,
      gameStatus: game.gameStatus,
      winner: game.winner,
      rules: game.rules,
      score: game.score,
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
      finishedAt: game.finishedAt?.toISOString() || null,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getGameByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomCode } = req.params;
    const game = await Game.findOne({ roomCode: roomCode.toUpperCase() })
      .populate('player1', 'username')
      .populate('player2', 'username');

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    res.json({
      _id: game._id.toString(),
      roomId: game.roomId,
      roomCode: game.roomCode,
      player1: game.player1?.toString() || null,
      player2: game.player2?.toString() || null,
      player1GuestId: game.player1GuestId,
      player2GuestId: game.player2GuestId,
      player1GuestName: game.player1GuestName,
      player2GuestName: game.player2GuestName,
      player1Marker: game.player1Marker,
      player2Marker: game.player2Marker,
      boardSize: game.boardSize,
      board: game.board,
      currentPlayer: game.currentPlayer,
      gameStatus: game.gameStatus,
      winner: game.winner,
      rules: game.rules,
      score: game.score,
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
      finishedAt: game.finishedAt?.toISOString() || null,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const joinGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { guestId, guestName, password } = req.body;
    const authReq = req as AuthRequest;
    
    // Try to get user from token (optional auth - allow both authenticated and guest)
    let userId: string | null = null;
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const { verifyToken } = await import('../utils/jwt');
        const decoded = verifyToken(token);
        userId = decoded.userId;
      }
    } catch (error) {
      // Token invalid or not provided - continue as guest
    }
    
    // Use userId from token or from authReq.user (fallback)
    const finalUserId = userId || authReq.user?.userId || null;

    // Fetch game with password field
    const game = await Game.findOne({ roomId }).select('+password');

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    // Check if game is playing - cannot join
    if (game.gameStatus === 'playing') {
      res.status(400).json({ message: 'Game is already in progress and cannot be joined' });
      return;
    }

    if (game.gameStatus !== 'waiting') {
      res.status(400).json({ message: 'Game is not available for joining' });
      return;
    }

    // Check if user is already in the game
    const userIdToCheck = finalUserId;
    const isPlayer1 = userIdToCheck 
      ? game.player1 && game.player1.toString() === userIdToCheck.toString()
      : game.player1GuestId === guestId;
    const isPlayer2 = userIdToCheck
      ? game.player2 && game.player2.toString() === userIdToCheck.toString()
      : game.player2GuestId === guestId;

    if (isPlayer1 || isPlayer2) {
      res.json({
        _id: game._id.toString(),
        roomId: game.roomId,
        roomCode: game.roomCode,
        player1: game.player1?.toString() || null,
        player2: game.player2?.toString() || null,
        player1GuestId: game.player1GuestId,
        player2GuestId: game.player2GuestId,
        player1GuestName: game.player1GuestName,
        player2GuestName: game.player2GuestName,
        player1Marker: game.player1Marker,
        player2Marker: game.player2Marker,
        boardSize: game.boardSize,
        board: game.board,
        currentPlayer: game.currentPlayer,
        gameStatus: game.gameStatus,
        winner: game.winner,
        rules: game.rules,
        score: game.score,
        createdAt: game.createdAt.toISOString(),
        updatedAt: game.updatedAt.toISOString(),
        finishedAt: game.finishedAt?.toISOString() || null,
      });
      return;
    }
    
    // Check if game is full (has both players) - cannot join
    const hasPlayer1 = !!(game.player1 || game.player1GuestId);
    const hasPlayer2 = !!(game.player2 || game.player2GuestId);
    
    if (hasPlayer1 && hasPlayer2) {
      res.status(400).json({ message: 'Game is full (2/2 players). Please wait for the game to start or find another game.' });
      return;
    }

    // CRITICAL: Check password if game has password (only for new players joining, not for existing players)
    if (game.password && !isPlayer1 && !isPlayer2) {
      if (!password) {
        res.status(401).json({ message: 'Password required to join this game', requiresPassword: true });
        return;
      }
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, game.password);
      if (!isPasswordValid) {
        res.status(401).json({ message: 'Incorrect password', requiresPassword: true });
        return;
      }
    }

    // Join as player2
    if (!game.player2 && !game.player2GuestId) {
      if (userIdToCheck) {
        game.player2 = userIdToCheck as any;
        game.player2GuestId = null; // Clear guestId if joining as authenticated user
        game.player2GuestName = null; // Clear guestName if joining as authenticated user
    } else {
        game.player2GuestId = guestId || null;
        game.player2GuestName = guestName || null;
      }
    }

    await game.save();

    // Emit socket event to room
    const user2 = userIdToCheck ? await User.findById(userIdToCheck).select('username').lean() : null;
    io.to(roomId).emit('player-joined', {
      player: {
        id: userIdToCheck || guestId || '',
        username: userIdToCheck 
          ? (user2?.username || 'Player 2') 
          : (guestName || `Guest ${guestId?.slice(-6) || ''}`),
        isGuest: !userIdToCheck,
        playerNumber: 2,
      },
    });

    // Emit socket event to lobby about game status update
    // Recalculate after save (game state may have changed)
    const hasPlayer1After = !!(game.player1 || game.player1GuestId);
    const hasPlayer2After = !!(game.player2 || game.player2GuestId);
    const playerCount = (hasPlayer1After ? 1 : 0) + (hasPlayer2After ? 1 : 0);
    const isFull = hasPlayer1After && hasPlayer2After;
    
    // After join, gameStatus is still 'waiting' (game hasn't started yet)
    // But check it anyway for type safety
    const currentGameStatus = game.gameStatus as string;
    let displayStatus: 'waiting' | 'ready' | 'playing';
    if (currentGameStatus === 'playing') {
      displayStatus = 'playing';
    } else if (isFull) {
      displayStatus = 'ready';
    } else {
      displayStatus = 'waiting';
    }

    io.emit('game-status-updated', {
      roomId: game.roomId,
      roomCode: game.roomCode,
      gameStatus: game.gameStatus,
      displayStatus,
      playerCount,
      isFull,
    });
    
    res.json({
      _id: game._id.toString(),
      roomId: game.roomId,
      roomCode: game.roomCode,
      player1: game.player1?.toString() || null,
      player2: game.player2?.toString() || null,
      player1GuestId: game.player1GuestId,
      player2GuestId: game.player2GuestId,
      player1GuestName: game.player1GuestName,
      player2GuestName: game.player2GuestName,
      player1Marker: game.player1Marker,
      player2Marker: game.player2Marker,
      boardSize: game.boardSize,
      board: game.board,
      currentPlayer: game.currentPlayer,
      gameStatus: game.gameStatus,
      winner: game.winner,
      rules: game.rules,
      score: game.score,
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
      finishedAt: game.finishedAt?.toISOString() || null,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserGames = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const games = await Game.find({
      $or: [
        { player1: userId },
        { player2: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('roomId roomCode boardSize gameStatus createdAt');

    res.json(games);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWaitingGames = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all active games (waiting with 1 player, waiting with 2 players, and playing)
    // Exclude finished and abandoned games
    // Optimized: Use lean() for read performance, batch user lookups (fixes Issue #7)
    const games = await Game.find({
      gameStatus: { $in: ['waiting', 'playing'] },
      $or: [
        { player1: { $ne: null } },
        { player1GuestId: { $ne: null } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('roomId roomCode boardSize gameStatus player1 player2 player1GuestId player2GuestId player1GuestName player2GuestName createdAt password')
      .lean();

    // Batch fetch all user IDs in a single query instead of N populate calls
    const userIds = games.flatMap(g => [g.player1, g.player2].filter(Boolean));
    const users = userIds.length > 0
      ? await User.find({ _id: { $in: userIds } }).select('_id username').lean()
      : [];
    const userMap = new Map(users.map(u => [u._id.toString(), u.username]));

    // Format response with display status
    const formattedGames = games.map(game => {
      const hasPlayer1 = !!(game.player1 || game.player1GuestId);
      const hasPlayer2 = !!(game.player2 || game.player2GuestId);
      const playerCount = (hasPlayer1 ? 1 : 0) + (hasPlayer2 ? 1 : 0);
      const isFull = hasPlayer1 && hasPlayer2;
      
      // Determine display status
      let displayStatus: 'waiting' | 'ready' | 'playing';
      let statusLabel: string;
      let canJoin: boolean;
      
      if (game.gameStatus === 'playing') {
        displayStatus = 'playing';
        statusLabel = 'Playing';
        canJoin = false;
      } else if (isFull) {
        displayStatus = 'ready';
        statusLabel = 'Ready (2/2)';
        canJoin = false;
      } else {
        displayStatus = 'waiting';
        statusLabel = `Waiting (${playerCount}/2)`;
        canJoin = true;
      }

      // Get player1 username from userMap (batch fetched) or guest name
      let player1Username: string | null = null;
      if (game.player1) {
        player1Username = userMap.get(game.player1.toString()) || 'Player 1';
      } else if (game.player1GuestId) {
        player1Username = game.player1GuestName || `Guest ${game.player1GuestId.slice(-6)}`;
      }

      return {
      _id: game._id.toString(),
      roomId: game.roomId,
      roomCode: game.roomCode,
      boardSize: game.boardSize,
      gameStatus: game.gameStatus,
        displayStatus, // 'waiting' | 'ready' | 'playing'
        statusLabel, // Display text
        canJoin, // Whether others can join
        hasPlayer1,
        hasPlayer2,
        playerCount,
        player1Username,
        hasPassword: !!(game.password), // Indicate if game has password (without exposing actual password)
      createdAt: game.createdAt.toISOString(),
      };
    });

    res.json(formattedGames);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const leaveGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { guestId } = req.body;
    const authReq = req as AuthRequest;
    
    // Try to get user from token (optional auth - allow both authenticated and guest)
    // Similar to createGame, but don't reject if no token (guest users are allowed)
    let userId: string | null = null;
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const { verifyToken } = await import('../utils/jwt');
        const decoded = verifyToken(token);
        userId = decoded.userId;
      }
    } catch (error) {
      // Token invalid or not provided - continue as guest
    }
    
    // Use userId from token or from authReq.user (fallback)
    const finalUserId = userId || authReq.user?.userId || null;
    
    console.log(`[leaveGame] Request received - roomId: ${roomId}, guestId: ${guestId}, finalUserId: ${finalUserId}`);
    
    const game = await Game.findOne({ roomId });

    if (!game) {
      console.log(`[leaveGame] Game not found for roomId: ${roomId}`);
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    console.log(`[leaveGame] Game found - player1: ${game.player1?.toString() || game.player1GuestId || 'null'}, player2: ${game.player2?.toString() || game.player2GuestId || 'null'}`);

    // Determine which player is leaving
    let isPlayer1 = false;
    let isPlayer2 = false;
    
    // Check if authenticated user is player1 or player2
    if (finalUserId) {
      const userIdStr = finalUserId.toString();
      const player1Str = game.player1 ? game.player1.toString() : null;
      const player2Str = game.player2 ? game.player2.toString() : null;
      
      console.log(`[leaveGame] Checking authenticated user - userId: ${userIdStr}, player1: ${player1Str}, player2: ${player2Str}`);
      
      isPlayer1 = !!(player1Str && player1Str === userIdStr);
      isPlayer2 = !!(player2Str && player2Str === userIdStr);
      
      console.log(`[leaveGame] Authenticated check - isPlayer1: ${isPlayer1}, isPlayer2: ${isPlayer2}`);
    }
    
    // Also check if guestId matches player1GuestId or player2GuestId
    if (guestId) {
      console.log(`[leaveGame] Checking guestId - guestId: ${guestId}, player1GuestId: ${game.player1GuestId}, player2GuestId: ${game.player2GuestId}`);
      
      if (game.player1GuestId && game.player1GuestId === guestId) {
        isPlayer1 = true;
        console.log(`[leaveGame] Guest matched as player1`);
      }
      if (game.player2GuestId && game.player2GuestId === guestId) {
        isPlayer2 = true;
        console.log(`[leaveGame] Guest matched as player2`);
      }
    }

    console.log(`[leaveGame] Final check - isPlayer1: ${isPlayer1}, isPlayer2: ${isPlayer2}`);

    // If player is not in the game, return success (they're already not in it)
    if (!isPlayer1 && !isPlayer2) {
      console.log(`[leaveGame] Player not found in game - finalUserId: ${finalUserId}, guestId: ${guestId}, game.player1: ${game.player1?.toString() || game.player1GuestId}, game.player2: ${game.player2?.toString() || game.player2GuestId}`);
      res.json({ message: 'Player not in game', gameDeleted: false });
      return;
    }

    // Check if game was finished before player left
    const wasFinished = game.gameStatus === 'finished';
    
    // Capture player data BEFORE removing (for history saving)
    // IMPORTANT: Capture authenticated players (not guest IDs) for history
    const player1Before = game.player1; // Authenticated user ID or null
    const player2Before = game.player2; // Authenticated user ID or null
    const player1GuestIdBefore = game.player1GuestId;
    const player2GuestIdBefore = game.player2GuestId;
    
    // Determine if there are any authenticated players in the game (before removal)
    const hasAuthenticatedPlayerBefore = !!(player1Before || player2Before);
    
    // Ensure history is saved if game finished (history should already be saved when game finished,
    // but we check again here to be safe, especially if game finished but history save failed)
    if (wasFinished && game.finishedAt && hasAuthenticatedPlayerBefore) {
      const existingHistory = await GameHistory.findOne({ roomId: game.roomId });
      
      if (!existingHistory) {
        // History not saved yet - save it now (fallback in case history wasn't saved when game finished)
        console.log(`[leaveGame] History not found for finished game ${roomId}, saving now as fallback`);
        const historyRecord = new GameHistory({
          originalGameId: game._id.toString(),
          roomId: game.roomId,
          roomCode: game.roomCode,
          gameType: game.gameType,
          player1: player1Before, // Use captured data before removal (authenticated user ID or null)
          player2: player2Before, // Use captured data before removal (authenticated user ID or null)
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
        console.log(`[leaveGame] History saved (fallback) for roomId: ${roomId}, player1: ${player1Before}, player2: ${player2Before}`);

        // Clean up old history for authenticated players
        await cleanupOldHistory(player1Before, null, player2Before, null);
      } else {
        // History already saved - just cleanup
        await cleanupOldHistory(player1Before, null, player2Before, null);
      }
    }

    // Check players BEFORE removing (to determine if we need host transfer)
    const hasPlayer1Before = !!(game.player1 || game.player1GuestId);
    const hasPlayer2Before = !!(game.player2 || game.player2GuestId);

    // Remove the player from the game
    if (isPlayer1) {
      game.player1 = null;
      game.player1GuestId = null;
    } else if (isPlayer2) {
      game.player2 = null;
      game.player2GuestId = null;
    }

    // Check players AFTER removing (before save) - this is the actual state after removal
    const hasPlayer1AfterLocal = !!(game.player1 || game.player1GuestId);
    const hasPlayer2AfterLocal = !!(game.player2 || game.player2GuestId);
    const hasNoPlayersLocal = !hasPlayer1AfterLocal && !hasPlayer2AfterLocal;
    
    console.log(`[leaveGame] Player left - roomId: ${roomId}, isPlayer1: ${isPlayer1}, isPlayer2: ${isPlayer2}, wasFinished: ${wasFinished}, hasAuthenticatedPlayerBefore: ${hasAuthenticatedPlayerBefore}`);
    console.log(`[leaveGame] Game state after removal (before save) - player1: ${game.player1 || game.player1GuestId || 'null'}, player2: ${game.player2 || game.player2GuestId || 'null'}`);
    console.log(`[leaveGame] hasPlayer1AfterLocal: ${hasPlayer1AfterLocal}, hasPlayer2AfterLocal: ${hasPlayer2AfterLocal}, hasNoPlayersLocal: ${hasNoPlayersLocal}`);

    // Save the game state first (with player removed)
    await game.save();
    
    // Reload game from database to get the latest state (in case another player left concurrently)
    const updatedGame = await Game.findOne({ roomId });
    if (!updatedGame) {
      // Game was already deleted (probably by the other player leaving)
      console.log(`[leaveGame] Game ${roomId} already deleted, probably by other player`);
      res.json({ 
        message: 'Game already deleted', 
        gameDeleted: true 
      });
      return;
    }

    // Check players AFTER removing (using reloaded game state) - double check
    const hasPlayer1After = !!(updatedGame.player1 || updatedGame.player1GuestId);
    const hasPlayer2After = !!(updatedGame.player2 || updatedGame.player2GuestId);
    const hasNoPlayers = !hasPlayer1After && !hasPlayer2After;
    
    console.log(`[leaveGame] Game state after reload - player1: ${updatedGame.player1 || updatedGame.player1GuestId || 'null'}, player2: ${updatedGame.player2 || updatedGame.player2GuestId || 'null'}`);
    console.log(`[leaveGame] hasPlayer1After: ${hasPlayer1After}, hasPlayer2After: ${hasPlayer2After}, hasNoPlayers: ${hasNoPlayers}`);
    console.log(`[leaveGame] Raw values - player1: ${JSON.stringify(updatedGame.player1)}, player1GuestId: ${updatedGame.player1GuestId}, player2: ${JSON.stringify(updatedGame.player2)}, player2GuestId: ${updatedGame.player2GuestId}`);
    
    // Use the reloaded state for final check (more reliable for concurrent leaves)
    // But if local check already shows no players, we can proceed
    const finalHasNoPlayers = hasNoPlayers || hasNoPlayersLocal;

    if (finalHasNoPlayers) {
      // Both players left - delete game
      // History should already be saved when game finished (or when first player left)
      
      // Final check: if game finished and history not saved, try to save it one more time
      if (updatedGame.gameStatus === 'finished' && updatedGame.finishedAt && hasAuthenticatedPlayerBefore) {
        const existingHistory = await GameHistory.findOne({ roomId: updatedGame.roomId });
        if (!existingHistory) {
          console.warn(`[leaveGame] History not found for finished game ${roomId} when both players left. This should not happen if history was saved when game finished.`);
        }
      }
      
      // Delete the game
      const deleteResult = await Game.deleteOne({ roomId });
      console.log(`[leaveGame] Game deleted - roomId: ${roomId}, finalHasNoPlayers: ${finalHasNoPlayers}, hasNoPlayers: ${hasNoPlayers}, hasNoPlayersLocal: ${hasNoPlayersLocal}, wasFinished: ${wasFinished}, deleteResult.deletedCount: ${deleteResult.deletedCount}`);
      
      // Verify deletion
      const verifyDeleted = await Game.findOne({ roomId });
      if (verifyDeleted) {
        console.error(`[leaveGame] ERROR: Game ${roomId} still exists after deleteOne! Attempting force delete...`);
        await Game.deleteOne({ _id: verifyDeleted._id });
      } else {
        console.log(`[leaveGame] Game ${roomId} successfully deleted and verified`);
      }

      // Emit socket event to notify all clients
      io.emit('game-deleted', { roomId });
      
      res.json({ 
        message: wasFinished ? 'Game finished - saved to history and deleted' : 'Game deleted - no players remaining', 
        gameDeleted: true 
      });
      return;
    } else {
      // One player remaining - update the reloaded game
      let gameReset = false;
      let hostTransferred = false;
      
      // If player1 (host) left and player2 still exists AFTER removal, transfer host to player2
      if (isPlayer1 && hasPlayer2After) {
        // Transfer player2 to player1 (host transfer)
        console.log(`[leaveGame] Host transfer: player2 (${updatedGame.player2 || updatedGame.player2GuestId}) becomes player1`);
        updatedGame.player1 = updatedGame.player2;
        updatedGame.player1GuestId = updatedGame.player2GuestId;
        updatedGame.player2 = null;
        updatedGame.player2GuestId = null;
        // CRITICAL: Clear password when host transfers (as per requirement)
        updatedGame.password = null;
        hostTransferred = true;
        console.log(`[leaveGame] Host transfer complete - new player1: ${updatedGame.player1 || updatedGame.player1GuestId}, player2: ${updatedGame.player2 || updatedGame.player2GuestId || 'null'}, password cleared`);

        // Case 2: Game finished + 1 player rời → reset về waiting
        if (wasFinished) {
          updatedGame.gameStatus = 'waiting';
          updatedGame.winner = null;
          updatedGame.finishedAt = null;
          // Reset board for new game
          updatedGame.board = Array(updatedGame.boardSize)
            .fill(null)
            .map(() => Array(updatedGame.boardSize).fill(0));
          updatedGame.currentPlayer = 1;
          gameReset = true;
        } else if (updatedGame.gameStatus === 'playing') {
          // Case 4: Game playing + 1 player rời → reset về waiting
          updatedGame.gameStatus = 'waiting';
          updatedGame.winner = null;
          updatedGame.finishedAt = null;
          // Reset board for new game
          updatedGame.board = Array(updatedGame.boardSize)
            .fill(null)
            .map(() => Array(updatedGame.boardSize).fill(0));
          updatedGame.currentPlayer = 1;
          gameReset = true;
        } else if (updatedGame.gameStatus === 'waiting') {
          // Keep as waiting so it shows in lobby
          updatedGame.gameStatus = 'waiting';
        }
      } else if (isPlayer2 && hasPlayer1After) {
        // Player2 left, player1 still there - just remove player2 (no host transfer needed)
        // Case 2: Game finished + 1 player rời → reset về waiting
        if (wasFinished) {
          updatedGame.gameStatus = 'waiting';
          updatedGame.winner = null;
          updatedGame.finishedAt = null;
          // Reset board for new game
          updatedGame.board = Array(updatedGame.boardSize)
            .fill(null)
            .map(() => Array(updatedGame.boardSize).fill(0));
          updatedGame.currentPlayer = 1;
          gameReset = true;
        } else if (updatedGame.gameStatus === 'playing') {
          // Case 4: Game playing + 1 player rời → reset về waiting
          updatedGame.gameStatus = 'waiting';
          updatedGame.winner = null;
          updatedGame.finishedAt = null;
          // Reset board for new game
          updatedGame.board = Array(updatedGame.boardSize)
            .fill(null)
            .map(() => Array(updatedGame.boardSize).fill(0));
          updatedGame.currentPlayer = 1;
          gameReset = true;
        } else if (updatedGame.gameStatus === 'waiting') {
          // Explicitly set to waiting to ensure it shows in lobby
          updatedGame.gameStatus = 'waiting';
        }
      }
      
      await updatedGame.save();

      // Emit socket event to notify other players in room
      // Include updated game state so frontend can update immediately
      io.to(roomId).emit('player-left', { 
        playerNumber: isPlayer1 ? 1 : 2,
        roomId,
        hostTransferred: hostTransferred, // Notify if host was transferred
        gameReset: gameReset, // Notify if game was reset from finished to waiting
        game: {
          player1: updatedGame.player1,
          player1GuestId: updatedGame.player1GuestId,
          player2: updatedGame.player2,
          player2GuestId: updatedGame.player2GuestId,
          gameStatus: updatedGame.gameStatus,
          currentPlayer: updatedGame.currentPlayer,
        },
      });

      // Emit socket event to lobby about game status update
      const playerCount = (hasPlayer1After ? 1 : 0) + (hasPlayer2After ? 1 : 0);
      const isFull = hasPlayer1After && hasPlayer2After;
      
      let displayStatus: 'waiting' | 'ready' | 'playing';
      if (updatedGame.gameStatus === 'playing') {
        displayStatus = 'playing';
      } else if (isFull) {
        displayStatus = 'ready';
      } else {
        displayStatus = 'waiting';
      }

      io.emit('game-status-updated', {
        roomId: updatedGame.roomId,
        roomCode: updatedGame.roomCode,
        gameStatus: updatedGame.gameStatus,
        displayStatus,
        playerCount,
        isFull,
      });
      
      res.json({ 
        message: 'Player left game', 
        gameDeleted: false,
        hostTransferred: hostTransferred,
      });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get game history for current user (last 20 finished games)
 */
/**
 * Clean up old history records - keep only last 20 for each player
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
      // Keep last 50 games for authenticated users (more than guest's 20)
      if (player1History.length > 50) {
        const idsToDelete = player1History.slice(50).map(h => h._id);
        await GameHistory.deleteMany({ _id: { $in: idsToDelete } });
      }
    }
    // Note: No cleanup for player1GuestId - guest history is not saved to DB
    
    // Clean up for player2 (authenticated only)
    if (player2) {
      const player2History = await GameHistory.find({ player2 })
        .sort({ finishedAt: -1 })
        .select('_id')
        .lean();
      // Keep last 50 games for authenticated users (more than guest's 20)
      if (player2History.length > 50) {
        const idsToDelete = player2History.slice(50).map(h => h._id);
        await GameHistory.deleteMany({ _id: { $in: idsToDelete } });
      }
    }
    // Note: No cleanup for player2GuestId - guest history is not saved to DB
  } catch (error: any) {
    console.error('[cleanupOldHistory] Error cleaning up old history:', error);
    // Don't throw - this is cleanup, shouldn't block the main operation
  }
};

export const setPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { password } = req.body;
    const authReq = req as AuthRequest;
    
    // Try to get user from token (optional auth - allow both authenticated and guest)
    let userId: string | null = null;
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const { verifyToken } = await import('../utils/jwt');
        const decoded = verifyToken(token);
        userId = decoded.userId;
      }
    } catch (error) {
      // Token invalid or not provided - continue as guest
    }
    
    const finalUserId = userId || authReq.user?.userId || null;
    const { guestId } = req.body;

    const game = await Game.findOne({ roomId });

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    // CRITICAL: Only host (player1) can set password
    const isHost = finalUserId
      ? game.player1 && game.player1.toString() === finalUserId.toString()
      : game.player1GuestId === guestId;

    if (!isHost) {
      res.status(403).json({ message: 'Only the host can set the game password' });
      return;
    }

    // If password is empty or null, remove password
    if (!password || password.trim() === '') {
      game.password = null;
      await game.save();
      res.json({ message: 'Password removed successfully', hasPassword: false });
      return;
    }

    // Validate password length (min 4, max 50 characters)
    const trimmedPassword = password.trim();
    if (trimmedPassword.length < 4 || trimmedPassword.length > 50) {
      res.status(400).json({ message: 'Password must be between 4 and 50 characters' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    game.password = hashedPassword;
    await game.save();

    res.json({ message: 'Password set successfully', hasPassword: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to set password' });
  }
};

export const updateMarker = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { marker } = req.body;
    const authReq = req as AuthRequest;
    
    // Try to get user from token (optional auth - allow both authenticated and guest)
    let userId: string | null = null;
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const { verifyToken } = await import('../utils/jwt');
        const decoded = verifyToken(token);
        userId = decoded.userId;
      }
    } catch (error) {
      // Token invalid or not provided - continue as guest
    }
    
    const finalUserId = userId || authReq.user?.userId || null;
    const { guestId } = req.body;
    
    // Validate marker: must be non-empty string
    if (!marker || typeof marker !== 'string') {
      res.status(400).json({ message: 'Invalid marker. Must be a non-empty string.' });
      return;
    }
    
    // Check if it's a base64 image
    const isBase64Image = marker.startsWith('data:image/');
    let sanitizedMarker: string;
    
    if (isBase64Image) {
      // Validate base64 image format and size
      if (marker.length > 200000) { // ~150KB image max
        res.status(400).json({ message: 'Image too large. Maximum size is 150KB.' });
        return;
      }
      
      // Validate base64 format
      const base64Match = marker.match(/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/);
      if (!base64Match) {
        res.status(400).json({ message: 'Invalid image format. Supported: PNG, JPEG, JPG, GIF, WEBP, SVG' });
        return;
      }
      
      sanitizedMarker = marker;
    } else {
      // Text marker validation
      const trimmedMarker = marker.trim();
      if (!trimmedMarker || trimmedMarker.length === 0) {
        res.status(400).json({ message: 'Invalid marker. Cannot be empty or whitespace only.' });
        return;
      }
      
      if (trimmedMarker.length > 10) {
        res.status(400).json({ message: 'Invalid marker. Text markers must be max 10 characters.' });
        return;
      }
      
      sanitizedMarker = trimmedMarker;
    }
    
    const game = await Game.findOne({ roomId });
    
    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }
    
    // Only allow marker selection when game is waiting or ready to start
    if (game.gameStatus !== 'waiting') {
      res.status(400).json({ message: 'Can only select marker when game is waiting' });
      return;
    }
    
    // Determine which player is updating marker
    let isPlayer1 = false;
    let isPlayer2 = false;
    
    if (finalUserId) {
      const userIdStr = finalUserId.toString();
      const player1Str = game.player1 ? game.player1.toString() : null;
      const player2Str = game.player2 ? game.player2.toString() : null;
      isPlayer1 = !!(player1Str && player1Str === userIdStr);
      isPlayer2 = !!(player2Str && player2Str === userIdStr);
    }
    
    if (guestId) {
      if (game.player1GuestId && game.player1GuestId === guestId) {
        isPlayer1 = true;
      }
      if (game.player2GuestId && game.player2GuestId === guestId) {
        isPlayer2 = true;
      }
    }
    
    if (!isPlayer1 && !isPlayer2) {
      res.status(403).json({ message: 'You are not a player in this game' });
      return;
    }
    
    // Check if marker is already taken by the other player
    const otherPlayerMarker = isPlayer1 ? game.player2Marker : game.player1Marker;
    if (otherPlayerMarker && otherPlayerMarker === sanitizedMarker) {
      res.status(400).json({ message: 'This marker is already taken by the other player' });
      return;
    }
    
    // Update marker with sanitized value
    if (isPlayer1) {
      game.player1Marker = sanitizedMarker;
    } else {
      game.player2Marker = sanitizedMarker;
    }
    
    await game.save();
    
    // Emit socket event to notify other player
    io.to(roomId).emit('marker-updated', {
      playerNumber: isPlayer1 ? 1 : 2,
      marker: sanitizedMarker,
    });
    
    res.json({
      message: 'Marker updated successfully',
      player1Marker: game.player1Marker,
      player2Marker: game.player2Marker,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getGameHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    // Only return history for authenticated users
    // Guest history should be retrieved from localStorage on frontend
    if (!userId) {
      console.log(`[getGameHistory] No userId, returning empty history`);
      res.json({ history: [], total: 0 });
      return;
    }

    console.log(`[getGameHistory] Querying history for userId: ${userId}, type: ${typeof userId}`);

    // Build query to find finished games in history where authenticated user participated
    // Convert userId to ObjectId - userId from auth middleware is string
    // Use String() to ensure we have a string, then convert to ObjectId
    const userIdStr = String(userId);
    const userIdObj = new mongoose.Types.ObjectId(userIdStr);

    console.log(`[getGameHistory] Converted userId to ObjectId: ${userIdObj.toString()}`);

    // Try query with ObjectId first
    let query: any = {
      $or: [
        { player1: userIdObj },
        { player2: userIdObj },
      ],
    };

    console.log(`[getGameHistory] Query with ObjectId:`, JSON.stringify({
      $or: [
        { player1: userIdObj.toString() },
        { player2: userIdObj.toString() },
      ],
    }, null, 2));

    // Get last 50 finished games from history
    let games = await GameHistory.find(query)
      .sort({ finishedAt: -1 })
      .limit(50)
      .select('roomId roomCode boardSize board winner winningLine finishedAt createdAt player1 player2 score')
      .populate('player1', 'username')
      .populate('player2', 'username')
      .lean();

    console.log(`[getGameHistory] Found ${games.length} games with ObjectId query`);

    // If no results, try with string format as fallback
    if (games.length === 0) {
      console.log(`[getGameHistory] No results with ObjectId, trying string format...`);
      const userIdStr = userId.toString();
      query = {
        $or: [
          { player1: userIdStr },
          { player2: userIdStr },
        ],
      };
      games = await GameHistory.find(query)
        .sort({ finishedAt: -1 })
        .limit(50)
        .select('roomId roomCode boardSize board winner winningLine finishedAt createdAt player1 player2 score')
        .populate('player1', 'username')
        .populate('player2', 'username')
        .lean();
      console.log(`[getGameHistory] Found ${games.length} games with string query`);
    }

    // Debug: Check all history records to see what player1/player2 values look like
    const allHistory = await GameHistory.find({}).limit(5).select('player1 player2 roomId').lean();
    console.log(`[getGameHistory] Sample history records:`, JSON.stringify(allHistory.map(h => ({
      roomId: h.roomId,
      player1: h.player1?.toString(),
      player2: h.player2?.toString(),
      player1Type: typeof h.player1,
      player2Type: typeof h.player2,
    })), null, 2));

    console.log(`[getGameHistory] Final result: Found ${games.length} games in history for userId: ${userId}`);

    // Format response with result for current user
    const history = games.map(game => {
      // Determine if current user is player1 or player2 (only authenticated users at this point)
      const isPlayer1 = game.player1 && (game.player1 as any)._id?.toString() === userId.toString();
      const isPlayer2 = game.player2 && (game.player2 as any)._id?.toString() === userId.toString();

      // Determine result
      let result: 'win' | 'loss' | 'draw' = 'draw';
      if (game.winner === 'draw' || game.winner === null) {
        result = 'draw';
      } else if (isPlayer1 && game.winner === 1) {
        result = 'win';
      } else if (isPlayer2 && game.winner === 2) {
        result = 'win';
      } else {
        result = 'loss';
      }

      // Get opponent info
      let opponentUsername = 'Unknown';
      if (isPlayer1 && game.player2) {
        opponentUsername = (game.player2 as any).username || 'Guest';
      } else if (isPlayer2 && game.player1) {
        opponentUsername = (game.player1 as any).username || 'Guest';
      }

      return {
        _id: game._id.toString(),
        roomId: game.roomId,
        roomCode: game.roomCode,
        boardSize: game.boardSize,
        board: game.board,
        winner: game.winner,
        winningLine: game.winningLine,
        result, // 'win' | 'loss' | 'draw'
        opponentUsername,
        finishedAt: game.finishedAt?.toISOString() || null,
        createdAt: game.createdAt.toISOString(),
        score: game.score,
      };
    });

    res.json({ history, total: history.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
