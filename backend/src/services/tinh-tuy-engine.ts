/**
 * Tinh Tuy Dai Chien — Game Engine
 * Pure logic functions. No DB access, no socket emits.
 * Returns computed values/mutations for socket handlers to persist.
 */
import crypto from 'crypto';
import { DiceResult, ITinhTuyGame, ITinhTuyPlayer } from '../types/tinh-tuy.types';
import {
  BOARD_CELLS, BOARD_SIZE, GO_SALARY,
  getCell, ownsFullGroup, countStationsOwned, getStationRent, getUtilityRent,
} from './tinh-tuy-board';

// ─── Dice ─────────────────────────────────────────────────────

/** Roll 2d6 with crypto RNG */
export function rollDice(): DiceResult {
  const dice1 = crypto.randomInt(1, 7);
  const dice2 = crypto.randomInt(1, 7);
  return { dice1, dice2, total: dice1 + dice2, isDouble: dice1 === dice2 };
}

// ─── Movement ─────────────────────────────────────────────────

/** Calculate new position on circular board, detect pass-Go */
export function calculateNewPosition(
  current: number, steps: number
): { position: number; passedGo: boolean } {
  const newPos = (current + steps) % BOARD_SIZE;
  const passedGo = newPos < current; // wrapped around the board
  return { position: newPos, passedGo };
}

// ─── Rent Calculation ─────────────────────────────────────────

/** Calculate rent owed for landing on a cell */
export function calculateRent(
  game: ITinhTuyGame,
  cellIndex: number,
  diceTotal: number = 0
): number {
  const cell = getCell(cellIndex);
  if (!cell) return 0;

  const owner = game.players.find(p => p.properties.includes(cellIndex));
  if (!owner || owner.isBankrupt) return 0;

  // Station rent: 250 per station owned
  if (cell.type === 'STATION') {
    return getStationRent(countStationsOwned(owner.properties));
  }

  // Utility rent: diceTotal * multiplier
  if (cell.type === 'UTILITY') {
    const utilitiesOwned = owner.properties.filter(
      idx => BOARD_CELLS[idx]?.type === 'UTILITY'
    ).length;
    return getUtilityRent(utilitiesOwned, diceTotal);
  }

  if (cell.type !== 'PROPERTY' || !cell.group) return 0;

  // Check hotel first, then houses
  const cellKey = String(cellIndex);
  if (owner.hotels[cellKey] && cell.rentHotel) return cell.rentHotel;

  const houseCount = owner.houses[cellKey] || 0;
  if (houseCount > 0 && cell.rentHouse) return cell.rentHouse[houseCount - 1];

  // No improvements — check monopoly bonus (2x)
  if (ownsFullGroup(cell.group, owner.properties)) {
    return cell.rentGroup || (cell.rentBase || 0) * 2;
  }

  return cell.rentBase || 0;
}

// ─── Turn Rotation ────────────────────────────────────────────

/** Get next active (non-bankrupt) player slot */
export function getNextActivePlayer(
  players: ITinhTuyPlayer[], currentSlot: number
): number {
  const maxSlot = players.length;
  for (let i = 1; i <= maxSlot; i++) {
    const nextSlot = ((currentSlot - 1 + i) % maxSlot) + 1;
    const player = players.find(p => p.slot === nextSlot);
    if (player && !player.isBankrupt) return nextSlot;
  }
  return currentSlot;
}

// ─── Game End Check ───────────────────────────────────────────

/** Check if game should end */
export function checkGameEnd(game: ITinhTuyGame): {
  ended: boolean;
  winner?: ITinhTuyPlayer;
  reason?: string;
} {
  const activePlayers = game.players.filter(p => !p.isBankrupt);

  // Classic: last player standing
  if (activePlayers.length <= 1) {
    return { ended: true, winner: activePlayers[0], reason: 'lastStanding' };
  }

  // Rounds mode: check if round limit reached
  if (game.settings.gameMode === 'rounds' && game.settings.maxRounds) {
    if (game.round >= game.settings.maxRounds) {
      const richest = [...activePlayers].sort(
        (a, b) => calculateNetWorth(b) - calculateNetWorth(a)
      )[0];
      return { ended: true, winner: richest, reason: 'roundsComplete' };
    }
  }

  return { ended: false };
}

// ─── Net Worth ────────────────────────────────────────────────

/** Calculate total net worth (cash + property values + building values) */
export function calculateNetWorth(player: ITinhTuyPlayer): number {
  let worth = player.points;
  for (const cellIdx of player.properties) {
    const cell = getCell(cellIdx);
    if (!cell) continue;
    worth += cell.price || 0;
    const houses = player.houses[String(cellIdx)] || 0;
    worth += houses * (cell.houseCost || 0);
    if (player.hotels[String(cellIdx)]) {
      worth += cell.hotelCost || 0;
    }
  }
  return worth;
}

// ─── Room Code Generation ─────────────────────────────────────

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude I,O,0,1

/** Generate unique 6-char room code */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[crypto.randomInt(0, ROOM_CODE_CHARS.length)];
  }
  return code;
}

/** Generate room code with DB uniqueness check */
export async function generateUniqueRoomCode(
  existsCheck: (code: string) => Promise<boolean>
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode();
    if (!(await existsCheck(code))) return code;
  }
  // Fallback: append random suffix
  return generateRoomCode() + crypto.randomInt(0, 10);
}

// ─── Cell Resolution ──────────────────────────────────────────

/** Determine what action is needed when player lands on a cell */
export function resolveCellAction(
  game: ITinhTuyGame,
  playerSlot: number,
  cellIndex: number,
  diceTotal: number
): {
  action: 'buy' | 'rent' | 'tax' | 'none' | 'go_to_island' | 'card';
  amount?: number;
  ownerSlot?: number;
} {
  const cell = getCell(cellIndex);
  if (!cell) return { action: 'none' };

  const player = game.players.find(p => p.slot === playerSlot);
  if (!player) return { action: 'none' };

  switch (cell.type) {
    case 'PROPERTY':
    case 'STATION':
    case 'UTILITY': {
      const owner = game.players.find(p => p.properties.includes(cellIndex));
      if (!owner) {
        // Unowned — player can buy
        return { action: 'buy', amount: cell.price || 0 };
      }
      if (owner.slot === playerSlot || owner.isBankrupt) {
        return { action: 'none' }; // Own property or bankrupt owner
      }
      // Owned by another — pay rent
      const rent = calculateRent(game, cellIndex, diceTotal);
      return { action: 'rent', amount: rent, ownerSlot: owner.slot };
    }
    case 'TAX':
      return { action: 'tax', amount: cell.taxAmount || 0 };
    case 'GO_TO_ISLAND':
      return { action: 'go_to_island' };
    case 'KHI_VAN':
    case 'CO_HOI':
      return { action: 'card' }; // Phase 3 — for now treat as 'none'
    default:
      return { action: 'none' }; // GO, TRAVEL, ISLAND, FESTIVAL
  }
}
