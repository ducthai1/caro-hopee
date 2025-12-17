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
        elevation={0}
        sx={{
          p: { xs: 2, md: 4 },
          background: '#ffffff',
          borderRadius: 4,
          boxShadow: '0 12px 40px rgba(126, 200, 227, 0.15)',
          border: '2px solid rgba(126, 200, 227, 0.2)',
          transition: 'all 0.3s ease',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${game.boardSize}, 1fr)`,
            gap: 0,
            border: '3px solid #7ec8e3',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 8px rgba(126, 200, 227, 0.1)',
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

