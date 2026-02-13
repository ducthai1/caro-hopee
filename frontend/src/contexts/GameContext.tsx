import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { Game, GameMove, PlayerInfo, PlayerNumber, Winner } from '../types/game.types';
import { socketService } from '../services/socketService';
import { getGuestId } from '../utils/guestId';
import { getGuestName } from '../utils/guestName';
import { gameToPlayers, updatePlayerWithGuestName } from './gameContextHelpers';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { gameApi, gameStatsApi } from '../services/api';
import { saveGuestHistory } from '../utils/guestHistory';
import { logger } from '../utils/logger';
import { AchievementDefinition } from '../constants/achievements';
import { getToast } from './ToastContext';
import { playChatSound } from '../utils/sound';

/**
 * GameContext - Split into 3 separate contexts to prevent re-render cascade
 * Fixes Critical Issue C4: Context Re-Render Cascade
 *
 * Architecture:
 * 1. GameStateContext - Rarely changing (game, roomId, players, myPlayerNumber)
 * 2. GamePlayContext - Frequently changing (currentPlayer, isMyTurn, lastMove, pendingUndo)
 * 3. GameActionsContext - Never changes (all action functions)
 *
 * Components can subscribe to only what they need, preventing unnecessary re-renders.
 */

// ============================================================================
// Context Types
// ============================================================================

interface GameStateContextType {
  game: Game | null;
  players: PlayerInfo[];
  myPlayerNumber: PlayerNumber | null;
  roomId: string | null;
}

interface GamePlayContextType {
  currentPlayer: PlayerNumber;
  isMyTurn: boolean;
  lastMove: { row: number; col: number } | null;
  pendingUndoMove: number | null;
  undoRequestSent: boolean;
  undoUsedCount: number;
}

interface GameActionsContextType {
  setGame: (game: Game | null) => void;
  joinRoom: (roomId: string) => void;
  makeMove: (row: number, col: number) => void;
  requestUndo: (moveNumber: number) => void;
  approveUndo: (moveNumber: number) => void;
  rejectUndo: () => void;
  surrender: () => void;
  startGame: () => void;
  newGame: () => void;
  leaveRoom: () => Promise<void>;
  clearPendingUndo: () => void;
  refreshPlayers: () => void;
  updateGuestName: (guestName: string) => void;
  sendReaction: (emoji: string) => void;
}

// Reaction received (from opponent or self)
interface ReceivedReaction {
  id: string; // unique id for React key
  emoji: string;
  fromName: string;
  fromPlayerNumber: 1 | 2;
  isSelf: boolean; // true if sender is viewing their own reaction
}

// Reaction context for components that need to listen to reactions
interface ReactionContextType {
  reactions: ReceivedReaction[];
  clearReaction: (id: string) => void;
}

// Chat message received (from opponent or self)
export interface CaroChatMessage {
  id: string;
  message: string;
  fromName: string;
  fromPlayerNumber: 1 | 2;
  isSelf: boolean;
}

// Chat context for components that need to listen to chat
interface ChatContextType {
  chatMessages: CaroChatMessage[];
  sendChat: (message: string) => void;
  clearChat: (id: string) => void;
}

// Combined type for backward compatibility
interface GameContextType extends GameStateContextType, GamePlayContextType, GameActionsContextType { }

// ============================================================================
// Create Contexts
// ============================================================================

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);
const GamePlayContext = createContext<GamePlayContextType | undefined>(undefined);
const GameActionsContext = createContext<GameActionsContextType | undefined>(undefined);
const ReactionContext = createContext<ReactionContextType | undefined>(undefined);
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Legacy context for backward compatibility
const GameContext = createContext<GameContextType | undefined>(undefined);

// ============================================================================
// Helper Functions
// ============================================================================

// Helper functions moved to gameContextHelpers.ts

