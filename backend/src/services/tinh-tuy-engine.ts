/**
 * Tinh Tuy Dai Chien — Game Engine
 * Pure logic functions. No DB access, no socket emits.
 * Returns computed values/mutations for socket handlers to persist.
 */
import crypto from 'crypto';
import { DiceResult, ITinhTuyGame, ITinhTuyPlayer } from '../types/tinh-tuy.types';
import {
  BOARD_CELLS, BOARD_SIZE, GO_SALARY, ISLAND_ESCAPE_COST, MAX_ISLAND_TURNS, PROPERTY_GROUPS,
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

/** Calculate rent owed for landing on a cell. Accounts for owner's doubleRentTurns. */
export function calculateRent(
  game: ITinhTuyGame,
  cellIndex: number,
  diceTotal: number = 0
): number {
  const cell = getCell(cellIndex);
  if (!cell) return 0;

  const owner = game.players.find(p => p.properties.includes(cellIndex));
  if (!owner || owner.isBankrupt) return 0;

  let rent = 0;

  // Station rent: 250 per station owned
  if (cell.type === 'STATION') {
    rent = getStationRent(countStationsOwned(owner.properties));
  } else if (cell.type === 'UTILITY') {
    // Utility rent: diceTotal * multiplier
    const utilitiesOwned = owner.properties.filter(
      idx => BOARD_CELLS[idx]?.type === 'UTILITY'
    ).length;
    rent = getUtilityRent(utilitiesOwned, diceTotal);
  } else if (cell.type === 'PROPERTY' && cell.group) {
    // Check hotel first, then houses
    const cellKey = String(cellIndex);
    if (owner.hotels[cellKey] && cell.rentHotel) {
      rent = cell.rentHotel;
    } else {
      const houseCount = owner.houses[cellKey] || 0;
      if (houseCount > 0 && cell.rentHouse) {
        rent = cell.rentHouse[houseCount - 1];
      } else if (ownsFullGroup(cell.group, owner.properties)) {
        rent = cell.rentGroup || (cell.rentBase || 0) * 2;
      } else {
        rent = cell.rentBase || 0;
      }
    }
  }

  // Owner has double rent buff
  if (owner.doubleRentTurns && owner.doubleRentTurns > 0) {
    rent *= 2;
  }

  return rent;
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

// ─── Island / Jail Mechanics ─────────────────────────────────

/** Send player to island (jail). Resets consecutiveDoubles. */
export function sendToIsland(player: ITinhTuyPlayer): void {
  player.position = 27;
  player.islandTurns = MAX_ISLAND_TURNS;
  player.consecutiveDoubles = 0;
}

/** Handle island escape attempt. Returns whether player escaped. */
export function handleIslandEscape(
  player: ITinhTuyPlayer,
  method: 'PAY' | 'ROLL' | 'USE_CARD',
  diceResult?: DiceResult
): { escaped: boolean; diceResult?: DiceResult; costPaid?: number } {
  if (method === 'PAY') {
    if (player.points < ISLAND_ESCAPE_COST) return { escaped: false };
    player.points -= ISLAND_ESCAPE_COST;
    player.islandTurns = 0;
    return { escaped: true, costPaid: ISLAND_ESCAPE_COST };
  }

  if (method === 'USE_CARD') {
    const cardIdx = player.cards.indexOf('escape-island');
    if (cardIdx === -1) return { escaped: false };
    player.cards.splice(cardIdx, 1);
    player.islandTurns = 0;
    return { escaped: true };
  }

  if (method === 'ROLL' && diceResult) {
    if (diceResult.isDouble) {
      player.islandTurns = 0;
      return { escaped: true, diceResult };
    }
    player.islandTurns--;
    if (player.islandTurns <= 0) {
      // Forced pay on last turn
      player.points -= ISLAND_ESCAPE_COST;
      player.islandTurns = 0;
      return { escaped: true, diceResult, costPaid: ISLAND_ESCAPE_COST };
    }
    return { escaped: false, diceResult };
  }

  return { escaped: false };
}

// ─── House / Hotel Build System ──────────────────────────────

/** Check if player can build a house on cellIndex */
export function canBuildHouse(
  game: ITinhTuyGame, playerSlot: number, cellIndex: number
): { valid: boolean; error?: string; cost?: number } {
  const player = game.players.find(p => p.slot === playerSlot);
  if (!player) return { valid: false, error: 'playerNotFound' };

  const cell = getCell(cellIndex);
  if (!cell || cell.type !== 'PROPERTY' || !cell.group) return { valid: false, error: 'notBuildable' };
  if (!player.properties.includes(cellIndex)) return { valid: false, error: 'notOwned' };
  if (!ownsFullGroup(cell.group, player.properties)) return { valid: false, error: 'needFullGroup' };

  const currentHouses = player.houses[String(cellIndex)] || 0;
  if (currentHouses >= 4) return { valid: false, error: 'maxHouses' };
  if (player.hotels[String(cellIndex)]) return { valid: false, error: 'hasHotel' };

  // Even-build rule: can't be more than 1 ahead of any sibling in group
  const groupCells = PROPERTY_GROUPS[cell.group];
  for (const idx of groupCells) {
    if (idx === cellIndex) continue;
    const otherHouses = player.houses[String(idx)] || 0;
    if (currentHouses > otherHouses) return { valid: false, error: 'evenBuildRule' };
  }

  const cost = cell.houseCost || 0;
  if (player.points < cost) return { valid: false, error: 'cannotAfford' };

  return { valid: true, cost };
}

/** Build house. Returns true on success. */
export function buildHouse(game: ITinhTuyGame, playerSlot: number, cellIndex: number): boolean {
  const check = canBuildHouse(game, playerSlot, cellIndex);
  if (!check.valid) return false;

  const player = game.players.find(p => p.slot === playerSlot)!;
  player.points -= check.cost!;
  player.houses[String(cellIndex)] = (player.houses[String(cellIndex)] || 0) + 1;
  return true;
}

/** Check if player can upgrade to hotel on cellIndex (requires 4 houses) */
export function canBuildHotel(
  game: ITinhTuyGame, playerSlot: number, cellIndex: number
): { valid: boolean; error?: string; cost?: number } {
  const player = game.players.find(p => p.slot === playerSlot);
  if (!player) return { valid: false, error: 'playerNotFound' };

  const cell = getCell(cellIndex);
  if (!cell || cell.type !== 'PROPERTY' || !cell.group) return { valid: false, error: 'notBuildable' };

  const currentHouses = player.houses[String(cellIndex)] || 0;
  if (currentHouses !== 4) return { valid: false, error: 'need4Houses' };
  if (player.hotels[String(cellIndex)]) return { valid: false, error: 'hasHotel' };

  const cost = cell.hotelCost || 0;
  if (player.points < cost) return { valid: false, error: 'cannotAfford' };

  return { valid: true, cost };
}

/** Build hotel (replaces 4 houses). Returns true on success. */
export function buildHotel(game: ITinhTuyGame, playerSlot: number, cellIndex: number): boolean {
  const check = canBuildHotel(game, playerSlot, cellIndex);
  if (!check.valid) return false;

  const player = game.players.find(p => p.slot === playerSlot)!;
  player.points -= check.cost!;
  player.houses[String(cellIndex)] = 0;
  player.hotels[String(cellIndex)] = true;
  return true;
}

// ─── Cell Resolution ──────────────────────────────────────────

/** Determine what action is needed when player lands on a cell */
export function resolveCellAction(
  game: ITinhTuyGame,
  playerSlot: number,
  cellIndex: number,
  diceTotal: number
): {
  action: 'buy' | 'rent' | 'tax' | 'none' | 'go_to_island' | 'card' | 'festival';
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
      return { action: 'card' };
    case 'FESTIVAL':
      return { action: 'festival', amount: 500 };
    default:
      return { action: 'none' }; // GO, TRAVEL, ISLAND
  }
}
