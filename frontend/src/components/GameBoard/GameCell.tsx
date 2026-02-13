import React, { memo, useMemo } from 'react';
import { Box, keyframes } from '@mui/material';

// PERF FIX: Define keyframes ONCE at module level instead of inside every cell's sx.
// Previously embedded in each cell's sx → Emotion reprocessed it for every re-render of every cell.
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

interface GameCellProps {
  value: number; // 0 = empty, 1 = player1, 2 = player2
  row: number;
  col: number;
  onClick: (row: number, col: number) => void;
  // PERF FIX: Removed `disabled` prop — it changed on every move (isMyTurn toggle),
  // causing ALL cells to fail memo check and re-render (400 cells on 20×20 board).
  // The click handler (GameBoard.handleCellClick) already checks turn state via refs.
  boardSize: number;
  cellSize: number;
  isLastMove?: boolean;
  isWinningCell?: boolean;
  player1Marker?: string | null;
  player2Marker?: string | null;
}

const GameCell: React.FC<GameCellProps> = ({
  value,
  row,
  col,
  onClick,
  cellSize,
  isLastMove = false,
  isWinningCell = false,
  player1Marker = null,
  player2Marker = null,
}) => {
  // FIX H5: Memoize cell content to avoid recalculating on every render
  // With 400 cells, this saves 400 function calls per render
  const cellContent = useMemo(() => {
    if (value === 1) {
      const marker = player1Marker || '✕';
      // Safety check: ensure marker is a string
      if (typeof marker !== 'string') return marker;
      // Check if marker is a base64 image
      if (marker.startsWith('data:image')) {
        return (
          <Box
            component="img"
            src={marker}
            alt="Player 1 marker"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              maxWidth: `${cellSize * 0.8}px`,
              maxHeight: `${cellSize * 0.8}px`,
              position: 'relative',
              zIndex: 1,
            }}
          />
        );
      }
      // Text marker - wrap in span with z-index
      return <span style={{ position: 'relative', zIndex: 1 }}>{marker}</span>;
    } else if (value === 2) {
      const marker = player2Marker || '○';
      // Safety check: ensure marker is a string
      if (typeof marker !== 'string') return marker;
      // Check if marker is a base64 image
      if (marker.startsWith('data:image')) {
        return (
          <Box
            component="img"
            src={marker}
            alt="Player 2 marker"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              maxWidth: `${cellSize * 0.8}px`,
              maxHeight: `${cellSize * 0.8}px`,
              position: 'relative',
              zIndex: 1,
            }}
          />
        );
      }
      // Text marker - wrap in span with z-index
      return <span style={{ position: 'relative', zIndex: 1 }}>{marker}</span>;
    }
    return '';
  }, [value, player1Marker, player2Marker, cellSize]);

  // FIX H6: Inline cell color calculation (simple ternary is faster than function call)
  const cellColor = value === 1 ? '#5ba8c7' : value === 2 ? '#88d6b7' : 'transparent';
  const isEmpty = value === 0;

  const handleClick = (): void => {
    // Only forward clicks for empty cells — turn/game-status checks are in GameBoard's handleCellClick via refs
    if (isEmpty) {
      onClick(row, col);
    }
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        width: `${cellSize}px`,
        height: `${cellSize}px`,
        minWidth: `${cellSize}px`,
        minHeight: `${cellSize}px`,
        border: isWinningCell
          ? '3px solid #ff6b6b'
          : isLastMove
          ? '2px solid rgba(126, 200, 227, 0.8)'
          : '1px solid rgba(126, 200, 227, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isEmpty ? 'pointer' : 'default',
        backgroundColor: '#ffffff',
        background: isWinningCell && !isEmpty
          ? `linear-gradient(135deg, rgba(255, 107, 107, 0.25) 0%, rgba(255, 107, 107, 0.35) 100%)`
          : isLastMove && !isEmpty
          ? `linear-gradient(135deg, ${value === 1 ? 'rgba(126, 200, 227, 0.15)' : 'rgba(168, 230, 207, 0.15)'} 0%, ${value === 1 ? 'rgba(126, 200, 227, 0.22)' : 'rgba(168, 230, 207, 0.22)'} 100%)`
          : '#ffffff',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        boxShadow: isWinningCell
          ? '0 0 12px rgba(255, 107, 107, 0.5), inset 0 0 6px rgba(255, 107, 107, 0.2)'
          : isLastMove
          ? '0 0 8px rgba(126, 200, 227, 0.35), inset 0 0 4px rgba(126, 200, 227, 0.15)'
          : 'none',
        '&:hover': isEmpty ? {
          background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.1) 0%, rgba(168, 230, 207, 0.1) 100%)',
          boxShadow: 'inset 0 0 0 2px rgba(126, 200, 227, 0.4)',
          transform: 'scale(1.02)',
          zIndex: 1,
        } : undefined,
        fontSize: `${cellSize * 0.65}px`,
        fontWeight: 800,
        color: cellColor,
        textShadow: !isEmpty ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
        '&::before': !isEmpty ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          animation: `${fadeIn} 0.3s cubic-bezier(0.4, 0, 0.2, 1)`,
          zIndex: 0,
          pointerEvents: 'none',
        } : {},
      }}
    >
      {cellContent}
    </Box>
  );
};

// PERF FIX: Removed `disabled` from memo comparison.
// `disabled` changed on every move (isMyTurn toggle) → ALL cells re-rendered.
// Now cells only re-render when their actual display data changes.
const MemoizedGameCell = memo(GameCell, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.row === nextProps.row &&
    prevProps.col === nextProps.col &&
    prevProps.cellSize === nextProps.cellSize &&
    prevProps.isLastMove === nextProps.isLastMove &&
    prevProps.isWinningCell === nextProps.isWinningCell &&
    prevProps.player1Marker === nextProps.player1Marker &&
    prevProps.player2Marker === nextProps.player2Marker
    // onClick is stable via useCallback so we don't compare it
  );
});
MemoizedGameCell.displayName = 'GameCell';

export default MemoizedGameCell;
