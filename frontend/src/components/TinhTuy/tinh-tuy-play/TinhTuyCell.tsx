/**
 * TinhTuyCell — Single cell on the board with house/hotel indicators.
 */
import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { useLanguage } from '../../../i18n';
import { BoardCellClient, GROUP_COLORS, PLAYER_COLORS, PropertyGroup } from '../tinh-tuy-types';
import { TinhTuyPlayerToken } from './TinhTuyPlayerToken';
import './tinh-tuy-board.css';

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
  houseCount = 0, hasHotel = false, isAnimating, onClick,
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
        onClick={onClick}
        sx={{
          gridColumn: col,
          gridRow: row,
          border: '1px solid',
          borderColor: isCurrentCell ? '#9b59b6' : 'rgba(0,0,0,0.15)',
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
          cursor: 'pointer',
          minHeight: 0,
          '&:hover': { borderColor: '#9b59b6' },
        }}
      >
        {/* Group color strip */}
        {groupColor && (
          <Box
            sx={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 3,
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
              width: 6, height: 6,
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
                width: isCorner ? '90%' : '88%',
                maxHeight: isCorner ? 48 : 40,
                objectFit: 'contain',
              }}
            />
          ) : (
            <Typography
              sx={{
                fontSize: isCorner ? '0.7rem' : '0.5rem',
                fontWeight: 600,
                lineHeight: 1.1,
                textAlign: 'center',
              }}
            >
              {CELL_ICONS[cell.type] || t(cell.name as any)}
            </Typography>
          )}
        </Box>

        {/* Price (small) */}
        {cell.price && (
          <Typography sx={{ fontSize: '0.4rem', color: 'text.secondary', lineHeight: 1 }}>
            {cell.price}
          </Typography>
        )}

        {/* Player tokens */}
        {playersOnCell.length > 0 && (
          <Box sx={{ display: 'flex', gap: '1px', mt: '1px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {playersOnCell.map(slot => (
              <TinhTuyPlayerToken key={slot} slot={slot} size={8} isAnimating={isAnimating} />
            ))}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
});
