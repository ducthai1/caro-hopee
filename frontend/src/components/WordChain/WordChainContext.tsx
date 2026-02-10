/**
 * WordChainContext - State management for Word Chain (Nối Từ) game.
 * Uses useReducer for complex state + socket listeners.
 */
import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, ReactNode } from 'react';
import { socketService } from '../../services/socketService';
import { getToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { getGuestId } from '../../utils/guestId';
import { getGuestName } from '../../utils/guestName';
import { API_BASE_URL } from '../../utils/constants';
import {
  WordChainState,
  WordChainAction,
  WordChainView,
  WordChainRules,
  WordChainPlayer,
  WaitingRoomInfo,
  CreateRoomPayload,
  DEFAULT_RULES,
} from './word-chain-types';

// ─── Session Storage (persist room code for reload reconnect) ─
const WC_SESSION_KEY = 'wordchain_room';

function saveRoomSession(roomCode: string) {
  sessionStorage.setItem(WC_SESSION_KEY, roomCode);
}

function clearRoomSession() {
  sessionStorage.removeItem(WC_SESSION_KEY);
}

function getSavedRoomCode(): string | null {
  return sessionStorage.getItem(WC_SESSION_KEY);
}

// ─── Initial State ────────────────────────────────────────────

const initialState: WordChainState = {
  view: 'lobby',
  waitingRooms: [],
  isLoadingRooms: false,
  roomId: null,
  roomCode: null,
  rules: null,
  players: [],
  maxPlayers: 2,
  isHost: false,
  mySlot: null,
  hasPassword: false,
  gameStatus: 'waiting',
  currentWord: '',
  currentPlayerSlot: 1,
  wordChain: [],
  turnStartedAt: 0,
  turnDuration: 60,
  roundNumber: 0,
  winner: null,
  showResult: false,
  error: null,
  notification: null,
};

// ─── Reducer ──────────────────────────────────────────────────

function wordChainReducer(state: WordChainState, action: WordChainAction): WordChainState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.payload, error: null };

    case 'SET_ROOMS':
      return { ...state, waitingRooms: action.payload, isLoadingRooms: false };

    case 'SET_LOADING_ROOMS':
      return { ...state, isLoadingRooms: action.payload };

    case 'ROOM_CREATED':
      saveRoomSession(action.payload.roomCode);
      return {
        ...state,
        view: 'waiting',
        roomId: action.payload.roomId,
        roomCode: action.payload.roomCode,
        rules: action.payload.rules,
        players: action.payload.players,
        maxPlayers: action.payload.maxPlayers,
        hasPassword: !!action.payload.hasPassword,
        isHost: true,
        gameStatus: 'waiting',
        error: null,
      };

    case 'ROOM_JOINED': {
      saveRoomSession(action.payload.roomCode);
      const isPlaying = action.payload.gameStatus === 'playing';
      return {
        ...state,
        view: isPlaying ? 'playing' : 'waiting',
        roomId: action.payload.roomId,
        roomCode: action.payload.roomCode,
        rules: action.payload.rules,
        players: action.payload.players,
        maxPlayers: action.payload.maxPlayers,
        gameStatus: action.payload.gameStatus,
        // Restore game state on reconnect
        ...(isPlaying ? {
          currentWord: action.payload.currentWord || state.currentWord,
          currentPlayerSlot: action.payload.currentPlayerSlot || state.currentPlayerSlot,
          turnStartedAt: action.payload.turnStartedAt || state.turnStartedAt,
          turnDuration: action.payload.turnDuration || state.turnDuration,
          roundNumber: action.payload.roundNumber || state.roundNumber,
          wordChain: action.payload.wordChain?.map((w: string, i: number) => ({
            word: w,
            playerSlot: i === 0 ? 0 : 0,
            playerName: i === 0 ? 'System' : '',
            timestamp: 0,
            accepted: true,
          })) || state.wordChain,
        } : {}),
        error: null,
      };
    }

    case 'PLAYER_JOINED':
      return {
        ...state,
        players: [...state.players.filter(p => p.slot !== action.payload.player.slot), action.payload.player]
          .sort((a, b) => a.slot - b.slot),
      };

    case 'PLAYER_LEFT':
      return {
        ...state,
        players: action.payload.players,
      };

    case 'GAME_STARTED':
      return {
        ...state,
        view: 'playing',
        gameStatus: 'playing',
        currentWord: action.payload.currentWord,
        currentPlayerSlot: action.payload.currentPlayerSlot,
        turnStartedAt: action.payload.turnStartedAt,
        turnDuration: action.payload.turnDuration,
        roundNumber: action.payload.roundNumber,
        players: action.payload.players,
        wordChain: [{
          word: action.payload.currentWord,
          playerSlot: 0,
          playerName: 'System',
          timestamp: action.payload.turnStartedAt,
          accepted: true,
        }],
        winner: null,
        showResult: false,
      };

    case 'WORD_ACCEPTED':
      return {
        ...state,
        currentWord: action.payload.currentWord,
        currentPlayerSlot: action.payload.nextPlayerSlot,
        turnStartedAt: action.payload.turnStartedAt,
        turnDuration: action.payload.turnDuration,
        roundNumber: action.payload.roundNumber,
        players: action.payload.players,
        wordChain: [...state.wordChain, {
          word: action.payload.word,
          playerSlot: action.payload.playerSlot,
          playerName: action.payload.playerName,
          timestamp: Date.now(),
          accepted: true,
        }],
      };

    case 'WORD_REJECTED':
      return {
        ...state,
        players: action.payload.players,
        wordChain: [...state.wordChain, {
          word: action.payload.word,
          playerSlot: action.payload.playerSlot,
          playerName: action.payload.playerName,
          timestamp: Date.now(),
          accepted: false,
          reason: action.payload.reason,
        }],
      };

    case 'TURN_TIMEOUT':
      return {
        ...state,
        currentPlayerSlot: action.payload.nextPlayerSlot,
        turnStartedAt: action.payload.turnStartedAt,
        turnDuration: action.payload.turnDuration,
        players: action.payload.players,
        wordChain: [...state.wordChain, {
          word: '', // Empty word for timeout
          playerSlot: action.payload.playerSlot,
          playerName: action.payload.playerName,
          timestamp: Date.now(),
          accepted: false,
          reason: 'timeout',
        }],
      };

    case 'PLAYER_ELIMINATED':
      return {
        ...state,
        players: action.payload.players,
      };

    case 'GAME_FINISHED':
      clearRoomSession();
      return {
        ...state,
        gameStatus: 'finished',
        winner: action.payload.winner,
        players: action.payload.players,
        showResult: true,
      };

    case 'GAME_DRAW':
      return {
        ...state,
        gameStatus: 'finished',
        winner: 'draw',
        players: action.payload.players,
        showResult: true,
      };

    case 'PLAYER_SURRENDERED':
      return {
        ...state,
        players: action.payload.players,
      };

    case 'GAME_RESET':
      return {
        ...state,
        view: 'waiting',
        gameStatus: action.payload.gameStatus,
        players: action.payload.players,
        currentWord: '',
        wordChain: [],
        winner: null,
        showResult: false,
        roundNumber: 0,
        currentPlayerSlot: 1,
      };

    case 'DISMISS_RESULT':
      return { ...state, showResult: false };

    case 'SET_HOST':
      return { ...state, isHost: action.payload };

    case 'SET_MY_SLOT':
      return { ...state, mySlot: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };

    case 'LEAVE_ROOM':
      clearRoomSession();
      return {
        ...initialState,
        waitingRooms: state.waitingRooms,
      };

    case 'NEW_TURN':
      return {
        ...state,
        currentWord: action.payload.currentWord,
        currentPlayerSlot: action.payload.currentPlayerSlot,
        turnStartedAt: action.payload.turnStartedAt,
        turnDuration: action.payload.turnDuration,
        // Updated players with current lives after life deduction
        ...(action.payload.players ? { players: action.payload.players } : {}),
      };

    case 'PLAYER_DISCONNECTED': {
      const updated = state.players.map(p =>
        p.slot === action.payload.slot ? { ...p, isConnected: false } : p
      );
      return { ...state, players: updated };
    }

    case 'PLAYER_RECONNECTED': {
      const updated = state.players.map(p =>
        p.slot === action.payload.slot ? { ...p, isConnected: true } : p
      );
      return { ...state, players: updated };
    }

    case 'ROOM_UPDATED':
      return {
        ...state,
        rules: action.payload.rules,
        maxPlayers: action.payload.maxPlayers,
        players: action.payload.players,
        hasPassword: action.payload.hasPassword,
      };

    case 'PLAYER_NAME_UPDATED':
      return {
        ...state,
        players: state.players.map(p =>
          p.slot === action.payload.slot ? { ...p, guestName: action.payload.name, name: action.payload.name } : p
        ),
      };

    default:
      return state;
  }
}

