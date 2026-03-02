/**
 * Go (Cờ Vây) Game Engine
 * Core logic: move validation, capture, ko, scoring, territory calculation.
 */
import { GoBoardSize, GoCell, GoColor, IGoGame, IGoScore } from '../types/go.types';
import GoGame from '../models/GoGame';

// ─── Internal Types ─────────────────────────────────────────────

interface StoneGroup {
  stones: Set<string>;    // "row-col" format
  liberties: Set<string>; // "row-col" format
  color: GoCell;
}

export interface MoveResult {
  valid: boolean;
  error?: string;         // error code e.g. GO_KO_VIOLATION
  captured?: { row: number; col: number }[];
  koPoint?: { row: number; col: number } | null;
}

// ─── Board Utilities ────────────────────────────────────────────

/** Create an empty size×size board filled with 0s */
export function createEmptyBoard(size: GoBoardSize): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

/** Clone a 2D board */
function cloneBoard(board: number[][]): number[][] {
  return board.map(row => [...row]);
}

/** Key helper */
function key(row: number, col: number): string {
  return `${row}-${col}`;
}

/** Parse a "row-col" key */
function parseKey(k: string): { row: number; col: number } {
  const [r, c] = k.split('-').map(Number);
  return { row: r, col: c };
}

/** Return valid orthogonal neighbors */
export function getAdjacentPositions(
  row: number,
  col: number,
  size: number
): { row: number; col: number }[] {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const result: { row: number; col: number }[] = [];
  for (const [dr, dc] of dirs) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < size && c >= 0 && c < size) {
      result.push({ row: r, col: c });
    }
  }
  return result;
}

/** BFS flood fill — find entire connected group + its liberties */
export function getGroup(board: number[][], row: number, col: number): StoneGroup {
  const size = board.length;
  const color = board[row][col] as GoCell;
  const stones = new Set<string>();
  const liberties = new Set<string>();
  const visited = new Set<string>();
  const queue: { row: number; col: number }[] = [{ row, col }];

  while (queue.length > 0) {
    const { row: r, col: c } = queue.shift()!;
    const k = key(r, c);
    if (visited.has(k)) continue;
    visited.add(k);

    if (board[r][c] === 0) {
      liberties.add(k);
      continue;
    }

    if (board[r][c] !== color) continue;

    stones.add(k);
    for (const adj of getAdjacentPositions(r, c, size)) {
      if (!visited.has(key(adj.row, adj.col))) {
        queue.push(adj);
      }
    }
  }

  return { stones, liberties, color };
}

/** Hash board state to a string for superko detection */
export function hashBoard(board: number[][]): string {
  return board.map(row => row.join('')).join('|');
}

// ─── Move Validation ────────────────────────────────────────────

/**
 * Validate a move without mutating game state.
 * Checks: bounds, empty cell, correct turn, ko, suicide, superko.
 */
export function validateMove(
  game: IGoGame,
  row: number,
  col: number,
  color: GoColor
): MoveResult {
  const board = game.board;
  const size = board.length;

  // Bounds check
  if (row < 0 || row >= size || col < 0 || col >= size) {
    return { valid: false, error: 'GO_OUT_OF_BOUNDS' };
  }

  // Must be empty
  if (board[row][col] !== 0) {
    return { valid: false, error: 'GO_CELL_OCCUPIED' };
  }

  // Correct turn
  if (game.currentColor !== color) {
    return { valid: false, error: 'GO_NOT_YOUR_TURN' };
  }

  // Ko rule — cannot play on the ko point
  if (
    game.koPoint &&
    game.koPoint.row === row &&
    game.koPoint.col === col
  ) {
    return { valid: false, error: 'GO_KO_VIOLATION' };
  }

  // Simulate the move on a copy
  const simBoard = cloneBoard(board);
  const cellColor: GoCell = color === 'black' ? 1 : 2;
  const oppColor: GoCell = color === 'black' ? 2 : 1;
  simBoard[row][col] = cellColor;

  // Collect opponent captures
  const captured: { row: number; col: number }[] = [];
  const adjPositions = getAdjacentPositions(row, col, size);

  for (const adj of adjPositions) {
    if (simBoard[adj.row][adj.col] === oppColor) {
      const group = getGroup(simBoard, adj.row, adj.col);
      if (group.liberties.size === 0) {
        for (const s of group.stones) {
          const pos = parseKey(s);
          simBoard[pos.row][pos.col] = 0;
          captured.push(pos);
        }
      }
    }
  }

  // Suicide check — after captures, own group must have ≥1 liberty
  const ownGroup = getGroup(simBoard, row, col);
  if (ownGroup.liberties.size === 0) {
    return { valid: false, error: 'GO_SUICIDE' };
  }

  // Superko — resulting board state must not have appeared before
  const newHash = hashBoard(simBoard);
  if (game.boardHistory.includes(newHash)) {
    return { valid: false, error: 'GO_SUPERKO_VIOLATION' };
  }

  // Determine new ko point: only set if exactly 1 stone captured and
  // the capturing group is exactly 1 stone
  let newKoPoint: { row: number; col: number } | null = null;
  if (captured.length === 1 && ownGroup.stones.size === 1) {
    newKoPoint = captured[0];
  }

  return { valid: true, captured, koPoint: newKoPoint };
}

