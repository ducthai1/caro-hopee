/**
 * TinhTuyBoard — 36-cell CSS Grid board with 3D perspective.
 * Board center is decorative only (game title). Interactive elements live outside.
 *
 * Performance: all derived maps are useMemo'd so they don't rebuild during
 * token animation ticks (~280ms).  Cell onClick callbacks are useCallback'd
 * so React.memo on TinhTuyCell actually skips re-render.
 */
import React, { useState, useMemo, useCallback } from 'react';
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

  // ─── Stable serialisation keys for memoization ──────────────
  // JSON-stable key that changes only when properties/houses/hotels actually change
  const propertyKey = useMemo(() =>
    state.players.map(p =>
      `${p.slot}:${p.isBankrupt}:${p.properties.join(',')}:${JSON.stringify(p.houses)}:${JSON.stringify(p.hotels)}:${p.doubleRentTurns}:${p.character}`
    ).join('|'),
    [state.players],
  );

  // ─── Ownership map (cellIndex → ownerSlot) ─────────────────
  const ownershipMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const player of state.players) {
      for (const cellIdx of player.properties) {
        m.set(cellIdx, player.slot);
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyKey]);

  // ─── Player display positions (changes during animation) ───
  const playerDisplayPos = useMemo(() => {
    const m = new Map<number, number>();
    for (const player of state.players) {
      if (player.isBankrupt) continue;
      let displayPos = player.position;
      if (state.animatingToken && state.animatingToken.slot === player.slot) {
        displayPos = state.animatingToken.path[state.animatingToken.currentStep];
      }
      m.set(player.slot, displayPos);
    }
    return m;
  }, [state.players, state.animatingToken]);

  // ─── Players grouped per cell (for stacking offsets) ────────
  const playersPerCell = useMemo(() => {
    const m = new Map<number, number[]>();
    playerDisplayPos.forEach((cellIdx, slot) => {
      const arr = m.get(cellIdx) || [];
      arr.push(slot);
      m.set(cellIdx, arr);
    });
    return m;
  }, [playerDisplayPos]);

  // Festival cell
  const festivalCell = state.festival?.cellIndex ?? -1;
  const festivalMult = state.festival?.multiplier ?? 1;

  // ─── Houses/hotels map ──────────────────────────────────────
  const housesMap = useMemo(() => {
    const m = new Map<number, { houses: number; hotel: boolean }>();
    for (const player of state.players) {
      for (const cellIdx of player.properties) {
        const houses = (player.houses || {})[String(cellIdx)] || 0;
        const hotel = !!(player.hotels || {})[String(cellIdx)];
        if (houses > 0 || hotel) {
          m.set(cellIdx, { houses, hotel });
        }
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyKey]);

  // ─── Monopoly set ───────────────────────────────────────────
  const monopolyCells = useMemo(() => {
    const s = new Set<number>();
    for (const player of state.players) {
      if (player.isBankrupt) continue;
      for (const [, cells] of Object.entries(PROPERTY_GROUPS)) {
        if (cells.every(i => player.properties.includes(i))) {
          cells.forEach(i => s.add(i));
        }
      }
    }
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyKey]);

  // ─── Current rent map (mirrors backend calculateRent) ──────
  const frozenKey = JSON.stringify(state.frozenProperties || []);
  const currentRentMap = useMemo(() => {
    const m = new Map<number, number>();
    const currentRound = state.round || 1;
    const completedRounds = Math.max(currentRound - 1, 0);
    for (const player of state.players) {
      if (player.isBankrupt) continue;
      for (const cellIdx of player.properties) {
        const cell = BOARD_CELLS[cellIdx];
        if (!cell) continue;
        let rent = 0;
        if (cell.type === 'STATION') {
          const stationsOwned = player.properties.filter(i => BOARD_CELLS[i]?.type === 'STATION').length;
          rent = Math.floor(stationsOwned * 250 * (1 + 0.20 * completedRounds));
        } else if (cell.type === 'UTILITY') {
          rent = Math.floor((cell.price || 1500) * (1 + 0.05 * completedRounds));
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
        // Monopoly bonus: +15% when owner owns full color group
        if (cell.group) {
          const groupCells = PROPERTY_GROUPS[cell.group as PropertyGroup];
          if (groupCells?.every(i => player.properties.includes(i))) {
            rent = Math.floor(rent * 1.15);
          }
        }
        // Festival multiplier
        if (festivalCell === cellIdx) {
          rent = Math.floor(rent * festivalMult);
        }
        // Double rent buff
        if (player.doubleRentTurns > 0) {
          rent = rent * 2;
        }
        // Late-game rent escalation: +5%/round after round 60
        if (currentRound > 60) {
          rent = Math.floor(rent * (1 + 0.05 * (currentRound - 60)));
        }
        // Character ability: Kungfu +15% rent collected
        if (state.settings?.abilitiesEnabled && player.character === 'kungfu') {
          rent = Math.floor(rent * 1.15);
        }
        // Character ability: Ca Noc +300 flat bonus on buildings
        if (state.settings?.abilitiesEnabled && player.character === 'canoc') {
          const cellKey = String(cellIdx);
          if (((player.houses || {})[cellKey] || 0) > 0 || !!(player.hotels || {})[cellKey]) {
            rent += 300;
          }
        }
        // Frozen properties have 0 rent
        if (state.frozenProperties?.some(fp => fp.cellIndex === cellIdx)) {
          rent = 0;
        }
        m.set(cellIdx, rent);
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyKey, state.round, festivalCell, festivalMult, state.settings?.abilitiesEnabled, frozenKey]);

  // Current player position (for highlight)
  const currentPlayerPos = state.players.find(p => p.slot === state.currentPlayerSlot)?.position ?? -1;

  // ─── Stable cell click handler (avoids 36 new arrows per render) ──
  const handleCellClick = useCallback((cellIndex: number) => {
    setSelectedCell(cellIndex);
  }, []);

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
            maxWidth: 'min(88vw, 88vh, 1200px)',
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
                isCurrentCell={currentPlayerPos === cell.index}
                houseCount={building?.houses || 0}
                hasHotel={building?.hotel || false}
                hasFestival={festivalCell === cell.index}
                isFrozen={state.frozenProperties?.some(fp => fp.cellIndex === cell.index) || false}
                hasMonopoly={monopolyCells.has(cell.index)}
                currentRent={currentRentMap.get(cell.index)}
                selectionState={selectionState}
                onClick={
                  isValidFestival ? () => applyFestival(cell.index)
                  : isValidTravel ? () => travelTo(cell.index)
                  : isValidDestination ? () => chooseDestination(cell.index)
                  : () => handleCellClick(cell.index)
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
            const isSwapping = !!(state.pendingSwapAnim &&
              (slot === state.pendingSwapAnim.slot || slot === state.pendingSwapAnim.targetSlot));
            const offsets = getTokenOffset(indexInGroup, cellGroup.length);
            return (
              <Box
                key={`token-${slot}`}
                className={isSwapping ? 'tt-swap-pulse' : undefined}
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
