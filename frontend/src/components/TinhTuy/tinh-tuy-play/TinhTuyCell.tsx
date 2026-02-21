/**
 * TinhTuyCell — Single cell on the board with house/hotel indicators.
 */
import React, { useRef, useEffect } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../../i18n';
import { BoardCellClient, GROUP_COLORS, PLAYER_COLORS, PropertyGroup } from '../tinh-tuy-types';
import './tinh-tuy-board.css';

/** Selection state during travel/festival phases: 'valid' = selectable, 'invalid' = dimmed */
type SelectionState = 'valid' | 'invalid' | null;

interface Props {
  cell: BoardCellClient;
  col: number;
  row: number;
  ownerSlot?: number;
  isCurrentCell?: boolean;
  houseCount?: number;
  hasHotel?: boolean;
  hasFestival?: boolean;
  currentRent?: number;
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

/** Mini fireworks interval for the FESTIVAL cell */
const FESTIVAL_FIREWORK_INTERVAL = 4000;
const FESTIVAL_COLORS = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22'];

export const TinhTuyCell: React.FC<Props> = React.memo(({
  cell, col, row, ownerSlot, isCurrentCell,
  houseCount = 0, hasHotel = false, hasFestival = false, currentRent, selectionState, onClick,
}) => {
  const { t } = useLanguage();
  const isCorner = [0, 9, 18, 27].includes(cell.index);
  const groupColor = cell.group ? GROUP_COLORS[cell.group as PropertyGroup] : undefined;
  const cellRef = useRef<HTMLDivElement>(null);

  // Mini fireworks on the property cell hosting the festival
  useEffect(() => {
    if (!hasFestival) return;
    const fire = () => {
      if (!cellRef.current) return;
      const rect = cellRef.current.getBoundingClientRect();
      const cellSize = Math.min(rect.width, rect.height);
      const isMobile = cellSize < 40;
      confetti({
        particleCount: isMobile ? 5 : 10,
        spread: isMobile ? 30 : 50,
        startVelocity: isMobile ? 8 : 15,
        gravity: 0.8,
        scalar: isMobile ? 0.3 : 0.5,
        ticks: isMobile ? 40 : 60,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: FESTIVAL_COLORS,
        disableForReducedMotion: true,
      });
    };
    const initTimer = setTimeout(fire, 1500);
    const interval = setInterval(fire, FESTIVAL_FIREWORK_INTERVAL);
    return () => { clearTimeout(initTimer); clearInterval(interval); };
  }, [hasFestival]);

  // 3D CSS class
  const cellClass = isCurrentCell ? 'tt-cell-active' : isCorner ? 'tt-cell-corner' : 'tt-cell-3d';

  return (
    <Tooltip
      title={`${t(cell.name as any)} ${currentRent != null ? `- 🔮${currentRent} TT` : cell.price ? `- ${cell.price} TT` : ''}`}
      arrow
      placement="top"
      enterDelay={300}
    >
      <Box
        ref={cellRef}
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

        {/* House/Hotel indicators — top-left, next to owner dot (top-right) */}
        {(houseCount > 0 || hasHotel) && (
          <Box sx={{ position: 'absolute', top: 1, left: 1, display: 'flex', gap: '1px', zIndex: 2 }}>
            {hasHotel ? (
              <div className="tt-hotel" />
            ) : (
              Array.from({ length: houseCount }).map((_, i) => (
                <div key={i} className="tt-house" />
              ))
            )}
          </Box>
        )}

        {/* Festival frame overlay */}
        {hasFestival && (
          <Box
            component="img"
            src="/location/le-hoi-frame.png"
            alt=""
            sx={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              zIndex: 3,
              pointerEvents: 'none',
              opacity: 0.85,
            }}
          />
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

        {/* Price (purchase) or current rent (owned) */}
        {(currentRent != null || cell.price) && (
          <Typography sx={{
            fontSize: '0.5rem', lineHeight: 1, fontWeight: 600,
            color: currentRent != null ? '#e74c3c' : 'text.secondary',
          }}>
            {currentRent != null ? `🔮${currentRent}` : cell.price}
          </Typography>
        )}

      </Box>
    </Tooltip>
  );
});
