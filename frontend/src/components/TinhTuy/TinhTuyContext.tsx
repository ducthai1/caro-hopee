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
    properties: p.properties || [],
    houses: p.houses || {},
    hotels: p.hotels || {},
    festivals: p.festivals || {},
    cards: p.cards || [],
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
  pendingMove: null,
  animatingToken: null,
  pendingCardMove: null,
  showGoPopup: false,
  islandAlertSlot: null,
  taxAlert: null,
  rentAlert: null,
  pointNotifs: [],
  pendingNotifs: [],
  displayPoints: {},
  queuedTurnChange: null,
  queuedTravelPrompt: false,
  queuedFestivalPrompt: false,
  queuedAction: null,
  queuedRentAlert: null,
  queuedTaxAlert: null,
  queuedIslandAlert: null,
};

// ─── Point notification helpers ───────────────────────
let _notifId = 0;
/** Create point notif entries with IDs for display (capped at 20) */
function addNotifs(
  existing: TinhTuyState['pointNotifs'],
  entries: Array<{ slot: number; amount: number }>,
): TinhTuyState['pointNotifs'] {
  const newNotifs = entries
    .filter(e => e.amount !== 0)
    .map(e => ({ id: ++_notifId, slot: e.slot, amount: e.amount }));
  if (newNotifs.length === 0) return existing;
  return [...existing, ...newNotifs].slice(-20);
}
/** Queue raw notifs (no ID yet) — flushed after animation completes */
function queueNotifs(
  existing: TinhTuyState['pendingNotifs'],
  entries: Array<{ slot: number; amount: number }>,
): TinhTuyState['pendingNotifs'] {
  const filtered = entries.filter(e => e.amount !== 0);
  if (filtered.length === 0) return existing;
  return [...existing, ...filtered].slice(-20);
}
/** Snapshot player points BEFORE update — so displayed total freezes until flush */
function freezePoints(state: TinhTuyState): Record<number, number> {
  // Only snapshot on first pending notif; keep existing snapshot otherwise
  if (state.pendingNotifs.length > 0) return state.displayPoints;
  const dp: Record<number, number> = {};
  state.players.forEach(p => { dp[p.slot] = p.points; });
  return dp;
}

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
      const { slot, from, to, goBonus, isTravel } = action.payload;
      // Compute movement path (wrap around at 36)
      const path: number[] = [];
      let pos = from;
      if (isTravel) {
        // Travel: use shortest path (no Go bonus)
        const fwdDist = (to - from + 36) % 36;
        const bwdDist = (from - to + 36) % 36;
        if (fwdDist <= bwdDist) {
          while (pos !== to) { pos = (pos + 1) % 36; path.push(pos); }
        } else {
          while (pos !== to) { pos = (pos - 1 + 36) % 36; path.push(pos); }
        }
      } else {
        while (pos !== to) { pos = (pos + 1) % 36; path.push(pos); }
      }
      // Freeze display points, update real points, queue notif (shown after animation)
      const dp1 = goBonus ? freezePoints(state) : state.displayPoints;
      const updated = state.players.map(p =>
        p.slot === slot ? { ...p, points: goBonus ? p.points + goBonus : p.points } : p
      );
      return {
        ...state,
        players: updated,
        pendingMove: { slot, path, goBonus, passedGo: action.payload.passedGo, fromCard: isTravel },
        pendingNotifs: goBonus ? queueNotifs(state.pendingNotifs, [{ slot, amount: goBonus }]) : state.pendingNotifs,
        displayPoints: dp1,
      };
    }

    case 'START_MOVE': {
      if (!state.pendingMove) return state;
      const { slot, path, passedGo } = state.pendingMove;
      return {
        ...state,
        pendingMove: null,
        animatingToken: { slot, path, currentStep: 0 },
        showGoPopup: passedGo ? true : state.showGoPopup,
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
      // Queue — applied after movement animation finishes
      return {
        ...state,
        queuedAction: {
          cellIndex: action.payload.cellIndex,
          cellType: action.payload.cellType,
          price: action.payload.price || 0,
          canAfford: action.payload.canAfford ?? true,
        },
      };

    case 'APPLY_QUEUED_ACTION': {
      const qa = state.queuedAction;
      if (!qa) return state;
      return {
        ...state,
        turnPhase: 'AWAITING_ACTION',
        pendingAction: {
          type: 'BUY_PROPERTY',
          cellIndex: qa.cellIndex,
          price: qa.price || 0,
          canAfford: qa.canAfford ?? true,
          cellType: qa.cellType,
        },
        queuedAction: null,
      };
    }

    case 'TRAVEL_PROMPT':
      // Queue — applied after movement animation finishes
      return { ...state, queuedTravelPrompt: true };

    case 'APPLY_QUEUED_TRAVEL':
      return { ...state, turnPhase: 'AWAITING_TRAVEL', queuedTravelPrompt: false };

    case 'PROPERTY_BOUGHT': {
      const dpBuy = freezePoints(state);
      const updated = state.players.map(p =>
        p.slot === action.payload.slot
          ? { ...p, points: action.payload.remainingPoints, properties: [...p.properties, action.payload.cellIndex] }
          : p
      );
      return {
        ...state, players: updated, pendingAction: null, displayPoints: dpBuy,
        pendingNotifs: queueNotifs(state.pendingNotifs, [{ slot: action.payload.slot, amount: -action.payload.price }]),
      };
    }

    case 'RENT_PAID': {
      const { fromSlot, toSlot, amount, cellIndex } = action.payload;
      const dpRent = freezePoints(state);
      const updated = state.players.map(p => {
        if (p.slot === fromSlot) return { ...p, points: p.points - amount };
        if (p.slot === toSlot) return { ...p, points: p.points + amount };
        return p;
      });
      return {
        ...state, players: updated, pendingAction: null, displayPoints: dpRent,
        queuedRentAlert: { fromSlot, toSlot, amount, cellIndex },
        pendingNotifs: queueNotifs(state.pendingNotifs, [{ slot: fromSlot, amount: -amount }, { slot: toSlot, amount }]),
      };
    }

    case 'CLEAR_RENT_ALERT':
      return { ...state, rentAlert: null };

    case 'TAX_PAID': {
      const { slot, amount, houseCount, hotelCount, perHouse, perHotel } = action.payload;
      const dpTax = amount > 0 ? freezePoints(state) : state.displayPoints;
      const updated = state.players.map(p =>
        p.slot === slot ? { ...p, points: p.points - amount } : p
      );
      return {
        ...state,
        players: updated, displayPoints: dpTax,
        queuedTaxAlert: { slot, amount, houseCount, hotelCount, perHouse, perHotel },
        pendingNotifs: amount > 0 ? queueNotifs(state.pendingNotifs, [{ slot, amount: -amount }]) : state.pendingNotifs,
      };
    }

    case 'CLEAR_TAX_ALERT':
      return { ...state, taxAlert: null };

    case 'CLEAR_POINT_NOTIFS':
      return { ...state, pointNotifs: [] };

    case 'FLUSH_NOTIFS': {
      if (state.pendingNotifs.length === 0) return state;
      return {
        ...state,
        pointNotifs: addNotifs(state.pointNotifs, state.pendingNotifs),
        pendingNotifs: [],
        displayPoints: {},  // Unfreeze — show real points alongside notifications
      };
    }

    case 'TURN_CHANGED':
      // Queue turn change — applied after animations + modals + notifs settle
      return {
        ...state,
        queuedTurnChange: {
          currentSlot: action.payload.currentSlot,
          turnPhase: action.payload.turnPhase,
          round: action.payload.round,
        },
      };

    case 'APPLY_QUEUED_TURN_CHANGE': {
      const qtc = state.queuedTurnChange;
      if (!qtc) return state;
      return {
        ...state,
        currentPlayerSlot: qtc.currentSlot,
        turnPhase: qtc.turnPhase,
        turnStartedAt: Date.now(),
        round: qtc.round || state.round,
        pendingAction: null,
        islandAlertSlot: null,
        taxAlert: null,
        rentAlert: null,
        queuedTurnChange: null,
      };
    }

    case 'PLAYER_BANKRUPT': {
      const updated = state.players.map(p =>
        p.slot === action.payload.slot ? { ...p, isBankrupt: true, points: 0, properties: [], houses: {}, hotels: {}, festivals: {} } : p
      );
      return { ...state, players: updated };
    }

    case 'PLAYER_SURRENDERED': {
      const updated = state.players.map(p =>
        p.slot === action.payload.slot ? { ...p, isBankrupt: true, points: 0, properties: [], houses: {}, hotels: {}, festivals: {} } : p
      );
      return { ...state, players: updated };
    }

    case 'PLAYER_ISLAND': {
      const updated = state.players.map(p =>
        p.slot === action.payload.slot ? { ...p, islandTurns: action.payload.turnsRemaining, position: 27 } : p
      );
      return { ...state, players: updated, queuedIslandAlert: action.payload.slot };
    }

    case 'CLEAR_ISLAND_ALERT':
      return { ...state, islandAlertSlot: null };

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
      let cardMove: TinhTuyState['pendingCardMove'] = null;
      // Collect notifs for point changes
      const cardNotifs: Array<{ slot: number; amount: number }> = [];
      // Apply point changes (exclude Go bonus for moved player — will apply after animation)
      if (effect?.pointsChanged) {
        for (const [slotStr, delta] of Object.entries(effect.pointsChanged)) {
          cardNotifs.push({ slot: Number(slotStr), amount: delta as number });
          // If player is being moved, Go bonus is included in pointsChanged — defer it
          if (effect?.playerMoved && Number(slotStr) === effect.playerMoved.slot && effect.playerMoved.passedGo) {
            const nonGoAmount = (delta as number) - 2000;
            if (nonGoAmount !== 0) {
              updated = updated.map(p =>
                p.slot === Number(slotStr) ? { ...p, points: p.points + nonGoAmount } : p
              );
            }
          } else {
            updated = updated.map(p =>
              p.slot === Number(slotStr) ? { ...p, points: p.points + (delta as number) } : p
            );
          }
        }
      }
      // Freeze display points before real update
      const dpCard = cardNotifs.length > 0 ? freezePoints(state) : state.displayPoints;
      // Defer movement to after card modal dismiss (animate instead of teleport)
      if (effect?.playerMoved && !effect?.goToIsland) {
        cardMove = {
          slot: effect.playerMoved.slot,
          to: effect.playerMoved.to,
          passedGo: !!effect.playerMoved.passedGo,
        };
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
          const h = p.houses || {};
          return { ...p, houses: { ...h, [key]: Math.max((h[key] || 0) - 1, 0) } };
        });
      }
      // Go to island — instant (teleport feel)
      if (effect?.goToIsland) {
        updated = updated.map(p =>
          p.slot === slot ? { ...p, position: 27, islandTurns: 3 } : p
        );
      }
      return {
        ...state, players: updated, drawnCard: card, pendingCardMove: cardMove,
        displayPoints: dpCard,
        pendingNotifs: cardNotifs.length > 0 ? queueNotifs(state.pendingNotifs, cardNotifs) : state.pendingNotifs,
      };
    }

    case 'CLEAR_CARD': {
      // If card triggered a move, start movement animation now
      const cm = state.pendingCardMove;
      if (cm) {
        const player = state.players.find(p => p.slot === cm.slot);
        const from = player?.position ?? 0;
        // Determine direction: passedGo → always forward; otherwise shortest path
        const fwdDist = (cm.to - from + 36) % 36;
        const bwdDist = (from - cm.to + 36) % 36;
        const goForward = cm.passedGo || fwdDist <= bwdDist;
        // Build step-by-step path (wrap around at 36)
        const path: number[] = [];
        let pos = from;
        if (goForward) {
          while (pos !== cm.to) {
            pos = (pos + 1) % 36;
            path.push(pos);
          }
        } else {
          while (pos !== cm.to) {
            pos = (pos - 1 + 36) % 36;
            path.push(pos);
          }
        }
        // Go bonus is applied during animation (same as dice move)
        const goBonus = cm.passedGo ? 2000 : 0;
        const dpCm = goBonus ? freezePoints(state) : state.displayPoints;
        const updatedPlayers = goBonus ? state.players.map(p =>
          p.slot === cm.slot ? { ...p, points: p.points + goBonus } : p
        ) : state.players;
        return {
          ...state,
          drawnCard: null,
          pendingCardMove: null,
          players: updatedPlayers,
          pendingMove: { slot: cm.slot, path, goBonus, passedGo: cm.passedGo, fromCard: true },
          pendingNotifs: goBonus ? queueNotifs(state.pendingNotifs, [{ slot: cm.slot, amount: goBonus }]) : state.pendingNotifs,
          displayPoints: dpCm,
        };
      }
      return { ...state, drawnCard: null, pendingCardMove: null };
    }

    case 'HOUSE_BUILT': {
      const hbPrev = state.players.find(p => p.slot === action.payload.slot)?.points ?? 0;
      const hbDelta = (action.payload.remainingPoints ?? hbPrev) - hbPrev;
      const dpHb = hbDelta !== 0 ? freezePoints(state) : state.displayPoints;
      const updated = state.players.map(p => {
        if (p.slot !== action.payload.slot) return p;
        const key = String(action.payload.cellIndex);
        return {
          ...p,
          houses: { ...p.houses, [key]: action.payload.houseCount },
          points: action.payload.remainingPoints ?? p.points,
        };
      });
      return {
        ...state, players: updated, displayPoints: dpHb,
        pendingNotifs: hbDelta !== 0 ? queueNotifs(state.pendingNotifs, [{ slot: action.payload.slot, amount: hbDelta }]) : state.pendingNotifs,
      };
    }

    case 'HOTEL_BUILT': {
      const htPrev = state.players.find(p => p.slot === action.payload.slot)?.points ?? 0;
      const htDelta = (action.payload.remainingPoints ?? htPrev) - htPrev;
      const dpHt = htDelta !== 0 ? freezePoints(state) : state.displayPoints;
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
      return {
        ...state, players: updated, displayPoints: dpHt,
        pendingNotifs: htDelta !== 0 ? queueNotifs(state.pendingNotifs, [{ slot: action.payload.slot, amount: htDelta }]) : state.pendingNotifs,
      };
    }

    case 'ISLAND_ESCAPED': {
      const { slot: escSlot, costPaid } = action.payload;
      const dpEsc = costPaid ? freezePoints(state) : state.displayPoints;
      const updated = state.players.map(p =>
        p.slot === escSlot
          ? { ...p, islandTurns: 0, points: costPaid ? p.points - costPaid : p.points }
          : p
      );
      return {
        ...state, players: updated, displayPoints: dpEsc,
        pendingNotifs: costPaid ? queueNotifs(state.pendingNotifs, [{ slot: escSlot, amount: -costPaid }]) : state.pendingNotifs,
      };
    }

    case 'FESTIVAL_PROMPT':
      // Queue — applied after movement animation finishes
      return { ...state, queuedFestivalPrompt: true };

    case 'FESTIVAL_APPLIED': {
      const { slot: fSlot, cellIndex: fCell } = action.payload;
      const updated = state.players.map(p =>
        p.slot === fSlot
          ? { ...p, festivals: { ...p.festivals, [String(fCell)]: true } }
          : p
      );
      return { ...state, players: updated };
    }

    case 'APPLY_QUEUED_FESTIVAL':
      return { ...state, turnPhase: 'AWAITING_FESTIVAL', queuedFestivalPrompt: false };

    case 'APPLY_QUEUED_RENT_ALERT':
      return { ...state, rentAlert: state.queuedRentAlert, queuedRentAlert: null };

    case 'APPLY_QUEUED_TAX_ALERT':
      return { ...state, taxAlert: state.queuedTaxAlert, queuedTaxAlert: null };

    case 'APPLY_QUEUED_ISLAND_ALERT':
      return { ...state, islandAlertSlot: state.queuedIslandAlert, queuedIslandAlert: null };

    case 'PLAYER_NAME_UPDATED': {
      const updated = state.players.map(p =>
        p.slot === action.payload.slot ? { ...p, displayName: action.payload.name, guestName: action.payload.name } : p
      );
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
  updateGuestName: (guestName: string) => void;
  clearCard: () => void;
  travelTo: (cellIndex: number) => void;
  applyFestival: (cellIndex: number) => void;
}

