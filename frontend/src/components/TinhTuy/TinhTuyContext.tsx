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
  TinhTuyState, TinhTuyAction, TinhTuyView, TinhTuyPlayer, TinhTuyCharacter,
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
    character: p.character || 'shiba',
    properties: p.properties || [],
    houses: p.houses || {},
    hotels: p.hotels || {},
    // festivals removed — now game-level state.festival
    cards: p.cards || [],
    immunityNextRent: !!p.immunityNextRent,
    doubleRentTurns: p.doubleRentTurns || 0,
    skipNextTurn: !!p.skipNextTurn,
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
  diceAnimating: false,
  round: 0,
  pendingAction: null,
  festival: null,
  winner: null,
  gameEndReason: null,
  error: null,
  drawnCard: null,
  houseRemovedCell: null,
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
  buildPrompt: null,
  queuedBuildPrompt: null,
  queuedRentAlert: null,
  queuedTaxAlert: null,
  queuedIslandAlert: null,
  sellPrompt: null,
  queuedSellPrompt: null,
  travelPendingSlot: null,
  queuedTravelPending: null,
  freeHousePrompt: null as { slot: number; buildableCells: number[] } | null,
  pendingCardEffect: null,
  queuedBankruptAlert: null,
  bankruptAlert: null,
  queuedGameFinished: null,
  attackPrompt: null,
  attackAlert: null,
  buybackPrompt: null,
  queuedBuybackPrompt: null,
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
          festival: g.festival || null,
          // Restore sell prompt on reconnect with AWAITING_SELL phase
          sellPrompt: g.turnPhase === 'AWAITING_SELL'
            ? { deficit: Math.abs(mapPlayers(g.players).find((p: any) => p.slot === g.currentPlayerSlot)?.points ?? 0) }
            : null,
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
        festival: g.festival || null,
        lastDiceResult: null, diceAnimating: false, pendingAction: null, winner: null,
        pendingCardEffect: null, gameEndReason: null,
        queuedBankruptAlert: null, bankruptAlert: null, queuedGameFinished: null, attackPrompt: null, attackAlert: null, buybackPrompt: null, queuedBuybackPrompt: null,
      };
    }

    case 'DICE_RESULT':
      return { ...state, lastDiceResult: { dice1: action.payload.dice1, dice2: action.payload.dice2 }, diceAnimating: true };

    case 'DICE_ANIM_DONE':
      return { ...state, diceAnimating: false };

    case 'FORCE_CLEAR_ANIM': {
      // Safety: force-clear all animation state to unblock queued effects
      const fcPlayers = state.animatingToken
        ? state.players.map(p =>
          p.slot === state.animatingToken!.slot
            ? { ...p, position: state.animatingToken!.path[state.animatingToken!.path.length - 1] }
            : p
        )
        : state.players;
      return {
        ...state, players: fcPlayers,
        diceAnimating: false, drawnCard: null, pendingMove: null, animatingToken: null,
        houseRemovedCell: null, pendingCardMove: null, pendingCardEffect: null,
      };
    }

    case 'PLAYER_MOVED': {
      const { slot, from, to, goBonus, isTravel, teleport } = action.payload;
      // Teleport: instant position change, no animation (e.g. triple doubles → island)
      if (teleport) {
        const updated = state.players.map(p =>
          p.slot === slot ? { ...p, position: to } : p
        );
        return { ...state, players: updated };
      }
      // Compute movement path (wrap around at 36)
      const path: number[] = [];
      let pos = from;
      if (isTravel) {
        // Travel / card: teleport directly (single step, no cell-by-cell walk)
        path.push(to);
      } else {
        while (pos !== to) { pos = (pos + 1) % 36; path.push(pos); }
      }
      // Freeze display points, update real points, queue notif (shown after animation)
      const dp1 = goBonus ? freezePoints(state) : state.displayPoints;
      // Sync position to server's `from` — ensures position is correct even if
      // a prior card-move animation didn't complete (fixes doubles + card move desync)
      const updated = state.players.map(p =>
        p.slot === slot ? { ...p, position: from, points: goBonus ? p.points + goBonus : p.points } : p
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
          buffs: action.payload.buffs,
        },
      };

    case 'APPLY_QUEUED_TURN_CHANGE': {
      const qtc = state.queuedTurnChange;
      if (!qtc) return state;
      // Sync player buffs from backend snapshot
      let updatedPlayers = state.players;
      if (qtc.buffs) {
        const buffsMap = new Map(qtc.buffs.map(b => [b.slot, b]));
        updatedPlayers = state.players.map(p => {
          const b = buffsMap.get(p.slot);
          if (!b) return p;
          return { ...p, cards: b.cards, immunityNextRent: b.immunityNextRent, doubleRentTurns: b.doubleRentTurns, skipNextTurn: b.skipNextTurn };
        });
      }
      // Don't clear rentAlert/taxAlert/islandAlertSlot — they have their own 4s auto-dismiss timers
      return {
        ...state,
        players: updatedPlayers,
        currentPlayerSlot: qtc.currentSlot,
        turnPhase: qtc.turnPhase,
        turnStartedAt: Date.now(),
        round: qtc.round || state.round,
        pendingAction: null,
        buildPrompt: null,
        freeHousePrompt: null,
        sellPrompt: null,
        buybackPrompt: null,
        attackPrompt: null,
        queuedTurnChange: null,
      };
    }

    case 'PLAYER_BANKRUPT': {
      const bSlot = action.payload.slot;
      const updated = state.players.map(p =>
        p.slot === bSlot ? { ...p, isBankrupt: true, points: 0, properties: [], houses: {}, hotels: {} } : p
      );
      // Clear game-level festival if bankrupt player owned it
      const newFestival = state.festival?.slot === bSlot ? null : state.festival;
      return { ...state, players: updated, festival: newFestival, queuedBankruptAlert: bSlot };
    }

    case 'PLAYER_SURRENDERED': {
      const sSlot = action.payload.slot;
      const updated = state.players.map(p =>
        p.slot === sSlot ? { ...p, isBankrupt: true, points: 0, properties: [], houses: {}, hotels: {} } : p
      );
      const newFestivalS = state.festival?.slot === sSlot ? null : state.festival;
      return { ...state, players: updated, festival: newFestivalS };
    }

    case 'PLAYER_ISLAND': {
      // Only set islandTurns — position is handled by movement animation (dice),
      // teleport flag (triple doubles), or CARD_DRAWN handler (card-based island)
      const wasAlreadyOnIsland = state.players.some(
        p => p.slot === action.payload.slot && p.islandTurns > 0,
      );
      const updated = state.players.map(p =>
        p.slot === action.payload.slot ? { ...p, islandTurns: action.payload.turnsRemaining } : p
      );
      // Only show "sent to island" alert for newly trapped players, not failed escape rolls
      return {
        ...state,
        players: updated,
        queuedIslandAlert: wasAlreadyOnIsland ? state.queuedIslandAlert : action.payload.slot,
      };
    }

    case 'CLEAR_ISLAND_ALERT':
      return { ...state, islandAlertSlot: null };

    case 'APPLY_QUEUED_BANKRUPT_ALERT':
      return { ...state, bankruptAlert: state.queuedBankruptAlert, queuedBankruptAlert: null };

    case 'CLEAR_BANKRUPT_ALERT':
      return { ...state, bankruptAlert: null };

    case 'ATTACK_PROPERTY_PROMPT':
      return { ...state, attackPrompt: action.payload };

    case 'PROPERTY_ATTACKED': {
      const { victimSlot, cellIndex, result: atkResult, prevHouses, prevHotel, newHouses, newHotel } = action.payload;
      const updatedPlayers = state.players.map(p => {
        if (p.slot !== victimSlot) return p;
        if (atkResult === 'destroyed' || atkResult === 'demolished') {
          // Property fully removed
          const newHousesMap = { ...p.houses };
          const newHotelsMap = { ...p.hotels };
          delete newHousesMap[String(cellIndex)];
          delete newHotelsMap[String(cellIndex)];
          return { ...p, properties: p.properties.filter(idx => idx !== cellIndex), houses: newHousesMap, hotels: newHotelsMap };
        }
        // Downgraded — update buildings
        return {
          ...p,
          houses: { ...p.houses, [String(cellIndex)]: newHouses },
          hotels: { ...p.hotels, [String(cellIndex)]: newHotel },
        };
      });
      return { ...state, players: updatedPlayers, attackPrompt: null, attackAlert: action.payload };
    }

    case 'CLEAR_ATTACK_ALERT':
      return { ...state, attackAlert: null };

    case 'BUYBACK_PROMPT':
      return { ...state, queuedBuybackPrompt: action.payload };

    case 'APPLY_QUEUED_BUYBACK':
      return { ...state, turnPhase: 'AWAITING_BUYBACK', buybackPrompt: state.queuedBuybackPrompt, queuedBuybackPrompt: null };

    case 'CLEAR_BUYBACK_PROMPT':
      return { ...state, buybackPrompt: null };

    case 'BUYBACK_COMPLETED': {
      const { buyerSlot, ownerSlot, cellIndex: bbCell, price: bbPrice, buyerPoints, ownerPoints, houses: bbHouses, hotel: bbHotel } = action.payload;
      const dpBb = freezePoints(state);
      const updatedPlayers = state.players.map(p => {
        if (p.slot === buyerSlot) {
          const key = String(bbCell);
          return {
            ...p,
            points: buyerPoints,
            properties: [...p.properties, bbCell],
            houses: { ...p.houses, [key]: bbHouses },
            hotels: { ...p.hotels, [key]: bbHotel },
          };
        }
        if (p.slot === ownerSlot) {
          const key = String(bbCell);
          const newHouses = { ...p.houses };
          const newHotels = { ...p.hotels };
          delete newHouses[key];
          delete newHotels[key];
          return { ...p, points: ownerPoints, properties: p.properties.filter(idx => idx !== bbCell), houses: newHouses, hotels: newHotels };
        }
        return p;
      });
      // Transfer festival if needed
      let newFestival = state.festival;
      if (state.festival && state.festival.cellIndex === bbCell && state.festival.slot === ownerSlot) {
        newFestival = { ...state.festival, slot: buyerSlot };
      }
      return {
        ...state, players: updatedPlayers, buybackPrompt: null, festival: newFestival, displayPoints: dpBb,
        pendingNotifs: queueNotifs(state.pendingNotifs, [{ slot: buyerSlot, amount: -bbPrice }, { slot: ownerSlot, amount: bbPrice }]),
      };
    }

    case 'APPLY_QUEUED_GAME_FINISHED': {
      const qgf = state.queuedGameFinished;
      if (!qgf) return state;
      return {
        ...state, gameStatus: 'finished',
        winner: qgf.winner,
        gameEndReason: qgf.reason,
        queuedGameFinished: null,
      };
    }

    case 'GAME_FINISHED':
      clearRoomSession();
      // Queue — applied after all animations + alerts are dismissed
      return {
        ...state,
        queuedGameFinished: {
          winner: action.payload.winner,
          reason: action.payload.reason || 'lastStanding',
        },
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
      // Defer buff/card/island effects until card modal is dismissed (prevents spoilers in player panel)
      const pendingEff: TinhTuyState['pendingCardEffect'] = (
        effect?.cardHeld || effect?.immunityNextRent || effect?.doubleRentTurns ||
        effect?.skipTurn || effect?.goToIsland || effect?.houseRemoved
      ) ? {
        slot,
        cardHeld: effect.cardHeld,
        immunityNextRent: effect.immunityNextRent,
        doubleRentTurns: effect.doubleRentTurns,
        skipTurn: effect.skipTurn,
        goToIsland: effect.goToIsland,
        houseRemoved: effect.houseRemoved,
      } : null;
      return {
        ...state, players: updated, drawnCard: card, pendingCardMove: cardMove,
        pendingCardEffect: pendingEff,
        houseRemovedCell: effect?.houseRemoved ? effect.houseRemoved.cellIndex : null,
        displayPoints: dpCard,
        pendingNotifs: cardNotifs.length > 0 ? queueNotifs(state.pendingNotifs, cardNotifs) : state.pendingNotifs,
      };
    }

    case 'CLEAR_CARD': {
      // Apply deferred card effects now that card modal is dismissed
      let clearPlayers = [...state.players];
      const eff = state.pendingCardEffect;
      if (eff) {
        if (eff.cardHeld) {
          clearPlayers = clearPlayers.map(p =>
            p.slot === eff.cardHeld!.slot ? { ...p, cards: [...p.cards, eff.cardHeld!.cardId] } : p
          );
        }
        if (eff.houseRemoved) {
          clearPlayers = clearPlayers.map(p => {
            if (p.slot !== eff.houseRemoved!.slot) return p;
            const key = String(eff.houseRemoved!.cellIndex);
            const h = p.houses || {};
            return { ...p, houses: { ...h, [key]: Math.max((h[key] || 0) - 1, 0) } };
          });
        }
        if (eff.goToIsland) {
          clearPlayers = clearPlayers.map(p =>
            p.slot === eff.slot ? { ...p, position: 27, islandTurns: 3 } : p
          );
        }
        if (eff.immunityNextRent) {
          clearPlayers = clearPlayers.map(p =>
            p.slot === eff.slot ? { ...p, immunityNextRent: true } : p
          );
        }
        if (eff.doubleRentTurns) {
          clearPlayers = clearPlayers.map(p =>
            p.slot === eff.slot ? { ...p, doubleRentTurns: p.doubleRentTurns + eff.doubleRentTurns! } : p
          );
        }
        if (eff.skipTurn) {
          clearPlayers = clearPlayers.map(p =>
            p.slot === eff.slot ? { ...p, skipNextTurn: true } : p
          );
        }
      }

      // If card triggered a move, start movement animation now
      const cm = state.pendingCardMove;
      if (cm) {
        const player = clearPlayers.find(p => p.slot === cm.slot);
        // Card move: teleport directly (single step, no cell-by-cell walk)
        const path: number[] = [cm.to];
        const goBonus = cm.passedGo ? 2000 : 0;
        const dpCm = goBonus ? freezePoints(state) : state.displayPoints;
        if (goBonus) {
          clearPlayers = clearPlayers.map(p =>
            p.slot === cm.slot ? { ...p, points: p.points + goBonus } : p
          );
        }
        return {
          ...state,
          drawnCard: null, houseRemovedCell: null, pendingCardMove: null, pendingCardEffect: null,
          players: clearPlayers,
          pendingMove: { slot: cm.slot, path, goBonus, passedGo: cm.passedGo, fromCard: true },
          pendingNotifs: goBonus ? queueNotifs(state.pendingNotifs, [{ slot: cm.slot, amount: goBonus }]) : state.pendingNotifs,
          displayPoints: dpCm,
        };
      }
      return { ...state, drawnCard: null, houseRemovedCell: null, pendingCardMove: null, pendingCardEffect: null, players: clearPlayers };
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
      const { slot: escSlot, costPaid, method: escMethod } = action.payload;
      const dpEsc = costPaid ? freezePoints(state) : state.displayPoints;
      const updated = state.players.map(p => {
        if (p.slot !== escSlot) return p;
        const upd = { ...p, islandTurns: 0, points: costPaid ? p.points - costPaid : p.points };
        // Remove escape-island card when used
        if (escMethod === 'USE_CARD') {
          const idx = upd.cards.indexOf('escape-island');
          if (idx !== -1) upd.cards = upd.cards.filter((_, i) => i !== idx);
        }
        return upd;
      });
      // PAY/USE_CARD: player still needs to roll → set ROLL_DICE phase
      // ROLL: backend handles movement directly, no phase change needed
      const escPhase = escMethod !== 'ROLL' ? 'ROLL_DICE' : state.turnPhase;
      return {
        ...state, players: updated, turnPhase: escPhase, displayPoints: dpEsc,
        pendingNotifs: costPaid ? queueNotifs(state.pendingNotifs, [{ slot: escSlot, amount: -costPaid }]) : state.pendingNotifs,
      };
    }

    case 'FESTIVAL_PROMPT':
      // Queue — applied after movement animation finishes
      return { ...state, queuedFestivalPrompt: true };

    case 'FESTIVAL_APPLIED': {
      const { slot: fSlot, cellIndex: fCell, multiplier: fMult } = action.payload;
      return { ...state, festival: { slot: fSlot, cellIndex: fCell, multiplier: fMult || 1.5 } };
    }

    case 'APPLY_QUEUED_FESTIVAL':
      return { ...state, turnPhase: 'AWAITING_FESTIVAL', queuedFestivalPrompt: false };

    case 'APPLY_QUEUED_RENT_ALERT':
      return { ...state, rentAlert: state.queuedRentAlert, queuedRentAlert: null };

    case 'APPLY_QUEUED_TAX_ALERT':
      return { ...state, taxAlert: state.queuedTaxAlert, queuedTaxAlert: null };

    case 'APPLY_QUEUED_ISLAND_ALERT':
      return { ...state, islandAlertSlot: state.queuedIslandAlert, queuedIslandAlert: null };

    case 'BUILD_PROMPT':
      // Queue — applied after movement animation finishes
      return { ...state, queuedBuildPrompt: action.payload };

    case 'APPLY_QUEUED_BUILD':
      return { ...state, turnPhase: 'AWAITING_BUILD', buildPrompt: state.queuedBuildPrompt, queuedBuildPrompt: null };

    case 'CLEAR_BUILD_PROMPT':
      return { ...state, buildPrompt: null };

    case 'FREE_HOUSE_PROMPT':
      return { ...state, freeHousePrompt: action.payload };

    case 'CLEAR_FREE_HOUSE_PROMPT':
      return { ...state, freeHousePrompt: null };

    case 'TRAVEL_PENDING':
      return { ...state, queuedTravelPending: action.payload.slot };

    case 'APPLY_QUEUED_TRAVEL_PENDING':
      return { ...state, travelPendingSlot: state.queuedTravelPending, queuedTravelPending: null };

    case 'CLEAR_TRAVEL_PENDING':
      return { ...state, travelPendingSlot: null };

    case 'SELL_PROMPT':
      return { ...state, queuedSellPrompt: { deficit: action.payload.deficit } };

    case 'APPLY_QUEUED_SELL':
      return { ...state, turnPhase: 'AWAITING_SELL', sellPrompt: state.queuedSellPrompt, queuedSellPrompt: null };

    case 'BUILDINGS_SOLD': {
      const { slot: bsSlot, newPoints, houses: newHouses, hotels: newHotels, properties: newProps } = action.payload;
      const dpBs = freezePoints(state);
      const prevPoints = state.players.find(p => p.slot === bsSlot)?.points ?? 0;
      const bsDelta = newPoints - prevPoints;
      const updated = state.players.map(p =>
        p.slot === bsSlot ? { ...p, points: newPoints, houses: newHouses, hotels: newHotels, ...(newProps ? { properties: newProps } : {}) } : p
      );
      return {
        ...state, players: updated, sellPrompt: null, displayPoints: dpBs,
        pendingNotifs: bsDelta !== 0 ? queueNotifs(state.pendingNotifs, [{ slot: bsSlot, amount: bsDelta }]) : state.pendingNotifs,
      };
    }

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
  clearRentAlert: () => void;
  clearTaxAlert: () => void;
  clearIslandAlert: () => void;
  clearTravelPending: () => void;
  travelTo: (cellIndex: number) => void;
  applyFestival: (cellIndex: number) => void;
  skipBuild: () => void;
  sellBuildings: (selections: Array<{ cellIndex: number; type: 'house' | 'hotel' | 'property'; count: number }>) => void;
  chooseFreeHouse: (cellIndex: number) => void;
  attackPropertyChoose: (cellIndex: number) => void;
  clearAttackAlert: () => void;
  buybackProperty: (cellIndex: number, accept: boolean) => void;
  selectCharacter: (character: TinhTuyCharacter) => void;
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
      // Sound deferred to APPLY_QUEUED_RENT_ALERT (after movement animation)
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
      // Sound deferred to APPLY_QUEUED_ISLAND_ALERT (after movement animation)
    };

    const handleGameFinished = (data: any) => {
      dispatch({ type: 'GAME_FINISHED', payload: data });
      // Victory sound deferred to APPLY_QUEUED_GAME_FINISHED (after all alerts)
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

    const handleBuildPrompt = (data: any) => {
      dispatch({ type: 'BUILD_PROMPT', payload: data });
    };

    const handleFreeHousePrompt = (data: any) => {
      dispatch({ type: 'FREE_HOUSE_PROMPT', payload: data });
    };

    const handleSellPrompt = (data: any) => {
      dispatch({ type: 'SELL_PROMPT', payload: data });
    };

    const handleBuildingsSold = (data: any) => {
      dispatch({ type: 'BUILDINGS_SOLD', payload: data });
    };

    const handleAttackPropertyPrompt = (data: any) => {
      dispatch({ type: 'ATTACK_PROPERTY_PROMPT', payload: data });
    };

    const handlePropertyAttacked = (data: any) => {
      dispatch({ type: 'PROPERTY_ATTACKED', payload: data });
    };

    const handleBuybackPrompt = (data: any) => {
      dispatch({ type: 'BUYBACK_PROMPT', payload: data });
    };

    const handleBuybackCompleted = (data: any) => {
      dispatch({ type: 'BUYBACK_COMPLETED', payload: data });
      tinhTuySounds.playSFX('purchase');
    };

    const handleTravelPending = (data: any) => {
      dispatch({ type: 'TRAVEL_PENDING', payload: data });
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
    socket.on('tinh-tuy:build-prompt' as any, handleBuildPrompt);
    socket.on('tinh-tuy:free-house-prompt' as any, handleFreeHousePrompt);
    socket.on('tinh-tuy:sell-prompt' as any, handleSellPrompt);
    socket.on('tinh-tuy:travel-pending' as any, handleTravelPending);
    socket.on('tinh-tuy:buildings-sold' as any, handleBuildingsSold);
    socket.on('tinh-tuy:attack-property-prompt' as any, handleAttackPropertyPrompt);
    socket.on('tinh-tuy:property-attacked' as any, handlePropertyAttacked);
    socket.on('tinh-tuy:buyback-prompt' as any, handleBuybackPrompt);
    socket.on('tinh-tuy:buyback-completed' as any, handleBuybackCompleted);
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
      socket.off('tinh-tuy:build-prompt' as any, handleBuildPrompt);
      socket.off('tinh-tuy:free-house-prompt' as any, handleFreeHousePrompt);
      socket.off('tinh-tuy:sell-prompt' as any, handleSellPrompt);
      socket.off('tinh-tuy:travel-pending' as any, handleTravelPending);
      socket.off('tinh-tuy:buildings-sold' as any, handleBuildingsSold);
      socket.off('tinh-tuy:attack-property-prompt' as any, handleAttackPropertyPrompt);
      socket.off('tinh-tuy:property-attacked' as any, handlePropertyAttacked);
      socket.off('tinh-tuy:buyback-prompt' as any, handleBuybackPrompt);
      socket.off('tinh-tuy:buyback-completed' as any, handleBuybackCompleted);
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

  const clearRentAlert = useCallback(() => {
    dispatch({ type: 'CLEAR_RENT_ALERT' });
  }, []);

  const clearTaxAlert = useCallback(() => {
    dispatch({ type: 'CLEAR_TAX_ALERT' });
  }, []);

  const clearIslandAlert = useCallback(() => {
    dispatch({ type: 'CLEAR_ISLAND_ALERT' });
  }, []);

  const clearTravelPending = useCallback(() => {
    dispatch({ type: 'CLEAR_TRAVEL_PENDING' });
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

  const skipBuild = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:skip-build' as any, {}, (res: any) => {
      if (res && !res.success) dispatch({ type: 'SET_ERROR', payload: res.error });
    });
  }, []);

  const chooseFreeHouse = useCallback((cellIndex: number) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    dispatch({ type: 'CLEAR_FREE_HOUSE_PROMPT' });
    socket.emit('tinh-tuy:free-house-choose' as any, { cellIndex }, (res: any) => {
      if (res && !res.success) dispatch({ type: 'SET_ERROR', payload: res.error });
    });
  }, []);

  const sellBuildings = useCallback((selections: Array<{ cellIndex: number; type: 'house' | 'hotel' | 'property'; count: number }>) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:sell-buildings' as any, { selections }, (res: any) => {
      if (res && !res.success) dispatch({ type: 'SET_ERROR', payload: res.error });
    });
  }, []);

  const attackPropertyChoose = useCallback((cellIndex: number) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:attack-property-choose' as any, { cellIndex }, (res: any) => {
      if (res && !res.success) dispatch({ type: 'SET_ERROR', payload: res.error });
    });
  }, []);

  const clearAttackAlert = useCallback(() => {
    dispatch({ type: 'CLEAR_ATTACK_ALERT' });
  }, []);

  const buybackProperty = useCallback((cellIndex: number, accept: boolean) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    dispatch({ type: 'CLEAR_BUYBACK_PROMPT' });
    socket.emit('tinh-tuy:buyback-property' as any, { cellIndex, accept }, (res: any) => {
      if (res && !res.success) dispatch({ type: 'SET_ERROR', payload: res.error });
    });
  }, []);

  const selectCharacter = useCallback((character: TinhTuyCharacter) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('tinh-tuy:select-character' as any, { character }, (res: any) => {
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

  // Attack alert auto-dismiss after 4s (safety net — component also has its own timer,
  // but if component unmounts/remounts during timer, this context-level timer ensures cleanup)
  useEffect(() => {
    if (!state.attackAlert) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_ATTACK_ALERT' }), 4000);
    return () => clearTimeout(timer);
  }, [state.attackAlert]);

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

  // Gate: dice animation + card modal + movement animation must all finish before queued visual effects fire
  const isAnimBusy = !!(state.diceAnimating || state.drawnCard || state.pendingMove || state.animatingToken);
  // Separate gate for turn change: excludes diceAnimating since it's purely visual
  // and its timer can fail (tab backgrounded, component re-mount), causing permanent stuck state
  const isTurnChangeBusy = !!(state.drawnCard || state.pendingMove || state.animatingToken);

  // Safety watchdog: force-clear stuck animation state after 5s
  useEffect(() => {
    if (!isAnimBusy) return;
    const timer = setTimeout(() => {
      console.warn('[TinhTuy] Animation stuck >5s — force clearing');
      dispatch({ type: 'FORCE_CLEAR_ANIM' });
    }, 5000);
    return () => clearTimeout(timer);
  }, [isAnimBusy]);

  // Auto-clear diceAnimating after 2.3s (matches dice CSS animation + settle time)
  useEffect(() => {
    if (!state.diceAnimating) return;
    const timer = setTimeout(() => dispatch({ type: 'DICE_ANIM_DONE' }), 2300);
    return () => clearTimeout(timer);
  }, [state.diceAnimating]);

  // Apply queued travel prompt after movement animation finishes
  useEffect(() => {
    if (!state.queuedTravelPrompt || isAnimBusy) return;
    dispatch({ type: 'APPLY_QUEUED_TRAVEL' });
  }, [state.queuedTravelPrompt, isAnimBusy]);

  // Apply queued festival prompt after movement animation finishes
  useEffect(() => {
    if (!state.queuedFestivalPrompt || isAnimBusy) return;
    dispatch({ type: 'APPLY_QUEUED_FESTIVAL' });
  }, [state.queuedFestivalPrompt, isAnimBusy]);

  // Apply queued rent alert after movement animation finishes
  useEffect(() => {
    if (!state.queuedRentAlert || isAnimBusy) return;
    tinhTuySounds.playSFX('rentPay');
    dispatch({ type: 'APPLY_QUEUED_RENT_ALERT' });
  }, [state.queuedRentAlert, isAnimBusy]);

  // Apply queued tax alert after movement animation finishes
  useEffect(() => {
    if (!state.queuedTaxAlert || isAnimBusy) return;
    dispatch({ type: 'APPLY_QUEUED_TAX_ALERT' });
  }, [state.queuedTaxAlert, isAnimBusy]);

  // Apply queued island alert after movement animation finishes
  useEffect(() => {
    if (state.queuedIslandAlert == null || isAnimBusy) return;
    tinhTuySounds.playSFX('island');
    dispatch({ type: 'APPLY_QUEUED_ISLAND_ALERT' });
  }, [state.queuedIslandAlert, isAnimBusy]);

  // Apply queued bankrupt alert after animations + rent/tax alerts are done
  useEffect(() => {
    if (state.queuedBankruptAlert == null || isAnimBusy) return;
    // Wait for both queued AND active rent/tax alerts to clear
    if (state.queuedRentAlert || state.rentAlert) return;
    if (state.queuedTaxAlert || state.taxAlert) return;
    dispatch({ type: 'APPLY_QUEUED_BANKRUPT_ALERT' });
  }, [state.queuedBankruptAlert, isAnimBusy, state.queuedRentAlert, state.rentAlert, state.queuedTaxAlert, state.taxAlert]);

  // Bankrupt alert auto-dismiss after 3.5s
  useEffect(() => {
    if (state.bankruptAlert == null) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_BANKRUPT_ALERT' }), 3500);
    return () => clearTimeout(timer);
  }, [state.bankruptAlert]);

  // Apply queued game-finished after ALL animations + alerts (including bankruptcy) are dismissed
  useEffect(() => {
    if (!state.queuedGameFinished || isAnimBusy) return;
    if (state.queuedRentAlert || state.rentAlert) return;
    if (state.queuedTaxAlert || state.taxAlert) return;
    if (state.queuedIslandAlert != null || state.islandAlertSlot != null) return;
    if (state.queuedBankruptAlert != null || state.bankruptAlert != null) return;
    const timer = setTimeout(() => {
      tinhTuySounds.playSFX('victory');
      dispatch({ type: 'APPLY_QUEUED_GAME_FINISHED' });
    }, 500);
    return () => clearTimeout(timer);
  }, [state.queuedGameFinished, isAnimBusy,
    state.queuedRentAlert, state.rentAlert,
    state.queuedTaxAlert, state.taxAlert,
    state.queuedIslandAlert, state.islandAlertSlot,
    state.queuedBankruptAlert, state.bankruptAlert]);

  // Apply queued travel pending alert after movement animation finishes
  useEffect(() => {
    if (state.queuedTravelPending == null || isAnimBusy) return;
    dispatch({ type: 'APPLY_QUEUED_TRAVEL_PENDING' });
  }, [state.queuedTravelPending, isAnimBusy]);

  // Travel pending alert auto-dismiss after 4s
  useEffect(() => {
    if (state.travelPendingSlot == null) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_TRAVEL_PENDING' }), 4000);
    return () => clearTimeout(timer);
  }, [state.travelPendingSlot]);

  // Apply queued build prompt after movement animation finishes
  useEffect(() => {
    if (!state.queuedBuildPrompt || isAnimBusy) return;
    dispatch({ type: 'APPLY_QUEUED_BUILD' });
  }, [state.queuedBuildPrompt, isAnimBusy]);

  // Apply queued buyback prompt after movement + rent alert finishes
  useEffect(() => {
    if (!state.queuedBuybackPrompt || isAnimBusy) return;
    // Wait for rent alert to show and dismiss first
    if (state.queuedRentAlert || state.rentAlert) return;
    dispatch({ type: 'APPLY_QUEUED_BUYBACK' });
  }, [state.queuedBuybackPrompt, isAnimBusy, state.queuedRentAlert, state.rentAlert]);

  // Buyback prompt with canAfford=false auto-dismiss after 3s
  useEffect(() => {
    if (!state.buybackPrompt || state.buybackPrompt.canAfford) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_BUYBACK_PROMPT' }), 3000);
    return () => clearTimeout(timer);
  }, [state.buybackPrompt]);

  // Apply queued sell prompt after movement animation + rent/tax alerts finish
  useEffect(() => {
    if (!state.queuedSellPrompt || isAnimBusy) return;
    if (state.queuedRentAlert || state.rentAlert) return;
    if (state.queuedTaxAlert || state.taxAlert) return;
    dispatch({ type: 'APPLY_QUEUED_SELL' });
  }, [state.queuedSellPrompt, isAnimBusy, state.queuedRentAlert, state.rentAlert, state.queuedTaxAlert, state.taxAlert]);

  // Apply queued action (buy/skip modal) after movement animation finishes
  useEffect(() => {
    if (!state.queuedAction || isAnimBusy) return;
    dispatch({ type: 'APPLY_QUEUED_ACTION' });
  }, [state.queuedAction, isAnimBusy]);

  // Apply queued turn change after movement animation finishes (skip if game ending)
  // Uses isTurnChangeBusy (not isAnimBusy) — excludes diceAnimating to prevent stuck state
  // when dice animation timer fails (tab backgrounded, component re-mount)
  useEffect(() => {
    if (!state.queuedTurnChange || isTurnChangeBusy) return;
    if (state.queuedGameFinished) return; // Game ending — no next turn
    const timer = setTimeout(() => {
      // Play "your turn" sound when turn actually switches
      if (stateRef.current.queuedTurnChange?.currentSlot === stateRef.current.mySlot) {
        tinhTuySounds.playSFX('yourTurn');
      }
      dispatch({ type: 'APPLY_QUEUED_TURN_CHANGE' });
    }, 300);
    return () => clearTimeout(timer);
  }, [state.queuedTurnChange, isTurnChangeBusy, state.queuedGameFinished]);

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

  // Sound: BGM only plays during gameplay
  useEffect(() => {
    if (state.view === 'playing') {
      tinhTuySounds.playBGM('game');
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
      buildHouse, buildHotel, escapeIsland, sendChat, sendReaction, updateGuestName,
      clearCard, clearRentAlert, clearTaxAlert, clearIslandAlert, clearTravelPending,
      travelTo, applyFestival, skipBuild, sellBuildings, chooseFreeHouse, attackPropertyChoose, clearAttackAlert, buybackProperty, selectCharacter,
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
