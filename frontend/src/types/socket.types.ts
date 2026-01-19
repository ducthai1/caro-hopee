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
  'player-left': (data: { 
    playerId?: string; 
    playerNumber?: number; 
    roomId?: string; 
    hostTransferred?: boolean; 
    gameReset?: boolean;
    game?: {
      player1: any;
      player1GuestId: string | null;
      player2: any;
      player2GuestId: string | null;
      gameStatus: string;
      currentPlayer: number;
    };
  }) => void;
  'game-deleted': (data: { roomId: string }) => void;
  'move-made': (data: { move: GameMove | null; board: number[][]; currentPlayer: PlayerNumber }) => void;
  'move-validated': (data: { valid: boolean; message?: string }) => void;
  'undo-requested': (data: { moveNumber: number; requestedBy: PlayerNumber }) => void;
  'undo-approved': (data: { moveNumber: number; board: number[][] }) => void;
  'undo-rejected': (data: { moveNumber: number }) => void;
  'game-finished': (data: { winner: Winner; reason: string }) => void;
  'game-started': (data: { currentPlayer: PlayerNumber }) => void;
  'game-reset': (data: { board: number[][]; currentPlayer: PlayerNumber; gameStatus: string; winner: null; winningLine: null }) => void;
  'game-error': (data: { message: string }) => void;
  'score-updated': (data: { score: GameScore }) => void;
  'game-created': (data: { roomId: string; roomCode: string; boardSize: number; gameStatus: string; player1Username: string | null; createdAt: string }) => void;
  'game-status-updated': (data: { roomId: string; roomCode: string; gameStatus: string; displayStatus: 'waiting' | 'ready' | 'playing'; playerCount: number; isFull: boolean }) => void;
  'marker-updated': (data: { playerNumber: 1 | 2; marker: string }) => void;
}

