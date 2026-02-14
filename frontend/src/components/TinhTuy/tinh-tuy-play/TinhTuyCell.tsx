/**
 * TinhTuyCell — Single cell on the board.
 */
import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { useLanguage } from '../../../i18n';
import { BoardCellClient, GROUP_COLORS, PLAYER_COLORS, PropertyGroup } from '../tinh-tuy-types';
import { TinhTuyPlayerToken } from './TinhTuyPlayerToken';

interface Props {
  cell: BoardCellClient;
  col: number;
  row: number;
  ownerSlot?: number;
  playersOnCell: number[];
  isCurrentCell?: boolean;
}

// Cell type icons
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

export const TinhTuyCell: React.FC<Props> = ({ cell, col, row, ownerSlot, playersOnCell, isCurrentCell }) => {
  const { t } = useLanguage();
  const isProperty = cell.type === 'PROPERTY';
  const isCorner = [0, 9, 18, 27].includes(cell.index);

  // Determine which side for group color strip placement
  const groupColor = cell.group ? GROUP_COLORS[cell.group as PropertyGroup] : undefined;

  return (
    <Tooltip
      title={`${t(cell.name as any)} ${cell.price ? `- ${cell.price} TT` : ''}`}
      arrow
      placement="top"
      enterDelay={300}
    >
      <Box
        sx={{
          gridColumn: col,
          gridRow: row,
          border: '1px solid',
          borderColor: isCurrentCell ? '#9b59b6' : 'rgba(0,0,0,0.12)',
          borderRadius: isCorner ? '6px' : '3px',
          p: '2px',
          fontSize: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          bgcolor: ownerSlot ? `${PLAYER_COLORS[ownerSlot]}15` : 'background.paper',
          boxShadow: isCurrentCell ? '0 0 6px rgba(155, 89, 182, 0.5)' : 'none',
          transition: 'box-shadow 0.2s ease',
          cursor: 'default',
          minHeight: 0,
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

        {/* Cell icon / name */}
        <Typography
          sx={{
            fontSize: isCorner ? '0.7rem' : '0.5rem',
            fontWeight: 600,
            lineHeight: 1.1,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            width: '100%',
            px: '1px',
          }}
        >
          {isProperty || cell.type === 'STATION' ? (
            cell.icon ? (
              <Box
                component="img"
                src={`/location/${cell.icon}`}
                alt=""
                sx={{ width: '70%', maxHeight: 20, objectFit: 'contain' }}
              />
            ) : t(cell.name as any)
          ) : (
            CELL_ICONS[cell.type] || t(cell.name as any)
          )}
        </Typography>

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
              <TinhTuyPlayerToken key={slot} slot={slot} size={8} />
            ))}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};
