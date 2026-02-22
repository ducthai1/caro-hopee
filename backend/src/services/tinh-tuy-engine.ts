/**
 * Tinh Tuy Dai Chien — Game Engine
 * Pure logic functions. No DB access, no socket emits.
 * Returns computed values/mutations for socket handlers to persist.
 */
import crypto from 'crypto';
import { DiceResult, ITinhTuyGame, ITinhTuyPlayer } from '../types/tinh-tuy.types';
import {
  BOARD_CELLS, BOARD_SIZE, GO_SALARY, ISLAND_ESCAPE_COST, MAX_ISLAND_TURNS, PROPERTY_GROUPS,
  EDGE_OWNABLE_CELLS, MONOPOLY_WIN_THRESHOLD,
  getCell, ownsFullGroup, countStationsOwned, getStationRent, getUtilityRent,
} from './tinh-tuy-board';

// ─── Late-Game Acceleration (Round 60+) ──────────────────────
export const LATE_GAME_START = 60;
const LATE_GAME_RENT_RATE = 0.05;   // +5%/round rent multiplier
const LATE_GAME_TAX_RATE = 0.10;    // +10%/round tax multiplier
const LATE_GAME_GO_DECAY = 0.05;    // -5%/round GO salary decay
const LATE_GAME_GO_FLOOR = 0.2;     // Minimum 20% of base salary

/** Late-game scaling multiplier: 1 + rate × (round − 60) when round > 60, else 1 */
export function getLateGameMultiplier(round: number, rate: number): number {
  if (round <= LATE_GAME_START) return 1;
  return 1 + rate * (round - LATE_GAME_START);
}

