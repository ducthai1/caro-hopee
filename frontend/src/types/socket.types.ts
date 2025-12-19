import { Game, GameMove, PlayerInfo, PlayerNumber, Winner } from './game.types';
import { GameRules, GameScore } from './game.types';

// Client → Server Events
export interface ClientToServerEvents {
  'join-room': (data: { roomId: string; playerId: string; isGuest: boolean }) => void;
  'leave-room': (data: { roomId: string }) => void;
  'make-move': (data: { roomId: string; row: number; col: number }) => void;
  'request-undo': (data: { roomId: string; moveNumber: number }) => void;
  'approve-undo': (data: { roomId: string; moveNumber: number }) => void;
  'reject-undo': (data: { roomId: string }) => void;
  'surrender': (data: { roomId: string }) => void;
  'start-game': (data: { roomId: string }) => void;
  'new-game': (data: { roomId: string }) => void;
  'update-rules': (data: { roomId: string; rules: GameRules }) => void;
}

// Server → Client Events
export interface ServerToClientEvents {
  'room-joined': (data: { roomId: string; players: PlayerInfo[]; gameStatus?: string; currentPlayer?: PlayerNumber }) => void;
  'player-joined': (data: { player: PlayerInfo }) => void;
  'player-left': (data: { playerId?: string; playerNumber?: number; roomId?: string; hostTransferred?: boolean; gameReset?: boolean }) => void;
  'game-deleted': (data: { roomId: string }) => void;
  'move-made': (data: { move: GameMove | null; board: number[][]; currentPlayer: PlayerNumber }) => void;
  'move-validated': (data: { valid: boolean; message?: string }) => void;
  'undo-requested': (data: { moveNumber: number; requestedBy: PlayerNumber }) => void;
  'undo-approved': (data: { moveNumber: number; board: number[][] }) => void;
  'undo-rejected': (data: { moveNumber: number }) => void;
  'game-finished': (data: { winner: Winner; reason: string }) => void;
  'game-started': (data: { currentPlayer: PlayerNumber }) => void;
  'game-error': (data: { message: string }) => void;
  'score-updated': (data: { score: GameScore }) => void;
}

