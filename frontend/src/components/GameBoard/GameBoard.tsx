import React, { useRef, useEffect, useState } from 'react';
import { Box, Paper } from '@mui/material';
import GameCell from './GameCell';
import { useGame } from '../../contexts/GameContext';

const GameBoard: React.FC = () => {
  const { game, isMyTurn, makeMove, myPlayerNumber } = useGame();
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(50);

  useEffect(() => {
    const updateCellSize = (): void => {
      if (containerRef.current && game) {
        const containerWidth = containerRef.current.offsetWidth;
        const maxWidth = Math.min(containerWidth * 0.9, 800);
        const calculatedSize = Math.min(maxWidth / game.boardSize, 60);
        const finalSize = Math.max(calculatedSize, 35); // Minimum 35px
        setCellSize(finalSize);
      }
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, [game]);

  if (!game) {
    return <div>No game loaded</div>;
  }

  const handleCellClick = (row: number, col: number): void => {
    // Only allow clicks if it's my turn, game is playing, and cell is empty
    if (isMyTurn && game.gameStatus === 'playing' && game.board[row][col] === 0) {
      console.log('Making move at:', { row, col }, 'myPlayerNumber:', myPlayerNumber, 'currentPlayer:', game.currentPlayer);
      makeMove(row, col);
    } else {
      // Debug log to help diagnose click issues
      console.log('Click blocked:', {
        isMyTurn,
        gameStatus: game.gameStatus,
        cellValue: game.board[row][col],
        currentPlayer: game.currentPlayer,
        myPlayerNumber,
        reason: !isMyTurn ? 'Not my turn' : game.gameStatus !== 'playing' ? `Game status is ${game.gameStatus}` : 'Cell not empty',
      });
    }
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        maxWidth: '800px',
        display: 'flex',
        justifyContent: 'center',
        mb: 3,
      }}
    >
      <Paper
        elevation={4}
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(232, 244, 248, 0.95) 100%)',
          borderRadius: 2,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          border: '2px solid rgba(179, 217, 230, 0.3)',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${game.boardSize}, 1fr)`,
            gap: 0,
            border: '3px solid #333',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          {game.board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <GameCell
                key={`${rowIndex}-${colIndex}`}
                value={cell}
                row={rowIndex}
                col={colIndex}
                onClick={handleCellClick}
                disabled={!isMyTurn || game.gameStatus !== 'playing'}
                boardSize={game.boardSize}
                cellSize={cellSize}
              />
            ))
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default GameBoard;

