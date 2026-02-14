/**
 * TinhTuyBoard — 36-cell CSS Grid board (10x10, cells on perimeter).
 */
import React from 'react';
import { Box } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, getCellPosition } from '../tinh-tuy-types';
import { TinhTuyCell } from './TinhTuyCell';

export const TinhTuyBoard: React.FC = () => {
  const { state } = useTinhTuy();

  // Build ownership map: cellIndex → ownerSlot
  const ownershipMap = new Map<number, number>();
  for (const player of state.players) {
    for (const cellIdx of player.properties) {
      ownershipMap.set(cellIdx, player.slot);
    }
  }

  // Build player positions: cellIndex → slot[]
  const playerPositions = new Map<number, number[]>();
  for (const player of state.players) {
    if (player.isBankrupt) continue;
    const slots = playerPositions.get(player.position) || [];
    slots.push(player.slot);
    playerPositions.set(player.position, slots);
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gridTemplateRows: 'repeat(10, 1fr)',
        gap: '2px',
        aspectRatio: '1',
        width: '100%',
        maxWidth: 'min(90vw, 600px)',
        mx: 'auto',
      }}
    >
      {BOARD_CELLS.map((cell) => {
        const pos = getCellPosition(cell.index);
        return (
          <TinhTuyCell
            key={cell.index}
            cell={cell}
            col={pos.col}
            row={pos.row}
            ownerSlot={ownershipMap.get(cell.index)}
            playersOnCell={playerPositions.get(cell.index) || []}
            isCurrentCell={
              state.players.find(p => p.slot === state.currentPlayerSlot)?.position === cell.index
            }
          />
        );
      })}
    </Box>
  );
};
