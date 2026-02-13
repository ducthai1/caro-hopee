/**
 * GameCell - Single cell in the Caro game board.
 *
 * PERF FIX (Critical): Replaced MUI Box + complex sx with plain div + inline styles.
 * Previously: 400 cells × MUI Box × Emotion sx processing = massive overhead.
 * Key fixes:
 * - `transition: all` → specific properties only (was creating 3200+ GPU transition calcs)
 * - Removed boxShadow from normal/lastMove cells (400 expensive compositing layers)
 * - Removed &::before pseudo-element animation (400 persistent compositing layers)
 * - Removed transform: scale on hover (compositing layer per hover)
 * - Plain div + inline styles (zero Emotion overhead for 400 cells)
 */
import React, { memo, useMemo } from 'react';

// ─── Inject hover CSS once ──────────────────────────────────────
// Using native CSS for hover avoids Emotion processing on 400 cells.
if (typeof document !== 'undefined' && !document.getElementById('caro-cell-styles')) {
  const style = document.createElement('style');
  style.id = 'caro-cell-styles';
  style.textContent = `
    .caro-cell-empty:hover {
      background-color: rgba(126, 200, 227, 0.08) !important;
      border-color: rgba(126, 200, 227, 0.5) !important;
    }
  `;
  document.head.appendChild(style);
}

interface GameCellProps {
  value: number; // 0 = empty, 1 = player1, 2 = player2
  row: number;
  col: number;
  onClick: (row: number, col: number) => void;
  boardSize: number;
  cellSize: number;
  isLastMove?: boolean;
  isWinningCell?: boolean;
  player1Marker?: string | null;
  player2Marker?: string | null;
}

const GameCell: React.FC<GameCellProps> = ({
  value,
  row,
  col,
  onClick,
  cellSize,
  isLastMove = false,
  isWinningCell = false,
  player1Marker = null,
  player2Marker = null,
}) => {
  const isEmpty = value === 0;
  const cellColor = value === 1 ? '#5ba8c7' : value === 2 ? '#88d6b7' : 'transparent';

  // Memoize cell content to avoid recalculating on every render
  const cellContent = useMemo(() => {
    if (value === 1) {
      const marker = player1Marker || '✕';
      if (typeof marker !== 'string') return marker;
      if (marker.startsWith('data:image')) {
        return (
          <img
            src={marker}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              maxWidth: `${cellSize * 0.8}px`,
              maxHeight: `${cellSize * 0.8}px`,
              position: 'relative',
              zIndex: 1,
            }}
          />
        );
      }
      return <span style={{ position: 'relative', zIndex: 1 }}>{marker}</span>;
    } else if (value === 2) {
      const marker = player2Marker || '○';
      if (typeof marker !== 'string') return marker;
      if (marker.startsWith('data:image')) {
        return (
          <img
            src={marker}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              maxWidth: `${cellSize * 0.8}px`,
              maxHeight: `${cellSize * 0.8}px`,
              position: 'relative',
              zIndex: 1,
            }}
          />
        );
      }
      return <span style={{ position: 'relative', zIndex: 1 }}>{marker}</span>;
    }
    return null;
  }, [value, player1Marker, player2Marker, cellSize]);

  const handleClick = (): void => {
    if (isEmpty) {
      onClick(row, col);
    }
  };

  // Compute border based on state — no boxShadow (too expensive for 400 cells)
  let border: string;
  if (isWinningCell) {
    border = '3px solid #ff6b6b';
  } else if (isLastMove) {
    border = '2px solid rgba(126, 200, 227, 0.8)';
  } else {
    border = '1px solid rgba(126, 200, 227, 0.3)';
  }

  // Compute background — simplified, no gradients (cheaper GPU paint)
  let background: string;
  if (isWinningCell && !isEmpty) {
    background = 'rgba(255, 107, 107, 0.15)';
  } else if (isLastMove && !isEmpty) {
    background = value === 1 ? 'rgba(126, 200, 227, 0.12)' : 'rgba(168, 230, 207, 0.12)';
  } else {
    background = '#ffffff';
  }

  const style: React.CSSProperties = {
    width: cellSize,
    height: cellSize,
    minWidth: cellSize,
    minHeight: cellSize,
    border,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isEmpty ? 'pointer' : 'default',
    backgroundColor: background,
    // PERF FIX: Removed all transitions. Cells change value instantly on move placement,
    // so transition animations are imperceptible. Eliminating 400 transition tracking
    // allocations reduces GPU compositing overhead that contributed to Chrome crashes.
    position: 'relative',
    boxSizing: 'border-box',
    // PERF FIX: Only winning cells get boxShadow (max 5 cells, not 400).
    // Was applying complex boxShadow to lastMove too → expensive compositing.
    boxShadow: isWinningCell
      ? '0 0 8px rgba(255, 107, 107, 0.4), inset 0 0 4px rgba(255, 107, 107, 0.15)'
      : 'none',
    fontSize: cellSize * 0.65,
    fontWeight: 800,
    color: cellColor,
    // PERF FIX: Removed textShadow on all cells (was on every non-empty cell).
    // PERF FIX: Removed &::before animation (was creating compositing layer per occupied cell).
    // PERF FIX: Removed transform: scale(1.02) on hover (was creating compositing layer per hover).
    // Hover effect now handled by CSS class (background + border color only — no compositing layer).
  };

  return (
    <div
      onClick={handleClick}
      className={isEmpty ? 'caro-cell-empty' : undefined}
      style={style}
    >
      {cellContent}
    </div>
  );
};

// React.memo — cells only re-render when their actual display data changes.
const MemoizedGameCell = memo(GameCell, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.row === nextProps.row &&
    prevProps.col === nextProps.col &&
    prevProps.cellSize === nextProps.cellSize &&
    prevProps.isLastMove === nextProps.isLastMove &&
    prevProps.isWinningCell === nextProps.isWinningCell &&
    prevProps.player1Marker === nextProps.player1Marker &&
    prevProps.player2Marker === nextProps.player2Marker
  );
});
MemoizedGameCell.displayName = 'GameCell';

export default MemoizedGameCell;
