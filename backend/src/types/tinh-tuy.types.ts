/**
 * Tinh Tuy Dai Chien — TypeScript type definitions
 * Monopoly-style board game with Vietnamese landmarks, 2-4 players
 */
import { Document } from 'mongoose';
import mongoose from 'mongoose';

// ─── Character ───────────────────────────────────────────────
export type TinhTuyCharacter = 'shiba' | 'kungfu' | 'fox' | 'elephant';
export const VALID_CHARACTERS: TinhTuyCharacter[] = ['shiba', 'kungfu', 'fox', 'elephant'];

// ─── Enums ────────────────────────────────────────────────────
export type TinhTuyGameStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';
export type TinhTuyGameMode = 'classic' | 'timed' | 'rounds';
export type TurnPhase = 'ROLL_DICE' | 'MOVING' | 'AWAITING_ACTION' | 'AWAITING_BUILD' | 'AWAITING_FREE_HOUSE' | 'AWAITING_CARD' | 'AWAITING_CARD_DISPLAY' | 'AWAITING_TRAVEL' | 'AWAITING_FESTIVAL' | 'AWAITING_SELL' | 'AWAITING_DESTROY_PROPERTY' | 'AWAITING_DOWNGRADE_BUILDING' | 'AWAITING_BUYBACK' | 'AWAITING_CARD_DESTINATION' | 'AWAITING_FORCED_TRADE' | 'AWAITING_RENT_FREEZE' | 'ISLAND_TURN' | 'END_TURN';

export type CellType =
  | 'GO'            // cell 0: Xuat Phat
  | 'PROPERTY'      // 20 properties in 8 color groups
  | 'STATION'       // 2 stations (Nha Ga)
  | 'UTILITY'       // 2 utilities (Dien, Nuoc)
  | 'KHI_VAN'       // 3 chance cards
  | 'CO_HOI'        // 3 community chest cards
  | 'TAX'           // 2 tax cells
  | 'TRAVEL'        // cell 9: Du Lich (free parking)
  | 'ISLAND'        // cell 27: Ra Dao (jail)
  | 'GO_TO_ISLAND'  // cell 18: Di Ra Dao
  | 'FESTIVAL';     // cell 14: Le Hoi

export type PropertyGroup =
  | 'brown' | 'light_blue' | 'purple' | 'orange'
  | 'red' | 'yellow' | 'green' | 'dark_blue';

// ─── Settings ─────────────────────────────────────────────────
export interface ITinhTuySettings {
  maxPlayers: number;           // 2-4
  startingPoints: number;       // 10000, 15000, 20000, 30000, 50000
  gameMode: TinhTuyGameMode;
  timeLimit?: number;           // minutes (timed mode)
  maxRounds?: number;           // rounds mode
  turnDuration: number;         // seconds: 30, 60, 90, 120
  password?: string;            // hashed
}

// ─── Player ───────────────────────────────────────────────────
export interface ITinhTuyPlayer {
  slot: number;                 // 1-4
  character: TinhTuyCharacter;  // chosen character
  userId?: mongoose.Types.ObjectId;
  guestId?: string;
  guestName?: string;
  points: number;
  position: number;             // 0-35
  properties: number[];         // cell indices owned
  houses: Record<string, number>;   // cellIndex → 0-4
  hotels: Record<string, boolean>;  // cellIndex → true/false
  // festivals removed — now game-level field
  islandTurns: number;          // turns remaining on island (0 = free)
  cards: string[];              // held card IDs (e.g., 'escape-island')
  isBankrupt: boolean;
  isConnected: boolean;
  disconnectedAt?: Date;
  consecutiveDoubles: number;
  skipNextTurn?: boolean;
  extraTurn?: boolean;
  immunityNextRent?: boolean;
  doubleRentTurns?: number;          // remaining turns where owned rents are doubled
  pendingTravel?: boolean;           // deferred travel — next turn starts as AWAITING_TRAVEL
  deviceType?: string;
}

// ─── Winner ───────────────────────────────────────────────────
export interface ITinhTuyWinner {
  slot: number;
  userId?: mongoose.Types.ObjectId;
  guestId?: string;
  guestName?: string;
  finalPoints: number;
}

// ─── Board Cell Definition ────────────────────────────────────
export interface IBoardCell {
  index: number;                // 0-35
  type: CellType;
  name: string;                 // i18n key: 'tinhTuy.cells.quangTri'
  group?: PropertyGroup;        // only for PROPERTY
  price?: number;               // purchase price
  rentBase?: number;            // base rent (no houses)
  rentGroup?: number;           // rent with full group (2x base)
  rentHouse?: number[];         // [1house, 2house, 3house, 4house]
  rentHotel?: number;
  houseCost?: number;
  hotelCost?: number;
  taxAmount?: number;           // for TAX cells (legacy flat tax)
  taxPerHouse?: number;         // per-house tax
  taxPerHotel?: number;         // per-hotel tax
  icon?: string;                // filename: 'quang-tri.png'
}

// ─── Game Document ────────────────────────────────────────────
export interface ITinhTuyGame extends Document {
  roomId: string;
  roomCode: string;
  gameType: 'tinh-tuy';
  hostPlayerId: string;

  settings: ITinhTuySettings;
  players: ITinhTuyPlayer[];

  gameStatus: TinhTuyGameStatus;
  currentPlayerSlot: number;
  turnPhase: TurnPhase;
  turnStartedAt?: Date;
  lastDiceResult?: { dice1: number; dice2: number } | null;

