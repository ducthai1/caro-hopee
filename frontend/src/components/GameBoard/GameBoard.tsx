import React, { useRef, useEffect, useState } from 'react';
import { Box, Paper } from '@mui/material';
import GameCell from './GameCell';
import { useGame } from '../../contexts/GameContext';

const GameBoard: React.FC = () => {
  const { game, isMyTurn, makeMove, myPlayerNumber, lastMove } = useGame();
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(50);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let rafId: number | null = null;
    let lastUpdateTime = 0;
    const THROTTLE_MS = 100; // Throttle to max once per 100ms

    const updateCellSize = (): void => {
      if (containerRef.current && game) {
        const containerWidth = containerRef.current.offsetWidth;
        const maxWidth = Math.min(containerWidth * 0.9, 800);
        const calculatedSize = Math.min(maxWidth / game.boardSize, 60);
        const finalSize = Math.max(calculatedSize, 35); // Minimum 35px
        setCellSize(finalSize);
      }
    };

    const throttledUpdate = (): void => {
      const now = Date.now();
      
      // Clear any pending updates
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      // If enough time has passed, update immediately
      if (now - lastUpdateTime >= THROTTLE_MS) {
        lastUpdateTime = now;
        updateCellSize();
      } else {
        // Otherwise, schedule update for later
        const delay = THROTTLE_MS - (now - lastUpdateTime);
        timeoutId = setTimeout(() => {
          lastUpdateTime = Date.now();
          updateCellSize();
          timeoutId = null;
        }, delay);
      }
    };

    // Initial update
    updateCellSize();
    lastUpdateTime = Date.now();

    // Use requestAnimationFrame for smoother updates during zoom
    const handleResize = (): void => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(throttledUpdate);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
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
        alignItems: 'center',
        margin: '0 auto',
        mb: 3,
        mx: 'auto',
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
                isLastMove={lastMove !== null && lastMove.row === rowIndex && lastMove.col === colIndex}
              />
            ))
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default GameBoard;

