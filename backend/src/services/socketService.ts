import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import mongoose from 'mongoose';
import Game from '../models/Game';
import GameMove from '../models/GameMove';
import User from '../models/User';
import { makeMove, undoMove } from './gameEngine';
import { checkWin } from './winChecker';
import { PlayerNumber } from '../types/game.types';
import { saveGameHistoryIfFinished } from './gameHistoryService';

// Throttle map for global broadcasts (fixes Issue #9: Unthrottled global socket broadcasts)
const lastBroadcastTime = new Map<string, number>();
const BROADCAST_THROTTLE_MS = 100; // Min 100ms between same-type broadcasts
const MAX_BROADCAST_EVENT_TYPES = 50; // Prevent unbounded growth (fixes C3)

// Throttled broadcast helper - prevents spam to all clients
const throttledBroadcast = (io: SocketIOServer, event: string, data: any): boolean => {
  const now = Date.now();
  const lastTime = lastBroadcastTime.get(event) || 0;
  if (now - lastTime < BROADCAST_THROTTLE_MS) {
    return false; // Skip this broadcast
  }

  // Prevent map growth beyond max event types
  if (lastBroadcastTime.size >= MAX_BROADCAST_EVENT_TYPES && !lastBroadcastTime.has(event)) {
    // Evict oldest entry
    const oldest = [...lastBroadcastTime.entries()].sort((a, b) => a[1] - b[1])[0];
    if (oldest) lastBroadcastTime.delete(oldest[0]);
  }

  lastBroadcastTime.set(event, now);
  io.emit(event, data);
  return true;
};

interface SocketData {
  userId?: string;
  username?: string;
  isGuest?: boolean;
  playerId?: string;
  currentRoomId?: string;
}

