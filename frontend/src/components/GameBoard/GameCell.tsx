import React from 'react';
import { Box } from '@mui/material';

interface GameCellProps {
  value: number; // 0 = empty, 1 = player1, 2 = player2
  row: number;
  col: number;
  onClick: (row: number, col: number) => void;
  disabled: boolean;
  boardSize: number;
  cellSize: number;
}

const GameCell: React.FC<GameCellProps> = ({
  value,
  row,
  col,
  onClick,
  disabled,
  cellSize,
}) => {
  const getCellContent = () => {
    if (value === 1) {
      return '✕'; // Player 1 - X symbol
    } else if (value === 2) {
      return '○'; // Player 2 - O symbol
    }
    return '';
  };

  const getCellColor = () => {
    if (value === 1) return '#1a4a5c'; // Dark blue for Player 1
    if (value === 2) return '#8b4513'; // Brown/orange for Player 2
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
        border: '2px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled || value !== 0 ? 'default' : 'pointer',
        backgroundColor: value === 0 ? 'rgba(232, 244, 248, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        background: value === 0 
          ? 'linear-gradient(135deg, rgba(232, 244, 248, 0.8) 0%, rgba(212, 232, 240, 0.4) 100%)'
          : 'rgba(255, 255, 255, 0.9)',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        '&:hover': {
          background: value === 0 && !disabled 
            ? 'linear-gradient(135deg, rgba(179, 217, 230, 0.4) 0%, rgba(212, 232, 240, 0.6) 100%)'
            : undefined,
          boxShadow: value === 0 && !disabled ? '0 2px 8px rgba(143, 196, 214, 0.3)' : undefined,
          transform: value === 0 && !disabled ? 'scale(1.05)' : undefined,
          zIndex: value === 0 && !disabled ? 1 : undefined,
        },
        fontSize: `${cellSize * 0.7}px`,
        fontWeight: 'bold',
        color: getCellColor(),
        textShadow: value !== 0 ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
        '&::before': value !== 0 ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          animation: 'fadeIn 0.2s ease-in',
        } : {},
        '@keyframes fadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
    >
      {getCellContent()}
    </Box>
  );
};

export default GameCell;

