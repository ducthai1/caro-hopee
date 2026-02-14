/**
 * TinhTuyBoard — 36-cell CSS Grid board with 3D perspective.
 * Dice, player HUD, and turn timer live inside the board center.
 */
import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, getCellPosition, PLAYER_COLORS } from '../tinh-tuy-types';
import { TinhTuyCell } from './TinhTuyCell';
import { TinhTuyPropertyDetail } from './TinhTuyPropertyDetail';
import { TinhTuyDice3D } from './TinhTuyDice3D';
import { TinhTuyTurnTimer } from './TinhTuyTurnTimer';
import './tinh-tuy-board.css';

const EMPTY_SLOTS: number[] = [];

export const TinhTuyBoard: React.FC = () => {
  const { state } = useTinhTuy();
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

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
            maxWidth: 'min(95vw, 95vh, 720px)',
            mx: 'auto',
          }}
        >
          {BOARD_CELLS.map((cell) => {
            const pos = getCellPosition(cell.index);
            const building = housesMap.get(cell.index);
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
                onClick={() => setSelectedCell(cell.index)}
              />
            );
          })}

          {/* Board center — dice, player HUD, turn timer */}
          <Box className="tt-board-center">
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: '100%', px: 1 }}>
              {/* Compact player HUD */}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center', mb: 0.5 }}>
                {state.players.map((player) => {
                  const isCurrent = state.currentPlayerSlot === player.slot;
                  const isMe = state.mySlot === player.slot;
                  return (
                    <Box
                      key={player.slot}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        px: 0.8,
                        py: '2px',
                        borderRadius: '10px',
                        bgcolor: isCurrent ? 'rgba(155,89,182,0.12)' : 'rgba(0,0,0,0.04)',
                        border: isMe ? '1.5px solid rgba(155,89,182,0.4)' : '1px solid transparent',
                        opacity: player.isBankrupt ? 0.4 : 1,
                        fontSize: '0.6rem',
                      }}
                    >
                      {/* Color dot */}
                      <Box sx={{
                        width: 7, height: 7, borderRadius: '50%',
                        bgcolor: PLAYER_COLORS[player.slot] || '#999',
                        flexShrink: 0,
                        boxShadow: isCurrent ? `0 0 4px ${PLAYER_COLORS[player.slot]}` : 'none',
                      }} />
                      <Typography sx={{
                        fontSize: '0.55rem', fontWeight: 600, lineHeight: 1,
                        maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        textDecoration: player.isBankrupt ? 'line-through' : 'none',
                      }}>
                        {player.displayName}
                      </Typography>
                      <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: '#9b59b6', lineHeight: 1 }}>
                        {player.points >= 1000 ? `${(player.points / 1000).toFixed(1)}k` : player.points}
                      </Typography>
                      {player.properties.length > 0 && (
                        <Typography sx={{ fontSize: '0.45rem', color: '#27ae60', lineHeight: 1 }}>
                          {player.properties.length}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {/* Turn timer */}
              <Box sx={{ width: '80%', maxWidth: 200 }}>
                <TinhTuyTurnTimer />
              </Box>

              {/* Dice */}
              <TinhTuyDice3D />
            </Box>
          </Box>
        </Box>
      </div>

      <TinhTuyPropertyDetail cellIndex={selectedCell} onClose={() => setSelectedCell(null)} />
    </>
  );
};