// ─── Move Application ───────────────────────────────────────────

/**
 * Apply a validated move to the game (mutates game object).
 * Caller should call validateMove first and check valid === true.
 */
export function applyMove(
  game: IGoGame,
  row: number,
  col: number,
  color: GoColor
): MoveResult {
  const validation = validateMove(game, row, col, color);
  if (!validation.valid) return validation;

  const cellColor: GoCell = color === 'black' ? 1 : 2;
  const oppColor: GoCell = color === 'black' ? 2 : 1;
  const size = game.board.length;

  // Place stone
  game.board[row][col] = cellColor;

  // Remove captured opponent groups
  const captured: { row: number; col: number }[] = [];
  for (const adj of getAdjacentPositions(row, col, size)) {
    if (game.board[adj.row][adj.col] === oppColor) {
      const group = getGroup(game.board, adj.row, adj.col);
      if (group.liberties.size === 0) {
        for (const s of group.stones) {
          const pos = parseKey(s);
          game.board[pos.row][pos.col] = 0;
          captured.push(pos);
        }
      }
    }
  }

  // Update captures for the moving player
  const player = game.players.find(p => p.color === color);
  if (player) {
    player.captures += captured.length;
  }

  // Ko point update
  const ownGroup = getGroup(game.board, row, col);
  game.koPoint =
    captured.length === 1 && ownGroup.stones.size === 1 ? captured[0] : null;

  // Record board hash for superko
  const boardHash = hashBoard(game.board);
  game.boardHistory.push(boardHash);

  // Move history entry
  game.moveCount += 1;
  game.moveHistory.push({
    row,
    col,
    color,
    captures: captured,
    isPass: false,
    moveNumber: game.moveCount,
    timestamp: new Date(),
  });

  // Reset consecutive passes
  game.consecutivePasses = 0;

  // Reset passer flag for the mover
  if (player) player.passed = false;

  // Toggle turn
  game.currentColor = color === 'black' ? 'white' : 'black';

  return { valid: true, captured, koPoint: game.koPoint };
}

/** Apply a pass move (mutates game). Transitions to scoring after 2 consecutive passes. */
export function applyPass(game: IGoGame, color: GoColor): void {
  const player = game.players.find(p => p.color === color);
  if (player) player.passed = true;

  game.consecutivePasses += 1;
  game.moveCount += 1;

  // Pass move in history (row/col = -1 sentinel for pass)
  game.moveHistory.push({
    row: -1,
    col: -1,
    color,
    captures: [],
    isPass: true,
    moveNumber: game.moveCount,
    timestamp: new Date(),
  });

  // Ko point is cleared on pass
  game.koPoint = null;

  // Toggle turn
  game.currentColor = color === 'black' ? 'white' : 'black';

  // Two consecutive passes → scoring phase
  if (game.consecutivePasses >= 2) {
    game.phase = 'scoring';
    game.gameStatus = 'scoring';
    // Reset scoring agreement
    game.players.forEach(p => { p.scoringAgreed = false; });
  }
}

// ─── Handicap ──────────────────────────────────────────────────

/** Standard Go handicap star point positions by board size */
const HANDICAP_POSITIONS: Record<GoBoardSize, [number, number][]> = {
  9: [
    [2, 2], [6, 6], [2, 6], [6, 2], [4, 4],
  ],
  13: [
    [3, 3], [9, 9], [3, 9], [9, 3], [6, 6],
    [3, 6], [9, 6], [6, 3], [6, 9],
  ],
  19: [
    [3, 3], [15, 15], [3, 15], [15, 3], [9, 9],
    [3, 9], [15, 9], [9, 3], [9, 15],
  ],
};

/**
 * Return the handicap stone positions for a given board size and handicap count.
 * Follows standard Go convention for stone placement order.
 */
export function getHandicapPositions(
  boardSize: GoBoardSize,
  handicap: number
): [number, number][] {
  if (handicap <= 0) return [];
  const positions = HANDICAP_POSITIONS[boardSize];
  return positions.slice(0, Math.min(handicap, positions.length));
}

/** Create board with pre-placed handicap stones. White goes first when handicap > 0. */
export function initBoardWithHandicap(
  boardSize: GoBoardSize,
  handicap: number
): { board: number[][]; currentColor: GoColor } {
  const board = createEmptyBoard(boardSize);
  const positions = getHandicapPositions(boardSize, handicap);

  for (const [r, c] of positions) {
    board[r][c] = 1; // black handicap stones
  }

  const currentColor: GoColor = handicap > 0 ? 'white' : 'black';
  return { board, currentColor };
}

// ─── Scoring & Territory ────────────────────────────────────────

/**
 * BFS flood fill on empty cells to determine territory ownership.
 * Removes dead stones from a board copy before calculating.
 */