// ─── Context Type ─────────────────────────────────────────────

interface WordChainContextValue {
  state: WordChainState;
  createRoom: (payload: CreateRoomPayload) => void;
  joinRoom: (roomCode: string, password?: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  submitWord: (word: string) => void;
  surrender: () => void;
  newGame: () => void;
  dismissResult: () => void;
  refreshRooms: () => void;
  setView: (view: WordChainView) => void;
  kickPlayer: (slot: number) => void;
  updateRoom: (payload: { rules?: Partial<WordChainRules>; maxPlayers?: number; password?: string | null }) => Promise<boolean>;
  updateGuestName: (name: string) => void;
}

const WordChainContext = createContext<WordChainContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────

export const WordChainProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(wordChainReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const { isConnected } = useSocket();
  const stateRef = useRef(state);
  stateRef.current = state;

  // Get player identity
  const getPlayerId = useCallback(() => {
    return isAuthenticated && user ? user._id : getGuestId();
  }, [isAuthenticated, user]);

  const getPlayerName = useCallback(() => {
    return isAuthenticated && user ? user.username : (getGuestName() || `Guest ${getGuestId().slice(-6)}`);
  }, [isAuthenticated, user]);

  // ─── Socket Listeners ─────────────────────────────────────

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Convert ISO string or number to ms timestamp
    const toTimestamp = (v: any): number => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') return new Date(v).getTime();
      return Date.now();
    };

