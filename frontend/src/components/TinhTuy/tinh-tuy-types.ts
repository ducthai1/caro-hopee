/**
 * Tinh Tuy Dai Chien — Frontend Types
 * Mirrors backend types + UI-specific extensions.
 */

// ─── View ─────────────────────────────────────────────
export type TinhTuyView = 'lobby' | 'waiting' | 'playing' | 'result';

// ─── Enums ────────────────────────────────────────────
export type TinhTuyGameStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';
export type TinhTuyGameMode = 'classic' | 'timed' | 'rounds';
export type TurnPhase = 'ROLL_DICE' | 'MOVING' | 'AWAITING_ACTION' | 'AWAITING_CARD' | 'ISLAND_TURN' | 'END_TURN';

export type CellType =
  | 'GO' | 'PROPERTY' | 'STATION' | 'UTILITY'
  | 'KHI_VAN' | 'CO_HOI' | 'TAX'
  | 'TRAVEL' | 'ISLAND' | 'GO_TO_ISLAND' | 'FESTIVAL';

export type PropertyGroup =
  | 'brown' | 'light_blue' | 'purple' | 'orange'
  | 'red' | 'yellow' | 'green' | 'dark_blue';

// ─── Settings ─────────────────────────────────────────
export interface TinhTuySettings {
  maxPlayers: number;
  startingPoints: number;
  gameMode: TinhTuyGameMode;
  timeLimit?: number;
  maxRounds?: number;
  turnDuration: number;
}

export const DEFAULT_SETTINGS: TinhTuySettings = {
  maxPlayers: 4,
  startingPoints: 20000,
  gameMode: 'classic',
  turnDuration: 60,
};

// ─── Player ───────────────────────────────────────────
export interface TinhTuyPlayer {
  slot: number;
  userId?: string;
  guestId?: string;
  guestName?: string;
  displayName: string;
  points: number;
  position: number;
  properties: number[];
  houses: Record<string, number>;
  hotels: Record<string, boolean>;
  islandTurns: number;
  cards: string[];
  isBankrupt: boolean;
  isConnected: boolean;
  consecutiveDoubles: number;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
}

// ─── Winner ───────────────────────────────────────────
export interface TinhTuyWinner {
  slot: number;
  userId?: string;
  guestId?: string;
  guestName?: string;
  finalPoints: number;
}

// ─── Turn Phase ───────────────────────────────────────
export type PendingAction =
  | { type: 'BUY_PROPERTY'; cellIndex: number; price: number; canAfford: boolean; cellType?: string }
  | { type: 'PAY_RENT'; cellIndex: number; amount: number; toSlot: number }
  | { type: 'TAX'; cellIndex: number; amount: number }
  | null;

// ─── Board Cell (client-side reference) ───────────────
export interface BoardCellClient {
  index: number;
  type: CellType;
  name: string;
  group?: PropertyGroup;
  price?: number;
  rentBase?: number;
  houseCost?: number;
  hotelCost?: number;
  icon?: string;
  taxAmount?: number;
}

// ─── Waiting Room Info (lobby card) ───────────────────
export interface WaitingRoomInfo {
  roomId: string;
  roomCode: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  settings: TinhTuySettings;
  createdAt: string;
}

// ─── Create Room Payload ──────────────────────────────
export interface CreateRoomPayload {
  settings: Partial<TinhTuySettings>;
  password?: string;
}

// ─── State ────────────────────────────────────────────
export interface TinhTuyState {
  view: TinhTuyView;
  waitingRooms: WaitingRoomInfo[];
  isLoadingRooms: boolean;
  roomId: string | null;
  roomCode: string | null;
  settings: TinhTuySettings | null;
  players: TinhTuyPlayer[];
  isHost: boolean;
  mySlot: number | null;
  hasPassword: boolean;
  gameStatus: TinhTuyGameStatus;
  currentPlayerSlot: number;
  turnPhase: TurnPhase;
  turnStartedAt: number;
  lastDiceResult: { dice1: number; dice2: number } | null;
  round: number;
  pendingAction: PendingAction;
  winner: TinhTuyWinner | null;
  error: string | null;
  drawnCard: CardInfo | null;
  chatMessages: ChatMessage[];
  animatingToken: { slot: number; path: number[]; currentStep: number } | null;
  showGoPopup: boolean;
}