  // Card decks (Phase 3 — placeholder arrays for now)
  luckCardDeck: string[];
  luckCardIndex: number;
  opportunityCardDeck: string[];
  opportunityCardIndex: number;

  round: number;
  gameStartedAt?: Date;
  finishedAt?: Date;

  /** Global festival — only one on the board at a time */
  festival: { slot: number; cellIndex: number; multiplier: number } | null;

  /** Frozen properties — rent is 0 for these cells for turnsRemaining rounds */
  frozenProperties: Array<{ cellIndex: number; turnsRemaining: number }>;

  winner?: ITinhTuyWinner | null;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Socket Callback Types ────────────────────────────────────
export interface TinhTuyCallback {
  (response: { success: boolean; [key: string]: unknown }): void;
}

// ─── Dice Result ──────────────────────────────────────────────
export interface DiceResult {
  dice1: number;
  dice2: number;
  total: number;
  isDouble: boolean;
}

// ─── Card Action Types ────────────────────────────────────────
export type CardAction =
  | { type: 'MOVE_TO'; position: number }
  | { type: 'MOVE_RELATIVE'; steps: number }
  | { type: 'GAIN_POINTS'; amount: number }
  | { type: 'LOSE_POINTS'; amount: number }
  | { type: 'GAIN_FROM_EACH'; amount: number }
  | { type: 'LOSE_TO_EACH'; amount: number }
  | { type: 'GO_TO_ISLAND' }
  | { type: 'HOLD_CARD'; cardId: string }
  | { type: 'SKIP_TURN' }
  | { type: 'FREE_HOUSE' }
  | { type: 'PER_HOUSE_COST'; amount: number }
  | { type: 'DOUBLE_RENT_NEXT'; turns: number }
  | { type: 'RANDOM_POINTS'; min: number; max: number }
  | { type: 'LOSE_ONE_HOUSE' }
  | { type: 'ALL_LOSE_POINTS'; amount: number }
  | { type: 'IMMUNITY_NEXT_RENT' }
  | { type: 'DESTROY_PROPERTY' }
  | { type: 'DOWNGRADE_BUILDING' }
  | { type: 'SWAP_POSITION' }
  | { type: 'STEAL_PROPERTY' }
  | { type: 'TAX_RICHEST'; amount: number }
  | { type: 'MOVE_RANDOM'; min: number; max: number }
  | { type: 'GAMBLE'; win: number; lose: number }
  | { type: 'ALL_LOSE_ONE_HOUSE' }
  | { type: 'UNDERDOG_BOOST'; boostAmount: number; penaltyAmount: number }
  | { type: 'EXTRA_TURN' }
  | { type: 'WEALTH_TRANSFER'; amount: number }
  | { type: 'CHOOSE_DESTINATION' }
  | { type: 'TELEPORT_ALL' }
  | { type: 'FORCED_TRADE' }
  | { type: 'RENT_FREEZE' }
  | { type: 'MOVE_TO_FESTIVAL' };

export interface ITinhTuyCard {
  id: string;
  type: 'KHI_VAN' | 'CO_HOI';
  nameKey: string;
  descriptionKey: string;
  action: CardAction;
  holdable?: boolean;
  /** Card only appears in deck from this round onward (skipped if drawn earlier) */
  minRound?: number;
}

// ─── Card Effect Result ───────────────────────────────────────
export interface CardEffectResult {
  pointsChanged: Record<number, number>; // slot → delta
  playerMoved?: { slot: number; to: number; passedGo: boolean };
  cardHeld?: { slot: number; cardId: string };
  houseRemoved?: { slot: number; cellIndex: number };
  skipTurn?: boolean;
  requiresChoice?: 'FREE_HOUSE' | 'DESTROY_PROPERTY' | 'DOWNGRADE_BUILDING' | 'CHOOSE_DESTINATION' | 'FORCED_TRADE' | 'RENT_FREEZE';
  goToIsland?: boolean;
  /** Target properties for attack cards — opponent cells the current player can target */
  targetableCells?: number[];
  immunityNextRent?: boolean;
  doubleRentTurns?: number;
  /** Swap position — both players teleport to each other's old position */
  swapPosition?: { slot: number; targetSlot: number; myNewPos: number; targetNewPos: number };
  /** Stolen property — transferred from opponent to current player */
  stolenProperty?: { fromSlot: number; toSlot: number; cellIndex: number; houses: number };
  /** Slot of the player who got taxed (for TAX_RICHEST visual) */
  taxedSlot?: number;
  /** Random steps rolled (for MOVE_RANDOM — stored so frontend can display the number) */
  randomSteps?: number;
  /** Random points won (for RANDOM_POINTS — stored so frontend can display the amount) */
  randomPoints?: number;
  /** Gamble result (true = won, false = lost) */
  gambleWon?: boolean;
  /** All houses removed by storm card — one per player */
  allHousesRemoved?: Array<{ slot: number; cellIndex: number }>;
  /** Shield blocked an attack */
  shieldUsed?: { slot: number };
  /** Player gets an extra turn after this one */
  extraTurn?: boolean;
  /** Wealth transfer: richest/poorest slots for UI display */
  wealthTransfer?: { richestSlot: number; poorestSlot: number; amount: number };
  /** Underdog boost: whether player was the poorest */
  underdogBoosted?: boolean;
  /** Teleport all: new positions for all players */
  teleportAll?: Array<{ slot: number; to: number }>;
  /** Player moved to festival cell */
  movedToFestival?: boolean;
}
