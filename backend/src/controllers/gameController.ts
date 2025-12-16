import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Game from '../models/Game';
import { initializeBoard, generateRoomCode } from '../services/gameEngine';
import { AuthRequest } from '../middleware/authMiddleware';
import { io } from '../server';

export const createGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { boardSize = 15, rules = {}, guestId } = req.body;
    const authReq = req as AuthRequest;

    const roomId = uuidv4();
    const roomCode = await generateRoomCode();
    const board = initializeBoard(boardSize);

    const game = new Game({
      roomId,
      roomCode,
      player1: authReq.user?.userId ? (authReq.user.userId as any) : null,
      player1GuestId: authReq.user ? null : guestId || null,
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

    res.status(201).json({
      _id: game._id.toString(),
      roomId: game.roomId,
      roomCode: game.roomCode,
      player1: game.player1?.toString() || null,
      player2: game.player2?.toString() || null,
      player1GuestId: game.player1GuestId,
      player2GuestId: game.player2GuestId,
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

export const getGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const game = await Game.findOne({ roomId });

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
    const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });

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
    const { guestId } = req.body;
    const authReq = req as AuthRequest;
    
    // Reload game to get latest state (avoid race conditions)
    const game = await Game.findOne({ roomId });

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    // Allow joining if game is waiting OR if it's playing but player2 slot is empty
    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'playing') {
      res.status(400).json({ message: 'Game is not available for joining' });
      return;
    }

    // Check if this player is already player1 or player2
    // Need to check both authenticated and guest scenarios
    let isPlayer1 = false;
    let isPlayer2 = false;
    
    // Check if authenticated user is player1 or player2
    if (authReq.user?.userId) {
      isPlayer1 = !!(game.player1 && game.player1.toString() === authReq.user.userId.toString());
      isPlayer2 = !!(game.player2 && game.player2.toString() === authReq.user.userId.toString());
    }
    
    // Also check if guestId matches player1GuestId or player2GuestId
    // (This handles cases where user might be authenticated but game was created/joined as guest)
    if (guestId) {
      if (game.player1GuestId && game.player1GuestId === guestId) {
        isPlayer1 = true;
      }
      if (game.player2GuestId && game.player2GuestId === guestId) {
        isPlayer2 = true;
      }
    }
    
    // If player is already in the game, allow them to rejoin
    if (isPlayer1 || isPlayer2) {
      // Return current game state - they're already a player
      res.json({
        _id: game._id.toString(),
        roomId: game.roomId,
        roomCode: game.roomCode,
        player1: game.player1?.toString() || null,
        player2: game.player2?.toString() || null,
        player1GuestId: game.player1GuestId,
        player2GuestId: game.player2GuestId,
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
    
    // Check if game already has 2 players (and this is a new player trying to join)
    // Use the game we already loaded (no need to reload again here)
    // Check if player2 slot is actually filled (not null, not undefined, not empty string)
    const hasPlayer2 = !!(game.player2 || (game.player2GuestId && game.player2GuestId.trim() !== ''));
    if (hasPlayer2) {
      res.status(400).json({ 
        message: 'Game is already full',
      });
      return;
    }

    // Assign player 2 - but don't auto-start, wait for start button
    // Use the game we already loaded
    if (authReq.user) {
      game.player2 = authReq.user.userId as any;
    } else if (guestId) {
      game.player2GuestId = guestId;
    } else {
      res.status(400).json({ message: 'Either authenticated user or guestId is required' });
      return;
    }

    // Keep game status as 'waiting' - game will start when start button is clicked
    await game.save();

    // Emit socket event to notify all clients in the room that player2 has joined
    const player2Id = authReq.user ? authReq.user.userId.toString() : guestId;
    const player2Username = authReq.user ? authReq.user.username : `Guest ${guestId?.slice(-6) || ''}`;
    io.to(roomId).emit('player-joined', {
      player: {
        id: player2Id,
        username: player2Username,
        isGuest: !authReq.user,
        playerNumber: 2,
      },
    });

    // Reload to get the latest state after save (to ensure we return fresh data)
    const savedGame = await Game.findOne({ roomId });
    if (!savedGame) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }
    
    res.json({
      _id: savedGame._id.toString(),
      roomId: savedGame.roomId,
      roomCode: savedGame.roomCode,
      player1: savedGame.player1?.toString() || null,
      player2: savedGame.player2?.toString() || null,
      player1GuestId: savedGame.player1GuestId,
      player2GuestId: savedGame.player2GuestId,
      boardSize: savedGame.boardSize,
      board: savedGame.board,
      currentPlayer: savedGame.currentPlayer,
      gameStatus: savedGame.gameStatus,
      winner: savedGame.winner,
      rules: savedGame.rules,
      score: savedGame.score,
      createdAt: savedGame.createdAt.toISOString(),
      updatedAt: savedGame.updatedAt.toISOString(),
      finishedAt: savedGame.finishedAt?.toISOString() || null,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserGames = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const games = await Game.find({
      $or: [{ player1: userId }, { player2: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(games);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

