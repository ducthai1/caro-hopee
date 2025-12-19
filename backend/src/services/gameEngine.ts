import Game, { IGame } from '../models/Game';
import GameMove from '../models/GameMove';
import { checkWin } from './winChecker';
import { validateMove } from './ruleEngine';
import { PlayerNumber } from '../types/game.types';

export const initializeBoard = (boardSize: number): number[][] => {
  return Array(boardSize)
    .fill(null)
    .map(() => Array(boardSize).fill(0));
};

export const generateRoomCode = async (): Promise<string> => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomCode: string;
  let isUnique = false;

  while (!isUnique) {
    roomCode = '';
    for (let i = 0; i < 6; i++) {
      roomCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    const existingGame = await Game.findOne({ roomCode });
    if (!existingGame) {
      isUnique = true;
    }
  }

  return roomCode!;
};

export const makeMove = async (
  game: IGame,
  row: number,
  col: number,
  player: PlayerNumber
): Promise<{ success: boolean; message?: string; game?: IGame }> => {
  // Validate move
  const validation = validateMove(game, row, col, player);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  // Make the move
  game.board[row][col] = player;
  game.currentPlayer = player === 1 ? 2 : 1;

  // Save move to history
  const moveCount = await GameMove.countDocuments({ gameId: game._id, isUndone: false });
  const moveNumber = moveCount + 1;
  const move = new GameMove({
    gameId: game._id,
    player,
    row,
    col,
    moveNumber,
    timestamp: new Date(),
    isUndone: false,
  });
  await move.save();

  // Check for win (with block two ends rule if enabled)
  const isWin = checkWin(game.board, row, col, player, game.boardSize, game.rules.blockTwoEnds);
  if (isWin) {
    game.gameStatus = 'finished';
    game.winner = player;
    game.finishedAt = new Date();
    
    // Update scores
    if (player === 1) {
      game.score.player1++;
    } else {
      game.score.player2++;
    }
  }

  // Check for draw (board full)
  const isBoardFull = game.board.every(row => row.every(cell => cell !== 0));
  if (isBoardFull && !isWin) {
    game.gameStatus = 'finished';
    game.winner = 'draw';
    game.finishedAt = new Date();
  }

  await game.save();

  return { success: true, game };
};

export const undoMove = async (
  game: IGame,
  moveNumber: number
): Promise<{ success: boolean; message?: string; game?: IGame }> => {
  if (!game.rules.allowUndo) {
    return { success: false, message: 'Undo is not allowed in this game' };
  }

  // Find the move
  const move = await GameMove.findOne({
    gameId: game._id,
    moveNumber,
    isUndone: false,
  });

  if (!move) {
    return { success: false, message: 'Move not found' };
  }

  // Check undo count
  const undoneMoves = await GameMove.countDocuments({
    gameId: game._id,
    isUndone: true,
  });

  if (undoneMoves >= game.rules.maxUndoPerGame) {
    return { success: false, message: 'Maximum undo limit reached' };
  }

  // Undo the move
  game.board[move.row][move.col] = 0;
  move.isUndone = true;
  await move.save();

  // Revert current player
  game.currentPlayer = move.player;
  game.gameStatus = 'playing';

  await game.save();

  return { success: true, game };
};
