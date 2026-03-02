/**
 * GoContext — State management for Go (Cờ Vây) game.
 * Uses useReducer + stateRef + socket listeners pattern (mirrors WordChainContext).
 */
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { socketService } from '../../services/socketService';
import { getToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { getGuestId } from '../../utils/guestId';
import { getGuestName } from '../../utils/guestName';
import { API_BASE_URL } from '../../utils/constants';
import { goSounds } from './go-sounds';
import {
  GoState,
  GoAction,
  GoView,
  GoRules,
  GoPlayer,
  GoMove,
  GoWinner,
  GoWinReason,
  GoScore,
  GoWaitingRoom,
  GoChatMessage,
  GoReaction,
  GoUndoRequest,
  TerritoryMap,
  GoColor,
  DEFAULT_RULES,
} from './go-types';

// ─── Session Storage ──────────────────────────────────────────
const GO_SESSION_KEY = 'go_room';

function saveRoomSession(roomCode: string) {
  localStorage.setItem(GO_SESSION_KEY, roomCode);
}

function clearRoomSession() {
  localStorage.removeItem(GO_SESSION_KEY);
}

function getSavedRoomCode(): string | null {
  return localStorage.getItem(GO_SESSION_KEY);
}

// ─── Initial Board ────────────────────────────────────────────
function makeEmptyBoard(size: number): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

const emptyTerritory: TerritoryMap = { black: [], white: [], neutral: [] };

// ─── Initial State ────────────────────────────────────────────
const initialState: GoState = {
  view: 'lobby',
  waitingRooms: [],
  isLoadingRooms: false,
  roomId: null,
  roomCode: null,
  rules: null,
  players: [],
  isHost: false,
  mySlot: null,
  hasPassword: false,
  gameStatus: 'waiting',
  board: makeEmptyBoard(9),
  currentColor: 'black',
  moveHistory: [],
  lastMove: null,
  moveCount: 0,
  timerEnabled: false,
  phase: 'play',
  deadStones: [],
  territory: emptyTerritory,
  score: null,
  winner: null,
  winReason: null,
  finalScore: null,
  showResult: false,
  pendingUndo: null,
  chatMessages: [],
  reactions: [],
  error: null,
  notification: null,
};

// ─── Reducer ──────────────────────────────────────────────────
function goReducer(state: GoState, action: GoAction): GoState {
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
        isHost: true,
        mySlot: 1,
        hasPassword: action.payload.hasPassword,
        gameStatus: 'waiting',
        chatMessages: [],
        error: null,
      };

    case 'ROOM_JOINED': {
      saveRoomSession(action.payload.roomCode);
      const gs = action.payload.gameStatus;
      let view: GoView = 'waiting';
      if (gs === 'playing') view = 'playing';
      else if (gs === 'scoring') view = 'scoring';
      else if (gs === 'finished') view = 'result';

      return {
        ...state,
        view,
        roomId: action.payload.roomId,
        roomCode: action.payload.roomCode,
        rules: action.payload.rules,
        players: action.payload.players,
        isHost: action.payload.isHost,
        mySlot: action.payload.mySlot,
        gameStatus: gs,
        // Restore game state if reconnecting
        ...(action.payload.board ? { board: action.payload.board } : {}),
        ...(action.payload.currentColor ? { currentColor: action.payload.currentColor } : {}),
        ...(action.payload.moveHistory ? { moveHistory: action.payload.moveHistory } : {}),
        ...(action.payload.phase ? { phase: action.payload.phase } : {}),
        ...(action.payload.deadStones ? { deadStones: action.payload.deadStones } : {}),
        ...(action.payload.territory ? { territory: action.payload.territory } : {}),
        ...(action.payload.score !== undefined ? { score: action.payload.score } : {}),
        ...(action.payload.moveCount !== undefined ? { moveCount: action.payload.moveCount } : {}),
        timerEnabled: !!(action.payload.rules?.mainTime),
        error: null,
      };
    }

    case 'PLAYER_JOINED':
      return { ...state, players: action.payload.players };

    case 'PLAYER_LEFT':
      return { ...state, players: action.payload.players };

    case 'GAME_STARTED': {
      const boardSize = state.rules?.boardSize ?? 9;
      return {
        ...state,
        view: 'playing',
        gameStatus: 'playing',
        phase: 'play',
        board: action.payload.board ?? makeEmptyBoard(boardSize),
        currentColor: action.payload.currentColor,
        players: action.payload.players,
        moveHistory: [],
        lastMove: null,
        moveCount: 0,
        deadStones: [],
        territory: emptyTerritory,
        score: null,
        winner: null,
        winReason: null,
        finalScore: null,
        showResult: false,
        pendingUndo: null,
        timerEnabled: !!(state.rules?.mainTime),
      };
    }

    case 'MOVE_MADE':
      return {
        ...state,
        board: action.payload.board,
        lastMove: action.payload.move,
        currentColor: action.payload.currentColor,
        players: action.payload.players,
        moveCount: action.payload.moveCount,
        moveHistory: [...state.moveHistory, action.payload.move],
        pendingUndo: null,
      };

    case 'PASS_MADE':
      return {
        ...state,
        currentColor: action.payload.currentColor,
        players: action.payload.players,
      };

    case 'SCORING_STARTED':
      return {
        ...state,
        view: 'scoring',
        phase: 'scoring',
        gameStatus: 'scoring',
        deadStones: action.payload.deadStones,
        territory: action.payload.territory,
        score: action.payload.score,
      };

    case 'DEAD_TOGGLED':
      return {
        ...state,
        deadStones: action.payload.deadStones,
        territory: action.payload.territory,
        score: action.payload.score,
      };

    case 'SCORING_AGREED':
      return {
        ...state,
        players: action.payload.players,
      };

    case 'RESUME_PLAY':
      return {
        ...state,
        view: 'playing',
        phase: 'play',
        gameStatus: 'playing',
        deadStones: [],
        territory: emptyTerritory,
        score: null,
        players: action.payload.players,
      };

    case 'GAME_FINISHED':
      return {
        ...state,
        view: 'result',
        gameStatus: 'finished',
        winner: action.payload.winner,
        winReason: action.payload.winReason,
        finalScore: action.payload.finalScore,
        players: action.payload.players,
        showResult: true,
      };

    case 'TIMER_UPDATE':
      return { ...state, players: action.payload.players };

    case 'UNDO_REQUESTED':
      return { ...state, pendingUndo: action.payload };

    case 'UNDO_RESOLVED': {
      if (!action.payload.approved) {
        return { ...state, pendingUndo: null };
      }
      return {
        ...state,
        pendingUndo: null,
        ...(action.payload.board ? { board: action.payload.board } : {}),
        ...(action.payload.currentColor ? { currentColor: action.payload.currentColor } : {}),
        ...(action.payload.players ? { players: action.payload.players } : {}),
        ...(action.payload.moveHistory ? {
          moveHistory: action.payload.moveHistory,
          lastMove: action.payload.moveHistory.length > 0
            ? action.payload.moveHistory[action.payload.moveHistory.length - 1]
            : null,
        } : {}),
        ...(action.payload.moveCount !== undefined ? { moveCount: action.payload.moveCount } : {}),
      };
    }

    case 'GAME_RESET': {
      const boardSize = state.rules?.boardSize ?? 9;
      return {
        ...state,
        view: 'playing',
        gameStatus: 'playing',
        phase: 'play',
        board: action.payload.board ?? makeEmptyBoard(boardSize),
        currentColor: action.payload.currentColor,
        players: action.payload.players,
        moveHistory: [],
        lastMove: null,
        moveCount: 0,
        deadStones: [],
        territory: emptyTerritory,
        score: null,
        winner: null,
        winReason: null,
        finalScore: null,
        showResult: false,
        pendingUndo: null,
      };
    }

    case 'PLAYER_RECONNECTED':
      return {
        ...state,
        players: action.payload.players,
      };

    case 'PLAYER_DISCONNECTED':
      return {
        ...state,
        players: action.payload.players,
      };

    case 'SETTINGS_UPDATED':
      return {
        ...state,
        rules: action.payload.rules,
        timerEnabled: !!(action.payload.rules?.mainTime),
      };

    case 'ADD_CHAT':
      return {
        ...state,
        chatMessages: [...state.chatMessages.slice(-49), action.payload],
      };

    case 'ADD_REACTION':
      return {
        ...state,
        reactions: [...state.reactions.slice(-19), action.payload],
      };

    case 'CLEAR_REACTIONS':
      return {
        ...state,
        reactions: state.reactions.filter(r => !action.payload.includes(r.id)),
      };

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

    case 'DISMISS_RESULT':
      return { ...state, showResult: false };

    default:
      return state;
  }
}