const TinhTuyContext = createContext<TinhTuyContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────
export const TinhTuyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(tinhTuyReducer, initialState);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isConnected } = useSocket();
  const stateRef = useRef(state);
  stateRef.current = state;

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
      // Sound deferred to APPLY_QUEUED_TURN_CHANGE effect
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
      // Auto-dismiss moved to TinhTuyCardModal — starts when card is actually visible
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

    const handleFestivalPrompt = (data: any) => {
      dispatch({ type: 'FESTIVAL_PROMPT', payload: data });
    };

    const handleFestivalApplied = (data: any) => {
      dispatch({ type: 'FESTIVAL_APPLIED', payload: data });
    };

    const handleTravelPrompt = (data: any) => {
      dispatch({ type: 'TRAVEL_PROMPT', payload: data });
    };

    const handlePlayerNameUpdated = (data: any) => {
      dispatch({ type: 'PLAYER_NAME_UPDATED', payload: data });
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
    socket.on('tinh-tuy:festival-prompt' as any, handleFestivalPrompt);
    socket.on('tinh-tuy:festival-applied' as any, handleFestivalApplied);
    socket.on('tinh-tuy:travel-prompt' as any, handleTravelPrompt);
    socket.on('tinh-tuy:player-name-updated' as any, handlePlayerNameUpdated);
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
      socket.off('tinh-tuy:festival-prompt' as any, handleFestivalPrompt);
      socket.off('tinh-tuy:festival-applied' as any, handleFestivalApplied);
      socket.off('tinh-tuy:travel-prompt' as any, handleTravelPrompt);
      socket.off('tinh-tuy:player-name-updated' as any, handlePlayerNameUpdated);
      socket.off('tinh-tuy:chat-message' as any, handleChatMessage);
      socket.off('tinh-tuy:room-created' as any, handleLobbyUpdated);
      socket.off('tinh-tuy:lobby-room-updated' as any, handleLobbyUpdated);
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

  const updateGuestName = useCallback((guestName: string) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:update-guest-name' as any, { guestName }, (res: any) => {
      if (res && !res.success) {
        dispatch({ type: 'SET_ERROR', payload: res.error });
      }
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

  const clearCard = useCallback(() => {
    dispatch({ type: 'CLEAR_CARD' });
  }, []);

  const travelTo = useCallback((cellIndex: number) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:travel-to' as any, { cellIndex }, (res: any) => {
      if (res && !res.success) dispatch({ type: 'SET_ERROR', payload: res.error });
    });
  }, []);

  const applyFestival = useCallback((cellIndex: number) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:apply-festival' as any, { cellIndex }, (res: any) => {
      if (res && !res.success) dispatch({ type: 'SET_ERROR', payload: res.error });
    });
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

  // Pending move → start after dice animation (2.5s) or immediately for card moves (300ms)
  useEffect(() => {
    if (!state.pendingMove) return;
    const delay = state.pendingMove.fromCard ? 300 : 2500;
    const timer = setTimeout(() => dispatch({ type: 'START_MOVE' }), delay);
    return () => clearTimeout(timer);
  }, [state.pendingMove?.slot, state.pendingMove?.path.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Movement animation driver — step every 280ms + move SFX per step
  useEffect(() => {
    if (!state.animatingToken) return;
    const timer = setInterval(() => {
      dispatch({ type: 'ANIMATION_STEP' });
      tinhTuySounds.playSFX('move');
    }, 280);
    return () => clearInterval(timer);
  }, [state.animatingToken?.slot, state.animatingToken?.path.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Go popup auto-dismiss after 1.5s
  useEffect(() => {
    if (!state.showGoPopup) return;
    const timer = setTimeout(() => dispatch({ type: 'HIDE_GO_POPUP' }), 1500);
    return () => clearTimeout(timer);
  }, [state.showGoPopup]);

  // Island alert auto-dismiss after 4s
  useEffect(() => {
    if (state.islandAlertSlot == null) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_ISLAND_ALERT' }), 4000);
    return () => clearTimeout(timer);
  }, [state.islandAlertSlot]);

  // Tax alert auto-dismiss after 4s
  useEffect(() => {
    if (!state.taxAlert) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_TAX_ALERT' }), 4000);
    return () => clearTimeout(timer);
  }, [state.taxAlert]);

  // Rent alert auto-dismiss after 4s
  useEffect(() => {
    if (!state.rentAlert) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_RENT_ALERT' }), 4000);
    return () => clearTimeout(timer);
  }, [state.rentAlert]);

  // Flush pending notifs → visible pointNotifs when animation + modals are all done
  useEffect(() => {
    if (state.pendingNotifs.length === 0) return;
    // Wait for movement to finish
    if (state.pendingMove || state.animatingToken) return;
    // Wait for modals to close
    if (state.drawnCard || state.pendingAction || state.taxAlert || state.rentAlert || state.islandAlertSlot != null) return;
    // Small delay so the dismiss feels settled before showing
    const timer = setTimeout(() => dispatch({ type: 'FLUSH_NOTIFS' }), 400);
    return () => clearTimeout(timer);
  }, [
    state.pendingNotifs.length, state.pendingMove, state.animatingToken,
    state.drawnCard, state.pendingAction, state.taxAlert, state.rentAlert, state.islandAlertSlot,
  ]);

  // Point notifs auto-cleanup after 2.5s
  useEffect(() => {
    if (state.pointNotifs.length === 0) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'CLEAR_POINT_NOTIFS' });
    }, 2500);
    return () => clearTimeout(timer);
  }, [state.pointNotifs.length]);

  // Apply queued travel prompt after movement animation finishes
  useEffect(() => {
    if (!state.queuedTravelPrompt) return;
    if (state.pendingMove || state.animatingToken) return;
    dispatch({ type: 'APPLY_QUEUED_TRAVEL' });
  }, [state.queuedTravelPrompt, state.pendingMove, state.animatingToken]);

  // Apply queued festival prompt after movement animation finishes
  useEffect(() => {
    if (!state.queuedFestivalPrompt) return;
    if (state.pendingMove || state.animatingToken) return;
    dispatch({ type: 'APPLY_QUEUED_FESTIVAL' });
  }, [state.queuedFestivalPrompt, state.pendingMove, state.animatingToken]);

  // Apply queued rent alert after movement animation finishes
  useEffect(() => {
    if (!state.queuedRentAlert) return;
    if (state.pendingMove || state.animatingToken) return;
    dispatch({ type: 'APPLY_QUEUED_RENT_ALERT' });
  }, [state.queuedRentAlert, state.pendingMove, state.animatingToken]);

  // Apply queued tax alert after movement animation finishes
  useEffect(() => {
    if (!state.queuedTaxAlert) return;
    if (state.pendingMove || state.animatingToken) return;
    dispatch({ type: 'APPLY_QUEUED_TAX_ALERT' });
  }, [state.queuedTaxAlert, state.pendingMove, state.animatingToken]);

  // Apply queued island alert after movement animation finishes
  useEffect(() => {
    if (state.queuedIslandAlert == null) return;
    if (state.pendingMove || state.animatingToken) return;
    dispatch({ type: 'APPLY_QUEUED_ISLAND_ALERT' });
  }, [state.queuedIslandAlert, state.pendingMove, state.animatingToken]);

  // Apply queued action (buy/skip modal) after movement animation finishes
  useEffect(() => {
    if (!state.queuedAction) return;
    if (state.pendingMove || state.animatingToken) return;
    dispatch({ type: 'APPLY_QUEUED_ACTION' });
  }, [state.queuedAction, state.pendingMove, state.animatingToken]);

  // Apply queued turn change after movement animation finishes
  // Only gate on movement — modals/notifs have their own timing and shouldn't block gameplay
  useEffect(() => {
    if (!state.queuedTurnChange) return;
    if (state.pendingMove || state.animatingToken) return;
    const timer = setTimeout(() => {
      // Play "your turn" sound when turn actually switches
      if (stateRef.current.queuedTurnChange?.currentSlot === stateRef.current.mySlot) {
        tinhTuySounds.playSFX('yourTurn');
      }
      dispatch({ type: 'APPLY_QUEUED_TURN_CHANGE' });
    }, 300);
    return () => clearTimeout(timer);
  }, [state.queuedTurnChange, state.pendingMove, state.animatingToken]);

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
      buildHouse, buildHotel, escapeIsland, sendChat, sendReaction, updateGuestName, clearCard, travelTo, applyFestival,
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
