/**
 * Go (Cờ Vây) — Canvas 2D Rendering
 * Pure stateless rendering functions. All functions take RenderConfig + CanvasRenderingContext2D.
 */

import { GoBoardSize } from './go-types';
import {
  BOARD_COLORS,
  BOARD_PADDING_RATIO,
  COORD_FONT_SIZE_RATIO,
  COORD_LABELS,
  DEAD_MARKER_SIZE_RATIO,
  LAST_MOVE_DOT_RATIO,
  SNAP_THRESHOLD_RATIO,
  STAR_POINT_RADIUS_RATIO,
  STAR_POINTS,
  STONE_RADIUS_RATIO,
} from './go-constants';

// ─── Config ──────────────────────────────────────────────────

export interface RenderConfig {
  boardSize: GoBoardSize;
  cellSize: number;         // pixels per cell
  padding: number;          // board padding in pixels
  dpr: number;              // device pixel ratio
}

// ─── Layout ──────────────────────────────────────────────────

/**
 * Compute RenderConfig to fit the board in the given canvas dimensions.
 * Leaves room for coordinate labels using BOARD_PADDING_RATIO.
 */
export function computeRenderConfig(
  canvasWidth: number,
  canvasHeight: number,
  boardSize: GoBoardSize,
  dpr: number,
): RenderConfig {
  // We need (boardSize - 1) grid gaps + 2 * padding sides.
  // padding = cellSize * BOARD_PADDING_RATIO, so:
  // canvasWidth = (boardSize - 1) * cellSize + 2 * BOARD_PADDING_RATIO * cellSize
  //             = cellSize * (boardSize - 1 + 2 * BOARD_PADDING_RATIO)
  const divisor = boardSize - 1 + 2 * BOARD_PADDING_RATIO;
  const cellSizeW = canvasWidth / divisor;
  const cellSizeH = canvasHeight / divisor;
  const cellSize = Math.floor(Math.min(cellSizeW, cellSizeH));
  const padding = cellSize * BOARD_PADDING_RATIO;

  return { boardSize, cellSize, padding, dpr };
}

// ─── Coordinate Conversion ───────────────────────────────────

/**
 * Convert board (row, col) to canvas pixel coords (top-left of canvas origin).
 * Row 0 is the top of the board.
 */
export function intersectionToPixel(
  row: number,
  col: number,
  config: RenderConfig,
): { x: number; y: number } {
  const x = config.padding + col * config.cellSize;
  const y = config.padding + row * config.cellSize;
  return { x, y };
}

/**
 * Convert canvas pixel click (px, py) to nearest board intersection.
 * Returns null if the click is outside SNAP_THRESHOLD_RATIO * cellSize from all intersections.
 */
export function pixelToIntersection(
  px: number,
  py: number,
  config: RenderConfig,
  boardSize: GoBoardSize,
): { row: number; col: number } | null {
  const { cellSize, padding } = config;
  const snapDist = cellSize * SNAP_THRESHOLD_RATIO;

  const col = Math.round((px - padding) / cellSize);
  const row = Math.round((py - padding) / cellSize);

  if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) return null;

  const { x, y } = intersectionToPixel(row, col, config);
  const dx = px - x;
  const dy = py - y;
  if (Math.sqrt(dx * dx + dy * dy) > snapDist) return null;

  return { row, col };
}

// ─── Board Background ────────────────────────────────────────

/**
 * Draw wood-colored background with a top-left → bottom-right gradient.
 */
export function drawBoard(ctx: CanvasRenderingContext2D, config: RenderConfig): void {
  const { cellSize, padding, boardSize } = config;
  const boardPx = (boardSize - 1) * cellSize;
  const totalSize = boardPx + 2 * padding;

  // Wood gradient
  const grad = ctx.createLinearGradient(0, 0, totalSize, totalSize);
  grad.addColorStop(0, BOARD_COLORS.background);
  grad.addColorStop(1, BOARD_COLORS.backgroundDark);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, totalSize, totalSize);
}