    // Note: room-created is handled via callback in createRoom() to avoid double dispatch.
    // Only joined-room needs an event listener (for reconnect scenarios).

    const handleJoinedRoom = (data: any) => {
      dispatch({
        type: 'ROOM_JOINED',
        payload: {
          roomId: data.roomId,
          roomCode: data.roomCode,
          rules: data.rules,
          players: data.players || [],
          maxPlayers: data.maxPlayers || 2,
          gameStatus: data.gameStatus || 'waiting',
          // Reconnect fields
          currentWord: data.currentWord,
          currentPlayerSlot: data.currentPlayerSlot,
          turnStartedAt: data.turnStartedAt ? toTimestamp(data.turnStartedAt) : undefined,
          turnDuration: data.turnDuration,
          roundNumber: data.roundNumber,
          wordChain: data.wordChain,
        },
      });
      // Use mySlot directly from backend response
      if (data.mySlot) {
        dispatch({ type: 'SET_MY_SLOT', payload: data.mySlot });
      }
      dispatch({ type: 'SET_HOST', payload: data.isHost || false });
    };

    const handlePlayerJoined = (data: any) => {
      dispatch({
        type: 'PLAYER_JOINED',
        payload: {
          player: data.player,
          playerCount: data.playerCount,
        },
      });
      // Notify about new player joining
      const playerName = data.player?.name || data.player?.guestName || 'Player';
      getToast()?.info('toast.playerJoined', { params: { name: playerName } });
    };

    const handlePlayerLeft = (data: any) => {
      // Notify about player leaving (before dispatch to capture name from current state)
      const leavingPlayer = stateRef.current.players.find(p => p.slot === data.slot);
      if (leavingPlayer) {
        getToast()?.warning('toast.playerLeft', { params: { name: leavingPlayer.name || leavingPlayer.guestName || 'Player' } });
      }

      dispatch({
        type: 'PLAYER_LEFT',
        payload: {
          slot: data.slot,
          players: data.players || [],
        },
      });
      // Check if I'm now host
      if (data.newHostPlayerId) {
        const playerId = getPlayerId();
        dispatch({ type: 'SET_HOST', payload: data.newHostPlayerId === playerId });
      }
    };

