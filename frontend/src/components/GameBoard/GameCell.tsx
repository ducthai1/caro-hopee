import React, { memo } from 'react';
import { Box } from '@mui/material';

interface GameCellProps {
  value: number; // 0 = empty, 1 = player1, 2 = player2
  row: number;
  col: number;
  onClick: (row: number, col: number) => void;
  disabled: boolean;
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
  disabled,
  cellSize,
  isLastMove = false,
  isWinningCell = false,
  player1Marker = null,
  player2Marker = null,
}) => {
  const getCellContent = () => {
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
  };

  const getCellColor = () => {
    if (value === 1) return '#5ba8c7'; // Sky blue for Player 1
    if (value === 2) return '#88d6b7'; // Mint green for Player 2
    return 'transparent';
  };

  const handleClick = (): void => {
    if (!disabled && value === 0) {
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
        cursor: disabled || value !== 0 ? 'default' : 'pointer',
        backgroundColor: value === 0 ? '#ffffff' : '#ffffff',
        background: isWinningCell && value !== 0
          ? `linear-gradient(135deg, ${value === 1 ? 'rgba(255, 107, 107, 0.25)' : 'rgba(255, 107, 107, 0.25)'} 0%, ${value === 1 ? 'rgba(255, 107, 107, 0.35)' : 'rgba(255, 107, 107, 0.35)'} 100%)`
          : isLastMove && value !== 0
          ? `linear-gradient(135deg, ${value === 1 ? 'rgba(126, 200, 227, 0.15)' : 'rgba(168, 230, 207, 0.15)'} 0%, ${value === 1 ? 'rgba(126, 200, 227, 0.22)' : 'rgba(168, 230, 207, 0.22)'} 100%)`
          : value === 0 
          ? '#ffffff'
          : '#ffffff',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        boxShadow: isWinningCell
          ? '0 0 12px rgba(255, 107, 107, 0.5), inset 0 0 6px rgba(255, 107, 107, 0.2)'
          : isLastMove 
          ? '0 0 8px rgba(126, 200, 227, 0.35), inset 0 0 4px rgba(126, 200, 227, 0.15)'
          : 'none',
        '&:hover': {
          background: value === 0 && !disabled 
            ? 'linear-gradient(135deg, rgba(126, 200, 227, 0.1) 0%, rgba(168, 230, 207, 0.1) 100%)'
            : undefined,
          boxShadow: value === 0 && !disabled ? 'inset 0 0 0 2px rgba(126, 200, 227, 0.4)' : undefined,
          transform: value === 0 && !disabled ? 'scale(1.02)' : undefined,
          zIndex: value === 0 && !disabled ? 1 : undefined,
        },
        fontSize: `${cellSize * 0.65}px`,
        fontWeight: 800,
        color: getCellColor(),
        textShadow: value !== 0 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
        '&::before': value !== 0 ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          animation: 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 0, // Behind the marker content
          pointerEvents: 'none',
        } : {},
        '@keyframes fadeIn': {
          from: { 
            opacity: 0,
            transform: 'scale(0.8)',
          },
          to: { 
            opacity: 1,
            transform: 'scale(1)',
          },
        },
      }}
    >
      {getCellContent()}
    </Box>
  );
};

// Custom comparison to prevent unnecessary re-renders (fixes Issue #6)
// Only re-render when props that affect display actually change
const MemoizedGameCell = memo(GameCell, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.row === nextProps.row &&
    prevProps.col === nextProps.col &&
    prevProps.disabled === nextProps.disabled &&
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

