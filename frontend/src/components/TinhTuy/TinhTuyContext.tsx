/**
 * TinhTuyContext — State management for Tinh Tuy Dai Chien.
 * Uses useReducer + socket listeners. Follows WordChainContext pattern.
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
  TinhTuyState, TinhTuyAction, TinhTuyView, TinhTuyPlayer,
  TinhTuySettings, WaitingRoomInfo, CreateRoomPayload, DEFAULT_SETTINGS,
} from './tinh-tuy-types';
import { tinhTuySounds } from './tinh-tuy-sounds';

// ─── Session Storage ──────────────────────────────────
const TT_SESSION_KEY = 'tinhtuy_room';

function saveRoomSession(roomCode: string) {
  localStorage.setItem(TT_SESSION_KEY, roomCode);
}
function clearRoomSession() {
  localStorage.removeItem(TT_SESSION_KEY);
}
function getSavedRoomCode(): string | null {
  return localStorage.getItem(TT_SESSION_KEY);
}

// ─── Helper: resolve displayName from player data ─────
function resolveDisplayName(p: any): string {
  return p.displayName || p.name || p.guestName || (p.guestId ? `Guest ${p.guestId.slice(-6)}` : 'Player');
}

function mapPlayers(players: any[]): TinhTuyPlayer[] {
  return (players || []).map((p: any) => ({
    ...p,
    displayName: resolveDisplayName(p),
    userId: p.userId?.toString?.() || p.userId,
  }));
}

// ─── Initial State ────────────────────────────────────
const initialState: TinhTuyState = {
  view: 'lobby',
  waitingRooms: [],
  isLoadingRooms: false,
  roomId: null,
  roomCode: null,
  settings: null,
  players: [],
  isHost: false,
  mySlot: null,
  hasPassword: false,
  gameStatus: 'waiting',
  currentPlayerSlot: 1,
  turnPhase: 'ROLL_DICE',
  turnStartedAt: 0,
  lastDiceResult: null,
  round: 0,
  pendingAction: null,
  winner: null,
  error: null,
  drawnCard: null,
  chatMessages: [],
  animatingToken: null,
  showGoPopup: false,
};

// ─── Reducer ──────────────────────────────────────────
function tinhTuyReducer(state: TinhTuyState, action: TinhTuyAction): TinhTuyState {
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
        ...state, view: 'waiting',
        roomId: action.payload.roomId, roomCode: action.payload.roomCode,
        settings: action.payload.settings, players: mapPlayers(action.payload.players),
        isHost: true, gameStatus: 'waiting', error: null,
      };

    case 'ROOM_JOINED': {
      saveRoomSession(action.payload.roomCode);
      const isPlaying = action.payload.gameStatus === 'playing';
      // On reconnect with full game state
      if (action.payload.reconnected && action.payload.game) {
        const g = action.payload.game;
        return {
          ...state,
          view: g.gameStatus === 'playing' ? 'playing' : 'waiting',
          roomId: g.roomId, roomCode: g.roomCode,
          settings: g.settings, players: mapPlayers(g.players),
          gameStatus: g.gameStatus,
          currentPlayerSlot: g.currentPlayerSlot || 1,
          turnPhase: g.turnPhase || 'ROLL_DICE',
          turnStartedAt: g.turnStartedAt ? new Date(g.turnStartedAt).getTime() : Date.now(),
          lastDiceResult: g.lastDiceResult || null,
          round: g.round || 1,
          error: null,
        };
      }
      return {
        ...state,
        view: isPlaying ? 'playing' : 'waiting',
        roomId: action.payload.roomId, roomCode: action.payload.roomCode,
        settings: action.payload.settings, players: mapPlayers(action.payload.players),
        gameStatus: action.payload.gameStatus,
        error: null,
      };
    }

    case 'ROOM_UPDATED': {
      const updates: Partial<TinhTuyState> = {};
      if (action.payload.players) updates.players = mapPlayers(action.payload.players);
      if (action.payload.settings) updates.settings = action.payload.settings;
      if (action.payload.gameStatus) updates.gameStatus = action.payload.gameStatus;
      return { ...state, ...updates };
    }

    case 'GAME_STARTED': {
      const g = action.payload.game;
      return {
        ...state, view: 'playing', gameStatus: 'playing',
        players: mapPlayers(g.players),
        currentPlayerSlot: g.currentPlayerSlot || 1,
        turnPhase: g.turnPhase || 'ROLL_DICE',
        turnStartedAt: Date.now(),
        round: g.round || 1,
        lastDiceResult: null, pendingAction: null, winner: null,
      };
    }

    case 'DICE_RESULT':
      return { ...state, lastDiceResult: { dice1: action.payload.dice1, dice2: action.payload.dice2 } };

    case 'PLAYER_MOVED': {
      const { slot, from, to, goBonus } = action.payload;
      // Compute movement path (wrap around at 36)
      const path: number[] = [];
      let pos = from;
      while (pos !== to) {
        pos = (pos + 1) % 36;
        path.push(pos);
      }
      // Update points immediately (Go bonus), start animation
      const updated = state.players.map(p =>
        p.slot === slot ? { ...p, points: goBonus ? p.points + goBonus : p.points } : p
      );
      return {
        ...state,
        players: updated,
        animatingToken: { slot, path, currentStep: 0 },
        showGoPopup: action.payload.passedGo ? true : state.showGoPopup,
      };
    }

    case 'ANIMATION_STEP': {
      if (!state.animatingToken) return state;
      const next = state.animatingToken.currentStep + 1;
      if (next >= state.animatingToken.path.length) {
        // Animation complete — update actual position
        const finalPos = state.animatingToken.path[state.animatingToken.path.length - 1];
        const updated = state.players.map(p =>
          p.slot === state.animatingToken!.slot ? { ...p, position: finalPos } : p
        );
        return { ...state, players: updated, animatingToken: null };
      }
      return { ...state, animatingToken: { ...state.animatingToken, currentStep: next } };
    }

    case 'SHOW_GO_POPUP':
      return { ...state, showGoPopup: true };

    case 'HIDE_GO_POPUP':
      return { ...state, showGoPopup: false };

    case 'AWAITING_ACTION':
      return {
        ...state, turnPhase: 'AWAITING_ACTION',
        pendingAction: {
          type: 'BUY_PROPERTY',
          cellIndex: action.payload.cellIndex,
          price: action.payload.price || 0,
          canAfford: action.payload.canAfford ?? true,
          cellType: action.payload.cellType,
        },
      };

    case 'PROPERTY_BOUGHT': {
      const updated = state.players.map(p =>
        p.slot === action.payload.slot
          ? { ...p, points: action.payload.remainingPoints, properties: [...p.properties, action.payload.cellIndex] }
          : p
      );
      return { ...state, players: updated, pendingAction: null };
    }

    case 'RENT_PAID': {
      const updated = state.players.map(p => {
        if (p.slot === action.payload.fromSlot) return { ...p, points: p.points - action.payload.amount };
        if (p.slot === action.payload.toSlot) return { ...p, points: p.points + action.payload.amount };
        return p;
      });
      return { ...state, players: updated, pendingAction: null };
    }

    case 'TAX_PAID': {
      const updated = state.players.map(p =>
        p.slot === action.payload.slot ? { ...p, points: p.points - action.payload.amount } : p
      );
      return { ...state, players: updated };
    }

    case 'TURN_CHANGED':
      return {
        ...state,
        currentPlayerSlot: action.payload.currentSlot,
        turnPhase: action.payload.turnPhase,
        turnStartedAt: Date.now(),
        round: action.payload.round || state.round,
        pendingAction: null,
        lastDiceResult: action.payload.extraTurn ? state.lastDiceResult : null,
      };

    case 'PLAYER_BANKRUPT': {
      const updated = state.players.map(p =>
        p.slot === action.payload.slot ? { ...p, isBankrupt: true, points: 0, properties: [] } : p
      );
      return { ...state, players: updated };
    }

    case 'PLAYER_SURRENDERED': {
      const updated = state.players.map(p =>
        p.slot === action.payload.slot ? { ...p, isBankrupt: true, points: 0, properties: [] } : p
      );
      return { ...state, players: updated };
    }

    case 'PLAYER_ISLAND': {
      const updated = state.players.map(p =>
        p.slot === action.payload.slot ? { ...p, islandTurns: action.payload.turnsRemaining, position: 27 } : p
      );
      return { ...state, players: updated };
    }

    case 'GAME_FINISHED':
      clearRoomSession();
      return { ...state, view: 'result', gameStatus: 'finished', winner: action.payload.winner };

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

    case 'SET_HOST':
      return { ...state, isHost: action.payload };

    case 'SET_MY_SLOT':
      return { ...state, mySlot: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CARD_DRAWN': {
      const { slot, card, effect } = action.payload;
      let updated = [...state.players];
      // Apply point changes
      if (effect?.pointsChanged) {
        for (const [slotStr, delta] of Object.entries(effect.pointsChanged)) {
          updated = updated.map(p =>
            p.slot === Number(slotStr) ? { ...p, points: p.points + (delta as number) } : p
          );
        }
      }
      // Move player
      if (effect?.playerMoved) {
        updated = updated.map(p =>
          p.slot === effect.playerMoved.slot ? { ...p, position: effect.playerMoved.to } : p
        );
      }
      // Hold card
      if (effect?.cardHeld) {
        updated = updated.map(p =>
          p.slot === effect.cardHeld.slot ? { ...p, cards: [...p.cards, effect.cardHeld.cardId] } : p
        );
      }
      // Remove house
      if (effect?.houseRemoved) {
        updated = updated.map(p => {
          if (p.slot !== effect.houseRemoved.slot) return p;
          const key = String(effect.houseRemoved.cellIndex);
          return { ...p, houses: { ...p.houses, [key]: Math.max((p.houses[key] || 0) - 1, 0) } };
        });
      }
      // Go to island
      if (effect?.goToIsland) {
        updated = updated.map(p =>
          p.slot === slot ? { ...p, position: 27, islandTurns: 3 } : p
        );
      }
      return { ...state, players: updated, drawnCard: card };
    }

    case 'CLEAR_CARD':
      return { ...state, drawnCard: null };

    case 'HOUSE_BUILT': {
      const updated = state.players.map(p => {
        if (p.slot !== action.payload.slot) return p;
        const key = String(action.payload.cellIndex);
        return {
          ...p,
          houses: { ...p.houses, [key]: action.payload.houseCount },
          points: action.payload.remainingPoints ?? p.points,
        };
      });
      return { ...state, players: updated };
    }

    case 'HOTEL_BUILT': {
      const updated = state.players.map(p => {
        if (p.slot !== action.payload.slot) return p;
        const key = String(action.payload.cellIndex);
        return {
          ...p,
          houses: { ...p.houses, [key]: 0 },
          hotels: { ...p.hotels, [key]: true },
          points: action.payload.remainingPoints ?? p.points,
        };
      });
      return { ...state, players: updated };
    }

    case 'ISLAND_ESCAPED': {
      const updated = state.players.map(p =>
        p.slot === action.payload.slot
          ? { ...p, islandTurns: 0, points: action.payload.costPaid ? p.points - action.payload.costPaid : p.points }
          : p
      );
      return { ...state, players: updated };
    }

    case 'FESTIVAL_PAID': {
      const updated = state.players.map(p => {
        const delta = action.payload.amounts[p.slot];
        return delta !== undefined ? { ...p, points: p.points + delta } : p;
      });
      return { ...state, players: updated };
    }

    case 'CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload].slice(-50) };

    case 'LEAVE_ROOM':
      clearRoomSession();
      return { ...initialState, waitingRooms: state.waitingRooms };

    default:
      return state;
  }
}

// ─── Context Type ─────────────────────────────────────
interface TinhTuyContextValue {
  state: TinhTuyState;
  createRoom: (payload: CreateRoomPayload) => void;
  joinRoom: (roomCode: string, password?: string) => void;
  leaveRoom: () => void;
  startGame: () => Promise<boolean>;
  rollDice: () => void;
  buyProperty: () => void;
  skipBuy: () => void;
  surrender: () => void;
  refreshRooms: () => void;
  setView: (view: TinhTuyView) => void;
  updateRoom: (payload: { settings?: Partial<TinhTuySettings> }) => Promise<boolean>;
  buildHouse: (cellIndex: number) => void;
  buildHotel: (cellIndex: number) => void;
  escapeIsland: (method: 'PAY' | 'ROLL' | 'USE_CARD') => void;
  sendChat: (message: string) => void;
  sendReaction: (reaction: string) => void;
}

const TinhTuyContext = createContext<TinhTuyContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────
export const TinhTuyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(tinhTuyReducer, initialState);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isConnected } = useSocket();
  const stateRef = useRef(state);
  stateRef.current = state;
  const cardTimerRef = useRef<number | null>(null);

  const getPlayerId = useCallback(() => {
    return isAuthenticated && user ? user._id : getGuestId();
  }, [isAuthenticated, user]);

  const getPlayerName = useCallback(() => {
    return isAuthenticated && user ? user.username : (getGuestName() || `Guest ${getGuestId().slice(-6)}`);
  }, [isAuthenticated, user]);

  // ─── Socket Listeners ───────────────────────────────
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleRoomUpdated = (data: any) => {
      dispatch({ type: 'ROOM_UPDATED', payload: data });
    };

    const handleGameStarted = (data: any) => {
      dispatch({ type: 'GAME_STARTED', payload: data });
      getToast()?.success('tinhTuy.game.gameStarted');
    };

    const handleDiceResult = (data: any) => {
      dispatch({ type: 'DICE_RESULT', payload: data });
      tinhTuySounds.playSFX('diceRoll');
    };

    const handlePlayerMoved = (data: any) => {
      dispatch({ type: 'PLAYER_MOVED', payload: data });
    };

    const handleAwaitingAction = (data: any) => {
      dispatch({ type: 'AWAITING_ACTION', payload: data });
    };

    const handlePropertyBought = (data: any) => {
      dispatch({ type: 'PROPERTY_BOUGHT', payload: data });
      tinhTuySounds.playSFX('purchase');
    };

    const handleRentPaid = (data: any) => {
      dispatch({ type: 'RENT_PAID', payload: data });
      tinhTuySounds.playSFX('rentPay');
    };

    const handleTaxPaid = (data: any) => {
      dispatch({ type: 'TAX_PAID', payload: data });
    };

    const handleTurnChanged = (data: any) => {
      dispatch({ type: 'TURN_CHANGED', payload: data });
      // Play "your turn" sound if it's my turn
      if (data.currentSlot === stateRef.current.mySlot) {
        tinhTuySounds.playSFX('yourTurn');
      }
    };

    const handlePlayerBankrupt = (data: any) => {
      dispatch({ type: 'PLAYER_BANKRUPT', payload: data });
    };

    const handlePlayerSurrendered = (data: any) => {
      dispatch({ type: 'PLAYER_SURRENDERED', payload: data });
    };

    const handlePlayerIsland = (data: any) => {
      dispatch({ type: 'PLAYER_ISLAND', payload: data });
      tinhTuySounds.playSFX('island');
    };

    const handleGameFinished = (data: any) => {
      dispatch({ type: 'GAME_FINISHED', payload: data });
      tinhTuySounds.playSFX('victory');
    };

    const handlePlayerDisconnected = (data: any) => {
      dispatch({ type: 'PLAYER_DISCONNECTED', payload: data });
    };

    const handlePlayerReconnected = (data: any) => {
      dispatch({ type: 'PLAYER_RECONNECTED', payload: data });
    };

    const handleCardDrawn = (data: any) => {
      dispatch({ type: 'CARD_DRAWN', payload: data });
      tinhTuySounds.playSFX('cardDraw');
      // Auto-clear card after 3s — clear previous timer to prevent overlap
      if (cardTimerRef.current) clearTimeout(cardTimerRef.current);
      cardTimerRef.current = window.setTimeout(() => {
        dispatch({ type: 'CLEAR_CARD' });
        cardTimerRef.current = null;
      }, 3000);
    };

    const handleHouseBuilt = (data: any) => {
      dispatch({ type: 'HOUSE_BUILT', payload: data });
      tinhTuySounds.playSFX('buildHouse');
    };

    const handleHotelBuilt = (data: any) => {
      dispatch({ type: 'HOTEL_BUILT', payload: data });
      tinhTuySounds.playSFX('buildHouse');
    };

    const handleIslandEscaped = (data: any) => {
      dispatch({ type: 'ISLAND_ESCAPED', payload: data });
    };

    const handleFestivalPaid = (data: any) => {
      dispatch({ type: 'FESTIVAL_PAID', payload: data });
    };

    const handleChatMessage = (data: any) => {
      dispatch({ type: 'CHAT_MESSAGE', payload: data });
      tinhTuySounds.playSFX('chat');
    };

    // Auto-refresh lobby
    const handleLobbyUpdated = async () => {
      if (stateRef.current.view !== 'lobby') return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/tinh-tuy/rooms`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const rooms: WaitingRoomInfo[] = await res.json();
          dispatch({ type: 'SET_ROOMS', payload: rooms });
        }
      } catch { /* ignore */ }
    };

    socket.on('tinh-tuy:room-updated' as any, handleRoomUpdated);
    socket.on('tinh-tuy:game-started' as any, handleGameStarted);
    socket.on('tinh-tuy:dice-result' as any, handleDiceResult);
    socket.on('tinh-tuy:player-moved' as any, handlePlayerMoved);
    socket.on('tinh-tuy:awaiting-action' as any, handleAwaitingAction);
    socket.on('tinh-tuy:property-bought' as any, handlePropertyBought);
    socket.on('tinh-tuy:rent-paid' as any, handleRentPaid);
    socket.on('tinh-tuy:tax-paid' as any, handleTaxPaid);
    socket.on('tinh-tuy:turn-changed' as any, handleTurnChanged);
    socket.on('tinh-tuy:player-bankrupt' as any, handlePlayerBankrupt);
    socket.on('tinh-tuy:player-surrendered' as any, handlePlayerSurrendered);
    socket.on('tinh-tuy:player-island' as any, handlePlayerIsland);
    socket.on('tinh-tuy:game-finished' as any, handleGameFinished);
    socket.on('tinh-tuy:player-disconnected' as any, handlePlayerDisconnected);
    socket.on('tinh-tuy:player-reconnected' as any, handlePlayerReconnected);
    socket.on('tinh-tuy:card-drawn' as any, handleCardDrawn);
    socket.on('tinh-tuy:house-built' as any, handleHouseBuilt);
    socket.on('tinh-tuy:hotel-built' as any, handleHotelBuilt);
    socket.on('tinh-tuy:island-escaped' as any, handleIslandEscaped);
    socket.on('tinh-tuy:festival-paid' as any, handleFestivalPaid);
    socket.on('tinh-tuy:chat-message' as any, handleChatMessage);
    socket.on('tinh-tuy:room-created' as any, handleLobbyUpdated);
    socket.on('tinh-tuy:lobby-room-updated' as any, handleLobbyUpdated);

    return () => {
      socket.off('tinh-tuy:room-updated' as any, handleRoomUpdated);
      socket.off('tinh-tuy:game-started' as any, handleGameStarted);
      socket.off('tinh-tuy:dice-result' as any, handleDiceResult);
      socket.off('tinh-tuy:player-moved' as any, handlePlayerMoved);
      socket.off('tinh-tuy:awaiting-action' as any, handleAwaitingAction);
      socket.off('tinh-tuy:property-bought' as any, handlePropertyBought);
      socket.off('tinh-tuy:rent-paid' as any, handleRentPaid);
      socket.off('tinh-tuy:tax-paid' as any, handleTaxPaid);
      socket.off('tinh-tuy:turn-changed' as any, handleTurnChanged);
      socket.off('tinh-tuy:player-bankrupt' as any, handlePlayerBankrupt);
      socket.off('tinh-tuy:player-surrendered' as any, handlePlayerSurrendered);
      socket.off('tinh-tuy:player-island' as any, handlePlayerIsland);
      socket.off('tinh-tuy:game-finished' as any, handleGameFinished);
      socket.off('tinh-tuy:player-disconnected' as any, handlePlayerDisconnected);
      socket.off('tinh-tuy:player-reconnected' as any, handlePlayerReconnected);
      socket.off('tinh-tuy:card-drawn' as any, handleCardDrawn);
      socket.off('tinh-tuy:house-built' as any, handleHouseBuilt);
      socket.off('tinh-tuy:hotel-built' as any, handleHotelBuilt);
      socket.off('tinh-tuy:island-escaped' as any, handleIslandEscaped);
      socket.off('tinh-tuy:festival-paid' as any, handleFestivalPaid);
      socket.off('tinh-tuy:chat-message' as any, handleChatMessage);
      socket.off('tinh-tuy:room-created' as any, handleLobbyUpdated);
      socket.off('tinh-tuy:lobby-room-updated' as any, handleLobbyUpdated);
      // Clear card auto-dismiss timer
      if (cardTimerRef.current) { clearTimeout(cardTimerRef.current); cardTimerRef.current = null; }
    };
  }, [isConnected]);

  // ─── Actions ────────────────────────────────────────

  const refreshRooms = useCallback(async () => {
    dispatch({ type: 'SET_LOADING_ROOMS', payload: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/tinh-tuy/rooms`, {
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

    socket.emit('tinh-tuy:create-room' as any, {
      settings: { ...DEFAULT_SETTINGS, ...payload.settings },
      password: payload.password,
      userId: isAuthenticated ? playerId : undefined,
      guestId: isAuthenticated ? undefined : playerId,
      guestName: isAuthenticated ? undefined : playerName,
    }, (res: any) => {
      if (res?.success) {
        dispatch({
          type: 'ROOM_CREATED',
          payload: {
            roomId: res.roomId, roomCode: res.roomCode,
            settings: res.settings, players: res.players || [],
          },
        });
        dispatch({ type: 'SET_MY_SLOT', payload: 1 });
        dispatch({ type: 'SET_HOST', payload: true });
        getToast()?.success('tinhTuy.lobby.roomCreated');
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

    socket.emit('tinh-tuy:join-room' as any, {
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
        dispatch({
          type: 'ROOM_JOINED',
          payload: {
            roomId: res.roomId, roomCode: res.roomCode,
            settings: res.settings, players: res.players || [],
            gameStatus: res.game?.gameStatus || 'waiting',
            reconnected: res.reconnected, game: res.game,
          },
        });
        // Find my slot
        const me = (res.players || res.game?.players || []).find((p: any) =>
          (isAuthenticated && p.userId?.toString?.() === playerId) ||
          (!isAuthenticated && p.guestId === playerId)
        );
        if (me) dispatch({ type: 'SET_MY_SLOT', payload: me.slot });
        // Check host
        const hostId = res.game?.hostPlayerId || res.hostPlayerId;
        dispatch({ type: 'SET_HOST', payload: hostId === playerId });
      }
    });
  }, [getPlayerId, getPlayerName, isAuthenticated]);

  const leaveRoom = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !stateRef.current.roomId) return;

    socket.emit('tinh-tuy:leave-room' as any, {}, (res: any) => {
      // ignore result
    });
    dispatch({ type: 'LEAVE_ROOM' });
    setTimeout(() => refreshRooms(), 300);
  }, [refreshRooms]);

  const startGame = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = socketService.getSocket();
      if (!socket || !stateRef.current.roomId) { resolve(false); return; }

      const timeout = setTimeout(() => resolve(false), 10_000);

      socket.emit('tinh-tuy:start-game' as any, {}, (res: any) => {
        clearTimeout(timeout);
        if (res && !res.success) {
          dispatch({ type: 'SET_ERROR', payload: res.error || 'failedToStart' });
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, []);

  const rollDice = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:roll-dice' as any, {}, (res: any) => {
      if (res && !res.success) {
        dispatch({ type: 'SET_ERROR', payload: res.error });
      }
    });
  }, []);

  const buyProperty = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:buy-property' as any, {}, (res: any) => {
      if (res && !res.success) {
        dispatch({ type: 'SET_ERROR', payload: res.error });
      }
    });
  }, []);

  const skipBuy = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:skip-buy' as any, {}, (res: any) => {
      if (res && !res.success) {
        dispatch({ type: 'SET_ERROR', payload: res.error });
      }
    });
  }, []);

  const surrender = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:surrender' as any, {}, (res: any) => {
      if (res && !res.success) {
        dispatch({ type: 'SET_ERROR', payload: res.error });
      }
    });
  }, []);

  const updateRoom = useCallback((payload: { settings?: Partial<TinhTuySettings> }): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = socketService.getSocket();
      if (!socket || !stateRef.current.roomId) { resolve(false); return; }

      socket.emit('tinh-tuy:update-room' as any, payload, (res: any) => {
        if (res?.success) {
          resolve(true);
        } else {
          dispatch({ type: 'SET_ERROR', payload: res?.error || 'failedToUpdate' });
          resolve(false);
        }
      });
    });
  }, []);

  const buildHouse = useCallback((cellIndex: number) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:build-house' as any, { cellIndex }, (res: any) => {
      if (res && !res.success) dispatch({ type: 'SET_ERROR', payload: res.error });
    });
  }, []);

  const buildHotel = useCallback((cellIndex: number) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:build-hotel' as any, { cellIndex }, (res: any) => {
      if (res && !res.success) dispatch({ type: 'SET_ERROR', payload: res.error });
    });
  }, []);

  const escapeIsland = useCallback((method: 'PAY' | 'ROLL' | 'USE_CARD') => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:escape-island' as any, { method }, (res: any) => {
      if (res && !res.success) dispatch({ type: 'SET_ERROR', payload: res.error });
    });
  }, []);

  const sendChat = useCallback((message: string) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:send-chat' as any, { message }, (res: any) => {
      if (res && !res.success && res.error !== 'tooFast') {
        dispatch({ type: 'SET_ERROR', payload: res.error });
      }
    });
  }, []);

  const sendReaction = useCallback((reaction: string) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:send-reaction' as any, { emoji: reaction }, (res: any) => {
      // Silently ignore reaction errors
    });
  }, []);

  const setView = useCallback((view: TinhTuyView) => {
    dispatch({ type: 'SET_VIEW', payload: view });
  }, []);

  // Auto-refresh rooms on lobby view
  useEffect(() => {
    if (state.view === 'lobby') refreshRooms();
  }, [state.view, refreshRooms]);

  // Auto-rejoin logic (use stateRef to avoid re-execution loops)
  useEffect(() => {
    if (isAuthLoading || !isConnected || stateRef.current.roomId) return;
    const savedCode = getSavedRoomCode();
    if (savedCode) joinRoom(savedCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, isConnected, joinRoom]);

  // Movement animation driver — step every 180ms + move SFX per step
  useEffect(() => {
    if (!state.animatingToken) return;
    const timer = setInterval(() => {
      dispatch({ type: 'ANIMATION_STEP' });
      tinhTuySounds.playSFX('move');
    }, 180);
    return () => clearInterval(timer);
  }, [state.animatingToken?.slot, state.animatingToken?.path.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Go popup auto-dismiss after 1.5s
  useEffect(() => {
    if (!state.showGoPopup) return;
    const timer = setTimeout(() => dispatch({ type: 'HIDE_GO_POPUP' }), 1500);
    return () => clearTimeout(timer);
  }, [state.showGoPopup]);

  // Sound: iOS AudioContext unlock on first user gesture + Page Visibility
  useEffect(() => {
    const handleInit = () => tinhTuySounds.init();
    document.addEventListener('click', handleInit, { once: true });
    document.addEventListener('touchstart', handleInit, { once: true });
    document.addEventListener('visibilitychange', tinhTuySounds.handleVisibilityChange);
    return () => {
      document.removeEventListener('click', handleInit);
      document.removeEventListener('touchstart', handleInit);
      document.removeEventListener('visibilitychange', tinhTuySounds.handleVisibilityChange);
    };
  }, []);

  // Sound: BGM track switching based on view (playBGM stops previous track internally)
  useEffect(() => {
    if (state.view === 'playing') {
      tinhTuySounds.playBGM('game');
    } else if (state.view === 'lobby' || state.view === 'waiting') {
      tinhTuySounds.playBGM('lobby');
    } else {
      tinhTuySounds.stopBGM();
    }
  }, [state.view]);

  // Sound: stop BGM on unmount only
  useEffect(() => () => tinhTuySounds.stopBGM(), []);

  return (
    <TinhTuyContext.Provider value={{
      state, createRoom, joinRoom, leaveRoom, startGame,
      rollDice, buyProperty, skipBuy, surrender,
      refreshRooms, setView, updateRoom,
      buildHouse, buildHotel, escapeIsland, sendChat, sendReaction,
    }}>
      {children}
    </TinhTuyContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────
export const useTinhTuy = (): TinhTuyContextValue => {
  const context = useContext(TinhTuyContext);
  if (!context) throw new Error('useTinhTuy must be used within TinhTuyProvider');
  return context;
};