// ─── Grid Lines ──────────────────────────────────────────────

/**
 * Draw all grid lines connecting intersections.
 */
export function drawGridLines(ctx: CanvasRenderingContext2D, config: RenderConfig): void {
  const { cellSize, padding, boardSize } = config;
  const boardPx = (boardSize - 1) * cellSize;

  ctx.save();
  ctx.strokeStyle = BOARD_COLORS.gridLine;
  ctx.globalAlpha = BOARD_COLORS.gridLineAlpha;
  ctx.lineWidth = 1;

  // Horizontal lines
  for (let row = 0; row < boardSize; row++) {
    const y = padding + row * cellSize;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + boardPx, y);
    ctx.stroke();
  }

  // Vertical lines
  for (let col = 0; col < boardSize; col++) {
    const x = padding + col * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, padding + boardPx);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Star Points ─────────────────────────────────────────────

/**
 * Draw filled circles at hoshi (star point) positions.
 */
export function drawStarPoints(ctx: CanvasRenderingContext2D, config: RenderConfig): void {
  const { cellSize, boardSize } = config;
  const points = STAR_POINTS[boardSize];
  const r = cellSize * STAR_POINT_RADIUS_RATIO;

  ctx.save();
  ctx.fillStyle = BOARD_COLORS.starPoint;

  for (const [row, col] of points) {
    const { x, y } = intersectionToPixel(row, col, config);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ─── Coordinate Labels ───────────────────────────────────────

/**
 * Draw column letters (A–T, skipping I) below the board,
 * and row numbers (1–boardSize, bottom = 1 per Go convention) to the left.
 */
export function drawCoordinateLabels(ctx: CanvasRenderingContext2D, config: RenderConfig): void {
  const { cellSize, padding, boardSize } = config;
  const fontSize = Math.max(8, Math.floor(cellSize * COORD_FONT_SIZE_RATIO));
  const boardPx = (boardSize - 1) * cellSize;
  const labelOffset = padding * 0.55;

  ctx.save();
  ctx.fillStyle = BOARD_COLORS.coordLabel;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Column labels — below the board
  for (let col = 0; col < boardSize; col++) {
    const x = padding + col * cellSize;
    const y = padding + boardPx + labelOffset;
    ctx.fillText(COORD_LABELS[col], x, y);
  }

  // Row labels — left of the board (Go convention: row 0 = top = boardSize)
  ctx.textAlign = 'right';
  for (let row = 0; row < boardSize; row++) {
    const x = padding - labelOffset;
    const y = padding + row * cellSize;
    const label = String(boardSize - row);
    ctx.fillText(label, x, y);
  }

  ctx.restore();
}

// ─── Stone Sprite Cache ──────────────────────────────────────
// Pre-render black & white stones to offscreen canvases keyed by cellSize.
// Avoids creating 361 radial gradients per frame on 19×19 boards.

let cachedCellSize = 0;
let blackSpriteCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
let whiteSpriteCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;

function createSpriteCanvas(size: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function buildStoneSpriteCache(cellSize: number): void {
  if (cellSize === cachedCellSize && blackSpriteCanvas) return;
  cachedCellSize = cellSize;

  const r = cellSize * STONE_RADIUS_RATIO;
  const spriteSize = Math.ceil((r * 2) + (r * 0.6) + 4);
  const cx = spriteSize / 2;
  const cy = spriteSize / 2;

  // Black stone sprite
  blackSpriteCanvas = createSpriteCanvas(spriteSize);
  const bCtx = blackSpriteCanvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (bCtx) {
    bCtx.shadowColor = 'rgba(0,0,0,0.4)';
    bCtx.shadowBlur = r * 0.4;
    bCtx.shadowOffsetX = r * 0.15;
    bCtx.shadowOffsetY = r * 0.2;
    const grad = bCtx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.05, cx, cy, r);
    grad.addColorStop(0, BOARD_COLORS.blackStoneHighlight);
    grad.addColorStop(1, BOARD_COLORS.blackStone);
    bCtx.fillStyle = grad;
    bCtx.beginPath();
    bCtx.arc(cx, cy, r, 0, Math.PI * 2);
    bCtx.fill();
  }

  // White stone sprite
  whiteSpriteCanvas = createSpriteCanvas(spriteSize);
  const wCtx = whiteSpriteCanvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (wCtx) {
    wCtx.shadowColor = 'rgba(0,0,0,0.4)';
    wCtx.shadowBlur = r * 0.4;
    wCtx.shadowOffsetX = r * 0.15;
    wCtx.shadowOffsetY = r * 0.2;
    const grad = wCtx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.05, cx, cy, r);
    grad.addColorStop(0, BOARD_COLORS.whiteStoneHighlight);
    grad.addColorStop(1, BOARD_COLORS.whiteStone);
    wCtx.fillStyle = grad;
    wCtx.beginPath();
    wCtx.arc(cx, cy, r, 0, Math.PI * 2);
    wCtx.fill();
    wCtx.shadowColor = 'transparent';
    wCtx.shadowBlur = 0;
    wCtx.shadowOffsetX = 0;
    wCtx.shadowOffsetY = 0;
    wCtx.strokeStyle = BOARD_COLORS.whiteStoneBorder;
    wCtx.lineWidth = Math.max(0.5, r * 0.06);
    wCtx.stroke();
  }
}

// ─── Stone Drawing ───────────────────────────────────────────

/**
 * Draw a single stone using cached sprite (drawImage) — O(1) vs O(N) gradient cost.
 * color: 1 = black, 2 = white
 */
export function drawStone(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  color: 1 | 2,
  config: RenderConfig,
): void {
  buildStoneSpriteCache(config.cellSize);
  const sprite = color === 1 ? blackSpriteCanvas : whiteSpriteCanvas;
  if (!sprite) return;

  const { x, y } = intersectionToPixel(row, col, config);
  const half = sprite.width / 2;
  ctx.drawImage(sprite as any, x - half, y - half);
}

/**
 * Iterate over the full board array and draw every placed stone.
 * board[row][col]: 0 = empty, 1 = black, 2 = white
 */
export function drawAllStones(
  ctx: CanvasRenderingContext2D,
  board: number[][],
  config: RenderConfig,
): void {
  const { boardSize, cellSize } = config;
  buildStoneSpriteCache(cellSize);

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const cell = board[row]?.[col];
      if (cell === 1 || cell === 2) {
        const sprite = cell === 1 ? blackSpriteCanvas : whiteSpriteCanvas;
        if (!sprite) continue;
        const { x, y } = intersectionToPixel(row, col, config);
        const half = sprite.width / 2;
        ctx.drawImage(sprite as any, x - half, y - half);
      }
    }
  }
}