    const handleGameStarted = (data: any) => {
      dispatch({
        type: 'GAME_STARTED',
        payload: {
          currentWord: data.currentWord,
          currentPlayerSlot: data.currentPlayerSlot,
          // BUG FIX: Use client-side timestamp to avoid server-client clock drift
          turnStartedAt: Date.now(),
          turnDuration: data.turnDuration,
          roundNumber: data.roundNumber || 1,
          players: data.players || stateRef.current.players,
        },
      });
      getToast()?.success('toast.gameStarted');
    };

    const handleWordAccepted = (data: any) => {
      dispatch({
        type: 'WORD_ACCEPTED',
        payload: {
          word: data.word,
          playerSlot: data.playerSlot,
          playerName: data.playerName,
          nextPlayerSlot: data.nextPlayerSlot,
          currentWord: data.currentWord,
          // BUG FIX: Use client-side timestamp to avoid server-client clock drift
          turnStartedAt: Date.now(),
          turnDuration: data.turnDuration,
          roundNumber: data.roundNumber,
          players: data.players || stateRef.current.players,
        },
      });
    };

    const REJECT_REASON_KEYS: Record<string, string> = {
      not_in_dictionary: 'wordChain.game.notInDict',
      wrong_type: 'wordChain.game.wrongType',
      wrong_chain: 'wordChain.game.wrongChain',
      already_used: 'wordChain.game.alreadyUsed',
    };

    const handleWordRejected = (data: any) => {
      dispatch({
        type: 'WORD_REJECTED',
        payload: {
          word: data.word,
          playerSlot: data.playerSlot,
          playerName: data.playerName,
          reason: data.reason,
          players: data.players || stateRef.current.players,
        },
      });
      const reasonKey = REJECT_REASON_KEYS[data.reason] || 'wordChain.game.invalid';
      const name = data.playerName || 'Player';
      getToast()?.warning(reasonKey, { params: { name, word: data.word } });
    };

    const handleTurnTimeout = (data: any) => {
      const player = stateRef.current.players.find(p => p.slot === data.slot);
      const name = player?.name || player?.guestName || 'Player';

      dispatch({
        type: 'TURN_TIMEOUT',
        payload: {
          playerSlot: data.slot,
          playerName: name,
          nextPlayerSlot: stateRef.current.currentPlayerSlot, // Current turn hasn't changed yet until NEW_TURN
          turnStartedAt: Date.now(),
          turnDuration: stateRef.current.turnDuration,
          players: stateRef.current.players,
        },
      });
      getToast()?.error('wordChain.game.timeoutMessage', { params: { name } });
    };

    const handlePlayerEliminated = (data: any) => {
      dispatch({
        type: 'PLAYER_ELIMINATED',
        payload: { slot: data.slot, players: data.players || stateRef.current.players },
      });
    };

    const handleGameFinished = (data: any) => {
      dispatch({
        type: 'GAME_FINISHED',
        payload: {
          winner: data.winner,
          players: data.players || stateRef.current.players,
        },
      });
    };

    const handleGameDraw = (data: any) => {
      dispatch({
        type: 'GAME_DRAW',
        payload: { players: data.players || stateRef.current.players },
      });
    };

    const handlePlayerSurrendered = (data: any) => {
      dispatch({
        type: 'PLAYER_SURRENDERED',
        payload: { slot: data.slot, players: data.players || stateRef.current.players },
      });
    };

    const handleGameReset = (data: any) => {
      dispatch({
        type: 'GAME_RESET',
        payload: {
          players: data.players || [],
          gameStatus: data.gameStatus || 'waiting',
        },
      });
    };

    const handleNewTurn = (data: any) => {
      dispatch({
        type: 'NEW_TURN',
        payload: {
          currentWord: data.currentWord,
          currentPlayerSlot: data.currentPlayerSlot,
          // BUG FIX: Use client-side timestamp to avoid server-client clock drift
          turnStartedAt: Date.now(),
          turnDuration: data.turnDuration,
          players: data.players,
        },
      });
    };

    const handlePlayerDisconnected = (data: any) => {
      dispatch({ type: 'PLAYER_DISCONNECTED', payload: { slot: data.slot } });
    };

    const handlePlayerReconnected = (data: any) => {
      dispatch({ type: 'PLAYER_RECONNECTED', payload: { slot: data.slot } });
    };