// ============================================================================
// Provider Component
// ============================================================================

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { isConnected: socketConnected } = useSocket();

  // State values
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [myPlayerNumber, setMyPlayerNumber] = useState<PlayerNumber | null>(null);
  const [pendingUndoMove, setPendingUndoMove] = useState<number | null>(null);
  const [undoRequestSent, setUndoRequestSent] = useState<boolean>(false);
  const [undoUsedCount, setUndoUsedCount] = useState<number>(0);
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null);
  const [reactions, setReactions] = useState<ReceivedReaction[]>([]);
  const [chatMessages, setChatMessages] = useState<CaroChatMessage[]>([]);

  // FIX C1: Auto-cleanup reactions array to prevent unbounded memory growth
  // Reactions older than 5 seconds are automatically removed
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setReactions(prev => {
        if (prev.length === 0) return prev;
        const now = Date.now();
        // Filter out reactions older than 5 seconds based on timestamp in ID
        const filtered = prev.filter(r => {
          // ID format: "reaction-{timestamp}-{random}" or "reaction-self-{timestamp}-{random}"
          const parts = r.id.split('-');
          const timestampIndex = parts[1] === 'self' ? 2 : 1;
          const timestamp = parseInt(parts[timestampIndex], 10);
          return !isNaN(timestamp) && (now - timestamp) < 5000;
        });
        // Only update if something was filtered
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 2000); // Check every 2 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  // Auto-cleanup chat messages older than 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setChatMessages(prev => {
        if (prev.length === 0) return prev;
        const now = Date.now();
        const filtered = prev.filter(m => {
          const parts = m.id.split('-');
          const tsIndex = parts[1] === 'self' ? 2 : 1;
          const ts = parseInt(parts[tsIndex], 10);
          return !isNaN(ts) && (now - ts) < 6000;
        });
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Refs for cleanup and latest values
  const rafIdRef = useRef<number | null>(null);
  const isMountedRef = useRef(true); // Track if component is mounted (for RAF race condition fix)
  const isAuthenticatedRef = useRef(isAuthenticated);
  const userRef = useRef(user);
  const myPlayerNumberRef = useRef(myPlayerNumber);
  const roomIdRef = useRef(roomId);
  const playersRef = useRef(players);
  const gameRef = useRef(game);
  const pendingTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  // Debounce refs to prevent rapid API calls during join/leave spam
  const reloadGameDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingReloadRef = useRef<boolean>(false);
  // Ref to track undo request state for socket event handlers
  const undoRequestSentRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { isAuthenticatedRef.current = isAuthenticated; }, [isAuthenticated]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { myPlayerNumberRef.current = myPlayerNumber; }, [myPlayerNumber]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { undoRequestSentRef.current = undoRequestSent; }, [undoRequestSent]);

  // Update players when game changes
  useEffect(() => {
    if (game) {
      try {
        const gamePlayers = gameToPlayers(game);

        setPlayers(prevPlayers => {
          if (prevPlayers.length === 0 ||
            (gamePlayers.length > prevPlayers.length &&
              !gamePlayers.every(p => prevPlayers.some(ep => ep.id === p.id)))) {

            const guestId = getGuestId();
            const authenticatedUserId = isAuthenticated ? user?._id : null;

            const myPlayer = gamePlayers.find(p => {
              if (authenticatedUserId && p.id === authenticatedUserId && !p.isGuest) return true;
              if (guestId && p.id === guestId && p.isGuest) return true;
              // Safety checks for game properties
              if (authenticatedUserId && game?.player1 === authenticatedUserId && p.playerNumber === 1 && !p.isGuest) return true;
              if (guestId && game?.player1GuestId === guestId && p.playerNumber === 1 && p.isGuest) return true;
              if (authenticatedUserId && game?.player2 === authenticatedUserId && p.playerNumber === 2 && !p.isGuest) return true;
              if (guestId && game?.player2GuestId === guestId && p.playerNumber === 2 && p.isGuest) return true;
              return false;
            });

            if (myPlayer) {
              const playerNumber = myPlayer.playerNumber;
              if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
              }
              rafIdRef.current = requestAnimationFrame(() => {
                // Check isMounted to prevent state update on unmounted component (fixes C1 RAF race condition)
                if (!isMountedRef.current) return;
                setMyPlayerNumber(playerNumber);
                rafIdRef.current = null;
              });
            }

            return gamePlayers;
          }
          return prevPlayers;
        });
      } catch (error) {
        // Safety: catch any errors during player update
        console.error('[GameContext] Error updating players:', error);
        logger.error('[GameContext] Error updating players:', error);
      }
    }

    return () => {
      isMountedRef.current = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, isAuthenticated, user?._id]);

  // Debounced game reload to prevent rapid API calls during join/leave spam
  const debouncedReloadGame = useCallback(async (isMounted: { current: boolean }) => {
    // Mark that a reload is pending
    pendingReloadRef.current = true;

    // Clear any existing debounce timeout and remove from pending array (fixes H1)
    if (reloadGameDebounceRef.current) {
      clearTimeout(reloadGameDebounceRef.current);
      const index = pendingTimeoutsRef.current.indexOf(reloadGameDebounceRef.current);
      if (index > -1) pendingTimeoutsRef.current.splice(index, 1);
    }

    // Debounce: wait 150ms before making API call
    const timeoutId = setTimeout(async () => {
      if (!isMounted.current || !pendingReloadRef.current) return;

      const currentRoomId = roomIdRef.current;
      if (!currentRoomId) {
        pendingReloadRef.current = false;
        return;
      }

      try {
        const updatedGame = await gameApi.getGame(currentRoomId);
        if (!isMounted.current) return;

        setGame(updatedGame);
        const gamePlayers = gameToPlayers(updatedGame);
        setPlayers(gamePlayers);

        // Update my player number
        const guestId = getGuestId();
        const currentIsAuth = isAuthenticatedRef.current;
        const authenticatedUserId = currentIsAuth ? userRef.current?._id : null;

        const myPlayer = gamePlayers.find(p => {
          if (authenticatedUserId && p.id === authenticatedUserId && !p.isGuest) return true;
          if (guestId && p.id === guestId && p.isGuest) return true;
          return false;
        });

        if (myPlayer) setMyPlayerNumber(myPlayer.playerNumber);
      } catch (error: any) {
        if (error.response?.status === 404) {
          setRoomId(null);
          setGame(null);
          setPlayers([]);
          setMyPlayerNumber(null);
        }
        logger.error('Failed to reload game state:', error);
      } finally {
        pendingReloadRef.current = false;
        // Remove self from pending timeouts
        const index = pendingTimeoutsRef.current.indexOf(timeoutId);
        if (index > -1) pendingTimeoutsRef.current.splice(index, 1);
      }
    }, 150) as NodeJS.Timeout;

    reloadGameDebounceRef.current = timeoutId;
    pendingTimeoutsRef.current.push(timeoutId); // Track timeout for cleanup (fixes H1)
  }, []);

  // Socket listeners setup - runs when socket connects/disconnects
  // CRITICAL FIX: Must depend on socketConnected to re-register listeners when socket reconnects
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !socketConnected) return;

    const isMountedRef = { current: true };

    pendingTimeoutsRef.current.forEach(clearTimeout);
    pendingTimeoutsRef.current = [];

    // Cleanup debounce on unmount
    const cleanupDebounce = () => {
      if (reloadGameDebounceRef.current) {
        clearTimeout(reloadGameDebounceRef.current);
        reloadGameDebounceRef.current = null;
      }
      pendingReloadRef.current = false;
    };

    const handleRoomJoined = (data: { roomId: string; players: PlayerInfo[]; gameStatus?: string; currentPlayer?: PlayerNumber }) => {
      if (!isMountedRef.current) return;

      // Safety check: validate data structure
      if (!data || !data.roomId || typeof data.roomId !== 'string') {
        logger.error('[GameContext] Invalid room-joined data:', data);
        return;
      }

      if (!Array.isArray(data.players)) {
        logger.error('[GameContext] Invalid players array in room-joined:', data);
        return;
      }

      setRoomId(data.roomId);

      // Override guest name from sessionStorage if available
      const updatedPlayers: PlayerInfo[] = data.players.map(updatePlayerWithGuestName);
      setPlayers(updatedPlayers);

      const currentIsAuth = isAuthenticatedRef.current;
      const currentUser = userRef.current;
      const authenticatedUserId = currentIsAuth ? currentUser?._id : null;
      const guestId = getGuestId();

      const myPlayer = updatedPlayers.find(p => {
        if (authenticatedUserId && p.id === authenticatedUserId && !p.isGuest) return true;
        if (guestId && p.id === guestId && p.isGuest) return true;
        return false;
      });

      if (myPlayer) {
        setMyPlayerNumber(myPlayer.playerNumber);
      } else {
        setMyPlayerNumber(null);
      }

      // Update game state with player info from room-joined
      // This ensures game has correct player2 info if they joined before we connected to room
      setGame(prevGame => {
        if (!prevGame) return prevGame;

        // Find player2 from the players list
        const player2 = data.players.find(p => p.playerNumber === 2);

        return {
          ...prevGame,
          gameStatus: (data.gameStatus as any) || prevGame.gameStatus,
          currentPlayer: data.currentPlayer || prevGame.currentPlayer,
          // Update player2 info if present in room-joined data
          ...(player2 ? {
            player2: player2.isGuest ? null : player2.id,
            player2GuestId: player2.isGuest ? player2.id : null,
          } : {}),
        };
      });
    };

    const handlePlayerJoined = (data: { player: PlayerInfo }) => {
      if (!isMountedRef.current) return;

      // Safety check: validate data structure
      if (!data || !data.player || typeof data.player !== 'object') {
        logger.error('[GameContext] Invalid player-joined data:', data);
        return;
      }

      if (!data.player.id || !data.player.playerNumber) {
        logger.error('[GameContext] Invalid player data in player-joined:', data);
        return;
      }

      setPlayers(prev => {
        const exists = prev.some(p => p.id === data.player.id);
        if (exists) return prev;

        // Override guest name from sessionStorage if available
        const player = updatePlayerWithGuestName(data.player);

        const updated = [...prev, player];
        const currentIsAuth = isAuthenticatedRef.current;
        const guestId = getGuestId();
        const myId = currentIsAuth ? userRef.current?._id : guestId;
        if (player.id === myId &&
          ((currentIsAuth && !player.isGuest) || (!currentIsAuth && player.isGuest))) {
          setMyPlayerNumber(player.playerNumber);
        } else {
          // Notify about opponent joining (only if not self)
          getToast()?.info('toast.playerJoined', { params: { name: player.username || 'Player' } });
        }
        return updated;
      });

      // Immediately update game state with player2 info (no debounce for joining)
      // This ensures the "Start Game" button appears immediately for player1
      if (data.player.playerNumber === 2) {
        setGame(prevGame => {
          if (!prevGame) return prevGame;
          // Update game with player2 info based on guest status
          if (data.player.isGuest) {
            return {
              ...prevGame,
              player2GuestId: data.player.id,
              player2: null,
            };
          } else {
            return {
              ...prevGame,
              player2: data.player.id,
              player2GuestId: null,
            };
          }
        });
      }

      // Still do debounced reload for complete data sync (optional, for consistency)
      const currentGame = gameRef.current;
      if (!currentGame || !currentGame.player2) {
        debouncedReloadGame(isMountedRef);
      }
    };

    const handlePlayerLeft = (data: {
      playerId?: string;
      playerNumber?: number;
      roomId?: string;
      hostTransferred?: boolean;
      gameReset?: boolean;
      game?: {
        player1: any;
        player1GuestId: string | null;
        player2: any;
        player2GuestId: string | null;
        gameStatus: string;
        currentPlayer: number;
      };
    }) => {
      if (!isMountedRef.current) return;

      // Safety check: validate data structure
      if (!data || typeof data !== 'object') {
        logger.error('[GameContext] Invalid player-left data:', data);
        return;
      }

      // Notify about player leaving
      if (data.playerNumber) {
        const leavingPlayer = playersRef.current.find(p => p.playerNumber === data.playerNumber);
        if (leavingPlayer) {
          getToast()?.warning('toast.playerLeft', { params: { name: leavingPlayer.username || 'Player' } });
        }
      }

      const currentRoomId = roomIdRef.current;
      const isForCurrentRoom = !data.roomId || data.roomId === currentRoomId;
      const hasRelevantData = data.hostTransferred || data.playerNumber !== undefined || data.playerId || data.gameReset;

      // If host was transferred, update game state immediately
      if (data.hostTransferred && data.game) {
        // Update game state immediately
        setGame(prevGame => {
          if (!prevGame) return prevGame;
          return {
            ...prevGame,
            player1: data.game!.player1,
            player1GuestId: data.game!.player1GuestId,
            player2: data.game!.player2,
            player2GuestId: data.game!.player2GuestId,
            gameStatus: data.game!.gameStatus as any,
            currentPlayer: data.game!.currentPlayer as any,
          };
        });

        // Update myPlayerNumber if host transfer affects current user
        // If I was player2 and host transferred, I'm now player1
        if (myPlayerNumberRef.current === 2) {
          setMyPlayerNumber(1);
          console.log('[GameContext] Host transferred: I am now player1');
        }

        // Update players list
        setPlayers(prev => {
          const filtered = data.playerNumber ? prev.filter(p => p.playerNumber !== data.playerNumber) : prev;
          // Update player numbers if host was transferred
          if (data.hostTransferred) {
            return filtered.map(p => {
              if (p.playerNumber === 2) {
                return { ...p, playerNumber: 1 };
              }
              return p;
            });
          }
          return filtered;
        });
      } else {
        // Immediately update players list for responsive UI
        if (data.playerNumber) {
          setPlayers(prev => prev.filter(p => p.playerNumber !== data.playerNumber));
        }
      }

      // Use debounced reload for API call to prevent spam (but immediate update above handles host transfer)
      if (currentRoomId && (isForCurrentRoom || hasRelevantData)) {
        debouncedReloadGame(isMountedRef);
      }
    };

    const handleGameDeleted = (data: { roomId: string }) => {
      if (!isMountedRef.current) return;

      // Safety check: validate data structure
      if (!data || !data.roomId || typeof data.roomId !== 'string') {
        logger.error('[GameContext] Invalid game-deleted data:', data);
        return;
      }

      if (data.roomId === roomIdRef.current) {
        setRoomId(null);
        setGame(null);
        setPlayers([]);
        setMyPlayerNumber(null);
      }
    };

    const handleMoveMade = (data: { move: GameMove | null; board: number[][]; currentPlayer: PlayerNumber }) => {
      if (!isMountedRef.current) return;

      // Safety check: validate data structure
      if (!data || !Array.isArray(data.board) || typeof data.currentPlayer !== 'number') {
        logger.error('[GameContext] Invalid move-made data:', data);
        return;
      }

      setGame(prevGame => {
        if (!prevGame) return prevGame;
        return {
          ...prevGame,
          board: data.board,
          currentPlayer: data.currentPlayer,
          gameStatus: 'playing',
        };
      });
      if (data.move) {
        setLastMove({ row: data.move.row, col: data.move.col });
      }
      setUndoRequestSent(false);
    };

    const handleGameFinished = async (data: {
      winner: Winner;
      reason: string;
      winningLine?: Array<{ row: number; col: number }>;
      score?: { player1: number; player2: number };
    }) => {
      if (!isMountedRef.current) return;

      // Safety check: validate data structure
      if (!data || (data.winner !== null && data.winner !== 1 && data.winner !== 2 && data.winner !== 'draw')) {
        logger.error('[GameContext] Invalid game-finished data:', data);
        return;
      }

      if (data.winningLine && !Array.isArray(data.winningLine)) {
        logger.error('[GameContext] Invalid winningLine in game-finished:', data);
        return;
      }

      if (data.score && (typeof data.score.player1 !== 'number' || typeof data.score.player2 !== 'number')) {
        logger.error('[GameContext] Invalid score in game-finished:', data);
        return;
      }

      let finishedGameData: {
        roomId: string;
        roomCode: string;
        boardSize: number;
        board: number[][];
        winner: Winner;
        winningLine?: Array<{ row: number; col: number }>;
        score: { player1: number; player2: number };
        createdAt: string;
        finishedAt: string | null;
      } | null = null;

      setGame(prevGame => {
        if (!prevGame) return prevGame;

        // Use winningLine and score from event data if available, otherwise fallback to prevGame
        const winningLine = data.winningLine !== undefined ? data.winningLine : prevGame.winningLine;
        const score = data.score || prevGame.score;

        finishedGameData = {
          roomId: prevGame.roomId,
          roomCode: prevGame.roomCode,
          boardSize: prevGame.boardSize,
          board: prevGame.board,
          winner: data.winner,
          winningLine: winningLine,
          score: score,
          createdAt: prevGame.createdAt,
          finishedAt: prevGame.finishedAt,
        };

        return {
          ...prevGame,
          gameStatus: 'finished',
          winner: data.winner,
          winningLine: winningLine,
          score: score,
        };
      });

      const timeoutId = setTimeout(async () => {
        if (!isMountedRef.current) return;

        // Re-capture game state inside timeout to fix race condition (C3 in frontend audit)
        const currentGame = gameRef.current;
        const currentFinishedData = finishedGameData || (currentGame ? {
          roomId: currentGame.roomId,
          roomCode: currentGame.roomCode,
          boardSize: currentGame.boardSize,
          board: currentGame.board,
          winner: currentGame.winner,
          winningLine: currentGame.winningLine,
          score: currentGame.score,
          createdAt: currentGame.createdAt,
          finishedAt: currentGame.finishedAt,
        } : null);

        const currentIsAuthenticated = isAuthenticatedRef.current;
        const currentUser = userRef.current;
        const currentMyPlayerNumber = myPlayerNumberRef.current;
        const currentPlayers = playersRef.current;

        if (!currentIsAuthenticated && currentFinishedData && currentMyPlayerNumber) {
          try {
            const opponent = currentPlayers.find(p => p.playerNumber !== currentMyPlayerNumber);
            const opponentUsername = opponent?.username || 'Unknown';

            let myResult: 'win' | 'loss' | 'draw';
            const winner = currentFinishedData.winner;
            if (winner === 'draw' || winner === null) {
              myResult = 'draw';
            } else if (currentMyPlayerNumber === winner) {
              myResult = 'win';
            } else {
              myResult = 'loss';
            }

            saveGuestHistory({
              roomId: currentFinishedData.roomId,
              roomCode: currentFinishedData.roomCode,
              boardSize: currentFinishedData.boardSize,
              board: currentFinishedData.board,
              winner: currentFinishedData.winner,
              winningLine: currentFinishedData.winningLine,
              score: currentFinishedData.score,
              finishedAt: currentFinishedData.finishedAt,
              createdAt: currentFinishedData.createdAt,
              myPlayerNumber: currentMyPlayerNumber,
              opponentUsername,
              result: myResult,
            });
          } catch (error) {
            logger.error('[GameContext] Failed to save guest history:', error);
          }
        }

        if (currentIsAuthenticated && currentUser && currentFinishedData && currentMyPlayerNumber) {
          try {
            let myResult: 'win' | 'loss' | 'draw';
            const winner = currentFinishedData.winner;
            if (winner === 'draw' || winner === null) {
              myResult = 'draw';
            } else if (currentMyPlayerNumber === winner) {
              myResult = 'win';
            } else {
              myResult = 'loss';
            }

            await gameStatsApi.submitGameResult(
              'caro',
              myResult,
              undefined,
              undefined,
              {
                roomId: currentFinishedData.roomId,
                roomCode: currentFinishedData.roomCode,
                boardSize: currentFinishedData.boardSize,
              }
            );
            // CRITICAL FIX: Check mounted state after async operation
            if (!isMountedRef.current) return;
          } catch (error) {
            logger.error('Failed to submit game result:', error);
            // Check mounted state even on error
            if (!isMountedRef.current) return;
          }
        }

        // Remove self from pending timeouts array (fixes H1: timeout array growth)
        const index = pendingTimeoutsRef.current.indexOf(timeoutId);
        if (index > -1) {
          pendingTimeoutsRef.current.splice(index, 1);
        }
      }, 100);
      pendingTimeoutsRef.current.push(timeoutId);
    };

    const handleScoreUpdated = (data: { score: { player1: number; player2: number } }) => {
      if (!isMountedRef.current) return;

      // Safety check: validate data structure
      if (!data || !data.score || typeof data.score.player1 !== 'number' || typeof data.score.player2 !== 'number') {
        logger.error('[GameContext] Invalid score-updated data:', data);
        return;
      }

      setGame(prevGame => {
        if (!prevGame) return prevGame;
        return { ...prevGame, score: data.score };
      });
    };

    const handleUndoRequested = (data: { moveNumber: number; requestedBy: PlayerNumber }) => {
      if (!isMountedRef.current) return;

      // Safety check: validate data structure
      if (!data || typeof data.moveNumber !== 'number' || typeof data.requestedBy !== 'number') {
        logger.error('[GameContext] Invalid undo-requested data:', data);
        return;
      }

      if (data.requestedBy !== myPlayerNumberRef.current) {
        setPendingUndoMove(data.moveNumber);
      }
    };

    const handleUndoApproved = (data: { moveNumber: number; board: number[][]; currentPlayer: PlayerNumber }) => {
      if (!isMountedRef.current) return;

      // Safety check: validate data structure
      if (!data || !Array.isArray(data.board) || typeof data.moveNumber !== 'number') {
        logger.error('[GameContext] Invalid undo-approved data:', data);
        return;
      }

      setGame(prevGame => {
        if (!prevGame) return prevGame;
        return {
          ...prevGame,
          board: data.board,
          currentPlayer: data.currentPlayer || prevGame.currentPlayer,
        };
      });

      // Only increment MY undo count if I was the one who requested (not the approver)
      // Use ref to check synchronously before resetting state
      if (undoRequestSentRef.current) {
        setUndoUsedCount(count => count + 1);
        getToast()?.success('toast.undoApproved');
      }
      setUndoRequestSent(false);
      setPendingUndoMove(null);
      setLastMove(null);
    };

    const handleUndoRejected = () => {
      if (!isMountedRef.current) return;
      if (undoRequestSentRef.current) {
        getToast()?.warning('toast.undoRejected');
      }
      setUndoRequestSent(false);
    };

    const handleGameStarted = (data: { currentPlayer: PlayerNumber }) => {
      if (!isMountedRef.current) return;
      setGame(prevGame => {
        if (!prevGame) return prevGame;
        return { ...prevGame, gameStatus: 'playing', currentPlayer: data.currentPlayer };
      });
      setLastMove(null);
      // Reset undo state when game starts
      setUndoUsedCount(0);
      setUndoRequestSent(false);
      setPendingUndoMove(null);
      getToast()?.success('toast.gameStarted');
    };

    const handleGameReset = (data: {
      board: number[][];
      currentPlayer: PlayerNumber;
      gameStatus: string;
      winner: null;
      winningLine: null;
    }) => {
      if (!isMountedRef.current) return;

      // Safety check: validate data structure
      if (!data || !Array.isArray(data.board) || typeof data.currentPlayer !== 'number') {
        logger.error('[GameContext] Invalid game-reset data:', data);
        return;
      }

      setGame(prevGame => {
        if (!prevGame) return prevGame;
        return {
          ...prevGame,
          board: data.board,
          currentPlayer: data.currentPlayer,
          gameStatus: data.gameStatus as any,
          winner: data.winner,
          winningLine: undefined, // Clear winning line
        };
      });
      setLastMove(null); // Clear last move highlight
      setUndoUsedCount(0); // Reset undo count for new game
    };

    const handleGameError = (data: { message: string }) => {
      logger.error('Game error received:', data.message);
      getToast()?.error('toast.gameError', { params: { message: data.message } });
    };

    const handleMoveValidated = (data: { valid: boolean; message?: string }) => {
      if (!data.valid) {
        logger.warn('Move was invalid:', data.message);
        getToast()?.error('toast.invalidMove', { params: { message: data.message || '' } });
      }
    };

    // Register all socket listeners
    const handleMarkerUpdated = (data: { playerNumber: 1 | 2; marker: string }) => {
      if (!isMountedRef.current) return;

      // Validate data structure
      if (!data || typeof data.playerNumber !== 'number' || !data.marker || typeof data.marker !== 'string') {
        logger.error('[GameContext] Invalid marker-updated data:', data);
        return;
      }

      // Validate playerNumber is 1 or 2
      if (data.playerNumber !== 1 && data.playerNumber !== 2) {
        logger.error('[GameContext] Invalid playerNumber in marker-updated:', data.playerNumber);
        return;
      }

      // Validate marker is not empty after trim
      const trimmedMarker = data.marker.trim();
      if (!trimmedMarker || trimmedMarker.length === 0) {
        logger.error('[GameContext] Empty marker received:', data);
        return;
      }

      setGame(prevGame => {
        if (!prevGame) return prevGame;
        if (data.playerNumber === 1) {
          return { ...prevGame, player1Marker: trimmedMarker };
        } else {
          return { ...prevGame, player2Marker: trimmedMarker };
        }
      });
    };

    // Handle guest name updated - sync opponent name in realtime
    const handleGuestNameUpdated = (data: { playerNumber: 1 | 2; guestName: string; guestId: string }) => {
      if (!isMountedRef.current) return;

      // Validate data structure
      if (!data || typeof data.playerNumber !== 'number' || !data.guestName || !data.guestId) {
        logger.error('[GameContext] Invalid guest-name-updated data:', data);
        return;
      }

      if (data.playerNumber !== 1 && data.playerNumber !== 2) {
        logger.error('[GameContext] Invalid playerNumber in guest-name-updated:', data.playerNumber);
        return;
      }

      // Update players list with new guest name
      setPlayers(prevPlayers => {
        return prevPlayers.map(player => {
          if (player.playerNumber === data.playerNumber && player.isGuest && player.id === data.guestId) {
            return { ...player, username: data.guestName };
          }
          return player;
        });
      });

      // Also update game state with new guest name
      setGame(prevGame => {
        if (!prevGame) return prevGame;
        if (data.playerNumber === 1) {
          return { ...prevGame, player1GuestName: data.guestName };
        } else {
          return { ...prevGame, player2GuestName: data.guestName };
        }
      });

      logger.log('[GameContext] Guest name updated:', data);
    };

    // Handle achievement unlocked - dispatch custom event for AchievementContext to handle
    const handleAchievementUnlocked = (data: {
      playerId: string;
      achievementIds: string[];
      achievements: AchievementDefinition[];
    }) => {
      if (!isMountedRef.current) return;

      // Check if this is for the current user
      const currentUser = userRef.current;
      const currentIsAuth = isAuthenticatedRef.current;
      if (!currentIsAuth || !currentUser || data.playerId !== currentUser._id) return;

      // Dispatch custom event for AchievementContext to handle
      if (data.achievements && data.achievements.length > 0) {
        window.dispatchEvent(new CustomEvent('achievement-unlocked', {
          detail: { achievements: data.achievements }
        }));
        logger.log('[GameContext] Achievement unlocked:', data.achievementIds);
      }
    };

    // Handle reaction received from opponent
    const handleReactionReceived = (data: { fromPlayerNumber: 1 | 2; emoji: string; fromName: string }) => {
      if (!isMountedRef.current) return;

      // Validate data structure
      if (!data || !data.emoji || !data.fromName || (data.fromPlayerNumber !== 1 && data.fromPlayerNumber !== 2)) {
        logger.error('[GameContext] Invalid reaction-received data:', data);
        return;
      }

      const newReaction: ReceivedReaction = {
        id: `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        emoji: data.emoji,
        fromName: data.fromName,
        fromPlayerNumber: data.fromPlayerNumber,
        isSelf: false,
      };

      setReactions(prev => [...prev, newReaction]);
      logger.log('[GameContext] Reaction received:', data);
    };

    // Handle chat message received from opponent
    const handleChatReceived = (data: { fromPlayerNumber: 1 | 2; message: string; fromName: string }) => {
      if (!isMountedRef.current) return;
      if (!data || !data.message || !data.fromName || (data.fromPlayerNumber !== 1 && data.fromPlayerNumber !== 2)) return;

      const chat: CaroChatMessage = {
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        message: data.message,
        fromName: data.fromName,
        fromPlayerNumber: data.fromPlayerNumber,
        isSelf: false,
      };
      setChatMessages(prev => [...prev, chat]);
      playChatSound();
    };

    socket.on('room-joined', handleRoomJoined);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('game-deleted', handleGameDeleted);
    socket.on('move-made', handleMoveMade);
    socket.on('move-validated', handleMoveValidated);
    socket.on('game-finished', handleGameFinished);
    socket.on('score-updated', handleScoreUpdated);
    socket.on('undo-requested', handleUndoRequested);
    socket.on('undo-approved', handleUndoApproved);
    socket.on('undo-rejected', handleUndoRejected);
    socket.on('game-started', handleGameStarted);
    socket.on('game-reset', handleGameReset);
    socket.on('game-error', handleGameError);
    socket.on('marker-updated', handleMarkerUpdated);
    socket.on('guest-name-updated', handleGuestNameUpdated);
    socket.on('achievement-unlocked', handleAchievementUnlocked);
    socket.on('reaction-received', handleReactionReceived);
    socket.on('chat-received', handleChatReceived);

    return () => {
      isMountedRef.current = false;
      pendingTimeoutsRef.current.forEach(clearTimeout);
      pendingTimeoutsRef.current = [];
      cleanupDebounce();

      socket.off('room-joined', handleRoomJoined);
      socket.off('player-joined', handlePlayerJoined);
      socket.off('player-left', handlePlayerLeft);
      socket.off('game-deleted', handleGameDeleted);
      socket.off('move-made', handleMoveMade);
      socket.off('move-validated', handleMoveValidated);
      socket.off('game-finished', handleGameFinished);
      socket.off('score-updated', handleScoreUpdated);
      socket.off('undo-requested', handleUndoRequested);
      socket.off('undo-approved', handleUndoApproved);
      socket.off('undo-rejected', handleUndoRejected);
      socket.off('game-started', handleGameStarted);
      socket.off('game-reset', handleGameReset);
      socket.off('game-error', handleGameError);
      socket.off('marker-updated', handleMarkerUpdated);
      socket.off('guest-name-updated', handleGuestNameUpdated);
      socket.off('achievement-unlocked', handleAchievementUnlocked);
      socket.off('reaction-received', handleReactionReceived);
      socket.off('chat-received', handleChatReceived);
    };
  }, [debouncedReloadGame, socketConnected]);

  // Auto-rejoin room when socket reconnects (to re-register with the backend socket room)
  useEffect(() => {
    if (!socketConnected) return;

    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    // Re-emit join-room to ensure we're in the socket room after reconnection
    const guestId = getGuestId();
    const currentIsAuth = isAuthenticatedRef.current;
    const currentUser = userRef.current;
    const playerId = currentIsAuth ? currentUser?._id || '' : guestId;
    const isGuest = !currentIsAuth;

    logger.log('[GameContext] Socket reconnected, rejoining room:', currentRoomId);
    socket.emit('join-room', { roomId: currentRoomId, playerId, isGuest });
  }, [socketConnected]);

  // ============================================================================
  // Actions (memoized with useCallback)
  // ============================================================================

  const joinRoom = useCallback((newRoomId: string): void => {
    const socket = socketService.getSocket();
    if (!socket) return;

    if (newRoomId === roomIdRef.current) return;

    const guestId = getGuestId();
    const currentGame = gameRef.current;
    const currentIsAuth = isAuthenticatedRef.current;
    const currentUser = userRef.current;

    let playerId: string;
    let isGuest: boolean;

    if (currentGame) {
      const myId = currentIsAuth ? currentUser?._id : guestId;
      const isPlayer1Guest = currentGame.player1GuestId && currentGame.player1GuestId === guestId;
      const isPlayer2Guest = currentGame.player2GuestId && currentGame.player2GuestId === guestId;
      const isPlayer1Auth = currentGame.player1 && currentGame.player1 === myId;
      const isPlayer2Auth = currentGame.player2 && currentGame.player2 === myId;

      if (isPlayer1Guest || isPlayer2Guest) {
        playerId = guestId;
        isGuest = true;
      } else if (isPlayer1Auth || isPlayer2Auth) {
        playerId = currentUser?._id || '';
        isGuest = false;
      } else {
        playerId = currentIsAuth ? currentUser?._id || '' : guestId;
        isGuest = !currentIsAuth;
      }
    } else {
      playerId = isAuthenticatedRef.current ? userRef.current?._id || '' : guestId;
      isGuest = !isAuthenticatedRef.current;
    }

    socket.emit('join-room', { roomId: newRoomId, playerId, isGuest });
    setRoomId(newRoomId);
    // Reset undo state when joining a new room
    setUndoUsedCount(0);
    setUndoRequestSent(false);
    setPendingUndoMove(null);
  }, []);

  const makeMove = useCallback((row: number, col: number): void => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('make-move', { roomId: currentRoomId, row, col });
  }, []);

  const requestUndo = useCallback((moveNumber: number): void => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    setUndoRequestSent(true);
    socket.emit('request-undo', { roomId: currentRoomId, moveNumber });
  }, []);

  const approveUndo = useCallback((moveNumber: number): void => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('approve-undo', { roomId: currentRoomId, moveNumber });
  }, []);

  const rejectUndo = useCallback((): void => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('reject-undo', { roomId: currentRoomId });
    setPendingUndoMove(null);
  }, []);

  const clearPendingUndo = useCallback((): void => {
    setPendingUndoMove(null);
  }, []);

  const surrender = useCallback((): void => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('surrender', { roomId: currentRoomId });
  }, []);

  const startGame = useCallback((): void => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    // Optimistically update game status to 'playing' for immediate UI feedback
    // This prevents the "Start Game" button from staying visible due to socket delays
    setGame(prevGame => {
      if (!prevGame) return prevGame;
      // Only update if still waiting (prevent double update)
      if (prevGame.gameStatus !== 'waiting') return prevGame;
      return { ...prevGame, gameStatus: 'playing' };
    });

    socket.emit('start-game', { roomId: currentRoomId });
  }, []);

  const newGame = useCallback((): void => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit('new-game', { roomId: currentRoomId });
  }, []);

  const leaveRoom = useCallback(async (): Promise<void> => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;

    try {
      await gameApi.leaveGame(currentRoomId);

      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('leave-room', { roomId: currentRoomId });
      }

      setRoomId(null);
      setGame(null);
      setPlayers([]);
      setMyPlayerNumber(null);
      // Reset undo state when leaving
      setUndoUsedCount(0);
      setUndoRequestSent(false);
      setPendingUndoMove(null);
    } catch (error) {
      logger.error('Failed to leave game:', error);
      setRoomId(null);
      setGame(null);
      setPlayers([]);
      setMyPlayerNumber(null);
      // Reset undo state when leaving (even on error)
      setUndoUsedCount(0);
      setUndoRequestSent(false);
      setPendingUndoMove(null);
      throw error;
    }
  }, []);

  const refreshPlayers = useCallback(() => {
    // Update players with current guest name from sessionStorage
    try {
      if (game) {
        const gamePlayers = gameToPlayers(game);
        setPlayers(gamePlayers);
      } else {
        // If no game, update existing players with guest name
        setPlayers(prevPlayers => {
          const guestId = getGuestId();
          const guestName = getGuestName();
          if (guestName && guestId) {
            return prevPlayers.map(player => {
              if (player.isGuest && player.id === guestId) {
                return { ...player, username: guestName };
              }
              return player;
            });
          }
          return prevPlayers;
        });
      }
    } catch (error) {
      // Safety: catch any errors during refresh - reset to safe state (fixes M1)
      logger.error('[GameContext] Error refreshing players:', error);
      setPlayers([]);
    }
  }, [game]);

  // Update guest name and sync to opponent via socket
  const updateGuestName = useCallback((guestName: string): void => {
    // Validate input early to avoid unnecessary socket roundtrip (fixes M2)
    const trimmed = guestName.trim();
    if (!trimmed || trimmed.length > 20) {
      logger.warn('[GameContext] Invalid guest name:', guestName);
      return;
    }

    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    // Optimistic update for immediate UI feedback (fixes M3)
    const currentMyPlayerNumber = myPlayerNumberRef.current;
    if (currentMyPlayerNumber) {
      setPlayers(prev => prev.map(p =>
        p.playerNumber === currentMyPlayerNumber && p.isGuest ? { ...p, username: trimmed } : p
      ));
      setGame(prev => {
        if (!prev) return prev;
        if (currentMyPlayerNumber === 1) return { ...prev, player1GuestName: trimmed };
        if (currentMyPlayerNumber === 2) return { ...prev, player2GuestName: trimmed };
        return prev;
      });
    }

    // Emit socket event to update guest name in realtime
    socket.emit('update-guest-name', { roomId: currentRoomId, guestName: trimmed });
  }, []);

  // Sync guest name from storage changes (e.g. sidebar edit)
  useEffect(() => {
    const handleNameSync = () => {
      const newName = getGuestName();
      if (!newName || !roomIdRef.current) return;

      const currentMyPlayerNumber = myPlayerNumberRef.current;
      if (!currentMyPlayerNumber) return;

      const myPlayer = playersRef.current.find(p => p.playerNumber === currentMyPlayerNumber);

      // If I am guest and name changed
      if (myPlayer?.isGuest && myPlayer.username !== newName) {
        updateGuestName(newName);
      }
    };

    window.addEventListener('guest-name-changed', handleNameSync);
    return () => window.removeEventListener('guest-name-changed', handleNameSync);
  }, [updateGuestName]);

  // Send reaction emoji to opponent
  const sendReaction = useCallback((emoji: string): void => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    // Get current player info for self-display
    const currentMyPlayerNumber = myPlayerNumberRef.current;
    const currentPlayers = playersRef.current;
    const myPlayer = currentPlayers.find(p => p.playerNumber === currentMyPlayerNumber);
    const myName = myPlayer?.username || 'You';

    // Show self reaction immediately (so sender knows it worked)
    if (currentMyPlayerNumber) {
      const selfReaction: ReceivedReaction = {
        id: `reaction-self-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        emoji,
        fromName: myName,
        fromPlayerNumber: currentMyPlayerNumber,
        isSelf: true,
      };
      setReactions(prev => [...prev, selfReaction]);
    }

    socket.emit('send-reaction', { roomId: currentRoomId, emoji });
  }, []);

  // Clear a specific reaction by id
  const clearReaction = useCallback((id: string): void => {
    setReactions(prev => prev.filter(r => r.id !== id));
  }, []);

  // Send chat message to opponent
  const sendChat = useCallback((message: string): void => {
    const trimmed = message.trim().slice(0, 100);
    if (!trimmed) return;

    const currentRoomId = roomIdRef.current;
    if (!currentRoomId) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    // Show self message immediately
    const currentMyPlayerNumber = myPlayerNumberRef.current;
    const currentPlayers = playersRef.current;
    const myPlayer = currentPlayers.find(p => p.playerNumber === currentMyPlayerNumber);
    const myName = myPlayer?.username || 'You';

    if (currentMyPlayerNumber) {
      const selfChat: CaroChatMessage = {
        id: `chat-self-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        message: trimmed,
        fromName: myName,
        fromPlayerNumber: currentMyPlayerNumber,
        isSelf: true,
      };
      setChatMessages(prev => [...prev, selfChat]);
      playChatSound();
    }

    socket.emit('send-chat', { roomId: currentRoomId, message: trimmed });
  }, []);

  // Clear a specific chat message by id
  const clearChat = useCallback((id: string): void => {
    setChatMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  // ============================================================================
  // Derived State
  // ============================================================================

  const currentPlayer = game?.currentPlayer || 1;
  const isMyTurn = myPlayerNumber !== null && currentPlayer === myPlayerNumber;

  // ============================================================================
  // Memoized Context Values (Split to prevent cascade re-renders)
  // ============================================================================

  // State context - changes infrequently
  const stateValue = useMemo<GameStateContextType>(() => ({
    game,
    players,
    myPlayerNumber,
    roomId,
  }), [game, players, myPlayerNumber, roomId]);

  // Play context - changes frequently during gameplay
  const playValue = useMemo<GamePlayContextType>(() => ({
    currentPlayer,
    isMyTurn,
    lastMove,
    pendingUndoMove,
    undoRequestSent,
    undoUsedCount,
  }), [currentPlayer, isMyTurn, lastMove, pendingUndoMove, undoRequestSent, undoUsedCount]);

  // Actions context - never changes (functions are memoized with useCallback)
  const actionsValue = useMemo<GameActionsContextType>(() => ({
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
    refreshPlayers,
    updateGuestName,
    sendReaction,
  }), [joinRoom, makeMove, requestUndo, approveUndo, rejectUndo, surrender, startGame, newGame, leaveRoom, clearPendingUndo, refreshPlayers, updateGuestName, sendReaction]);

  // Reaction context value
  const reactionValue = useMemo<ReactionContextType>(() => ({
    reactions,
    clearReaction,
  }), [reactions, clearReaction]);

  // Chat context value
  const chatValue = useMemo<ChatContextType>(() => ({
    chatMessages,
    sendChat,
    clearChat,
  }), [chatMessages, sendChat, clearChat]);

  // Combined context for backward compatibility
  const combinedValue = useMemo<GameContextType>(() => ({
    ...stateValue,
    ...playValue,
    ...actionsValue,
  }), [stateValue, playValue, actionsValue]);

  // ============================================================================
  // Render with nested providers
  // ============================================================================

  return (
    <GameStateContext.Provider value={stateValue}>
      <GamePlayContext.Provider value={playValue}>
        <GameActionsContext.Provider value={actionsValue}>
          <ReactionContext.Provider value={reactionValue}>
            <ChatContext.Provider value={chatValue}>
              <GameContext.Provider value={combinedValue}>
                {children}
              </GameContext.Provider>
            </ChatContext.Provider>
          </ReactionContext.Provider>
        </GameActionsContext.Provider>
      </GamePlayContext.Provider>
    </GameStateContext.Provider>
  );
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * useGame - Full context (backward compatible)
 * Use this when you need everything, but prefer specific hooks for better performance
 */
export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

/**
 * useGameState - Subscribe only to game state (rarely changes)
 * Use for: game board, players list, room info
 */
export const useGameState = (): GameStateContextType => {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
};

/**
 * useGamePlay - Subscribe only to play state (changes frequently)
 * Use for: turn indicator, last move highlight, undo state
 */
export const useGamePlay = (): GamePlayContextType => {
  const context = useContext(GamePlayContext);
  if (context === undefined) {
    throw new Error('useGamePlay must be used within a GameProvider');
  }
  return context;
};

/**
 * useGameActions - Subscribe only to actions (never changes)
 * Use for: buttons, controls that trigger game actions
 */
export const useGameActions = (): GameActionsContextType => {
  const context = useContext(GameActionsContext);
  if (context === undefined) {
    throw new Error('useGameActions must be used within a GameProvider');
  }
  return context;
};

/**
 * useReaction - Subscribe to reaction events
 * Use for: displaying reaction popup when opponent sends a reaction
 */
export const useReaction = (): ReactionContextType => {
  const context = useContext(ReactionContext);
  if (context === undefined) {
    throw new Error('useReaction must be used within a GameProvider');
  }
  return context;
};

/**
 * useChat - Subscribe to chat events
 * Use for: displaying chat messages and sending chat in game room
 */
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a GameProvider');
  }
  return context;
};
