/**
 * GoBoard — Canvas-based Go board with HiDPI, hover, touch, and scoring support.
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Box } from '@mui/material';
import { GoBoardSize, GoColor, GoMove, TerritoryMap } from './go-types';
import {
  computeRenderConfig,
  pixelToIntersection,
  renderFullBoard,
} from './go-canvas-renderer';

interface GoBoardProps {
  board: number[][];
  boardSize: GoBoardSize;
  lastMove: GoMove | null;
  phase: 'play' | 'scoring';
  currentColor: GoColor;
  myColor: GoColor | null;
  isMyTurn: boolean;
  deadStones: string[];
  territory: TerritoryMap;
  onPlaceStone: (row: number, col: number) => void;
  onToggleDead: (row: number, col: number) => void;
}

const GoBoard: React.FC<GoBoardProps> = ({
  board,
  boardSize,
  lastMove,
  phase,
  currentColor,
  myColor,
  isMyTurn,
  deadStones,
  territory,
  onPlaceStone,
  onToggleDead,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTouchRef = useRef(false);

  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  const hoverRef = useRef(hover);
  hoverRef.current = hover;

  // Map GoColor → canvas stone color number
  const colorNum = useCallback((c: GoColor): 1 | 2 => (c === 'black' ? 1 : 2), []);

  // Render the board
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.offsetWidth;
    const displayH = canvas.offsetHeight;
    if (!displayW || !displayH) return;

    // Resize canvas buffer if needed
    if (canvas.width !== Math.round(displayW * dpr) || canvas.height !== Math.round(displayH * dpr)) {
      canvas.width = Math.round(displayW * dpr);
      canvas.height = Math.round(displayH * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const config = computeRenderConfig(displayW, displayH, boardSize, dpr);

    // Build lastMove render param
    let lastMoveParam: { row: number; col: number; color: 1 | 2 } | null = null;
    if (lastMove && !lastMove.isPass) {
      lastMoveParam = {
        row: lastMove.row,
        col: lastMove.col,
        color: colorNum(lastMove.color),
      };
    }

    // Hover ghost (play phase + my turn + no stone there)
    let hoverParam: { row: number; col: number; color: 1 | 2 } | null = null;
    const h = hoverRef.current;
    if (h && phase === 'play' && isMyTurn && myColor && board[h.row]?.[h.col] === 0) {
      hoverParam = { row: h.row, col: h.col, color: colorNum(myColor) };
    }

    renderFullBoard(ctx, {
      config,
      board,
      lastMove: lastMoveParam,
      territory: phase === 'scoring' ? territory : null,
      deadStones: phase === 'scoring' ? deadStones : null,
      hover: hoverParam,
    });
  }, [board, boardSize, lastMove, phase, isMyTurn, myColor, deadStones, territory, colorNum]);

  // ResizeObserver for responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(draw);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [draw]);

  // Redraw on prop changes
  useEffect(() => {
    let rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [draw]);

  // Pixel → board intersection helper
  const getIntersection = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.offsetWidth;
    const displayH = canvas.offsetHeight;
    const config = computeRenderConfig(displayW, displayH, boardSize, dpr);
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    return pixelToIntersection(px, py, config, boardSize);
  }, [boardSize]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isTouchRef.current) return;
    const pos = getIntersection(e.clientX, e.clientY);
    if (!pos) return;
    if (phase === 'play' && isMyTurn) {
      onPlaceStone(pos.row, pos.col);
    } else if (phase === 'scoring') {
      onToggleDead(pos.row, pos.col);
    }
  }, [phase, isMyTurn, onPlaceStone, onToggleDead, getIntersection]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isTouchRef.current) return;
    if (phase !== 'play' || !isMyTurn) {
      if (hoverRef.current) setHover(null);
      return;
    }
    const pos = getIntersection(e.clientX, e.clientY);
    const prev = hoverRef.current;
    if (!pos) {
      if (prev) setHover(null);
      return;
    }
    if (!prev || prev.row !== pos.row || prev.col !== pos.col) {
      setHover(pos);
    }
  }, [phase, isMyTurn, getIntersection]);

  const handleMouseLeave = useCallback(() => {
    setHover(null);
  }, []);

  const handleTouchStart = useCallback(() => {
    isTouchRef.current = true;
    setHover(null);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch) return;
    const pos = getIntersection(touch.clientX, touch.clientY);
    if (!pos) return;
    if (phase === 'play' && isMyTurn) {
      onPlaceStone(pos.row, pos.col);
    } else if (phase === 'scoring') {
      onToggleDead(pos.row, pos.col);
    }
  }, [phase, isMyTurn, onPlaceStone, onToggleDead, getIntersection]);

  const cursor = phase === 'play' && isMyTurn
    ? 'pointer'
    : phase === 'scoring'
      ? 'crosshair'
      : 'default';

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        maxWidth: 600,
        aspectRatio: '1',
        position: 'relative',
        mx: 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
          cursor,
          borderRadius: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />
    </Box>
  );
};

export default GoBoard;