    const handleKicked = () => {
      dispatch({ type: 'LEAVE_ROOM' });
      dispatch({ type: 'SET_ERROR', payload: 'kicked' });
      getToast()?.warning('toast.kicked');
    };

    const handleRoomUpdated = (data: any) => {
      dispatch({
        type: 'ROOM_UPDATED',
        payload: {
          rules: data.rules,
          maxPlayers: data.maxPlayers,
          players: data.players || stateRef.current.players,
          hasPassword: !!data.hasPassword,
        },
      });
      // Toast for non-host players
      if (!stateRef.current.isHost) {
        getToast()?.info('wordChain.settingsUpdated');
      }
    };

    const handlePlayerNameUpdated = (data: any) => {
      dispatch({
        type: 'PLAYER_NAME_UPDATED',
        payload: { slot: data.slot, name: data.name },
      });
    };

    const handleError = (data: any) => {
      const errorCode = data.error || data.message || 'serverError';
      dispatch({ type: 'SET_ERROR', payload: errorCode });
      // Toast shown by view-level useEffect watching state.error
    };

    // Auto-refresh lobby room list when rooms change
    const handleRoomsUpdated = async () => {
      if (stateRef.current.view !== 'lobby') return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/word-chain/rooms`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const rooms: WaitingRoomInfo[] = await res.json();
          dispatch({ type: 'SET_ROOMS', payload: rooms });
        }
      } catch { /* ignore */ }
    };

    // Register all listeners
    socket.on('word-chain:joined-room' as any, handleJoinedRoom);
    socket.on('word-chain:player-joined' as any, handlePlayerJoined);
    socket.on('word-chain:player-left' as any, handlePlayerLeft);
    socket.on('word-chain:game-started' as any, handleGameStarted);
    socket.on('word-chain:word-accepted' as any, handleWordAccepted);
    socket.on('word-chain:word-rejected' as any, handleWordRejected);
    socket.on('word-chain:turn-timeout' as any, handleTurnTimeout);
    socket.on('word-chain:player-eliminated' as any, handlePlayerEliminated);
    socket.on('word-chain:game-finished' as any, handleGameFinished);
    socket.on('word-chain:game-draw' as any, handleGameDraw);
    socket.on('word-chain:player-surrendered' as any, handlePlayerSurrendered);
    socket.on('word-chain:game-reset' as any, handleGameReset);
    socket.on('word-chain:new-turn' as any, handleNewTurn);
    socket.on('word-chain:player-disconnected' as any, handlePlayerDisconnected);
    socket.on('word-chain:player-reconnected' as any, handlePlayerReconnected);
    socket.on('word-chain:kicked' as any, handleKicked);
    socket.on('word-chain:room-updated' as any, handleRoomUpdated);
    socket.on('word-chain:player-name-updated' as any, handlePlayerNameUpdated);
    socket.on('word-chain:error' as any, handleError);
    socket.on('word-chain:rooms-updated' as any, handleRoomsUpdated);

    return () => {
      socket.off('word-chain:joined-room' as any, handleJoinedRoom);
      socket.off('word-chain:player-joined' as any, handlePlayerJoined);
      socket.off('word-chain:player-left' as any, handlePlayerLeft);
      socket.off('word-chain:game-started' as any, handleGameStarted);
      socket.off('word-chain:word-accepted' as any, handleWordAccepted);
      socket.off('word-chain:word-rejected' as any, handleWordRejected);
      socket.off('word-chain:turn-timeout' as any, handleTurnTimeout);
      socket.off('word-chain:player-eliminated' as any, handlePlayerEliminated);
      socket.off('word-chain:game-finished' as any, handleGameFinished);
      socket.off('word-chain:game-draw' as any, handleGameDraw);
      socket.off('word-chain:player-surrendered' as any, handlePlayerSurrendered);
      socket.off('word-chain:game-reset' as any, handleGameReset);
      socket.off('word-chain:new-turn' as any, handleNewTurn);
      socket.off('word-chain:player-disconnected' as any, handlePlayerDisconnected);
      socket.off('word-chain:player-reconnected' as any, handlePlayerReconnected);
      socket.off('word-chain:kicked' as any, handleKicked);
      socket.off('word-chain:room-updated' as any, handleRoomUpdated);
      socket.off('word-chain:player-name-updated' as any, handlePlayerNameUpdated);
      socket.off('word-chain:error' as any, handleError);
      socket.off('word-chain:rooms-updated' as any, handleRoomsUpdated);
    };
  }, [getPlayerId, isConnected]);

  // ─── Actions ──────────────────────────────────────────────

  const refreshRooms = useCallback(async () => {
    dispatch({ type: 'SET_LOADING_ROOMS', payload: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/word-chain/rooms`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const rooms: WaitingRoomInfo[] = await res.json();
        dispatch({ type: 'SET_ROOMS', payload: rooms });
      }
    } catch {
      dispatch({ type: 'SET_LOADING_ROOMS', payload: false });
    }
  }, []);

  const createRoom = useCallback((payload: CreateRoomPayload) => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const playerId = getPlayerId();
    const playerName = getPlayerName();

    socket.emit('word-chain:create-room' as any, {
      maxPlayers: payload.maxPlayers,
      rules: { ...DEFAULT_RULES, ...payload.rules },
      password: payload.password,
      userId: isAuthenticated ? playerId : undefined,
      guestId: isAuthenticated ? undefined : playerId,
      guestName: isAuthenticated ? undefined : playerName,
    }, (res: any) => {
      if (res?.success) {
        // Use callback (guaranteed delivery) to transition state
        dispatch({
          type: 'ROOM_CREATED',
          payload: {
            roomId: res.roomId,
            roomCode: res.roomCode,
            rules: res.rules,
            players: res.players || [],
            maxPlayers: res.maxPlayers || 2,
            hasPassword: !!payload.password,
          },
        });
        dispatch({ type: 'SET_MY_SLOT', payload: res.mySlot || 1 });
        dispatch({ type: 'SET_HOST', payload: true });
        getToast()?.success('toast.roomCreated');
      } else if (res) {
        dispatch({ type: 'SET_ERROR', payload: res.error || 'failedToCreate' });
      }
    });
  }, [getPlayerId, getPlayerName, isAuthenticated]);

  const joinRoom = useCallback((roomCode: string, password?: string) => {
    const socket = socketService.getSocket();
    if (!socket) {
      dispatch({ type: 'SET_ERROR', payload: 'socketNotConnected' });
      return;
    }

    const playerId = getPlayerId();
    const playerName = getPlayerName();

    socket.emit('word-chain:join-room' as any, {
      roomCode: roomCode.toUpperCase(),
      password,
      userId: isAuthenticated ? playerId : undefined,
      guestId: isAuthenticated ? undefined : playerId,
      guestName: isAuthenticated ? undefined : playerName,
    }, (res: any) => {
      if (res && !res.success) {
        dispatch({ type: 'SET_ERROR', payload: res.error || 'failedToJoin' });
      } else if (res?.success && res.roomId) {
        // Handle join success via callback (reliable path, same as createRoom)
        // Prevents silent failure if event listener is not registered
        if (stateRef.current.view === 'lobby') {
          dispatch({
            type: 'ROOM_JOINED',
            payload: {
              roomId: res.roomId,
              roomCode: res.roomCode,
              rules: res.rules,
              players: res.players || [],
              maxPlayers: res.maxPlayers || 2,
              gameStatus: res.gameStatus || 'waiting',
            },
          });
          if (res.mySlot) {
            dispatch({ type: 'SET_MY_SLOT', payload: res.mySlot });
          }
          dispatch({ type: 'SET_HOST', payload: res.isHost || false });
        }
      }
    });
  }, [getPlayerId, getPlayerName, isAuthenticated]);

  const leaveRoom = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;

    socket.emit('word-chain:leave-room' as any, {
      roomId: stateRef.current.roomId,
    });
    dispatch({ type: 'LEAVE_ROOM' });
    // Refresh room list after returning to lobby
    setTimeout(() => refreshRooms(), 300);
  }, [refreshRooms]);

  const startGame = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;

    socket.emit('word-chain:start-game' as any, {
      roomId: stateRef.current.roomId,
    }, (res: any) => {
      if (res && !res.success) {
        dispatch({ type: 'SET_ERROR', payload: res.error || 'failedToStart' });
      }
    });
  }, []);

  const submitWord = useCallback((word: string) => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;

    socket.emit('word-chain:submit-word' as any, {
      roomId: stateRef.current.roomId,
      word,
    }, (res: any) => {
      if (res && !res.success && res.error) {
        dispatch({ type: 'SET_ERROR', payload: res.error });
      }
    });
  }, []);

  const surrender = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId || !stateRef.current.mySlot) return;

    socket.emit('word-chain:surrender' as any, {
      roomId: stateRef.current.roomId,
      slot: stateRef.current.mySlot,
    });
  }, []);

  const newGame = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;

    socket.emit('word-chain:new-game' as any, {
      roomId: stateRef.current.roomId,
    });
  }, []);

  const kickPlayer = useCallback((slot: number) => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;

    socket.emit('word-chain:kick-player' as any, {
      roomId: stateRef.current.roomId,
      slot,
    }, (res: any) => {
      if (res && !res.success) {
        dispatch({ type: 'SET_ERROR', payload: res.error || 'failedToKick' });
      }
    });
  }, []);

  const updateRoom = useCallback((payload: { rules?: Partial<WordChainRules>; maxPlayers?: number; password?: string | null }): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = socketService.getSocket();
      if (!socket || !stateRef.current.roomId) { resolve(false); return; }

      socket.emit('word-chain:update-room' as any, {
        roomId: stateRef.current.roomId,
        ...payload,
      }, (res: any) => {
        if (res?.success) {
          getToast()?.success('wordChain.settingsUpdated');
          resolve(true);
        } else {
          dispatch({ type: 'SET_ERROR', payload: res?.error || 'failedToUpdate' });
          getToast()?.error('wordChain.errors.failedToUpdate');
          resolve(false);
        }
      });
    });
  }, []);

  const updateGuestName = useCallback((name: string) => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;

    socket.emit('word-chain:update-guest-name' as any, {
      roomId: stateRef.current.roomId,
      guestName: name,
    });
  }, []);

  // Sync guest name from storage changes (e.g. sidebar edit)
  useEffect(() => {
    const handleNameSync = () => {
      const newName = getGuestName();
      if (!newName || !stateRef.current.roomId || !stateRef.current.mySlot) return;

      const currentPlayer = stateRef.current.players.find(p => p.slot === stateRef.current.mySlot);
      // Only update if guest name is different AND we are a guest (no user ID or check auth)
      // Actually updateGuestName handler on server checks if guest.
      const currentName = currentPlayer?.guestName;

      if (newName !== currentName) {
        updateGuestName(newName);
      }
    };

    window.addEventListener('guest-name-changed', handleNameSync);
    return () => window.removeEventListener('guest-name-changed', handleNameSync);
  }, [updateGuestName]);

  const dismissResult = useCallback(() => {
    dispatch({ type: 'DISMISS_RESULT' });
  }, []);

  const setView = useCallback((view: WordChainView) => {
    dispatch({ type: 'SET_VIEW', payload: view });
  }, []);

  // Auto-refresh rooms when on lobby
  useEffect(() => {
    if (state.view === 'lobby') {
      refreshRooms();
    }
  }, [state.view, refreshRooms]);

  // Auto-rejoin on socket reconnect (handles page reload / network interruption)
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleReconnect = () => {
      // Use state first, fallback to sessionStorage (survives page reload)
      const currentRoomCode = stateRef.current.roomCode || getSavedRoomCode();
      if (currentRoomCode) {
        // Re-join via room code — backend will detect reconnect and send full state
        joinRoom(currentRoomCode);
      }
    };

    socket.on('connect', handleReconnect);
    return () => { socket.off('connect', handleReconnect); };
  }, [joinRoom]);

  // On mount: try to rejoin from sessionStorage (handles page reload)
  useEffect(() => {
    const savedCode = getSavedRoomCode();
    if (savedCode) {
      joinRoom(savedCode);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <WordChainContext.Provider value={{
      state,
      createRoom,
      joinRoom,
      leaveRoom,
      startGame,
      submitWord,
      surrender,
      newGame,
      dismissResult,
      refreshRooms,
      setView,
      kickPlayer,
      updateRoom,
      updateGuestName,
    }}>
      {children}
    </WordChainContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────

export const useWordChain = (): WordChainContextValue => {
  const context = useContext(WordChainContext);
  if (!context) {
    throw new Error('useWordChain must be used within WordChainProvider');
  }
  return context;
};
