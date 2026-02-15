/**
 * TinhTuyPlayerToken — 3D character avatar floating above a cell.
 * Rendered as an overlay grid item (not inside cell flex layout).
 * Character overflows UPWARD beyond the cell — "standing on" the cell.
 */
import React from 'react';
import { Box } from '@mui/material';
import { PLAYER_ACTORS, PLAYER_COLORS } from '../tinh-tuy-types';
import './tinh-tuy-board.css';

interface Props {
  slot: number;
  isAnimating?: boolean;
}

export const TinhTuyPlayerToken: React.FC<Props> = React.memo(({ slot, isAnimating }) => {
  const actorSrc = PLAYER_ACTORS[slot];
  const color = PLAYER_COLORS[slot] || '#999';

  return (
    <Box
      className={isAnimating ? 'tt-token-moving' : undefined}
      sx={{
        position: 'absolute',
        bottom: '35%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '220%',
        height: '440%',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <Box
        component="img"
        src={actorSrc}
        alt={`Player ${slot}`}
        draggable={false}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'bottom',
          filter: `drop-shadow(0 4px 8px ${color}aa) drop-shadow(0 2px 4px rgba(0,0,0,0.35))`,
        }}
      />
    </Box>
  );
});