export const setupSocketHandlers = (io: SocketIOServer): void => {
  io.on('connection', (socket) => {
    const socketData: SocketData = socket.data;

    // Join room
    socket.on('join-room', async (data: { roomId: string; playerId: string; isGuest: boolean }) => {
      try {
        const { roomId, playerId, isGuest } = data;
        socketData.currentRoomId = roomId;
        socketData.playerId = playerId;
        socketData.isGuest = isGuest;
        socket.join(roomId);

        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }

        // Socket should NOT assign player2 - only API joinGame should do that
        // Socket only handles joining the socket room for real-time communication
        // Player assignment is handled by the REST API joinGame endpoint

        // Emit current game state - only include players that actually exist and are set
        const players: any[] = [];
        
        // Add player1 if exists - populate username from User model
        if (game.player1) {
          const user1 = await User.findById(game.player1).select('username').lean();
          players.push({
            id: game.player1.toString(),
            username: user1?.username || 'Player 1',
            isGuest: false,
            playerNumber: 1,
          });
        } else if (game.player1GuestId) {
          players.push({
            id: game.player1GuestId,
            username: game.player1GuestName || `Guest ${game.player1GuestId.slice(-6)}`,
            isGuest: true,
            playerNumber: 1,
          });
        }
        
        // Only add player2 if they actually exist (not null/undefined) - populate username from User model
        if (game.player2) {
          const user2 = await User.findById(game.player2).select('username').lean();
          players.push({
            id: game.player2.toString(),
            username: user2?.username || 'Player 2',
            isGuest: false,
            playerNumber: 2,
          });
        } else if (game.player2GuestId) {
          players.push({
            id: game.player2GuestId,
            username: game.player2GuestName || `Guest ${game.player2GuestId.slice(-6)}`,
            isGuest: true,
            playerNumber: 2,
          });
        }

        // Emit room-joined with current game state
        socket.emit('room-joined', { 
          roomId, 
          players,
          gameStatus: game.gameStatus,
          currentPlayer: game.currentPlayer,
        });
      } catch (error: any) {
        socket.emit('game-error', { message: error.message });
      }
    });

    // Make move
    socket.on('make-move', async (data: { roomId: string; row: number; col: number }) => {
      try {
        const { roomId, row, col } = data;
        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }

        // Debug logging reduced for production performance (fixes Issue #16)

        // Determine player number - check both authenticated and guest
        let player: PlayerNumber = 1;
        let playerDetermined = false;
        
        
        // First check authenticated user
        if (socketData.userId) {
          if (game.player1?.toString() === socketData.userId) {
            player = 1;
            playerDetermined = true;
          } else if (game.player2?.toString() === socketData.userId) {
            player = 2;
            playerDetermined = true;
          }
        }
        
        // Check guest ID - this is the most common case for guest players
        // Check playerId first (most reliable)
        if (!playerDetermined && socketData.playerId) {
          if (game.player1GuestId && game.player1GuestId === socketData.playerId) {
            player = 1;
            playerDetermined = true;
          } else if (game.player2GuestId && game.player2GuestId === socketData.playerId) {
            player = 2;
            playerDetermined = true;
          }
        }
        
        // Also check if authenticated user matches guest IDs (edge case)
        if (!playerDetermined && socketData.userId) {
          if (game.player1GuestId && game.player1GuestId === socketData.userId.toString()) {
            player = 1;
            playerDetermined = true;
          } else if (game.player2GuestId && game.player2GuestId === socketData.userId.toString()) {
            player = 2;
            playerDetermined = true;
          }
        }
        
        if (!playerDetermined) {
          console.error('[socketService] Could not determine player');
          socket.emit('game-error', { message: 'Could not determine player number. Please rejoin the room.' });
          return;
        }

        const result = await makeMove(game, row, col, player);
        if (!result.success) {
          socket.emit('move-validated', { valid: false, message: result.message });
          return;
        }

        // Reload game to get the latest state after makeMove
        const updatedGame = await Game.findOne({ roomId });
        if (!updatedGame) {
          socket.emit('game-error', { message: 'Game not found after move' });
          return;
        }

        // Get the move that was just made
        const move = await GameMove.findOne({
          gameId: updatedGame._id,
          row,
          col,
          player,
        }).sort({ timestamp: -1 });

        // Emit to all in room
        io.to(roomId).emit('move-made', {
          move: move ? {
            _id: move._id.toString(),
            gameId: move.gameId.toString(),
            player: move.player,
            row: move.row,
            col: move.col,
            moveNumber: move.moveNumber,
            timestamp: move.timestamp.toISOString(),
            isUndone: move.isUndone,
          } : null,
          board: updatedGame.board,
          currentPlayer: updatedGame.currentPlayer,
        });

        if (updatedGame.gameStatus === 'finished') {
          // Reload game from database to ensure we have the full document with winningLine
          const finishedGame = await Game.findOne({ roomId });
          if (finishedGame) {
            // Save history immediately when game finishes
            await saveGameHistoryIfFinished(finishedGame);
            
            // Emit game-finished with all necessary data including winningLine and score
            io.to(roomId).emit('game-finished', {
              winner: finishedGame.winner,
              reason: finishedGame.winner === 'draw' ? 'Draw' : `Player ${finishedGame.winner} wins!`,
              winningLine: (finishedGame as any).winningLine || undefined,
              score: finishedGame.score,
            });
          } else {
            // Fallback if game not found - use updatedGame data
            io.to(roomId).emit('game-finished', {
              winner: updatedGame.winner,
              reason: updatedGame.winner === 'draw' ? 'Draw' : `Player ${updatedGame.winner} wins!`,
              winningLine: (updatedGame as any).winningLine || undefined,
              score: updatedGame.score,
            });
          }
        }
      } catch (error: any) {
        socket.emit('game-error', { message: error.message });
      }
    });

    // Request undo
    socket.on('request-undo', async (data: { roomId: string; moveNumber: number }) => {
      try {
        const { roomId, moveNumber } = data;
        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }

        const move = await GameMove.findOne({
          gameId: game._id,
          moveNumber,
        });

        if (!move) {
          socket.emit('game-error', { message: 'Move not found' });
          return;
        }

        // Emit to opponent
        socket.to(roomId).emit('undo-requested', {
          moveNumber,
          requestedBy: move.player,
        });
      } catch (error: any) {
        socket.emit('game-error', { message: error.message });
      }
    });

    // Approve undo
    socket.on('approve-undo', async (data: { roomId: string; moveNumber: number }) => {
      try {
        const { roomId, moveNumber } = data;
        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }

        const result = await undoMove(game, moveNumber);
        if (!result.success) {
          socket.emit('game-error', { message: result.message });
          return;
        }

        io.to(roomId).emit('undo-approved', {
          moveNumber,
          board: game.board,
        });
      } catch (error: any) {
        socket.emit('game-error', { message: error.message });
      }
    });

    // Reject undo
    socket.on('reject-undo', (data: { roomId: string }) => {
      socket.to(data.roomId).emit('undo-rejected', { moveNumber: 0 });
    });

    // Start game
    socket.on('start-game', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }

        // Only allow starting if game is waiting and has 2 players
        if (game.gameStatus !== 'waiting') {
          // Game might have been started by another player - emit current state instead of error
          socket.emit('game-started', {
            currentPlayer: game.currentPlayer,
          });
          return;
        }

        if (!game.player2 && !game.player2GuestId) {
          socket.emit('game-error', { message: 'Not enough players to start' });
          return;
        }

        // Determine which player is starting the game (whoever clicks start goes first)
        let startingPlayer: PlayerNumber = 1;
        let playerDetermined = false;

        // Check authenticated user ID first
        if (!playerDetermined && socketData.userId) {
          if (game.player1 && game.player1.toString() === socketData.userId.toString()) {
            startingPlayer = 1;
            playerDetermined = true;
          } else if (game.player2 && game.player2.toString() === socketData.userId.toString()) {
            startingPlayer = 2;
            playerDetermined = true;
          }
        }

        // Check guest ID - this is the most common case for guest players
        if (!playerDetermined && socketData.playerId) {
          if (game.player1GuestId && game.player1GuestId === socketData.playerId) {
            startingPlayer = 1;
            playerDetermined = true;
          } else if (game.player2GuestId && game.player2GuestId === socketData.playerId) {
            startingPlayer = 2;
            playerDetermined = true;
          }
        }

        // If still not determined, default to player1 (host)
        if (!playerDetermined) {
          startingPlayer = 1;
        }

        // Start the game with the player who clicked start going first
        game.gameStatus = 'playing';
        game.currentPlayer = startingPlayer;
        await game.save();

        // Emit to lobby about game status change (throttled to prevent spam)
        throttledBroadcast(io, 'game-status-updated', {
          roomId: game.roomId,
          roomCode: game.roomCode,
          gameStatus: 'playing',
          displayStatus: 'playing',
          playerCount: 2,
          isFull: true,
        });

        // Emit to all players in the room
        io.to(roomId).emit('game-started', {
          currentPlayer: game.currentPlayer,
        });

        // Also emit directly to the socket that sent the request (in case they're not in room yet)
        socket.emit('game-started', {
          currentPlayer: game.currentPlayer,
        });
      } catch (error: any) {
        socket.emit('game-error', { message: error.message });
      }
    });

    // Surrender
    socket.on('surrender', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }

        // Determine winner (opponent)
        let winner: PlayerNumber = 1;
        if (socketData.userId) {
          // Authenticated user
          if (game.player1?.toString() === socketData.userId) {
            winner = 2;
          }
        } else if (socketData.isGuest && socketData.playerId) {
          // Guest user
          if (game.player1GuestId === socketData.playerId) {
            winner = 2;
          } else if (game.player2GuestId === socketData.playerId) {
            winner = 1;
          }
        }

        game.gameStatus = 'finished';
        game.winner = winner;
        game.finishedAt = new Date();

        if (winner === 1) {
          game.score.player1++;
        } else {
          game.score.player2++;
        }

        await game.save();

        // Save history immediately when game finishes
        await saveGameHistoryIfFinished(game);

        io.to(roomId).emit('game-finished', {
          winner,
          reason: 'Opponent surrendered',
          winningLine: (game as any).winningLine,
          score: game.score,
        });
      } catch (error: any) {
        socket.emit('game-error', { message: error.message });
      }
    });

    // New game
    socket.on('new-game', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }

        // Reset game but keep score
        game.board = Array(game.boardSize)
          .fill(null)
          .map(() => Array(game.boardSize).fill(0));
        game.currentPlayer = 1;
        game.gameStatus = 'playing';
        game.winner = null;
        game.winningLine = undefined; // Clear winning line for new game
        game.finishedAt = null;

        await game.save();

        // Emit game-reset event with full state (including cleared winningLine)
        io.to(roomId).emit('game-reset', {
          board: game.board,
          currentPlayer: game.currentPlayer,
          gameStatus: game.gameStatus,
          winner: null,
          winningLine: null,
        });
      } catch (error: any) {
        socket.emit('game-error', { message: error.message });
      }
    });

    // Leave room
    // Note: This is called AFTER the API leaveGame has been called
    // So we only need to leave the socket room, not update game state
    socket.on('leave-room', async (data: { roomId: string }) => {
      socket.leave(data.roomId);
      // The API leaveGame already emitted player-left event with proper data
      // We don't need to emit again here to avoid duplicate events
      socketData.currentRoomId = undefined;
    });

    // Update guest name - sync to opponent in realtime
    socket.on('update-guest-name', async (data: { roomId: string; guestName: string }) => {
      try {
        const { roomId, guestName } = data;

        // Validate guest name
        if (!guestName || typeof guestName !== 'string' || guestName.trim().length === 0) {
          socket.emit('game-error', { message: 'Invalid guest name' });
          return;
        }

        const trimmedName = guestName.trim();
        if (trimmedName.length > 20) {
          socket.emit('game-error', { message: 'Guest name too long (max 20 characters)' });
          return;
        }

        const game = await Game.findOne({ roomId });
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }

        // Determine which player is updating (must be a guest)
        let playerNumber: 1 | 2 | null = null;

        if (socketData.playerId) {
          if (game.player1GuestId === socketData.playerId) {
            playerNumber = 1;
            game.player1GuestName = trimmedName;
          } else if (game.player2GuestId === socketData.playerId) {
            playerNumber = 2;
            game.player2GuestName = trimmedName;
          }
        }

        if (!playerNumber) {
          socket.emit('game-error', { message: 'Only guests can update their name' });
          return;
        }

        await game.save();

        // Broadcast to all players in room (including sender for confirmation)
        io.to(roomId).emit('guest-name-updated', {
          playerNumber,
          guestName: trimmedName,
          guestId: socketData.playerId,
        });
      } catch (error: any) {
        console.error('[update-guest-name] Error:', error.message);
        socket.emit('game-error', { message: error.message });
      }
    });

    // Disconnect - Optimized to reduce DB queries (fixes Issue #4: N+1 Database Queries)
    // Reduced from 5-7 sequential queries to 1-2 queries using lean() and upsert
    socket.on('disconnect', async () => {
      if (!socketData.currentRoomId) return;

      const roomId = socketData.currentRoomId;
      const playerId = socketData.userId || socketData.playerId;
      const isGuest = socketData.isGuest || !socketData.userId;

      try {
        // Single query with lean() for read performance
        const game = await Game.findOne({ roomId }).lean();
        if (!game) return;

        // Determine which player is leaving
        let isPlayer1 = false;
        let isPlayer2 = false;

        if (playerId) {
          if (socketData.userId) {
            isPlayer1 = !!(game.player1 && game.player1.toString() === socketData.userId.toString());
            isPlayer2 = !!(game.player2 && game.player2.toString() === socketData.userId.toString());
          }
          if (isGuest && playerId) {
            if (game.player1GuestId === playerId) isPlayer1 = true;
            if (game.player2GuestId === playerId) isPlayer2 = true;
          }
        }

        if (!isPlayer1 && !isPlayer2) return;

        const wasFinished = game.gameStatus === 'finished';

        // Capture player data BEFORE removal (for history saving)
        const player1Before = game.player1;
        const player2Before = game.player2;
        const player1GuestIdBefore = game.player1GuestId;
        const player2GuestIdBefore = game.player2GuestId;

        // Compute state after removal (without modifying read-only lean object)
        let newPlayer1 = game.player1;
        let newPlayer1GuestId = game.player1GuestId;
        let newPlayer2 = game.player2;
        let newPlayer2GuestId = game.player2GuestId;

        if (isPlayer1) {
          newPlayer1 = null;
          newPlayer1GuestId = null;
        } else if (isPlayer2) {
          newPlayer2 = null;
          newPlayer2GuestId = null;
        }

        const hasPlayer1After = !!(newPlayer1 || newPlayer1GuestId);
        const hasPlayer2After = !!(newPlayer2 || newPlayer2GuestId);
        const hasNoPlayers = !hasPlayer1After && !hasPlayer2After;

        // Ensure history is saved if game finished (history should already be saved when game finished,
        // but we check again here as fallback)
        if (wasFinished && game.finishedAt) {
          const hasAuthenticatedPlayerBefore = !!(player1Before || player2Before);
          if (hasAuthenticatedPlayerBefore) {
            const GameHistory = (await import('../models/GameHistory')).default;
            const existingHistory = await GameHistory.findOne({ roomId }).lean();
            
            if (!existingHistory) {
              // History not saved yet - save it now (fallback)
              console.log(`[socket disconnect] History not found for finished game ${roomId}, saving now as fallback`);
              const historyRecord = new GameHistory({
                originalGameId: game._id.toString(),
                roomId: game.roomId,
                roomCode: game.roomCode,
                gameType: game.gameType,
                player1: player1Before, // Use captured data before removal
                player2: player2Before, // Use captured data before removal
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
              console.log(`[socket disconnect] History saved (fallback) for roomId: ${roomId}`);
            }
          }
        }

        if (hasNoPlayers) {
          // Both players left - delete game
          // History should already be saved above if needed
          await Game.deleteOne({ roomId });
          io.to(roomId).emit('game-deleted', { roomId });
          return;
        }

        // One player remaining - use single atomic update
        const updateDoc: Record<string, any> = {};
        let gameReset = false;
        let hostTransferred = false;

        if (isPlayer1 && hasPlayer2After) {
          // Host transfer: player2 becomes player1
          updateDoc.player1 = newPlayer2;
          updateDoc.player1GuestId = newPlayer2GuestId;
          updateDoc.player2 = null;
          updateDoc.player2GuestId = null;
          hostTransferred = true;
        } else {
          updateDoc.player1 = newPlayer1;
          updateDoc.player1GuestId = newPlayer1GuestId;
          updateDoc.player2 = newPlayer2;
          updateDoc.player2GuestId = newPlayer2GuestId;
        }

        // Reset game if it was in progress
        if (wasFinished || game.gameStatus === 'playing') {
          updateDoc.gameStatus = 'waiting';
          updateDoc.winner = null;
          updateDoc.finishedAt = null;
          updateDoc.board = Array(game.boardSize).fill(null).map(() => Array(game.boardSize).fill(0));
          updateDoc.currentPlayer = 1;
          gameReset = true;
        }

        await Game.updateOne({ roomId }, { $set: updateDoc });

        // Reload game to get updated state for socket event
        const updatedGameAfterDisconnect = await Game.findOne({ roomId }).lean();
        if (updatedGameAfterDisconnect) {
          io.to(roomId).emit('player-left', {
            playerNumber: isPlayer1 ? 1 : 2,
            roomId,
            hostTransferred,
            gameReset,
            game: {
              player1: updatedGameAfterDisconnect.player1,
              player1GuestId: updatedGameAfterDisconnect.player1GuestId,
              player2: updatedGameAfterDisconnect.player2,
              player2GuestId: updatedGameAfterDisconnect.player2GuestId,
              gameStatus: updatedGameAfterDisconnect.gameStatus,
              currentPlayer: updatedGameAfterDisconnect.currentPlayer,
            },
          });
        } else {
          io.to(roomId).emit('player-left', {
            playerNumber: isPlayer1 ? 1 : 2,
            roomId,
            hostTransferred,
            gameReset,
          });
        }
      } catch (error: any) {
        console.error('[socket disconnect] Error:', error.message);
        io.to(roomId).emit('player-left', { playerId: playerId || 'guest', roomId });
      } finally {
        // Clear socket.data to prevent memory leak (fixes C4)
        socket.data = {};
      }
    });
  });
};


