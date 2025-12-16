import { IGame, IGameRules } from '../models/Game';
import { PlayerNumber } from '../types/game.types';

export const validateMove = (
  game: IGame,
  row: number,
  col: number,
  player: PlayerNumber
): { valid: boolean; message?: string } => {
  // Check if it's player's turn
  if (game.currentPlayer !== player) {
    return { valid: false, message: 'Not your turn' };
  }

  // Check if game is in playing status
  if (game.gameStatus !== 'playing') {
    return { valid: false, message: 'Game is not in playing status' };
  }

  // Check bounds
  if (row < 0 || row >= game.boardSize || col < 0 || col >= game.boardSize) {
    return { valid: false, message: 'Move out of bounds' };
  }

  // Check if cell is empty
  if (game.board[row][col] !== 0) {
    return { valid: false, message: 'Cell already occupied' };
  }

  // Check block two ends rule
  if (game.rules.blockTwoEnds) {
    const blockResult = checkBlockTwoEnds(game, row, col, player);
    if (!blockResult.valid) {
      return blockResult;
    }
  }

  return { valid: true };
};

const checkBlockTwoEnds = (
  game: IGame,
  row: number,
  col: number,
  player: PlayerNumber
): { valid: boolean; message?: string } => {
  const opponent = player === 1 ? 2 : 1;
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1],  // diagonal /
  ];

  // Temporarily place the move to check if it creates a forbidden pattern
  const tempBoard = game.board.map(r => [...r]);
  tempBoard[row][col] = player;

  for (const [dx, dy] of directions) {
    // Check if opponent has open 4 at both ends
    let openEnds = 0;

    // Check positive direction
    let count = 0;
    let blocked = false;
    for (let i = 1; i < 5; i++) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      if (
        newRow >= 0 &&
        newRow < game.boardSize &&
        newCol >= 0 &&
        newCol < game.boardSize
      ) {
        if (tempBoard[newRow][newCol] === opponent) {
          count++;
        } else if (tempBoard[newRow][newCol] === 0) {
          // Open end
          if (count === 4) {
            openEnds++;
          }
          break;
        } else {
          blocked = true;
          break;
        }
      } else {
        blocked = true;
        break;
      }
    }

    // Check negative direction
    count = 0;
    blocked = false;
    for (let i = 1; i < 5; i++) {
      const newRow = row - dx * i;
      const newCol = col - dy * i;
      if (
        newRow >= 0 &&
        newRow < game.boardSize &&
        newCol >= 0 &&
        newCol < game.boardSize
      ) {
        if (tempBoard[newRow][newCol] === opponent) {
          count++;
        } else if (tempBoard[newRow][newCol] === 0) {
          // Open end
          if (count === 4) {
            openEnds++;
          }
          break;
        } else {
          blocked = true;
          break;
        }
      } else {
        blocked = true;
        break;
      }
    }

    // If opponent has open 4 at both ends, this move is forbidden
    if (openEnds >= 2) {
      return {
        valid: false,
        message: 'This move would create a forbidden pattern (block two ends rule)',
      };
    }
  }

  return { valid: true };
};

