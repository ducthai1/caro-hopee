/**
 * TinhTuyBoard — 36-cell CSS Grid board with 3D perspective.
 * Board center is decorative only (game title). Interactive elements live outside.
 */
import React, { useState } from 'react';
import { Box } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, PROPERTY_GROUPS, getCellPosition, PropertyGroup } from '../tinh-tuy-types';
import { TinhTuyCell } from './TinhTuyCell';
import { TinhTuyPlayerToken } from './TinhTuyPlayerToken';
import { TinhTuyPropertyDetail } from './TinhTuyPropertyDetail';
import './tinh-tuy-board.css';

// Valid travel destination types (buyable cells)
const TRAVEL_BUYABLE_TYPES = new Set(['PROPERTY', 'STATION', 'UTILITY']);

/** Compute translate offset (%) for stacking multiple tokens on one cell */
function getTokenOffset(index: number, total: number): { x: number; y: number } {
  if (total <= 1) return { x: 0, y: 0 };
  // 2 players: side by side
  if (total === 2) return [{ x: -18, y: 0 }, { x: 18, y: 0 }][index];
  // 3 players: triangle
  if (total === 3) return [{ x: 0, y: -15 }, { x: -18, y: 12 }, { x: 18, y: 12 }][index];
  // 4 players: 2×2 grid
  return [{ x: -15, y: -12 }, { x: 15, y: -12 }, { x: -15, y: 12 }, { x: 15, y: 12 }][index];
}

