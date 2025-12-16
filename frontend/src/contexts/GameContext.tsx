import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Game, GameMove, PlayerInfo, PlayerNumber } from '../types/game.types';
import { socketService } from '../services/socketService';
import { getGuestId } from '../utils/guestId';
import { useAuth } from './AuthContext';

interface GameContextType {
  game: Game | null;
  players: PlayerInfo[];
  currentPlayer: PlayerNumber;
  isMyTurn: boolean;
  myPlayerNumber: PlayerNumber | null;
  roomId: string | null;
  pendingUndoMove: number | null;
  setGame: (game: Game | null) => void;
  joinRoom: (roomId: string) => void;
  makeMove: (row: number, col: number) => void;
  requestUndo: (moveNumber: number) => void;
  approveUndo: (moveNumber: number) => void;
  rejectUndo: () => void;
  surrender: () => void;
  startGame: () => void;
  newGame: () => void;
  leaveRoom: () => void;
  clearPendingUndo: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Helper function to convert game data to players array
const gameToPlayers = (game: Game): PlayerInfo[] => {
  const players: PlayerInfo[] = [];
  
  if (game.player1) {
    players.push({
      id: game.player1,
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
  
  if (game.player2) {
    players.push({
      id: game.player2,
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
  
  return players;
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myPlayerNumber, setMyPlayerNumber] = useState<PlayerNumber | null>(null);
  const [pendingUndoMove, setPendingUndoMove] = useState<number | null>(null);
  
  // Update players when game changes (only if players array is empty or doesn't match)
  // This ensures we have initial players, but socket events take precedence for real-time updates
  useEffect(() => {
    if (game) {
      const gamePlayers = gameToPlayers(game);
      console.log('Game changed, checking players from game data:', gamePlayers, 'current players:', players);
      
      // Only update if players array is empty or significantly different
      // This prevents overriding socket updates
      if (players.length === 0 || 
          (gamePlayers.length > players.length && 
           !gamePlayers.every(p => players.some(ep => ep.id === p.id)))) {
        console.log('Updating players from game data');
        setPlayers(gamePlayers);
        
        // Update my player number
        // Need to check both authenticated user ID and guest ID
        // because user might have created game as guest, then logged in
        const guestId = getGuestId();
        const authenticatedUserId = isAuthenticated ? user?._id : null;
        
        console.log('Trying to match my player - authenticatedUserId:', authenticatedUserId, 'isAuthenticated:', isAuthenticated, 'guestId:', guestId);
        console.log('Available players:', gamePlayers);
        console.log('Game data - player1:', game.player1, 'player1GuestId:', game.player1GuestId, 'player2:', game.player2, 'player2GuestId:', game.player2GuestId);
        
        // Try to find player by matching either authenticated user ID or guest ID
        const myPlayer = gamePlayers.find(p => {
          // Check if this player matches authenticated user ID
          if (authenticatedUserId && p.id === authenticatedUserId && !p.isGuest) {
            console.log('Matched by authenticated user ID:', p);
            return true;
          }
          // Check if this player matches guest ID
          if (guestId && p.id === guestId && p.isGuest) {
            console.log('Matched by guest ID:', p);
            return true;
          }
          // Also check if game data has our IDs (for edge cases)
          if (authenticatedUserId && game.player1 === authenticatedUserId && p.playerNumber === 1 && !p.isGuest) {
            console.log('Matched by game.player1:', p);
            return true;
          }
          if (guestId && game.player1GuestId === guestId && p.playerNumber === 1 && p.isGuest) {
            console.log('Matched by game.player1GuestId:', p);
            return true;
          }
          if (authenticatedUserId && game.player2 === authenticatedUserId && p.playerNumber === 2 && !p.isGuest) {
            console.log('Matched by game.player2:', p);
            return true;
          }
          if (guestId && game.player2GuestId === guestId && p.playerNumber === 2 && p.isGuest) {
            console.log('Matched by game.player2GuestId:', p);
            return true;
          }
          return false;
        });
        
        if (myPlayer) {
          setMyPlayerNumber(myPlayer.playerNumber);
          console.log('My player number set from game data:', myPlayer.playerNumber, 'myPlayer:', myPlayer);
        } else {
          console.warn('Could not find my player in gamePlayers:', gamePlayers, 'authenticatedUserId:', authenticatedUserId, 'guestId:', guestId, 'isGuest:', !isAuthenticated);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, isAuthenticated, user?._id]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleRoomJoined = (data: { roomId: string; players: PlayerInfo[]; gameStatus?: string; currentPlayer?: PlayerNumber }) => {
      console.log('Room joined event received:', data);
      setRoomId(data.roomId);
      // Update players from socket - this ensures real-time sync
      setPlayers(data.players);
      
      // Determine my player number
      // Need to check both authenticated user ID and guest ID
      const guestId = getGuestId();
      const authenticatedUserId = isAuthenticated ? user?._id : null;
      
      console.log('Room-joined: Trying to match my player - authenticatedUserId:', authenticatedUserId, 'isAuthenticated:', isAuthenticated, 'guestId:', guestId);
      console.log('Room-joined: Available players:', data.players);
      
      // Try to find player by matching either authenticated user ID or guest ID
      const myPlayer = data.players.find(p => {
        // Check if this player matches authenticated user ID
        if (authenticatedUserId && p.id === authenticatedUserId && !p.isGuest) {
          console.log('Room-joined: Matched by authenticated user ID:', p);
          return true;
        }
        // Check if this player matches guest ID
        if (guestId && p.id === guestId && p.isGuest) {
          console.log('Room-joined: Matched by guest ID:', p);
          return true;
        }
        return false;
      });
      
      if (myPlayer) {
        setMyPlayerNumber(myPlayer.playerNumber);
        console.log('Player number set from room-joined:', myPlayer.playerNumber, 'for player:', myPlayer);
      } else {
        console.warn('Could not find my player in players list:', data.players, 'authenticatedUserId:', authenticatedUserId, 'guestId:', guestId, 'isGuest:', !isAuthenticated);
        setMyPlayerNumber(null);
      }
      
      // Update game state with information from socket - use functional update to avoid dependency issues
      setGame(prevGame => {
        if (!prevGame) return prevGame;
        return {
          ...prevGame,
          gameStatus: (data.gameStatus as any) || prevGame.gameStatus,
          currentPlayer: data.currentPlayer || prevGame.currentPlayer,
        };
      });
    };

    const handlePlayerJoined = (data: { player: PlayerInfo }) => {
      console.log('Player joined event received:', data);
      setPlayers(prev => {
        // Check if player already exists
        const exists = prev.some(p => p.id === data.player.id);
        if (exists) {
          console.log('Player already exists, skipping:', data.player.id);
          return prev;
        }
        
        const updated = [...prev, data.player];
        console.log('Updated players list:', updated);
        // Update my player number if this is me joining
        const guestId = getGuestId();
        const myId = isAuthenticated ? user?._id : guestId;
        if (data.player.id === myId && 
            ((isAuthenticated && !data.player.isGuest) || (!isAuthenticated && data.player.isGuest))) {
          setMyPlayerNumber(data.player.playerNumber);
        }
        return updated;
      });
      
      // Don't auto-update game status - wait for start button
    };

    const handlePlayerLeft = (data: { playerId: string }) => {
      setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    };

    const handleMoveMade = (data: { move: GameMove | null; board: number[][]; currentPlayer: PlayerNumber }) => {
      console.log('Move made event received:', data);
      setGame(prevGame => {
        if (!prevGame) {
          console.warn('Received move-made but no game state');
          return prevGame;
        }
        console.log('Updating game state with move:', {
          oldBoard: prevGame.board,
          newBoard: data.board,
          oldCurrentPlayer: prevGame.currentPlayer,
          newCurrentPlayer: data.currentPlayer,
        });
        return {
          ...prevGame,
          board: data.board,
          currentPlayer: data.currentPlayer,
          gameStatus: 'playing', // Ensure game status is playing
        };
      });
    };

    const handleGameFinished = (data: { winner: PlayerNumber | null; reason: string }) => {
      setGame(prevGame => {
        if (!prevGame) return prevGame;
        return {
          ...prevGame,
          gameStatus: 'finished',
          winner: data.winner,
        };
      });
    };

    const handleScoreUpdated = (data: { score: { player1: number; player2: number } }) => {
      setGame(prevGame => {
        if (!prevGame) return prevGame;
        return {
          ...prevGame,
          score: data.score,
        };
      });
    };

    const handleUndoRequested = (data: { moveNumber: number; requestedBy: PlayerNumber }) => {
      // Only show dialog if it's not my move (opponent wants to undo)
      // Use current myPlayerNumber from closure
      const currentMyPlayerNumber = myPlayerNumber;
      if (data.requestedBy !== currentMyPlayerNumber) {
        setPendingUndoMove(data.moveNumber);
      }
    };

    const handleUndoApproved = (data: { moveNumber: number; board: number[][] }) => {
      setGame(prevGame => {
        if (!prevGame) return prevGame;
        return {
          ...prevGame,
          board: data.board,
        };
      });
      setPendingUndoMove(null);
    };

    const handleGameStarted = (data: { currentPlayer: PlayerNumber }) => {
      setGame(prevGame => {
        if (!prevGame) return prevGame;
        return {
          ...prevGame,
          gameStatus: 'playing',
          currentPlayer: data.currentPlayer,
        };
      });
    };

    const handleGameError = (data: { message: string }) => {
      console.error('Game error received:', data.message);
      alert(`Game Error: ${data.message}`);
    };

    const handleMoveValidated = (data: { valid: boolean; message?: string }) => {
      console.log('Move validated event received:', data);
      if (!data.valid) {
        console.warn('Move was invalid:', data.message);
        alert(`Invalid move: ${data.message}`);
      }
    };

    socket.on('room-joined', handleRoomJoined);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('move-made', handleMoveMade);
    socket.on('move-validated', handleMoveValidated);
    socket.on('game-finished', handleGameFinished);
    socket.on('score-updated', handleScoreUpdated);
    socket.on('undo-requested', handleUndoRequested);
    socket.on('undo-approved', handleUndoApproved);
    socket.on('game-started', handleGameStarted);
    socket.on('game-error', handleGameError);

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('player-joined', handlePlayerJoined);
      socket.off('player-left', handlePlayerLeft);
      socket.off('move-made', handleMoveMade);
      socket.off('move-validated', handleMoveValidated);
      socket.off('game-finished', handleGameFinished);
      socket.off('score-updated', handleScoreUpdated);
      socket.off('undo-requested', handleUndoRequested);
      socket.off('undo-approved', handleUndoApproved);
      socket.off('game-started', handleGameStarted);
      socket.off('game-error', handleGameError);
    };
  }, [isAuthenticated, user?._id, myPlayerNumber]);

  const joinRoom = useCallback((newRoomId: string): void => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Don't join if already in this room
    if (newRoomId === roomId) {
      return;
    }

    const guestId = getGuestId();
    
    // Determine playerId based on game data
    // If game has guestId for this player, use guestId; otherwise use userId
    let playerId: string;
    let isGuest: boolean;
    
    if (game) {
      // Check if this player is in the game as guest or authenticated
      const myId = isAuthenticated ? user?._id : guestId;
      const isPlayer1Guest = game.player1GuestId && game.player1GuestId === guestId;
      const isPlayer2Guest = game.player2GuestId && game.player2GuestId === guestId;
      const isPlayer1Auth = game.player1 && game.player1 === myId;
      const isPlayer2Auth = game.player2 && game.player2 === myId;
      
      if (isPlayer1Guest || isPlayer2Guest) {
        // Player is in game as guest, use guestId
        playerId = guestId;
        isGuest = true;
      } else if (isPlayer1Auth || isPlayer2Auth) {
        // Player is in game as authenticated, use userId
        playerId = user?._id || '';
        isGuest = false;
      } else {
        // Not yet in game, use guestId if not authenticated, userId if authenticated
        playerId = isAuthenticated ? user?._id || '' : guestId;
        isGuest = !isAuthenticated;
      }
    } else {
      // No game data yet, use default logic
      playerId = isAuthenticated ? user?._id || '' : guestId;
      isGuest = !isAuthenticated;
    }

    console.log('Joining room:', { roomId: newRoomId, playerId, isGuest, gamePlayer1GuestId: game?.player1GuestId, gamePlayer2GuestId: game?.player2GuestId });
    socket.emit('join-room', { roomId: newRoomId, playerId, isGuest });
    setRoomId(newRoomId);
  }, [isAuthenticated, user?._id, roomId, game]);

  const makeMove = (row: number, col: number): void => {
    if (!roomId) {
      console.error('Cannot make move: no roomId');
      return;
    }
    const socket = socketService.getSocket();
    if (!socket) {
      console.error('Cannot make move: socket not connected');
      return;
    }

    console.log('Emitting make-move:', { roomId, row, col, myPlayerNumber });
    socket.emit('make-move', { roomId, row, col });
  };

  const requestUndo = (moveNumber: number): void => {
    if (!roomId) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('request-undo', { roomId, moveNumber });
  };

  const approveUndo = (moveNumber: number): void => {
    if (!roomId) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('approve-undo', { roomId, moveNumber });
  };

  const rejectUndo = (): void => {
    if (!roomId) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('reject-undo', { roomId });
    setPendingUndoMove(null);
  };

  const clearPendingUndo = (): void => {
    setPendingUndoMove(null);
  };

  const surrender = (): void => {
    if (!roomId) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('surrender', { roomId });
  };

  const startGame = (): void => {
    if (!roomId) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('start-game', { roomId });
  };

  const newGame = (): void => {
    if (!roomId) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('new-game', { roomId });
  };

  const leaveRoom = (): void => {
    if (!roomId) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('leave-room', { roomId });
    setRoomId(null);
    setGame(null);
    setPlayers([]);
    setMyPlayerNumber(null);
  };

  const currentPlayer = game?.currentPlayer || 1;
  const isMyTurn = myPlayerNumber !== null && currentPlayer === myPlayerNumber;

  return (
    <GameContext.Provider
      value={{
        game,
        players,
        currentPlayer,
        isMyTurn,
        myPlayerNumber,
        roomId,
        pendingUndoMove,
        setGame,
        joinRoom,
        makeMove,
        requestUndo,
        approveUndo,
        rejectUndo,
        surrender,
        startGame,
        newGame,
        leaveRoom,
        clearPendingUndo,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

