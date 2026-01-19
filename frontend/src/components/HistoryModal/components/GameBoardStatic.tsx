/**
 * GameBoardStatic - Static game board viewer for viewing finished games
 */
import React, { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface GameBoardStaticProps {
  board: number[][];
  boardSize: number;
  winningLine?: Array<{ row: number; col: number }>;
}

const GameBoardStatic: React.FC<GameBoardStaticProps> = ({ board, boardSize, winningLine }) => {
  const [cellSize, setCellSize] = useState(30);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const maxSize = Math.min(500, window.innerWidth * 0.6);
    const calculatedSize = Math.floor(maxSize / boardSize);
    setCellSize(Math.max(20, Math.min(calculatedSize, 40)));
  }, [boardSize]);

  const getCellContent = (value: number): string => {
    if (value === 1) return '✕';
    if (value === 2) return '○';
    return '';
  };

  const getCellColor = (value: number): string => {
    if (value === 1) return '#5ba8c7';
    if (value === 2) return '#88d6b7';
    return 'transparent';
  };

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
        gap: 0,
        border: '3px solid #7ec8e3',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: 'inset 0 2px 8px rgba(126, 200, 227, 0.1)',
      }}
      ref={boardRef}
    >
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <Box
            key={`${rowIndex}-${colIndex}`}
            sx={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              minWidth: `${cellSize}px`,
              minHeight: `${cellSize}px`,
              border: '1px solid rgba(126, 200, 227, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              fontSize: `${cellSize * 0.65}px`,
              fontWeight: 800,
              color: getCellColor(cell),
            }}
          >
            {getCellContent(cell)}
          </Box>
        ))
      )}
      {/* Winning line overlay */}
      {winningLine && winningLine.length >= 5 && (
        <WinningLineOverlay winningLine={winningLine} cellSize={cellSize} />
      )}
    </Box>
  );
};

// Winning line overlay component
interface WinningLineOverlayProps {
  winningLine: Array<{ row: number; col: number }>;
  cellSize: number;
}

const WinningLineOverlay: React.FC<WinningLineOverlayProps> = ({ winningLine, cellSize }) => {
  const rows = winningLine.map(c => c.row);
  const cols = winningLine.map(c => c.col);
  const uniqueRows = Array.from(new Set(rows));
  const uniqueCols = Array.from(new Set(cols));

  const isHorizontal = uniqueRows.length === 1;
  const isVertical = uniqueCols.length === 1;
  const isDiagonal = !isHorizontal && !isVertical;

  if (isDiagonal) {
    return <DiagonalWinningLine winningLine={winningLine} cellSize={cellSize} />;
  }

  // Horizontal or vertical: use rectangle
  let rectX: number;
  let rectY: number;
  let rectWidth: number;
  let rectHeight: number;

  if (isHorizontal) {
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);
    rectX = minCol * cellSize;
    rectY = rows[0] * cellSize;
    rectWidth = (maxCol - minCol + 1) * cellSize;
    rectHeight = cellSize;
  } else {
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    rectX = cols[0] * cellSize;
    rectY = minRow * cellSize;
    rectWidth = cellSize;
    rectHeight = (maxRow - minRow + 1) * cellSize;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        left: `${rectX}px`,
        top: `${rectY}px`,
        width: `${rectWidth}px`,
        height: `${rectHeight}px`,
        border: '3px solid #ff6b6b',
        borderRadius: 2,
        pointerEvents: 'none',
        zIndex: 5,
        boxSizing: 'border-box',
      }}
    />
  );
};

// Diagonal winning line component
interface DiagonalWinningLineProps {
  winningLine: Array<{ row: number; col: number }>;
  cellSize: number;
}

const DiagonalWinningLine: React.FC<DiagonalWinningLineProps> = ({ winningLine, cellSize }) => {
  const sortedCells = [...winningLine].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const firstCell = sortedCells[0];
  const lastCell = sortedCells[sortedCells.length - 1];

  const firstCenterX = (firstCell.col + 0.5) * cellSize;
  const firstCenterY = (firstCell.row + 0.5) * cellSize;
  const lastCenterX = (lastCell.col + 0.5) * cellSize;
  const lastCenterY = (lastCell.row + 0.5) * cellSize;

  const offset = cellSize * 0.4;

  const dx = lastCenterX - firstCenterX;
  const dy = lastCenterY - firstCenterY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / length;
  const perpY = dx / length;

  const widthOffset = cellSize * 0.3;

  const p1x = firstCenterX - offset * (dx / length) - widthOffset * perpX;
  const p1y = firstCenterY - offset * (dy / length) - widthOffset * perpY;
  const p2x = firstCenterX - offset * (dx / length) + widthOffset * perpX;
  const p2y = firstCenterY - offset * (dy / length) + widthOffset * perpY;
  const p3x = lastCenterX + offset * (dx / length) + widthOffset * perpX;
  const p3y = lastCenterY + offset * (dy / length) + widthOffset * perpY;
  const p4x = lastCenterX + offset * (dx / length) - widthOffset * perpX;
  const p4y = lastCenterY + offset * (dy / length) - widthOffset * perpY;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <polygon
        points={`${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}`}
        fill="none"
        stroke="#ff6b6b"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default GameBoardStatic;
