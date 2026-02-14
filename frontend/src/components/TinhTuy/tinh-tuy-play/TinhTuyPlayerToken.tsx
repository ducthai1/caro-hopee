/**
 * TinhTuyPlayerToken — Colored dot representing a player on the board.
 * Bounces when landing during movement animation.
 */
import React from 'react';
import { Box } from '@mui/material';
import { PLAYER_COLORS } from '../tinh-tuy-types';
import './tinh-tuy-board.css';

interface Props {
  slot: number;
  size?: number;
  isAnimating?: boolean;
}

export const TinhTuyPlayerToken: React.FC<Props> = ({ slot, size = 10, isAnimating }) => {
  return (
    <Box
      className={isAnimating ? 'tt-token-moving' : undefined}
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: PLAYER_COLORS[slot] || '#999',
        border: '1px solid #fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}
    />
  );
};