/** Effective GO salary after late-game decay */
export function getEffectiveGoSalary(round: number): number {
  if (round <= LATE_GAME_START) return GO_SALARY;
  const factor = Math.max(LATE_GAME_GO_FLOOR, 1 - LATE_GAME_GO_DECAY * (round - LATE_GAME_START));
  return Math.floor(GO_SALARY * factor);
}

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

  // Frozen property — rent is 0
  if (game.frozenProperties?.some((fp: any) => fp.cellIndex === cellIndex && fp.turnsRemaining > 0)) {
    return 0;
  }

  let rent = 0;

  const completedRounds = Math.max((game.round || 1) - 1, 0);

  // Station rent: 250 per station owned, scales with rounds
  if (cell.type === 'STATION') {
    rent = getStationRent(countStationsOwned(owner.properties), completedRounds);
  } else if (cell.type === 'UTILITY') {
    // Utility rent: scales with completed rounds
    rent = getUtilityRent(cell.price || 1500, completedRounds);
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

  // Monopoly bonus: +15% when owner owns full color group
  if (cell.group && ownsFullGroup(cell.group, owner.properties)) {
    rent = Math.floor(rent * 1.15);
  }

  // Festival multiplier (game-level, stacking: 1.5x, 2x, 2.5x, ...)
  if (game.festival && game.festival.cellIndex === cellIndex) {
    rent = Math.floor(rent * game.festival.multiplier);
  }

  // Owner has double rent buff
  if (owner.doubleRentTurns && owner.doubleRentTurns > 0) {
    rent *= 2;
  }

  // Late-game rent escalation: +5%/round after round 60
  rent = Math.floor(rent * getLateGameMultiplier(game.round || 1, LATE_GAME_RENT_RATE));

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

  // Monopoly domination: 6/8 completed color groups OR all ownable cells on one edge
  const allGroups = Object.keys(PROPERTY_GROUPS) as Array<keyof typeof PROPERTY_GROUPS>;
  for (const p of activePlayers) {
    const completedGroups = allGroups.filter(g => ownsFullGroup(g, p.properties)).length;
    if (completedGroups >= MONOPOLY_WIN_THRESHOLD) {
      return { ended: true, winner: p, reason: 'monopolyGroupDomination' };
    }
    // Check full-edge ownership (all ownable cells on one board edge)
    if (EDGE_OWNABLE_CELLS.some(edge => edge.every(idx => p.properties.includes(idx)))) {
      return { ended: true, winner: p, reason: 'edgeDomination' };
    }
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

// ─── Near-Win Warning ────────────────────────────────────────

/** Check if a player is 1 step away from winning via domination.
 *  Returns warning details or null. */
export function checkNearWin(player: ITinhTuyPlayer): {
  type: 'nearEdgeDomination' | 'nearMonopolyGroupDomination';
  /** For edge: the missing cell indices. For groups: completed group count. */
  missingCells?: number[];
  completedGroups?: number;
  edgeIndex?: number;
} | null {
  // Check edge domination: owns all but 1 cell on an edge
  for (let i = 0; i < EDGE_OWNABLE_CELLS.length; i++) {
    const edge = EDGE_OWNABLE_CELLS[i];
    const missing = edge.filter(idx => !player.properties.includes(idx));
    if (missing.length === 1) {
      return { type: 'nearEdgeDomination', missingCells: missing, edgeIndex: i };
    }
  }

  // Check monopoly group domination: completed 5/8 groups (one more = 6 = win)
  const allGroups = Object.keys(PROPERTY_GROUPS) as Array<keyof typeof PROPERTY_GROUPS>;
  const completedGroups = allGroups.filter(g => ownsFullGroup(g, player.properties)).length;
  if (completedGroups === MONOPOLY_WIN_THRESHOLD - 1) {
    return { type: 'nearMonopolyGroupDomination', completedGroups };
  }

  return null;
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
): { valid: boolean; error?: string; cost: number } {
  const player = game.players.find(p => p.slot === playerSlot);
  if (!player) return { valid: false, error: 'playerNotFound', cost: 0 };

  const cell = getCell(cellIndex);
  if (!cell || cell.type !== 'PROPERTY' || !cell.group) return { valid: false, error: 'notBuildable', cost: 0 };
  if (!player.properties.includes(cellIndex)) return { valid: false, error: 'notOwned', cost: 0 };

  const cost = cell.houseCost || 0;
  const currentHouses = player.houses[String(cellIndex)] || 0;
  if (currentHouses >= 4) return { valid: false, error: 'maxHouses', cost };
  if (player.hotels[String(cellIndex)]) return { valid: false, error: 'hasHotel', cost };
  if (player.points < cost) return { valid: false, error: 'cannotAfford', cost };

  return { valid: true, cost };
}

/** Build house. Returns true on success. */
export function buildHouse(game: ITinhTuyGame, playerSlot: number, cellIndex: number): boolean {
  const check = canBuildHouse(game, playerSlot, cellIndex);
  if (!check.valid) return false;

  const player = game.players.find(p => p.slot === playerSlot)!;
  player.points -= check.cost;
  player.houses[String(cellIndex)] = (player.houses[String(cellIndex)] || 0) + 1;
  return true;
}

/** Check if player can upgrade to hotel on cellIndex (requires 4 houses) */
export function canBuildHotel(
  game: ITinhTuyGame, playerSlot: number, cellIndex: number
): { valid: boolean; error?: string; cost: number } {
  const player = game.players.find(p => p.slot === playerSlot);
  if (!player) return { valid: false, error: 'playerNotFound', cost: 0 };

  const cell = getCell(cellIndex);
  if (!cell || cell.type !== 'PROPERTY' || !cell.group) return { valid: false, error: 'notBuildable', cost: 0 };

  const cost = cell.hotelCost || 0;
  const currentHouses = player.houses[String(cellIndex)] || 0;
  if (currentHouses !== 4) return { valid: false, error: 'need4Houses', cost };
  if (player.hotels[String(cellIndex)]) return { valid: false, error: 'hasHotel', cost };
  if (player.points < cost) return { valid: false, error: 'cannotAfford', cost };

  return { valid: true, cost };
}

/** Build hotel (replaces 4 houses). Returns true on success. */
export function buildHotel(game: ITinhTuyGame, playerSlot: number, cellIndex: number): boolean {
  const check = canBuildHotel(game, playerSlot, cellIndex);
  if (!check.valid) return false;

  const player = game.players.find(p => p.slot === playerSlot)!;
  player.points -= check.cost;
  player.houses[String(cellIndex)] = 0;
  player.hotels[String(cellIndex)] = true;
  return true;
}

// ─── Sell Building Helpers ────────────────────────────────

const SELL_RATIO = 0.8; // Sell at 80% of cost/value

/** Sell price = 80% of cost. For utilities/stations selling as 'property',
 *  pass completedRounds/player so the scaled value is used. */
export function getSellPrice(
  cellIndex: number, type: 'house' | 'hotel' | 'property',
  completedRounds?: number, player?: ITinhTuyPlayer,
): number {
  const cell = getCell(cellIndex);
  if (!cell) return 0;
  if (type === 'property') {
    // Utilities: 80% of round-scaled value
    if (cell.type === 'UTILITY' && completedRounds != null) {
      return Math.floor(getUtilityRent(cell.price || 0, completedRounds) * SELL_RATIO);
    }
    // Stations: 80% of (base price + rent based on stations owned, round-scaled)
    if (cell.type === 'STATION' && player) {
      const stationsOwned = player.properties.filter(i => getCell(i)?.type === 'STATION').length;
      return Math.floor(((cell.price || 0) + getStationRent(stationsOwned, completedRounds || 0)) * SELL_RATIO);
    }
    return Math.floor((cell.price || 0) * SELL_RATIO);
  }
  return Math.floor(((type === 'hotel' ? cell.hotelCost : cell.houseCost) || 0) * SELL_RATIO);
}

/** Total sell value of a single property (land + any buildings on it) — 80% of cost/value */
export function getPropertyTotalSellValue(
  player: ITinhTuyPlayer, cellIndex: number, completedRounds?: number,
): number {
  const cell = getCell(cellIndex);
  if (!cell) return 0;
  const key = String(cellIndex);
  let total = getSellPrice(cellIndex, 'property', completedRounds, player);
  if (player.hotels[key]) total += Math.floor((cell.hotelCost || 0) * SELL_RATIO);
  const houses = player.houses[key] || 0;
  if (houses > 0) total += houses * Math.floor((cell.houseCost || 0) * SELL_RATIO);
  return total;
}

/** Total value of all sellable assets (buildings + properties) for a player */
export function calculateSellableValue(player: ITinhTuyPlayer, completedRounds?: number): number {
  let total = 0;
  for (const cellIdx of player.properties) {
    total += getPropertyTotalSellValue(player, cellIdx, completedRounds);
  }
  return total;
}

// ─── Cell Resolution ──────────────────────────────────────────

/** Determine what action is needed when player lands on a cell */
export function resolveCellAction(
  game: ITinhTuyGame,
  playerSlot: number,
  cellIndex: number,
  diceTotal: number
): {
  action: 'buy' | 'rent' | 'tax' | 'none' | 'go_to_island' | 'card' | 'festival' | 'travel' | 'build';
  amount?: number;
  ownerSlot?: number;
  houseCount?: number;
  hotelCount?: number;
  perHouse?: number;
  perHotel?: number;
  // Build-specific fields
  canBuildHouse?: boolean;
  houseCost?: number;
  canBuildHotel?: boolean;
  hotelCost?: number;
  currentHouses?: number;
  hasHotel?: boolean;
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
        // Unowned — player can buy (unless buy-blocked)
        if (player.buyBlockedTurns && player.buyBlockedTurns > 0) {
          return { action: 'none' };
        }
        return { action: 'buy', amount: cell.price || 0 };
      }
      if (owner.isBankrupt) {
        return { action: 'none' };
      }
      if (owner.slot === playerSlot) {
        // Own property — check if can build house or hotel
        const houseCheck = canBuildHouse(game, playerSlot, cellIndex);
        const hotelCheck = canBuildHotel(game, playerSlot, cellIndex);
        if (houseCheck.valid || hotelCheck.valid) {
          return {
            action: 'build',
            canBuildHouse: houseCheck.valid,
            houseCost: houseCheck.cost,
            canBuildHotel: hotelCheck.valid,
            hotelCost: hotelCheck.cost,
            currentHouses: player.houses?.[String(cellIndex)] || 0,
            hasHotel: !!player.hotels?.[String(cellIndex)],
          };
        }
        return { action: 'none' };
      }
      // Owned by another — pay rent
      const rent = calculateRent(game, cellIndex, diceTotal);
      return { action: 'rent', amount: rent, ownerSlot: owner.slot };
    }
    case 'TAX': {
      // Per-building tax: count houses & hotels owned by the player
      // Late-game: tax scales +10%/round after round 60
      const taxMult = getLateGameMultiplier(game.round || 1, LATE_GAME_TAX_RATE);
      const perHouse = Math.floor((cell.taxPerHouse || 500) * taxMult);
      const perHotel = Math.floor((cell.taxPerHotel || 1000) * taxMult);
      let houseCount = 0;
      let hotelCount = 0;
      for (const propIdx of player.properties) {
        const h = player.houses?.[String(propIdx)] || 0;
        const hasHotel = !!player.hotels?.[String(propIdx)];
        if (hasHotel) hotelCount++;
        else houseCount += h;
      }
      const totalTax = (houseCount * perHouse) + (hotelCount * perHotel);
      return { action: 'tax', amount: totalTax, houseCount, hotelCount, perHouse, perHotel };
    }
    case 'GO_TO_ISLAND':
      return { action: 'go_to_island' };
    case 'KHI_VAN':
    case 'CO_HOI':
      return { action: 'card' };
    case 'FESTIVAL':
      return { action: 'festival' };
    case 'TRAVEL':
      return { action: 'travel' };
    case 'ISLAND':
      return { action: 'go_to_island' };
    default:
      return { action: 'none' }; // GO
  }
}
