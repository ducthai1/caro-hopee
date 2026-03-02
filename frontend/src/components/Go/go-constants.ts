import { GoBoardSize } from './go-types';

// ─── Star Points (hoshi) ─────────────────────────────────────
// Standard positions for star point markers on the board
export const STAR_POINTS: Record<GoBoardSize, [number, number][]> = {
  9: [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]],
  13: [[3, 3], [3, 9], [9, 3], [9, 9], [6, 6], [3, 6], [9, 6], [6, 3], [6, 9]],
  19: [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]],
};

// ─── Handicap Stone Positions ────────────────────────────────
// Order follows standard Go convention per handicap level
export const HANDICAP_POSITIONS: Record<GoBoardSize, Record<number, [number, number][]>> = {
  9: {
    2: [[2, 6], [6, 2]],
    3: [[2, 6], [6, 2], [6, 6]],
    4: [[2, 2], [2, 6], [6, 2], [6, 6]],
    5: [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]],
  },
  13: {
    2: [[3, 9], [9, 3]],
    3: [[3, 9], [9, 3], [9, 9]],
    4: [[3, 3], [3, 9], [9, 3], [9, 9]],
    5: [[3, 3], [3, 9], [9, 3], [9, 9], [6, 6]],
    6: [[3, 3], [3, 9], [9, 3], [9, 9], [6, 3], [6, 9]],
    7: [[3, 3], [3, 9], [9, 3], [9, 9], [6, 3], [6, 9], [6, 6]],
    8: [[3, 3], [3, 9], [9, 3], [9, 9], [6, 3], [6, 9], [3, 6], [9, 6]],
    9: [[3, 3], [3, 9], [9, 3], [9, 9], [6, 3], [6, 9], [3, 6], [9, 6], [6, 6]],
  },
  19: {
    2: [[3, 15], [15, 3]],
    3: [[3, 15], [15, 3], [15, 15]],
    4: [[3, 3], [3, 15], [15, 3], [15, 15]],
    5: [[3, 3], [3, 15], [15, 3], [15, 15], [9, 9]],
    6: [[3, 3], [3, 15], [15, 3], [15, 15], [9, 3], [9, 15]],
    7: [[3, 3], [3, 15], [15, 3], [15, 15], [9, 3], [9, 15], [9, 9]],
    8: [[3, 3], [3, 15], [15, 3], [15, 15], [9, 3], [9, 15], [3, 9], [15, 9]],
    9: [[3, 3], [3, 15], [15, 3], [15, 15], [9, 3], [9, 15], [3, 9], [15, 9], [9, 9]],
  },
};

// ─── Coordinate Labels ───────────────────────────────────────
// Standard Go notation skips 'I' to avoid confusion with 'J'
export const COORD_LABELS = ['A','B','C','D','E','F','G','H','J','K','L','M','N','O','P','Q','R','S','T'];

// ─── Board Colors ────────────────────────────────────────────
export const BOARD_COLORS = {
  background: '#DEB887',       // burlywood / wood color
  backgroundDark: '#C4975A',   // darker wood for gradient
  gridLine: '#1a1a1a',
  gridLineAlpha: 0.7,
  starPoint: '#1a1a1a',
  coordLabel: '#5a4a3a',
  blackStone: '#1a1a1a',
  blackStoneHighlight: '#4a4a4a',
  whiteStone: '#f0f0f0',
  whiteStoneHighlight: '#ffffff',
  whiteStoneBorder: '#888888',
  lastMoveBlack: '#ffffff',    // white dot on black stone
  lastMoveWhite: '#1a1a1a',   // black dot on white stone
  hoverAlpha: 0.4,
  territoryBlack: 'rgba(0, 0, 0, 0.2)',
  territoryWhite: 'rgba(255, 255, 255, 0.35)',
  territoryNeutral: 'rgba(128, 128, 128, 0.15)',
  deadMarker: '#ff4444',
};

// ─── Rendering Config ────────────────────────────────────────
export const STONE_RADIUS_RATIO = 0.47;  // stone radius = cellSize × ratio
export const STAR_POINT_RADIUS_RATIO = 0.12;
export const LAST_MOVE_DOT_RATIO = 0.15;
export const DEAD_MARKER_SIZE_RATIO = 0.3;
export const COORD_FONT_SIZE_RATIO = 0.35;
export const SNAP_THRESHOLD_RATIO = 0.45; // click snap radius
export const BOARD_PADDING_RATIO = 1.5;   // padding in cell units around the board
