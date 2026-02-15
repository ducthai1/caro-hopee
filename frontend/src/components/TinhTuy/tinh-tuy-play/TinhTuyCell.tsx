/**
 * TinhTuyCell — Single cell on the board with house/hotel indicators.
 */
import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { useLanguage } from '../../../i18n';
import { BoardCellClient, GROUP_COLORS, PLAYER_COLORS, PropertyGroup } from '../tinh-tuy-types';
import { TinhTuyPlayerToken } from './TinhTuyPlayerToken';
import './tinh-tuy-board.css';

/** Selection state during travel/festival phases: 'valid' = selectable, 'invalid' = dimmed */
type SelectionState = 'valid' | 'invalid' | null;

interface Props {
  cell: BoardCellClient;
  col: number;
  row: number;
  ownerSlot?: number;
  playersOnCell: number[];
  isCurrentCell?: boolean;
  houseCount?: number;
  hasHotel?: boolean;
  isAnimating?: boolean;
  selectionState?: SelectionState;
  onClick?: () => void;
}

// Fallback icons for cells without images
const CELL_ICONS: Record<string, string> = {
  GO: '🚀',
  KHI_VAN: '🎲',
  CO_HOI: '💎',
  TAX: '💰',
  TRAVEL: '✈️',
  ISLAND: '🏝️',
  GO_TO_ISLAND: '⛵',
  FESTIVAL: '🎉',
  UTILITY: '⚡',
  STATION: '🚂',
};

export const TinhTuyCell: React.FC<Props> = React.memo(({
  cell, col, row, ownerSlot, playersOnCell, isCurrentCell,
  houseCount = 0, hasHotel = false, isAnimating, selectionState, onClick,
}) => {
  const { t } = useLanguage();
  const isCorner = [0, 9, 18, 27].includes(cell.index);
  const groupColor = cell.group ? GROUP_COLORS[cell.group as PropertyGroup] : undefined;

  // 3D CSS class
  const cellClass = isCurrentCell ? 'tt-cell-active' : isCorner ? 'tt-cell-corner' : 'tt-cell-3d';

  return (
    <Tooltip
      title={`${t(cell.name as any)} ${cell.price ? `- ${cell.price} TT` : ''}`}
      arrow
      placement="top"
      enterDelay={300}
    >
      <Box
        className={cellClass}
        onClick={selectionState === 'invalid' ? undefined : onClick}
        sx={{
          gridColumn: col,
          gridRow: row,
          border: selectionState === 'valid' ? '2px solid' : '1px solid',
          borderColor: selectionState === 'valid' ? '#2ecc71' : isCurrentCell ? '#9b59b6' : 'rgba(0,0,0,0.15)',
          boxShadow: selectionState === 'valid' ? '0 0 8px rgba(46,204,113,0.5), inset 0 0 6px rgba(46,204,113,0.15)' : undefined,
          animation: selectionState === 'valid' ? 'tt-travel-pulse 1.5s ease-in-out infinite' : undefined,
          borderRadius: isCorner ? '6px' : '3px',
          p: '2px',
          fontSize: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          bgcolor: ownerSlot ? `${PLAYER_COLORS[ownerSlot]}15` : '#fffdf8',
          cursor: selectionState === 'invalid' ? 'not-allowed' : 'pointer',
          minHeight: 0,
          // Dim invalid cells during selection phase
          opacity: selectionState === 'invalid' ? 0.35 : 1,
          filter: selectionState === 'invalid' ? 'grayscale(0.6)' : undefined,
          transition: 'opacity 0.3s ease, filter 0.3s ease',
          pointerEvents: selectionState === 'invalid' ? 'none' : undefined,
          '&:hover': selectionState === 'valid'
            ? { borderColor: '#27ae60', transform: 'translateZ(6px)', boxShadow: '0 0 14px rgba(46,204,113,0.7), inset 0 0 8px rgba(46,204,113,0.2)' }
            : selectionState === 'invalid' ? {} : { borderColor: '#9b59b6' },
        }}
      >
        {/* Group color strip */}
        {groupColor && (
          <Box
            sx={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 4,
              bgcolor: groupColor,
            }}
          />
        )}

        {/* Owner indicator */}
        {ownerSlot && (
          <Box
            sx={{
              position: 'absolute',
              top: 1, right: 1,
              width: 8, height: 8,
              borderRadius: '50%',
              bgcolor: PLAYER_COLORS[ownerSlot] || '#999',
            }}
          />
        )}

        {/* House/Hotel indicators */}
        {(houseCount > 0 || hasHotel) && (
          <Box sx={{ position: 'absolute', bottom: 1, left: 1, display: 'flex', gap: '1px' }}>
            {hasHotel ? (
              <div className="tt-hotel" />
            ) : (
              Array.from({ length: houseCount }).map((_, i) => (
                <div key={i} className="tt-house" />
              ))
            )}
          </Box>
        )}

        {/* Cell icon / image */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            flex: 1,
            minHeight: 0,
          }}
        >
          {cell.icon ? (
            <Box
              component="img"
              src={`/location/${cell.icon}`}
              alt=""
              sx={{
                width: '95%',
                height: '95%',
                objectFit: 'contain',
              }}
            />
          ) : (
            <Typography
              sx={{
                fontSize: isCorner ? '1rem' : '0.65rem',
                fontWeight: 600,
                lineHeight: 1.1,
                textAlign: 'center',
              }}
            >
              {CELL_ICONS[cell.type] || t(cell.name as any)}
            </Typography>
          )}
        </Box>

        {/* Price */}
        {cell.price && (
          <Typography sx={{ fontSize: '0.5rem', color: 'text.secondary', lineHeight: 1, fontWeight: 600 }}>
            {cell.price}
          </Typography>
        )}

        {/* Player tokens */}
        {playersOnCell.length > 0 && (
          <Box sx={{ display: 'flex', gap: '1px', mt: '1px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {playersOnCell.map(slot => (
              <TinhTuyPlayerToken key={slot} slot={slot} size={10} isAnimating={isAnimating} />
            ))}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
});