export function calculateTerritory(
  board: number[][],
  deadStones: string[]
): { black: string[]; white: string[]; neutral: string[] } {
  const size = board.length;
  const workBoard = cloneBoard(board);

  // Remove dead stones
  for (const k of deadStones) {
    const { row, col } = parseKey(k);
    workBoard[row][col] = 0;
  }

  const visited = new Set<string>();
  const black: string[] = [];
  const white: string[] = [];
  const neutral: string[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const k = key(r, c);
      if (workBoard[r][c] !== 0 || visited.has(k)) continue;

      // BFS to find connected empty region
      const region: string[] = [];
      const queue = [{ row: r, col: c }];
      let touchesBlack = false;
      let touchesWhite = false;

      while (queue.length > 0) {
        const { row: qr, col: qc } = queue.shift()!;
        const qk = key(qr, qc);
        if (visited.has(qk)) continue;
        visited.add(qk);

        if (workBoard[qr][qc] === 0) {
          region.push(qk);
          for (const adj of getAdjacentPositions(qr, qc, size)) {
            if (!visited.has(key(adj.row, adj.col))) {
              queue.push(adj);
            }
          }
        } else if (workBoard[qr][qc] === 1) {
          touchesBlack = true;
        } else if (workBoard[qr][qc] === 2) {
          touchesWhite = true;
        }
      }

      if (touchesBlack && !touchesWhite) {
        black.push(...region);
      } else if (touchesWhite && !touchesBlack) {
        white.push(...region);
      } else {
        neutral.push(...region);
      }
    }
  }

  return { black, white, neutral };
}

/**
 * Chinese scoring: territory + stones on board + komi.
 * Removes dead stones from board copy before counting.
 */
export function calculateScore(
  board: number[][],
  deadStones: string[],
  komi: number
): IGoScore {
  const size = board.length;
  const workBoard = cloneBoard(board);

  // Count dead stones per color before removal
  let blackDeadCount = 0;
  let whiteDeadCount = 0;
  for (const k of deadStones) {
    const { row, col } = parseKey(k);
    if (workBoard[row][col] === 1) blackDeadCount++;
    else if (workBoard[row][col] === 2) whiteDeadCount++;
    workBoard[row][col] = 0;
  }

  // Count live stones on board
  let blackStones = 0;
  let whiteStones = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (workBoard[r][c] === 1) blackStones++;
      else if (workBoard[r][c] === 2) whiteStones++;
    }
  }

  const { black: blackTerr, white: whiteTerr } = calculateTerritory(board, deadStones);

  // Chinese scoring: stones + territory
  const blackTotal = blackStones + blackTerr.length;
  const whiteTotal = whiteStones + whiteTerr.length + komi;

  return {
    black: {
      territory: blackTerr.length,
      stones: blackStones,
      captures: blackDeadCount, // dead white stones
      total: blackTotal,
    },
    white: {
      territory: whiteTerr.length,
      stones: whiteStones,
      captures: whiteDeadCount, // dead black stones
      komi,
      total: whiteTotal,
    },
  };
}

/**
 * Simple heuristic to suggest dead stones.
 * Finds groups with ≤1 liberty that are completely surrounded by the opponent.
 */
export function suggestDeadStones(board: number[][]): string[] {
  const size = board.length;
  const dead: string[] = [];
  const processed = new Set<string>();

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const k = key(r, c);
      if (board[r][c] === 0 || processed.has(k)) continue;

      const color = board[r][c] as GoCell;
      const group = getGroup(board, r, c);

      // Mark all stones in group as processed
      for (const s of group.stones) processed.add(s);

      if (group.liberties.size > 1) continue;

      // Check if all adjacent non-group cells are opponent stones
      const oppColor: GoCell = color === 1 ? 2 : 1;
      let surroundedByOpp = true;

      for (const s of group.stones) {
        const { row: sr, col: sc } = parseKey(s);
        for (const adj of getAdjacentPositions(sr, sc, size)) {
          const ak = key(adj.row, adj.col);
          if (!group.stones.has(ak) && board[adj.row][adj.col] !== oppColor && board[adj.row][adj.col] !== 0) {
            surroundedByOpp = false;
          }
        }
      }

      if (surroundedByOpp) {
        for (const s of group.stones) dead.push(s);
      }
    }
  }

  return dead;
}

/**
 * Toggle an entire connected group as dead/alive.
 * If ANY stone in the group is in deadStones → remove ALL from deadStones.
 * Otherwise → add ALL group stones to deadStones.
 */
export function toggleDeadStoneGroup(
  board: number[][],
  deadStones: string[],
  row: number,
  col: number
): string[] {
  if (board[row][col] === 0) return deadStones;

  const group = getGroup(board, row, col);
  const deadSet = new Set(deadStones);

  // Check if any stone in group is already dead
  const anyDead = [...group.stones].some(s => deadSet.has(s));

  if (anyDead) {
    // Remove entire group from dead set
    for (const s of group.stones) deadSet.delete(s);
  } else {
    // Add entire group to dead set
    for (const s of group.stones) deadSet.add(s);
  }

  return [...deadSet];
}

// ─── Room Code Generator ────────────────────────────────────────

/** Generate unique 6-char room code for Go games */
export async function generateGoRoomCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await GoGame.findOne({ roomCode: code });
    if (!existing) isUnique = true;
  }

  return code!;
}