// ─── Last Move Indicator ─────────────────────────────────────

/**
 * Draw a small contrasting dot on the last placed stone.
 */
export function drawLastMoveIndicator(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  stoneColor: 1 | 2,
  config: RenderConfig,
): void {
  const { cellSize } = config;
  const { x, y } = intersectionToPixel(row, col, config);
  const r = cellSize * LAST_MOVE_DOT_RATIO;

  ctx.save();
  ctx.fillStyle = stoneColor === 1 ? BOARD_COLORS.lastMoveBlack : BOARD_COLORS.lastMoveWhite;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── Hover Preview ───────────────────────────────────────────

/**
 * Draw a semi-transparent ghost stone to preview placement on hover.
 */
export function drawHoverPreview(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  color: 1 | 2,
  config: RenderConfig,
): void {
  ctx.save();
  ctx.globalAlpha = BOARD_COLORS.hoverAlpha;
  drawStone(ctx, row, col, color, config);
  ctx.restore();
}

// ─── Territory Overlay ───────────────────────────────────────

/**
 * Draw semi-transparent filled squares at territory positions to indicate ownership.
 * Keys in each array are "row-col" strings.
 */
export function drawTerritoryOverlay(
  ctx: CanvasRenderingContext2D,
  territory: { black: string[]; white: string[]; neutral: string[] },
  config: RenderConfig,
): void {
  const { cellSize } = config;
  const size = cellSize * 0.35;
  const half = size / 2;

  const drawGroup = (keys: string[], fillStyle: string) => {
    ctx.fillStyle = fillStyle;
    for (const key of keys) {
      const parts = key.split('-');
      if (parts.length < 2) continue;
      const row = parseInt(parts[0], 10);
      const col = parseInt(parts[1], 10);
      if (isNaN(row) || isNaN(col)) continue;
      const { x, y } = intersectionToPixel(row, col, config);
      ctx.fillRect(x - half, y - half, size, size);
    }
  };

  ctx.save();
  drawGroup(territory.black, BOARD_COLORS.territoryBlack);
  drawGroup(territory.white, BOARD_COLORS.territoryWhite);
  drawGroup(territory.neutral, BOARD_COLORS.territoryNeutral);
  ctx.restore();
}

// ─── Dead Stone Markers ──────────────────────────────────────

/**
 * Draw "×" markers over dead stones to indicate they should be removed.
 * Keys are "row-col" strings.
 */
export function drawDeadStoneMarkers(
  ctx: CanvasRenderingContext2D,
  deadStones: string[],
  config: RenderConfig,
): void {
  const { cellSize } = config;
  const half = cellSize * DEAD_MARKER_SIZE_RATIO;

  ctx.save();
  ctx.strokeStyle = BOARD_COLORS.deadMarker;
  ctx.lineWidth = Math.max(1.5, cellSize * 0.07);
  ctx.lineCap = 'round';

  for (const key of deadStones) {
    const parts = key.split('-');
    if (parts.length < 2) continue;
    const row = parseInt(parts[0], 10);
    const col = parseInt(parts[1], 10);
    if (isNaN(row) || isNaN(col)) continue;
    const { x, y } = intersectionToPixel(row, col, config);

    // Draw × (two diagonal lines)
    ctx.beginPath();
    ctx.moveTo(x - half, y - half);
    ctx.lineTo(x + half, y + half);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + half, y - half);
    ctx.lineTo(x - half, y + half);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Full Board Render ───────────────────────────────────────

export interface FullBoardRenderOptions {
  config: RenderConfig;
  board: number[][];
  lastMove?: { row: number; col: number; color: 1 | 2 } | null;
  territory?: { black: string[]; white: string[]; neutral: string[] } | null;
  deadStones?: string[] | null;
  hover?: { row: number; col: number; color: 1 | 2 } | null;
}

/**
 * Convenience function: draws the full board in the correct layer order.
 * Callers should clear the canvas before invoking this.
 */
export function renderFullBoard(
  ctx: CanvasRenderingContext2D,
  options: FullBoardRenderOptions,
): void {
  const { config, board, lastMove, territory, deadStones, hover } = options;

  drawBoard(ctx, config);
  drawGridLines(ctx, config);
  drawStarPoints(ctx, config);
  drawCoordinateLabels(ctx, config);
  drawAllStones(ctx, board, config);

  if (lastMove) {
    drawLastMoveIndicator(ctx, lastMove.row, lastMove.col, lastMove.color, config);
  }

  if (territory) {
    drawTerritoryOverlay(ctx, territory, config);
  }

  if (deadStones && deadStones.length > 0) {
    drawDeadStoneMarkers(ctx, deadStones, config);
  }

  if (hover) {
    drawHoverPreview(ctx, hover.row, hover.col, hover.color, config);
  }
}
