/**
 * Go (Cờ Vây) — Frontend Types
 * Mirrors backend types + UI-specific extensions.
 */

// ─── View & Status ───────────────────────────────────────────
export type GoView = 'lobby' | 'waiting' | 'playing' | 'scoring' | 'result';
export type GoGameStatus = 'waiting' | 'playing' | 'scoring' | 'finished' | 'abandoned';
export type GoBoardSize = 9 | 13 | 19;
export type GoColor = 'black' | 'white';
export type GoWinReason = 'score' | 'resign' | 'timeout';

// ─── Settings / Rules ────────────────────────────────────────
export interface GoRules {
  boardSize: GoBoardSize;
  komi: number;
  handicap: number;
  mainTime: number;      // seconds, 0 = no timer
  byoyomiPeriods: number;
  byoyomiTime: number;
}

export const DEFAULT_RULES: GoRules = {
  boardSize: 9,
  komi: 6.5,
  handicap: 0,
  mainTime: 300,         // 5 min
  byoyomiPeriods: 3,
  byoyomiTime: 30,
};

// ─── Player ──────────────────────────────────────────────────
export interface GoPlayer {
  slot: 1 | 2;
  userId?: string;
  guestId?: string;
  guestName?: string;
  username?: string;      // resolved display name
  color: GoColor;
  captures: number;
  mainTimeLeft: number;
  byoyomiPeriodsLeft: number;
  passed: boolean;
  scoringAgreed: boolean;
  isConnected: boolean;
}

// ─── Move ────────────────────────────────────────────────────
export interface GoMove {
  row: number;
  col: number;
  color: GoColor;
  captures: { row: number; col: number }[];
  isPass: boolean;
  moveNumber: number;
  timestamp: number;
}

// ─── Score ───────────────────────────────────────────────────
export interface GoScore {
  black: { territory: number; stones: number; captures: number; total: number };
  white: { territory: number; stones: number; captures: number; komi: number; total: number };
}

// ─── Winner ──────────────────────────────────────────────────
export interface GoWinner {
  slot: number;
  color: GoColor;
  userId?: string;
  guestId?: string;
  guestName?: string;
  username?: string;
}

// ─── Territory ───────────────────────────────────────────────
export interface TerritoryMap {
  black: string[];    // "row-col" keys
  white: string[];
  neutral: string[];
}

// ─── Waiting Room ────────────────────────────────────────────
export interface GoWaitingRoom {
  roomId: string;
  roomCode: string;
  hostName: string;
  settings: GoRules;
  playerCount: number;
  hasPassword: boolean;
}

// ─── Chat & Reactions (reuse pattern) ────────────────────────
export interface GoChatMessage {
  id: string;
  slot: number;
  username: string;
  message: string;
  timestamp: number;
}

export interface GoReaction {
  id: string;
  slot: number;
  emoji: string;
  timestamp: number;
}

// ─── Undo Request ────────────────────────────────────────────
export interface GoUndoRequest {
  fromSlot: number;
  moveNumber: number;
}

// ─── Reducer State ───────────────────────────────────────────
export interface GoState {
  view: GoView;

  // Lobby
  waitingRooms: GoWaitingRoom[];
  isLoadingRooms: boolean;

  // Room
  roomId: string | null;
  roomCode: string | null;
  rules: GoRules | null;
  players: GoPlayer[];
  isHost: boolean;
  mySlot: number | null;
  hasPassword: boolean;
  gameStatus: GoGameStatus;

  // Game board
  board: number[][];          // 2D array of GoCell (0/1/2)
  currentColor: GoColor;
  moveHistory: GoMove[];
  lastMove: GoMove | null;
  moveCount: number;

  // Timer
  timerEnabled: boolean;

  // Scoring
  phase: 'play' | 'scoring';
  deadStones: string[];
  territory: TerritoryMap;
  score: GoScore | null;

  // Result
  winner: GoWinner | null;
  winReason: GoWinReason | null;
  finalScore: GoScore | null;
  showResult: boolean;

  // Undo
  pendingUndo: GoUndoRequest | null;

  // Chat/Reactions
  chatMessages: GoChatMessage[];
  reactions: GoReaction[];

  // Error/Notification
  error: string | null;
  notification: string | null;
}

// ─── Reducer Actions ─────────────────────────────────────────
export type GoAction =
  | { type: 'SET_VIEW'; payload: GoView }
  | { type: 'SET_ROOMS'; payload: GoWaitingRoom[] }
  | { type: 'SET_LOADING_ROOMS'; payload: boolean }
  | { type: 'ROOM_CREATED'; payload: { roomId: string; roomCode: string; rules: GoRules; players: GoPlayer[]; hasPassword: boolean } }
  | { type: 'ROOM_JOINED'; payload: { roomId: string; roomCode: string; rules: GoRules; players: GoPlayer[]; gameStatus: GoGameStatus; isHost: boolean; mySlot: number; board?: number[][]; currentColor?: GoColor; moveHistory?: GoMove[]; phase?: 'play' | 'scoring'; deadStones?: string[]; territory?: TerritoryMap; score?: GoScore; moveCount?: number } }
  | { type: 'PLAYER_JOINED'; payload: { players: GoPlayer[] } }
  | { type: 'PLAYER_LEFT'; payload: { players: GoPlayer[]; newHostId?: string } }
  | { type: 'GAME_STARTED'; payload: { board: number[][]; currentColor: GoColor; players: GoPlayer[] } }
  | { type: 'MOVE_MADE'; payload: { board: number[][]; move: GoMove; currentColor: GoColor; players: GoPlayer[]; koPoint: { row: number; col: number } | null; moveCount: number } }
  | { type: 'PASS_MADE'; payload: { color: GoColor; currentColor: GoColor; consecutivePasses: number; players: GoPlayer[] } }
  | { type: 'SCORING_STARTED'; payload: { deadStones: string[]; territory: TerritoryMap; score: GoScore } }
  | { type: 'DEAD_TOGGLED'; payload: { deadStones: string[]; territory: TerritoryMap; score: GoScore } }
  | { type: 'SCORING_AGREED'; payload: { slot: number; players: GoPlayer[] } }
  | { type: 'RESUME_PLAY'; payload: { players: GoPlayer[] } }
  | { type: 'GAME_FINISHED'; payload: { winner: GoWinner; winReason: GoWinReason; finalScore: GoScore | null; players: GoPlayer[] } }
  | { type: 'TIMER_UPDATE'; payload: { players: GoPlayer[] } }
  | { type: 'UNDO_REQUESTED'; payload: GoUndoRequest }
  | { type: 'UNDO_RESOLVED'; payload: { approved: boolean; board?: number[][]; currentColor?: GoColor; players?: GoPlayer[]; moveHistory?: GoMove[]; moveCount?: number } }
  | { type: 'GAME_RESET'; payload: { board: number[][]; currentColor: GoColor; players: GoPlayer[] } }
  | { type: 'PLAYER_RECONNECTED'; payload: { slot: number; players: GoPlayer[] } }
  | { type: 'PLAYER_DISCONNECTED'; payload: { slot: number; players: GoPlayer[] } }
  | { type: 'SETTINGS_UPDATED'; payload: { rules: GoRules } }
  | { type: 'ADD_CHAT'; payload: GoChatMessage }
  | { type: 'ADD_REACTION'; payload: GoReaction }
  | { type: 'CLEAR_REACTIONS'; payload: string[] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTIFICATION'; payload: string | null }
  | { type: 'LEAVE_ROOM' }
  | { type: 'DISMISS_RESULT' };
