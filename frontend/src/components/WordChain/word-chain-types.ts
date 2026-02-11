/**
 * Word Chain (Nối Từ) - Frontend Types
 * Mirrors backend types + UI-specific extensions.
 */

// ─── Enums / Literals ─────────────────────────────────────────

export type WordType = '2+' | '3+' | 'all';
export type WordChainGameMode = 'classic' | 'speed';
export type WordChainGameStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';
export type RejectionReason = 'not_in_dictionary' | 'wrong_type' | 'wrong_chain' | 'already_used' | 'timeout';
export type WordChainView = 'lobby' | 'waiting' | 'playing' | 'result';

// ─── Rules ────────────────────────────────────────────────────

export interface WordChainRules {
  wordType: WordType;
  allowProperNouns: boolean;
  allowSlang: boolean;
  turnDuration: number;        // seconds: 15, 30, 60, 90, 120
  lives: number;               // 1-5
  gameMode: WordChainGameMode;
  allowRepeat: boolean;
  showHint: boolean;
}

export const DEFAULT_RULES: WordChainRules = {
  wordType: '2+',
  allowProperNouns: false,
  allowSlang: false,
  turnDuration: 60,
  lives: 3,
  gameMode: 'classic',
  allowRepeat: false,
  showHint: true,
};

// ─── Player ───────────────────────────────────────────────────

export interface WordChainPlayer {
  slot: number;
  userId?: string;
  guestId?: string;
  guestName?: string;
  name: string;                // resolved display name
  lives: number;
  score: number;
  wordsPlayed: number;
  isEliminated: boolean;
  isConnected: boolean;
  isHost?: boolean;
}

// ─── Winner ───────────────────────────────────────────────────

export interface WordChainWinner {
  slot: number;
  userId?: string;
  guestId?: string;
  guestName?: string;
  name?: string;
}

// ─── Word Entry (for word chain history) ──────────────────────

export interface WordEntry {
  word: string;
  playerSlot: number;
  playerName: string;
  timestamp: number;
  accepted: boolean;
  reason?: RejectionReason;
}

// ─── Waiting Room Info (lobby card) ───────────────────────────

export interface WaitingRoomInfo {
  roomId: string;
  roomCode: string;
  maxPlayers: number;
  playerCount: number;
  isFull: boolean;
  canJoin: boolean;
  hostName: string;
  rules: WordChainRules;
  gameStatus: WordChainGameStatus;
  hasPassword: boolean;
  createdAt: string;
}

// ─── Create Room Payload ──────────────────────────────────────

export interface CreateRoomPayload {
  maxPlayers: number;
  rules: Partial<WordChainRules>;
  password?: string;
}

// ─── Context State ────────────────────────────────────────────

export interface WordChainState {
  // View control
  view: WordChainView;

  // Lobby
  waitingRooms: WaitingRoomInfo[];
  isLoadingRooms: boolean;

  // Current room
  roomId: string | null;
  roomCode: string | null;
  rules: WordChainRules | null;
  players: WordChainPlayer[];
  maxPlayers: number;
  isHost: boolean;
  mySlot: number | null;
  hasPassword: boolean;

  // Game state (populated when playing)
  gameStatus: WordChainGameStatus;
  currentWord: string;
  currentPlayerSlot: number;
  wordChain: WordEntry[];
  turnStartedAt: number;      // timestamp ms
  turnDuration: number;        // seconds
  roundNumber: number;

  // Result
  winner: WordChainWinner | 'draw' | null;
  lastWord: string;              // the final word that ended the game
  showResult: boolean;

  // UI
  error: string | null;
  notification: string | null;
}

// ─── Reducer Actions ──────────────────────────────────────────

export type WordChainAction =
  | { type: 'SET_VIEW'; payload: WordChainView }
  | { type: 'SET_ROOMS'; payload: WaitingRoomInfo[] }
  | { type: 'SET_LOADING_ROOMS'; payload: boolean }
  | { type: 'ROOM_CREATED'; payload: { roomId: string; roomCode: string; rules: WordChainRules; players: WordChainPlayer[]; maxPlayers: number; hasPassword?: boolean } }
  | { type: 'ROOM_JOINED'; payload: { roomId: string; roomCode: string; rules: WordChainRules; players: WordChainPlayer[]; maxPlayers: number; gameStatus: WordChainGameStatus; currentWord?: string; currentPlayerSlot?: number; turnStartedAt?: number; turnDuration?: number; roundNumber?: number; wordChain?: string[] } }
  | { type: 'PLAYER_JOINED'; payload: { player: WordChainPlayer; playerCount: number } }
  | { type: 'PLAYER_LEFT'; payload: { slot: number; players: WordChainPlayer[] } }
  | { type: 'GAME_STARTED'; payload: { currentWord: string; currentPlayerSlot: number; turnStartedAt: number; turnDuration: number; roundNumber: number; players: WordChainPlayer[] } }
  | { type: 'WORD_ACCEPTED'; payload: { word: string; playerSlot: number; playerName: string; nextPlayerSlot: number; currentWord: string; turnStartedAt: number; turnDuration: number; roundNumber: number; players: WordChainPlayer[] } }
  | { type: 'WORD_REJECTED'; payload: { word: string; playerSlot: number; playerName: string; reason: RejectionReason; players: WordChainPlayer[] } }
  | { type: 'TURN_TIMEOUT'; payload: { playerSlot: number; playerName: string; nextPlayerSlot: number; turnStartedAt: number; turnDuration: number; players: WordChainPlayer[] } }
  | { type: 'PLAYER_ELIMINATED'; payload: { slot: number; players: WordChainPlayer[] } }
  | { type: 'GAME_FINISHED'; payload: { winner: WordChainWinner | 'draw'; players: WordChainPlayer[]; lastWord?: string } }
  | { type: 'GAME_DRAW'; payload: { players: WordChainPlayer[] } }
  | { type: 'PLAYER_SURRENDERED'; payload: { slot: number; players: WordChainPlayer[] } }
  | { type: 'GAME_RESET'; payload: { players: WordChainPlayer[]; gameStatus: WordChainGameStatus } }
  | { type: 'SET_HOST'; payload: boolean }
  | { type: 'SET_MY_SLOT'; payload: number | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTIFICATION'; payload: string | null }
  | { type: 'LEAVE_ROOM' }
  | { type: 'NEW_TURN'; payload: { currentWord: string; currentPlayerSlot: number; turnStartedAt: number; turnDuration: number; players?: WordChainPlayer[] } }
  | { type: 'DISMISS_RESULT' }
  | { type: 'PLAYER_DISCONNECTED'; payload: { slot: number } }
  | { type: 'PLAYER_RECONNECTED'; payload: { slot: number } }
  | { type: 'ROOM_UPDATED'; payload: { rules: WordChainRules; maxPlayers: number; players: WordChainPlayer[]; hasPassword: boolean } }
  | { type: 'PLAYER_NAME_UPDATED'; payload: { slot: number; name: string } };