export const TinhTuyBoard: React.FC = () => {
  const { state, travelTo, applyFestival, chooseDestination } = useTinhTuy();
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const isTravelPhase = state.turnPhase === 'AWAITING_TRAVEL' && isMyTurn;
  const isFestivalPhase = state.turnPhase === 'AWAITING_FESTIVAL' && isMyTurn;
  const isDestinationPhase = state.turnPhase === 'AWAITING_CARD_DESTINATION' && isMyTurn;
  const myPlayer = state.players.find(p => p.slot === state.mySlot);
  const myPos = myPlayer?.position ?? -1;

  // Build ownership map: cellIndex → ownerSlot
  const ownershipMap = new Map<number, number>();
  for (const player of state.players) {
    for (const cellIdx of player.properties) {
      ownershipMap.set(cellIdx, player.slot);
    }
  }

  // Build active player display positions (slot → cellIndex)
  const playerDisplayPos = new Map<number, number>();
  for (const player of state.players) {
    if (player.isBankrupt) continue;
    let displayPos = player.position;
    if (state.animatingToken && state.animatingToken.slot === player.slot) {
      displayPos = state.animatingToken.path[state.animatingToken.currentStep];
    }
    playerDisplayPos.set(player.slot, displayPos);
  }

  // Group players by cell for offset calculation
  const playersPerCell = new Map<number, number[]>();
  playerDisplayPos.forEach((cellIdx, slot) => {
    const arr = playersPerCell.get(cellIdx) || [];
    arr.push(slot);
    playersPerCell.set(cellIdx, arr);
  });

  // Festival: single cell on the board (game-level)
  const festivalCell = state.festival?.cellIndex ?? -1;

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

  // Compute current rent for each owned cell (mirrors backend calculateRent logic)
  const currentRentMap = new Map<number, number>();
  const completedRounds = Math.max((state.round || 1) - 1, 0);
  for (const player of state.players) {
    if (player.isBankrupt) continue;
    for (const cellIdx of player.properties) {
      const cell = BOARD_CELLS[cellIdx];
      if (!cell) continue;
      let rent = 0;
      if (cell.type === 'STATION') {
        const stationsOwned = player.properties.filter(i => BOARD_CELLS[i]?.type === 'STATION').length;
        rent = Math.floor(stationsOwned * 250 * (1 + 0.08 * completedRounds));
      } else if (cell.type === 'UTILITY') {
        rent = Math.floor((cell.price || 1500) * (1 + 0.08 * completedRounds));
      } else if (cell.type === 'PROPERTY' && cell.group) {
        const hasHotel = !!(player.hotels || {})[String(cellIdx)];
        const houses = (player.houses || {})[String(cellIdx)] || 0;
        if (hasHotel && cell.rentHotel) {
          rent = cell.rentHotel;
        } else if (houses > 0 && cell.rentHouse) {
          rent = cell.rentHouse[houses - 1] || 0;
        } else {
          const groupCells = PROPERTY_GROUPS[cell.group as PropertyGroup];
          const ownsFullGroup = groupCells?.every(i => player.properties.includes(i));
          rent = ownsFullGroup ? (cell.rentGroup || (cell.rentBase || 0) * 2) : (cell.rentBase || 0);
        }
      }
      // Festival multiplier (game-level, stacking) — applied before doubleRent to match backend
      if (state.festival && state.festival.cellIndex === cellIdx) {
        rent = Math.floor(rent * state.festival.multiplier);
      }
      // Double rent buff
      if (player.doubleRentTurns > 0) {
        rent = rent * 2;
      }
      // Frozen properties have 0 rent
      if (state.frozenProperties?.some(fp => fp.cellIndex === cellIdx)) {
        rent = 0;
      }
      currentRentMap.set(cellIdx, rent);
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
            overflow: 'visible',
          }}
        >
          {BOARD_CELLS.map((cell) => {
            const pos = getCellPosition(cell.index);
            const building = housesMap.get(cell.index);
            const isBuyableCell = TRAVEL_BUYABLE_TYPES.has(cell.type);
            const isUnowned = isBuyableCell && !ownershipMap.has(cell.index);
            const isOwnCell = isBuyableCell && ownershipMap.get(cell.index) === state.mySlot;
            const isValidTravel = isTravelPhase && cell.index !== myPos && (cell.type === 'GO' || isUnowned || isOwnCell);
            const isValidFestival = isFestivalPhase && isOwnCell;
            const isValidDestination = isDestinationPhase && cell.index !== myPos;
            const isSelectionMode = isTravelPhase || isFestivalPhase || isDestinationPhase;
            // Selection state: valid (bright + clickable), invalid (dimmed), null (normal)
            const selectionState = isSelectionMode
              ? ((isValidTravel || isValidFestival || isValidDestination) ? 'valid' as const : 'invalid' as const)
              : null;
            return (
              <TinhTuyCell
                key={cell.index}
                cell={cell}
                col={pos.col}
                row={pos.row}
                ownerSlot={ownershipMap.get(cell.index)}
                isCurrentCell={
                  state.players.find(p => p.slot === state.currentPlayerSlot)?.position === cell.index
                }
                houseCount={building?.houses || 0}
                hasHotel={building?.hotel || false}
                hasFestival={festivalCell === cell.index}
                isFrozen={state.frozenProperties?.some(fp => fp.cellIndex === cell.index) || false}
                currentRent={currentRentMap.get(cell.index)}
                selectionState={selectionState}
                onClick={() =>
                  isValidFestival ? applyFestival(cell.index)
                  : isValidTravel ? travelTo(cell.index)
                  : isValidDestination ? chooseDestination(cell.index)
                  : setSelectedCell(cell.index)
                }
              />
            );
          })}

          {/* Player actor tokens — overlaid on same grid positions, overflow upward */}
          {Array.from(playerDisplayPos.entries()).map(([slot, cellIdx]) => {
            const cellPos = getCellPosition(cellIdx);
            const cellGroup = playersPerCell.get(cellIdx) || [slot];
            const indexInGroup = cellGroup.indexOf(slot);
            const isAnim = state.animatingToken?.slot === slot;
            const offsets = getTokenOffset(indexInGroup, cellGroup.length);
            return (
              <Box
                key={`token-${slot}`}
                sx={{
                  gridColumn: cellPos.col,
                  gridRow: cellPos.row,
                  pointerEvents: 'none',
                  zIndex: 10 + slot,
                  position: 'relative',
                  overflow: 'visible',
                  /* translateZ(10px) lifts token above 3D cells (which use 2-6px) */
                  transform: `translateZ(10px) translate(${offsets.x}%, ${offsets.y}%)`,
                  transformStyle: 'preserve-3d',
                  transition: isAnim ? 'none' : 'transform 0.15s ease',
                }}
              >
                <TinhTuyPlayerToken slot={slot} character={state.players.find(p => p.slot === slot)?.character} isAnimating={isAnim} />
              </Box>
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