// ─── Context Type ─────────────────────────────────────────────
interface GoContextValue {
  state: GoState;
  createRoom: (rules: GoRules, password?: string) => void;
  joinRoom: (roomCode: string, password?: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  placeStone: (row: number, col: number) => void;
  pass: () => void;
  resign: () => void;
  toggleDeadStone: (row: number, col: number) => void;
  agreeScoring: () => void;
  rejectScoring: () => void;
  requestUndo: () => void;
  approveUndo: () => void;
  rejectUndo: () => void;
  newGame: () => void;
  updateSettings: (rules: GoRules) => void;
  refreshRooms: () => void;
  dismissResult: () => void;
  sendChat: (message: string) => void;
  sendReaction: (emoji: string) => void;
}

const GoContext = createContext<GoContextValue | null>(null);

export const useGo = (): GoContextValue => {
  const ctx = useContext(GoContext);
  if (!ctx) throw new Error('useGo must be used within GoProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────
export const GoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(goReducer, initialState);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isConnected } = useSocket();
  const stateRef = useRef(state);
  stateRef.current = state;

  const getPlayerId = useCallback(() => {
    return isAuthenticated && user ? user._id : getGuestId();
  }, [isAuthenticated, user]);

  const getPlayerName = useCallback(() => {
    return isAuthenticated && user
      ? user.username
      : (getGuestName() || `Guest ${getGuestId().slice(-6)}`);
  }, [isAuthenticated, user]);

  // ─── Client-side Timer ──────────────────────────────────────
  // Counts down the current player's time locally, synced by go:timer-update from server
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const s = stateRef.current;
      if (s.phase !== 'play' || !s.timerEnabled) return;
      const currentPlayer = s.players.find(p => p.color === s.currentColor);
      if (!currentPlayer) return;

      // Timer warning sounds
      if (currentPlayer.slot === s.mySlot) {
        const mainLeft = currentPlayer.mainTimeLeft;
        if (mainLeft === 10 || mainLeft === 5) {
          goSounds.playSFX('timerWarning');
        }
      }

      const updatedPlayers: GoPlayer[] = s.players.map(p => {
        if (p.color !== s.currentColor) return p;
        if (p.mainTimeLeft > 0) {
          return { ...p, mainTimeLeft: Math.max(0, p.mainTimeLeft - 1) };
        }
        if (p.byoyomiPeriodsLeft > 0) {
          // Byoyomi counting handled by server; just show visual countdown
          return p;
        }
        return p;
      });

      dispatch({ type: 'TIMER_UPDATE', payload: { players: updatedPlayers } });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Socket Listeners ────────────────────────────────────────
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleJoinedRoom = (data: any) => {
      dispatch({
        type: 'ROOM_JOINED',
        payload: {
          roomId: data.roomId,
          roomCode: data.roomCode,
          rules: data.rules,
          players: data.players || [],
          gameStatus: data.gameStatus || 'waiting',
          isHost: data.isHost || false,
          mySlot: data.mySlot || 1,
          board: data.board,
          currentColor: data.currentColor,
          moveHistory: data.moveHistory,
          phase: data.phase,
          deadStones: data.deadStones,
          territory: data.territory,
          score: data.score,
          moveCount: data.moveCount,
        },
      });
    };

    const handlePlayerJoined = (data: any) => {
      dispatch({ type: 'PLAYER_JOINED', payload: { players: data.players || [] } });
      const name = data.player?.username || data.player?.guestName || 'Player';
      getToast()?.info('toast.playerJoined', { params: { name } });
    };

    const handlePlayerLeft = (data: any) => {
      const leavingPlayer = stateRef.current.players.find(p => p.slot === data.slot);
      if (leavingPlayer) {
        const name = leavingPlayer.username || leavingPlayer.guestName || 'Player';
        getToast()?.warning('toast.playerLeft', { params: { name } });
      }
      dispatch({ type: 'PLAYER_LEFT', payload: { players: data.players || [] } });
    };

    const handleGameStarted = (data: any) => {
      dispatch({
        type: 'GAME_STARTED',
        payload: {
          board: data.board,
          currentColor: data.currentColor || 'black',
          players: data.players || stateRef.current.players,
        },
      });
      const myColor = stateRef.current.players.find(p => p.slot === stateRef.current.mySlot)?.color;
      if (myColor === 'black') {
        goSounds.playSFX('yourTurn');
      }
      getToast()?.success('toast.gameStarted');
    };

    const handleMoveMade = (data: any) => {
      dispatch({
        type: 'MOVE_MADE',
        payload: {
          board: data.board,
          move: data.move,
          currentColor: data.currentColor,
          players: data.players || stateRef.current.players,
          koPoint: data.koPoint || null,
          moveCount: data.moveCount,
        },
      });
      const captures = data.move?.captures?.length || 0;
      goSounds.playSFX(captures > 0 ? 'stoneCapture' : 'stonePlace');
      // Sound for my turn
      if (data.currentColor === stateRef.current.players.find(p => p.slot === stateRef.current.mySlot)?.color) {
        goSounds.playSFX('yourTurn');
      }
    };

    const handlePassMade = (data: any) => {
      dispatch({
        type: 'PASS_MADE',
        payload: {
          color: data.color,
          currentColor: data.currentColor,
          consecutivePasses: data.consecutivePasses,
          players: data.players || stateRef.current.players,
        },
      });
      goSounds.playSFX('pass');
      getToast()?.info('go.passed', { params: { color: data.color } });
    };

    const handleScoringStarted = (data: any) => {
      dispatch({
        type: 'SCORING_STARTED',
        payload: {
          deadStones: data.deadStones || [],
          territory: data.territory || emptyTerritory,
          score: data.score,
        },
      });
      getToast()?.info('go.scoringStarted');
    };

    const handleDeadToggled = (data: any) => {
      dispatch({
        type: 'DEAD_TOGGLED',
        payload: {
          deadStones: data.deadStones || [],
          territory: data.territory || emptyTerritory,
          score: data.score,
        },
      });
    };

    const handleScoringAgreed = (data: any) => {
      dispatch({
        type: 'SCORING_AGREED',
        payload: {
          slot: data.slot,
          players: data.players || stateRef.current.players,
        },
      });
    };

    const handleResumePlay = (data: any) => {
      dispatch({
        type: 'RESUME_PLAY',
        payload: { players: data.players || stateRef.current.players },
      });
    };

    const handleGameFinished = (data: any) => {
      dispatch({
        type: 'GAME_FINISHED',
        payload: {
          winner: data.winner,
          winReason: data.winReason,
          finalScore: data.finalScore || null,
          players: data.players || stateRef.current.players,
        },
      });
      const mySlot = stateRef.current.mySlot;
      const winner: GoWinner = data.winner;
      if (winner && mySlot) {
        goSounds.playSFX(winner.slot === mySlot ? 'victory' : 'defeat');
      }
    };

    const handleTimerUpdate = (data: any) => {
      dispatch({
        type: 'TIMER_UPDATE',
        payload: { players: data.players || stateRef.current.players },
      });
    };

    const handleUndoRequested = (data: any) => {
      dispatch({ type: 'UNDO_REQUESTED', payload: data });
      getToast()?.info('go.undoRequested');
    };

    const handleUndoResolved = (data: any) => {
      dispatch({
        type: 'UNDO_RESOLVED',
        payload: {
          approved: data.approved,
          board: data.board,
          currentColor: data.currentColor,
          players: data.players,
          moveHistory: data.moveHistory,
          moveCount: data.moveCount,
        },
      });
      if (data.approved) {
        getToast()?.success('go.undoApproved');
      } else {
        getToast()?.warning('go.undoRejected');
      }
    };

    const handleGameReset = (data: any) => {
      dispatch({
        type: 'GAME_RESET',
        payload: {
          board: data.board,
          currentColor: data.currentColor || 'black',
          players: data.players || stateRef.current.players,
        },
      });
    };

    const handlePlayerReconnected = (data: any) => {
      dispatch({
        type: 'PLAYER_RECONNECTED',
        payload: { slot: data.slot, players: data.players || stateRef.current.players },
      });
    };

    const handlePlayerDisconnected = (data: any) => {
      dispatch({
        type: 'PLAYER_DISCONNECTED',
        payload: { slot: data.slot, players: data.players || stateRef.current.players },
      });
    };

    const handleSettingsUpdated = (data: any) => {
      dispatch({ type: 'SETTINGS_UPDATED', payload: { rules: data.settings || data.rules } });
      if (!stateRef.current.isHost) {
        getToast()?.info('go.settingsUpdated');
      }
    };

    const handleChatReceived = (data: any) => {
      if (!data?.message) return;
      const chat: GoChatMessage = {
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        slot: data.slot,
        username: data.username || `Player ${data.slot}`,
        message: data.message,
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_CHAT', payload: chat });
      goSounds.playSFX('chat');
    };

    const handleReactionReceived = (data: any) => {
      if (!data?.emoji) return;
      const reaction: GoReaction = {
        id: `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        slot: data.slot,
        emoji: data.emoji,
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_REACTION', payload: reaction });
    };

    const handleKicked = () => {
      dispatch({ type: 'LEAVE_ROOM' });
      getToast()?.warning('toast.kicked');
    };

    const handleError = (data: any) => {
      const code = data.error || data.message || 'serverError';
      dispatch({ type: 'SET_ERROR', payload: code });
    };

    // Debounced room refresh with AbortController to prevent concurrent overlapping fetches
    let roomsDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let roomsAbortController: AbortController | null = null;

    const handleRoomsUpdated = () => {
      if (stateRef.current.view !== 'lobby') return;
      if (roomsDebounceTimer) clearTimeout(roomsDebounceTimer);
      roomsDebounceTimer = setTimeout(async () => {
        roomsAbortController?.abort();
        roomsAbortController = new AbortController();
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE_URL}/go/rooms`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: roomsAbortController.signal,
          });
          if (res.ok) {
            const rooms: GoWaitingRoom[] = await res.json();
            dispatch({ type: 'SET_ROOMS', payload: rooms });
          }
        } catch { /* aborted or network error */ }
      }, 500);
    };

    socket.on('go:joined-room' as any, handleJoinedRoom);
    socket.on('go:player-joined' as any, handlePlayerJoined);
    socket.on('go:player-left' as any, handlePlayerLeft);
    socket.on('go:game-started' as any, handleGameStarted);
    socket.on('go:move-made' as any, handleMoveMade);
    socket.on('go:pass-made' as any, handlePassMade);
    socket.on('go:scoring-started' as any, handleScoringStarted);
    socket.on('go:dead-toggled' as any, handleDeadToggled);
    socket.on('go:scoring-agreed' as any, handleScoringAgreed);
    socket.on('go:resume-play' as any, handleResumePlay);
    socket.on('go:game-finished' as any, handleGameFinished);
    socket.on('go:timer-update' as any, handleTimerUpdate);
    socket.on('go:undo-requested' as any, handleUndoRequested);
    socket.on('go:undo-resolved' as any, handleUndoResolved);
    socket.on('go:game-reset' as any, handleGameReset);
    socket.on('go:player-reconnected' as any, handlePlayerReconnected);
    socket.on('go:player-disconnected' as any, handlePlayerDisconnected);
    socket.on('go:settings-updated' as any, handleSettingsUpdated);
    socket.on('go:chat-received' as any, handleChatReceived);
    socket.on('go:reaction-received' as any, handleReactionReceived);
    socket.on('go:kicked' as any, handleKicked);
    socket.on('go:error' as any, handleError);
    socket.on('go:rooms-updated' as any, handleRoomsUpdated);

    return () => {
      if (roomsDebounceTimer) clearTimeout(roomsDebounceTimer);
      roomsAbortController?.abort();
      socket.off('go:joined-room' as any, handleJoinedRoom);
      socket.off('go:player-joined' as any, handlePlayerJoined);
      socket.off('go:player-left' as any, handlePlayerLeft);
      socket.off('go:game-started' as any, handleGameStarted);
      socket.off('go:move-made' as any, handleMoveMade);
      socket.off('go:pass-made' as any, handlePassMade);
      socket.off('go:scoring-started' as any, handleScoringStarted);
      socket.off('go:dead-toggled' as any, handleDeadToggled);
      socket.off('go:scoring-agreed' as any, handleScoringAgreed);
      socket.off('go:resume-play' as any, handleResumePlay);
      socket.off('go:game-finished' as any, handleGameFinished);
      socket.off('go:timer-update' as any, handleTimerUpdate);
      socket.off('go:undo-requested' as any, handleUndoRequested);
      socket.off('go:undo-resolved' as any, handleUndoResolved);
      socket.off('go:game-reset' as any, handleGameReset);
      socket.off('go:player-reconnected' as any, handlePlayerReconnected);
      socket.off('go:player-disconnected' as any, handlePlayerDisconnected);
      socket.off('go:settings-updated' as any, handleSettingsUpdated);
      socket.off('go:chat-received' as any, handleChatReceived);
      socket.off('go:reaction-received' as any, handleReactionReceived);
      socket.off('go:kicked' as any, handleKicked);
      socket.off('go:error' as any, handleError);
      socket.off('go:rooms-updated' as any, handleRoomsUpdated);
    };
  }, [isConnected]);

  // ─── Auto-refresh rooms on lobby view ───────────────────────
  useEffect(() => {
    if (state.view === 'lobby') {
      refreshRooms();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view]);

  // ─── Auto-rejoin ─────────────────────────────────────────────
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isConnected) return;
    if (state.roomId) return;
    const saved = getSavedRoomCode();
    if (saved) joinRoom(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, isConnected, state.roomId]);

  // ─── Cleanup on unmount: sounds + leaveRoom timer ──────────
  useEffect(() => {
    return () => {
      goSounds.dispose();
      if (leaveRoomTimerRef.current) clearTimeout(leaveRoomTimerRef.current);
    };
  }, []);

  // ─── Auto-cleanup stale reactions (>5s) ─────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const staleIds = stateRef.current.reactions
        .filter(r => now - r.timestamp > 5000)
        .map(r => r.id);
      if (staleIds.length > 0) {
        dispatch({ type: 'CLEAR_REACTIONS', payload: staleIds });
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // ─── Actions ─────────────────────────────────────────────────

  const refreshRooms = useCallback(async () => {
    dispatch({ type: 'SET_LOADING_ROOMS', payload: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/go/rooms`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const rooms: GoWaitingRoom[] = await res.json();
        dispatch({ type: 'SET_ROOMS', payload: rooms });
      } else {
        dispatch({ type: 'SET_LOADING_ROOMS', payload: false });
      }
    } catch {
      dispatch({ type: 'SET_LOADING_ROOMS', payload: false });
    }
  }, []);

  const createRoom = useCallback((rules: GoRules, password?: string) => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const playerId = getPlayerId();
    const playerName = getPlayerName();

    socket.emit('go:create-room' as any, {
      rules: { ...DEFAULT_RULES, ...rules },
      password,
      userId: isAuthenticated ? playerId : undefined,
      guestId: isAuthenticated ? undefined : playerId,
      guestName: isAuthenticated ? undefined : playerName,
    }, (res: any) => {
      if (res?.success) {
        dispatch({
          type: 'ROOM_CREATED',
          payload: {
            roomId: res.roomId,
            roomCode: res.roomCode,
            rules: res.rules,
            players: res.players || [],
            hasPassword: !!password,
          },
        });
        if (res.mySlot) {
          // Slot embedded in ROOM_JOINED via joined-room event; set via ROOM_JOINED mySlot field
        }
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

    socket.emit('go:join-room' as any, {
      roomCode: roomCode.toUpperCase(),
      password,
      userId: isAuthenticated ? playerId : undefined,
      guestId: isAuthenticated ? undefined : playerId,
      guestName: isAuthenticated ? undefined : playerName,
    }, (res: any) => {
      if (res && !res.success) {
        if (res.error === 'roomNotFound') clearRoomSession();
        dispatch({ type: 'SET_ERROR', payload: res.error || 'failedToJoin' });
      } else if (res?.success) {
        if (res.reconnected) return; // full state via go:joined-room event
        if (stateRef.current.view === 'lobby') {
          dispatch({
            type: 'ROOM_JOINED',
            payload: {
              roomId: res.roomId,
              roomCode: res.roomCode,
              rules: res.rules,
              players: res.players || [],
              gameStatus: res.gameStatus || 'waiting',
              isHost: res.isHost || false,
              mySlot: res.mySlot || 1,
            },
          });
        }
      }
    });
  }, [getPlayerId, getPlayerName, isAuthenticated]);

  const leaveRoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const leaveRoom = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    socket.emit('go:leave-room' as any, { roomId: stateRef.current.roomId });
    dispatch({ type: 'LEAVE_ROOM' });
    if (leaveRoomTimerRef.current) clearTimeout(leaveRoomTimerRef.current);
    leaveRoomTimerRef.current = setTimeout(() => refreshRooms(), 300);
  }, [refreshRooms]);

  const startGame = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    socket.emit('go:start-game' as any, { roomId: stateRef.current.roomId }, (res: any) => {
      if (res && !res.success) {
        dispatch({ type: 'SET_ERROR', payload: res.error || 'failedToStart' });
      }
    });
  }, []);

  const placeStone = useCallback((row: number, col: number) => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    goSounds.init();
    socket.emit('go:place-stone' as any, {
      roomId: stateRef.current.roomId,
      row,
      col,
    }, (res: any) => {
      if (res && !res.success) {
        dispatch({ type: 'SET_ERROR', payload: res.error || 'invalidMove' });
      }
    });
  }, []);

  const pass = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    socket.emit('go:pass' as any, { roomId: stateRef.current.roomId });
  }, []);

  const resign = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    socket.emit('go:resign' as any, { roomId: stateRef.current.roomId });
  }, []);

  const toggleDeadStone = useCallback((row: number, col: number) => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    socket.emit('go:toggle-dead' as any, {
      roomId: stateRef.current.roomId,
      row,
      col,
    });
  }, []);

  const agreeScoring = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    socket.emit('go:agree-scoring' as any, { roomId: stateRef.current.roomId });
  }, []);

  const rejectScoring = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    socket.emit('go:reject-scoring' as any, { roomId: stateRef.current.roomId });
  }, []);

  const requestUndo = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    socket.emit('go:request-undo' as any, { roomId: stateRef.current.roomId });
  }, []);

  const approveUndo = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    socket.emit('go:approve-undo' as any, { roomId: stateRef.current.roomId });
  }, []);

  const rejectUndo = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    socket.emit('go:reject-undo' as any, { roomId: stateRef.current.roomId });
  }, []);

  const newGame = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    socket.emit('go:new-game' as any, { roomId: stateRef.current.roomId });
  }, []);

  const updateSettings = useCallback((rules: GoRules) => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    socket.emit('go:update-room' as any, {
      roomId: stateRef.current.roomId,
      rules,
    }, (res: any) => {
      if (res?.success) {
        getToast()?.success('go.settingsUpdated');
      } else if (res) {
        dispatch({ type: 'SET_ERROR', payload: res.error || 'failedToUpdate' });
      }
    });
  }, []);

  const dismissResult = useCallback(() => {
    dispatch({ type: 'DISMISS_RESULT' });
  }, []);

  const sendChat = useCallback((message: string) => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    const trimmed = message.trim().slice(0, 200);
    if (!trimmed) return;
    socket.emit('go:send-chat' as any, { message: trimmed });
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;
    socket.emit('go:send-reaction' as any, { emoji });
  }, []);

  return (
    <GoContext.Provider value={{
      state,
      createRoom,
      joinRoom,
      leaveRoom,
      startGame,
      placeStone,
      pass,
      resign,
      toggleDeadStone,
      agreeScoring,
      rejectScoring,
      requestUndo,
      approveUndo,
      rejectUndo,
      newGame,
      updateSettings,
      refreshRooms,
      dismissResult,
      sendChat,
      sendReaction,
    }}>
      {children}
    </GoContext.Provider>
  );
};
