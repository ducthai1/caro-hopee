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

  // Check each direction to see if this move would block both ends of opponent's open 4
  for (const [dx, dy] of directions) {
    // Check if there's a sequence of 4 consecutive opponent pieces in this direction
    // that has both ends open, and this move would block both ends
    
    // Scan for sequences of 4 opponent pieces
    for (let startRow = 0; startRow < game.boardSize; startRow++) {
      for (let startCol = 0; startCol < game.boardSize; startCol++) {
        // Check if there's a sequence of 4 opponent pieces starting here
        let sequenceCount = 0;
        let end1Row = startRow - dx;
        let end1Col = startCol - dy;
        let end2Row = startRow + dx * 4;
        let end2Col = startCol + dy * 4;
        
        // Count consecutive opponent pieces
        for (let i = 0; i < 4; i++) {
          const checkRow = startRow + dx * i;
          const checkCol = startCol + dy * i;
          if (
            checkRow >= 0 &&
            checkRow < game.boardSize &&
            checkCol >= 0 &&
            checkCol < game.boardSize &&
            game.board[checkRow][checkCol] === opponent
          ) {
            sequenceCount++;
          } else {
            break;
          }
        }
        
        // If we have exactly 4 consecutive opponent pieces
        if (sequenceCount === 4) {
          // Check if both ends are open (empty cells)
          let end1Open = false;
          let end2Open = false;
          
          // Check end 1 (negative direction)
          if (
            end1Row >= 0 &&
            end1Row < game.boardSize &&
            end1Col >= 0 &&
            end1Col < game.boardSize &&
            game.board[end1Row][end1Col] === 0
          ) {
            end1Open = true;
          }
          
          // Check end 2 (positive direction)
          if (
            end2Row >= 0 &&
            end2Row < game.boardSize &&
            end2Col >= 0 &&
            end2Col < game.boardSize &&
            game.board[end2Row][end2Col] === 0
          ) {
            end2Open = true;
          }
          
          // If both ends are open, check if this move would block both ends
          if (end1Open && end2Open) {
            // Check if the placed piece is at one of the ends
            const isAtEnd1 = (row === end1Row && col === end1Col);
            const isAtEnd2 = (row === end2Row && col === end2Col);
            
            if (isAtEnd1 || isAtEnd2) {
              // Check if the other end is already blocked by player's piece
              const otherEndRow = isAtEnd1 ? end2Row : end1Row;
              const otherEndCol = isAtEnd1 ? end2Col : end1Col;
              
              // Check if other end is blocked (by player's piece or boundary)
              const otherEndBlocked = 
                otherEndRow < 0 ||
                otherEndRow >= game.boardSize ||
                otherEndCol < 0 ||
                otherEndCol >= game.boardSize ||
                game.board[otherEndRow][otherEndCol] === player;
              
              if (otherEndBlocked) {
                return {
                  valid: false,
                  message: 'This move would block both ends of opponent\'s open 4 (block two ends rule)',
                };
              }
            }
          }
        }
      }
    }
  }

  return { valid: true };
};