// ─── Reducer Actions ──────────────────────────────────
export type TinhTuyAction =
  | { type: 'SET_VIEW'; payload: TinhTuyView }
  | { type: 'SET_ROOMS'; payload: WaitingRoomInfo[] }
  | { type: 'SET_LOADING_ROOMS'; payload: boolean }
  | { type: 'ROOM_CREATED'; payload: { roomId: string; roomCode: string; settings: TinhTuySettings; players: TinhTuyPlayer[] } }
  | { type: 'ROOM_JOINED'; payload: { roomId: string; roomCode: string; settings: TinhTuySettings; players: TinhTuyPlayer[]; gameStatus: TinhTuyGameStatus; game?: any; reconnected?: boolean } }
  | { type: 'ROOM_UPDATED'; payload: { players?: TinhTuyPlayer[]; settings?: TinhTuySettings; gameStatus?: TinhTuyGameStatus; hostPlayerId?: string } }
  | { type: 'GAME_STARTED'; payload: { game: any } }
  | { type: 'DICE_RESULT'; payload: { dice1: number; dice2: number; total: number; isDouble: boolean } }
  | { type: 'PLAYER_MOVED'; payload: { slot: number; from: number; to: number; passedGo: boolean; goBonus?: number } }
  | { type: 'AWAITING_ACTION'; payload: { slot: number; cellIndex: number; cellType?: string; price?: number; canAfford?: boolean } }
  | { type: 'PROPERTY_BOUGHT'; payload: { slot: number; cellIndex: number; price: number; remainingPoints: number } }
  | { type: 'RENT_PAID'; payload: { fromSlot: number; toSlot: number; amount: number; cellIndex: number } }
  | { type: 'TAX_PAID'; payload: { slot: number; amount: number; cellIndex: number } }
  | { type: 'TURN_CHANGED'; payload: { currentSlot: number; turnPhase: TurnPhase; turnStartedAt?: any; round?: number; extraTurn?: boolean } }
  | { type: 'PLAYER_BANKRUPT'; payload: { slot: number } }
  | { type: 'PLAYER_SURRENDERED'; payload: { slot: number } }
  | { type: 'PLAYER_ISLAND'; payload: { slot: number; turnsRemaining: number } }
  | { type: 'GAME_FINISHED'; payload: { winner: TinhTuyWinner | null; reason: string } }
  | { type: 'PLAYER_DISCONNECTED'; payload: { slot: number } }
  | { type: 'PLAYER_RECONNECTED'; payload: { slot: number } }
  | { type: 'SET_HOST'; payload: boolean }
  | { type: 'SET_MY_SLOT'; payload: number | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LEAVE_ROOM' }
  | { type: 'CARD_DRAWN'; payload: { slot: number; card: CardInfo; effect: any } }
  | { type: 'CLEAR_CARD' }
  | { type: 'HOUSE_BUILT'; payload: { slot: number; cellIndex: number; houseCount: number; remainingPoints?: number } }
  | { type: 'HOTEL_BUILT'; payload: { slot: number; cellIndex: number; remainingPoints?: number } }
  | { type: 'ISLAND_ESCAPED'; payload: { slot: number; method: string; costPaid?: number } }
  | { type: 'FESTIVAL_PAID'; payload: { amounts: Record<number, number> } }
  | { type: 'CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'ANIMATION_STEP' }
  | { type: 'SHOW_GO_POPUP' }
  | { type: 'HIDE_GO_POPUP' };

// ─── Card Types ──────────────────────────────────────
export interface CardInfo {
  id: string;
  type: 'KHI_VAN' | 'CO_HOI';
  nameKey: string;
  descriptionKey: string;
}

export interface ChatMessage {
  slot: number;
  message: string;
  timestamp: number;
}

// ─── Player Colors ────────────────────────────────────
export const PLAYER_COLORS: Record<number, string> = {
  1: '#e74c3c',
  2: '#3498db',
  3: '#2ecc71',
  4: '#f39c12',
};

// ─── Property Group Colors ────────────────────────────
export const GROUP_COLORS: Record<PropertyGroup, string> = {
  brown: '#8B4513',
  light_blue: '#87CEEB',
  purple: '#9B59B6',
  orange: '#E67E22',
  red: '#E74C3C',
  yellow: '#F1C40F',
  green: '#27AE60',
  dark_blue: '#2C3E50',
};

// ─── Board Definition (client-side) ───────────────────
export const BOARD_CELLS: BoardCellClient[] = [
  // TOP (0-8)
  { index: 0, type: 'GO', name: 'tinhTuy.cells.go', icon: 'bat-dau.png' },
  { index: 1, type: 'PROPERTY', name: 'tinhTuy.cells.quangTri', group: 'brown', price: 600, rentBase: 20, houseCost: 500, hotelCost: 500, icon: 'quang-tri.png' },
  { index: 2, type: 'STATION', name: 'tinhTuy.cells.canTho', price: 2000, rentBase: 250, icon: 'can-tho.png' },
  { index: 3, type: 'PROPERTY', name: 'tinhTuy.cells.pleiku', group: 'brown', price: 600, rentBase: 40, houseCost: 500, hotelCost: 500, icon: 'pleiku.png' },
  { index: 4, type: 'KHI_VAN', name: 'tinhTuy.cells.khiVan', icon: 'khi-van.png' },
  { index: 5, type: 'PROPERTY', name: 'tinhTuy.cells.hoiAn', group: 'light_blue', price: 1000, rentBase: 60, houseCost: 500, hotelCost: 500, icon: 'hoi-an.png' },
  { index: 6, type: 'UTILITY', name: 'tinhTuy.cells.electric', price: 1500 },
  { index: 7, type: 'PROPERTY', name: 'tinhTuy.cells.hue', group: 'light_blue', price: 1000, rentBase: 60, houseCost: 500, hotelCost: 500, icon: 'hue.png' },
  { index: 8, type: 'CO_HOI', name: 'tinhTuy.cells.coHoi', icon: 'co-hoi.png' },
  // RIGHT (9-17)
  { index: 9, type: 'TRAVEL', name: 'tinhTuy.cells.travel', icon: 'du-lich.png' },
  { index: 10, type: 'PROPERTY', name: 'tinhTuy.cells.benThanh', group: 'purple', price: 1400, rentBase: 100, houseCost: 1000, hotelCost: 1000, icon: 'ben-thanh.png' },
  { index: 11, type: 'PROPERTY', name: 'tinhTuy.cells.ducBa', group: 'purple', price: 1400, rentBase: 100, houseCost: 1000, hotelCost: 1000, icon: 'duc-ba.png' },
  { index: 12, type: 'TAX', name: 'tinhTuy.cells.tax', icon: 'thue.png', taxAmount: 1500 },
  { index: 13, type: 'PROPERTY', name: 'tinhTuy.cells.vanMieu', group: 'orange', price: 1800, rentBase: 140, houseCost: 1000, hotelCost: 1000, icon: 'quoc-tu-giam.png' },
  { index: 14, type: 'FESTIVAL', name: 'tinhTuy.cells.festival', icon: 'le-hoi.png' },
  { index: 15, type: 'PROPERTY', name: 'tinhTuy.cells.hoGuom', group: 'orange', price: 1800, rentBase: 140, houseCost: 1000, hotelCost: 1000, icon: 'ho-guom.png' },
  { index: 16, type: 'KHI_VAN', name: 'tinhTuy.cells.khiVan', icon: 'khi-van.png' },
  { index: 17, type: 'PROPERTY', name: 'tinhTuy.cells.haLong', group: 'red', price: 2200, rentBase: 180, houseCost: 1500, hotelCost: 1500, icon: 'ha-long.png' },
  // BOTTOM (18-26)
  { index: 18, type: 'GO_TO_ISLAND', name: 'tinhTuy.cells.goToIsland', icon: 'ra-dao.png' },
  { index: 19, type: 'PROPERTY', name: 'tinhTuy.cells.phongNha', group: 'red', price: 2200, rentBase: 180, houseCost: 1500, hotelCost: 1500, icon: 'phong-nha.png' },
  { index: 20, type: 'CO_HOI', name: 'tinhTuy.cells.coHoi', icon: 'co-hoi.png' },
  { index: 21, type: 'PROPERTY', name: 'tinhTuy.cells.cauVang', group: 'yellow', price: 2600, rentBase: 220, houseCost: 1500, hotelCost: 1500, icon: 'cau-vang.png' },
  { index: 22, type: 'UTILITY', name: 'tinhTuy.cells.water', price: 1500 },
  { index: 23, type: 'PROPERTY', name: 'tinhTuy.cells.sapa', group: 'yellow', price: 2600, rentBase: 220, houseCost: 1500, hotelCost: 1500, icon: 'sapa.png' },
  { index: 24, type: 'TAX', name: 'tinhTuy.cells.tax', icon: 'thue.png', taxAmount: 2000 },
  { index: 25, type: 'PROPERTY', name: 'tinhTuy.cells.nhaTrang', group: 'green', price: 3000, rentBase: 260, houseCost: 2000, hotelCost: 2000, icon: 'nha-trang.png' },
  { index: 26, type: 'PROPERTY', name: 'tinhTuy.cells.muiNe', group: 'green', price: 3000, rentBase: 260, houseCost: 2000, hotelCost: 2000, icon: 'mui-ne.png' },
  // LEFT (27-35)
  { index: 27, type: 'ISLAND', name: 'tinhTuy.cells.island', icon: 'ra-dao.png' },
  { index: 28, type: 'KHI_VAN', name: 'tinhTuy.cells.khiVan', icon: 'khi-van.png' },
  { index: 29, type: 'PROPERTY', name: 'tinhTuy.cells.daLat', group: 'green', price: 3200, rentBase: 280, houseCost: 2000, hotelCost: 2000, icon: 'da-lat.png' },
  { index: 30, type: 'STATION', name: 'tinhTuy.cells.ninhBinh', price: 2000, rentBase: 250, icon: 'ninh-binh.png' },
  { index: 31, type: 'PROPERTY', name: 'tinhTuy.cells.phuQuoc', group: 'dark_blue', price: 3500, rentBase: 350, houseCost: 2000, hotelCost: 2000, icon: 'phu-quoc.png' },
  { index: 32, type: 'CO_HOI', name: 'tinhTuy.cells.coHoi', icon: 'co-hoi.png' },
  { index: 33, type: 'PROPERTY', name: 'tinhTuy.cells.conDao', group: 'dark_blue', price: 3500, rentBase: 350, houseCost: 2000, hotelCost: 2000, icon: 'con-dao.png' },
  { index: 34, type: 'PROPERTY', name: 'tinhTuy.cells.landmark81', group: 'dark_blue', price: 4000, rentBase: 500, houseCost: 2000, hotelCost: 2000, icon: 'landmark.png' },
  { index: 35, type: 'TAX', name: 'tinhTuy.cells.tax', icon: 'thue.png', taxAmount: 1000 },
];

/** Get cell position on 10x10 CSS grid (36 cells on perimeter) */
export function getCellPosition(index: number): { col: number; row: number } {
  if (index <= 9) return { col: index + 1, row: 1 };          // top row (L→R)
  if (index <= 17) return { col: 10, row: index - 8 };         // right col (T→B)
  if (index <= 27) return { col: 28 - index, row: 10 };        // bottom row (R→L)
  return { col: 1, row: 37 - index };                           // left col (B→T)
}
