import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import Game from '../models/Game';
import GameMove from '../models/GameMove';
import { makeMove, undoMove } from './gameEngine';
import { checkWin } from './winChecker';
import { PlayerNumber } from '../types/game.types';

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
        
        // Add player1 if exists
        if (game.player1) {
          players.push({
            id: game.player1.toString(),
            username: 'Player 1',
            isGuest: false,
            playerNumber: 1,
          });
        } else if (game.player1GuestId) {
          players.push({
            id: game.player1GuestId,
            username: `Guest ${game.player1GuestId.slice(-6)}`,
            isGuest: true,
            playerNumber: 1,
          });
        }
        
        // Only add player2 if they actually exist (not null/undefined)
        if (game.player2) {
          players.push({
            id: game.player2.toString(),
            username: 'Player 2',
            isGuest: false,
            playerNumber: 2,
          });
        } else if (game.player2GuestId) {
          players.push({
            id: game.player2GuestId,
            username: `Guest ${game.player2GuestId.slice(-6)}`,
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

        console.log('Make move received:', { roomId, row, col, socketData });
        console.log('Game state:', {
          player1: game.player1?.toString(),
          player1GuestId: game.player1GuestId,
          player2: game.player2?.toString(),
          player2GuestId: game.player2GuestId,
          currentPlayer: game.currentPlayer,
          gameStatus: game.gameStatus,
        });

        // Determine player number - check both authenticated and guest
        let player: PlayerNumber = 1;
        let playerDetermined = false;
        
        console.log('Determining player - socketData:', {
          userId: socketData.userId,
          playerId: socketData.playerId,
          isGuest: socketData.isGuest,
        });
        
        // First check authenticated user
        if (socketData.userId) {
          if (game.player1?.toString() === socketData.userId) {
            player = 1;
            playerDetermined = true;
            console.log('Matched by authenticated userId as player1');
          } else if (game.player2?.toString() === socketData.userId) {
            player = 2;
            playerDetermined = true;
            console.log('Matched by authenticated userId as player2');
          }
        }
        
        // Check guest ID - this is the most common case for guest players
        // Check playerId first (most reliable)
        if (!playerDetermined && socketData.playerId) {
          if (game.player1GuestId && game.player1GuestId === socketData.playerId) {
            player = 1;
            playerDetermined = true;
            console.log('Matched by playerId as player1 (guest):', socketData.playerId);
          } else if (game.player2GuestId && game.player2GuestId === socketData.playerId) {
            player = 2;
            playerDetermined = true;
            console.log('Matched by playerId as player2 (guest):', socketData.playerId);
          } else {
            console.log('playerId did not match:', {
              socketPlayerId: socketData.playerId,
              gamePlayer1GuestId: game.player1GuestId,
              gamePlayer2GuestId: game.player2GuestId,
            });
          }
        }
        
        // Also check if authenticated user matches guest IDs (edge case)
        if (!playerDetermined && socketData.userId) {
          if (game.player1GuestId && game.player1GuestId === socketData.userId.toString()) {
            player = 1;
            playerDetermined = true;
            console.log('Matched by userId as guest player1');
          } else if (game.player2GuestId && game.player2GuestId === socketData.userId.toString()) {
            player = 2;
            playerDetermined = true;
            console.log('Matched by userId as guest player2');
          }
        }
        
        if (!playerDetermined) {
          console.error('Could not determine player - socketData:', JSON.stringify(socketData, null, 2), 'game:', {
            player1: game.player1?.toString(),
            player1GuestId: game.player1GuestId,
            player2: game.player2?.toString(),
            player2GuestId: game.player2GuestId,
          });
          socket.emit('game-error', { message: 'Could not determine player number. Please rejoin the room.' });
          return;
        }
        
        console.log('Player determined successfully:', player);

        console.log('Attempting move:', { row, col, player, currentPlayer: game.currentPlayer, gameStatus: game.gameStatus });

        const result = await makeMove(game, row, col, player);
        if (!result.success) {
          console.log('Move failed:', result.message);
          socket.emit('move-validated', { valid: false, message: result.message });
          return;
        }

        console.log('Move successful, reloading game to get latest state');

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

        console.log('Emitting move-made to room:', {
          move: move ? { row: move.row, col: move.col, player: move.player } : null,
          currentPlayer: updatedGame.currentPlayer,
          gameStatus: updatedGame.gameStatus,
        });

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
          console.log('Game finished, emitting game-finished event');
          io.to(roomId).emit('game-finished', {
            winner: updatedGame.winner,
            reason: updatedGame.winner === 'draw' ? 'Draw' : `Player ${updatedGame.winner} wins!`,
          });
          io.to(roomId).emit('score-updated', { score: updatedGame.score });
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
          socket.emit('game-error', { message: 'Game is not in waiting status' });
          return;
        }

        if (!game.player2 && !game.player2GuestId) {
          socket.emit('game-error', { message: 'Not enough players to start' });
          return;
        }

        // Start the game
        game.gameStatus = 'playing';
        game.currentPlayer = 1;
        await game.save();

        io.to(roomId).emit('game-started', {
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

        io.to(roomId).emit('game-finished', {
          winner,
          reason: 'Opponent surrendered',
        });
        io.to(roomId).emit('score-updated', { score: game.score });
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
        game.finishedAt = null;

        await game.save();

        io.to(roomId).emit('move-made', {
          move: null,
          board: game.board,
          currentPlayer: game.currentPlayer,
        });
      } catch (error: any) {
        socket.emit('game-error', { message: error.message });
      }
    });

    // Leave room
    socket.on('leave-room', async (data: { roomId: string }) => {
      socket.leave(data.roomId);
      socket.to(data.roomId).emit('player-left', { playerId: socketData.userId || 'guest' });
      socketData.currentRoomId = undefined;
    });

    // Disconnect
    socket.on('disconnect', async () => {
      if (socketData.currentRoomId) {
        socket.to(socketData.currentRoomId).emit('player-left', {
          playerId: socketData.userId || 'guest',
        });
      }
    });
  });
};


