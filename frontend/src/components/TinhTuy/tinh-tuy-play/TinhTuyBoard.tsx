/**
 * TinhTuyBoard — 36-cell CSS Grid board with 3D perspective.
 * Board center is decorative only (game title). Interactive elements live outside.
 */
import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, getCellPosition } from '../tinh-tuy-types';
import { TinhTuyCell } from './TinhTuyCell';
import { TinhTuyPropertyDetail } from './TinhTuyPropertyDetail';
import './tinh-tuy-board.css';

const EMPTY_SLOTS: number[] = [];

// Invalid travel destinations
const TRAVEL_INVALID_TYPES = new Set(['GO_TO_ISLAND', 'ISLAND', 'TRAVEL']);

export const TinhTuyBoard: React.FC = () => {
  const { state, travelTo } = useTinhTuy();
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const isTravelPhase = state.turnPhase === 'AWAITING_TRAVEL' && isMyTurn;
  const myPos = state.players.find(p => p.slot === state.mySlot)?.position ?? -1;

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
    let displayPos = player.position;
    if (state.animatingToken && state.animatingToken.slot === player.slot) {
      displayPos = state.animatingToken.path[state.animatingToken.currentStep];
    }
    const slots = playerPositions.get(displayPos) || [];
    slots.push(player.slot);
    playerPositions.set(displayPos, slots);
  }

  // Build houses/hotels map
  const housesMap = new Map<number, { houses: number; hotel: boolean }>();
  for (const player of state.players) {
    for (const cellIdx of player.properties) {
      const houses = (player.houses || {})[String(cellIdx)] || 0;
      const hotel = !!(player.hotels || {})[String(cellIdx)];
      if (houses > 0 || hotel) {
        housesMap.set(cellIdx, { houses, hotel });
      }
    }
  }

  return (
    <>
      <div className="tt-board-perspective">
        <Box
          className="tt-board-grid"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gridTemplateRows: 'repeat(10, 1fr)',
            gap: '2px',
            aspectRatio: '1',
            width: '100%',
            maxWidth: 'min(88vw, 88vh, 780px)',
            mx: 'auto',
          }}
        >
          {BOARD_CELLS.map((cell) => {
            const pos = getCellPosition(cell.index);
            const building = housesMap.get(cell.index);
            const isValidTravel = isTravelPhase && cell.index !== myPos && !TRAVEL_INVALID_TYPES.has(cell.type);
            // Selection state: valid (bright + clickable), invalid (dimmed), null (normal)
            const selectionState = isTravelPhase
              ? (isValidTravel ? 'valid' as const : 'invalid' as const)
              : null;
            return (
              <TinhTuyCell
                key={cell.index}
                cell={cell}
                col={pos.col}
                row={pos.row}
                ownerSlot={ownershipMap.get(cell.index)}
                playersOnCell={playerPositions.get(cell.index) || EMPTY_SLOTS}
                isCurrentCell={
                  state.players.find(p => p.slot === state.currentPlayerSlot)?.position === cell.index
                }
                houseCount={building?.houses || 0}
                hasHotel={building?.hotel || false}
                isAnimating={state.animatingToken?.path[state.animatingToken.currentStep] === cell.index}
                selectionState={selectionState}
                onClick={() => isValidTravel ? travelTo(cell.index) : setSelectedCell(cell.index)}
              />
            );
          })}

          {/* Board center — empty, dice overlay sits on top via absolute positioning */}
          <Box className="tt-board-center" />
        </Box>
      </div>

      <TinhTuyPropertyDetail cellIndex={selectedCell} onClose={() => setSelectedCell(null)} />
    </>
  );
};
