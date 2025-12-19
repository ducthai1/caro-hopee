import { PlayerNumber } from '../types/game.types';

export const checkWin = (
  board: number[][],
  row: number,
  col: number,
  player: PlayerNumber,
  boardSize: number,
  blockTwoEnds: boolean = false
): boolean => {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1],  // diagonal /
  ];

  const opponent = player === 1 ? 2 : 1;
  
  // Determine win condition based on board size
  // 3x3 board needs 3-in-a-row, larger boards need 5-in-a-row
  const winCount = boardSize === 3 ? 3 : 5;
  const maxCheck = winCount - 1; // Maximum cells to check in each direction

  for (const [dx, dy] of directions) {
    let count = 1; // Count the current move
    let posEndRow = row;
    let posEndCol = col;
    let negEndRow = row;
    let negEndCol = col;

    // Check in positive direction
    for (let i = 1; i <= maxCheck; i++) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      if (
        newRow >= 0 &&
        newRow < boardSize &&
        newCol >= 0 &&
        newCol < boardSize &&
        board[newRow][newCol] === player
      ) {
        count++;
        posEndRow = newRow;
        posEndCol = newCol;
      } else {
        break;
      }
    }

    // Check in negative direction
    for (let i = 1; i <= maxCheck; i++) {
      const newRow = row - dx * i;
      const newCol = col - dy * i;
      if (
        newRow >= 0 &&
        newRow < boardSize &&
        newCol >= 0 &&
        newCol < boardSize &&
        board[newRow][newCol] === player
      ) {
        count++;
        negEndRow = newRow;
        negEndCol = newCol;
      } else {
        break;
      }
    }

    // If we have enough consecutive pieces to win
    if (count >= winCount) {
      // If blockTwoEnds rule is enabled, check if both ends are blocked
      if (blockTwoEnds) {
        // Check the cell immediately after the positive end (right/down/right-down/right-up)
        const posEndCheckRow = posEndRow + dx;
        const posEndCheckCol = posEndCol + dy;
        const posEndBlocked = 
          posEndCheckRow < 0 ||
          posEndCheckRow >= boardSize ||
          posEndCheckCol < 0 ||
          posEndCheckCol >= boardSize ||
          board[posEndCheckRow][posEndCheckCol] === opponent;

        // Check the cell immediately before the negative end (left/up/left-up/left-down)
        const negEndCheckRow = negEndRow - dx;
        const negEndCheckCol = negEndCol - dy;
        const negEndBlocked = 
          negEndCheckRow < 0 ||
          negEndCheckRow >= boardSize ||
          negEndCheckCol < 0 ||
          negEndCheckCol >= boardSize ||
          board[negEndCheckRow][negEndCheckCol] === opponent;

        // If both ends are blocked, this is not a win (x o o o o o x pattern)
        if (posEndBlocked && negEndBlocked) {
          continue; // Check next direction
        }
      }

      // If we reach here, it's a valid win
      return true;
    }
  }

  return false;
};

