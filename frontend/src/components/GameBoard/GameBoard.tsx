import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Box, Paper, useMediaQuery, useTheme } from '@mui/material';
import GameCell from './GameCell';
import { useGame } from '../../contexts/GameContext';
import { useLanguage } from '../../i18n';

const GameBoard: React.FC = () => {
  const { game, isMyTurn, makeMove, lastMove } = useGame();
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(50);
  
  // Memoize winning cells to avoid recalculating on every render
  const winningCellsSet = useMemo(() => {
    if (!game?.winningLine) return new Set<string>();
    // Safety check: ensure winningLine is an array
    if (!Array.isArray(game.winningLine)) return new Set<string>();
    return new Set(
      game.winningLine.map(line => `${line.row}-${line.col}`)
    );
  }, [game?.winningLine]);

  const handleCellClick = useCallback((row: number, col: number): void => {
    // Only allow clicks if it's my turn, game is playing, and cell is empty
    if (!game) return;
    if (isMyTurn && game.gameStatus === 'playing' && game.board[row]?.[col] === 0) {
      makeMove(row, col);
    }
  }, [game, isMyTurn, makeMove]);

  // Fix H2: Added isMounted check to prevent state updates after unmount
  useEffect(() => {
    if (!game) return;

    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let rafId: number | null = null;
    let lastUpdateTime = 0;
    const THROTTLE_MS = 100;

    const updateCellSize = (): void => {
      if (!isMounted) return; // Prevent state update after unmount
      if (containerRef.current && game) {
        const containerWidth = containerRef.current.offsetWidth;
        // CRITICAL FIX FOR MOBILE: On mobile, allow board to be wider than screen for horizontal scroll
        const isMobile = window.innerWidth < 960; // lg breakpoint
        const maxWidth = isMobile 
          ? Math.max(containerWidth, game.boardSize * 40) // Minimum 40px per cell on mobile
          : Math.min(containerWidth * 0.9, 800);
        const calculatedSize = Math.min(maxWidth / game.boardSize, 60);
        const finalSize = Math.max(calculatedSize, 35);
        setCellSize(finalSize);
      }
    };

    const throttledUpdate = (): void => {
      if (!isMounted) return; // Early exit if unmounted
      const now = Date.now();

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      if (now - lastUpdateTime >= THROTTLE_MS) {
        lastUpdateTime = now;
        updateCellSize();
      } else {
        const delay = THROTTLE_MS - (now - lastUpdateTime);
        timeoutId = setTimeout(() => {
          if (!isMounted) return;
          lastUpdateTime = Date.now();
          updateCellSize();
          timeoutId = null;
        }, delay);
      }
    };

    // CRITICAL FIX: Wrap initial call in RAF to prevent state update after unmount
    // This prevents React 18 StrictMode warnings and potential memory leaks
    const initialRafId = requestAnimationFrame(() => {
      if (isMounted) {
        updateCellSize();
        lastUpdateTime = Date.now();
      }
    });

    const handleResize = (): void => {
      if (!isMounted) return;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(throttledUpdate);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
      if (initialRafId) cancelAnimationFrame(initialRafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.boardSize]);

  if (!game) {
    return <div>{t('gameBoard.noGameLoaded')}</div>;
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', md: '800px' }, // Full width on mobile for horizontal scroll
        display: 'flex',
        // CRITICAL FIX: On mobile, use flex-start to allow full scroll access to left side
        // On desktop, use center for aesthetic centering
        justifyContent: { xs: 'flex-start', md: 'center' },
        alignItems: 'center',
        margin: '0 auto',
        mb: 3,
        mx: 'auto',
        // CRITICAL FIX FOR MOBILE: Enable horizontal scrolling on mobile
        overflowX: { xs: 'auto', md: 'visible' },
        overflowY: 'visible',
        // Enable smooth scrolling on mobile
        WebkitOverflowScrolling: 'touch',
        // Prevent vertical scroll interference
        touchAction: { xs: 'pan-x pan-y', md: 'auto' },
        // Custom scrollbar styling for mobile
        '&::-webkit-scrollbar': {
          height: '8px',
          display: { xs: 'block', md: 'none' },
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(126, 200, 227, 0.1)',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(126, 200, 227, 0.3)',
          borderRadius: '4px',
          '&:hover': {
            background: 'rgba(126, 200, 227, 0.5)',
          },
        },
        // Firefox scrollbar
        scrollbarWidth: { xs: 'thin', md: 'none' },
        scrollbarColor: { xs: 'rgba(126, 200, 227, 0.3) rgba(126, 200, 227, 0.1)', md: 'transparent transparent' },
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
          // CRITICAL FIX FOR MOBILE: Prevent Paper from shrinking on mobile
          minWidth: { xs: `${game.boardSize * 40}px`, md: 'auto' }, // Minimum width for mobile scroll
          width: { xs: 'max-content', md: 'auto' }, // Allow content to determine width on mobile
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'grid',
            // CRITICAL FIX FOR MOBILE: Use fixed size on mobile for horizontal scroll, 1fr on desktop
            gridTemplateColumns: isMobile 
              ? `repeat(${game.boardSize}, ${cellSize}px)` 
              : `repeat(${game.boardSize}, 1fr)`,
            gap: 0,
            border: '3px solid #7ec8e3',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 8px rgba(126, 200, 227, 0.1)',
            // CRITICAL FIX FOR MOBILE: Ensure board maintains its size on mobile for horizontal scroll
            width: isMobile ? `${game.boardSize * cellSize}px` : 'auto',
            minWidth: isMobile ? `${game.boardSize * cellSize}px` : 'auto',
          }}
          ref={boardRef}
        >
          {Array.isArray(game.board) && game.board.map((row, rowIndex) =>
            Array.isArray(row) ? row.map((cell, colIndex) => {
              const cellKey = `${rowIndex}-${colIndex}`;
              const isWinningCell = winningCellsSet.has(cellKey);
              const isLastMoveCell = lastMove !== null && lastMove.row === rowIndex && lastMove.col === colIndex;
              return (
                <GameCell
                  key={cellKey}
                  value={cell}
                  row={rowIndex}
                  col={colIndex}
                  onClick={handleCellClick}
                  disabled={!isMyTurn || game.gameStatus !== 'playing'}
                  boardSize={game.boardSize}
                  cellSize={cellSize}
                  isLastMove={isLastMoveCell}
                  isWinningCell={isWinningCell}
                  player1Marker={game.player1Marker}
                  player2Marker={game.player2Marker}
                />
              );
            }) : null
          )}
          {/* Winning line overlay */}
          {game.winningLine && game.winningLine.length >= 2 && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              <line
                x1={(game.winningLine[0].col + 0.5) * cellSize}
                y1={(game.winningLine[0].row + 0.5) * cellSize}
                x2={(game.winningLine[game.winningLine.length - 1].col + 0.5) * cellSize}
                y2={(game.winningLine[game.winningLine.length - 1].row + 0.5) * cellSize}
                stroke="#ff6b6b"
                strokeWidth={4}
                strokeLinecap="round"
                opacity={0.8}
              />
            </svg>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default GameBoard;

