/**
 * Tinh Tuy Dai Chien — Board Definition
 * 36 cells: 19 properties (8 groups), 1 station, 2 utilities, 4 Khi Van, 4 Co Hoi,
 * 1 tax (34), 1 GO, 1 Travel, 1 Island (corner 27), 1 Festival (corner 18)
 */
import { IBoardCell, PropertyGroup } from '../types/tinh-tuy.types';

// ─── Constants ────────────────────────────────────────────────
export const BOARD_SIZE = 36;
export const GO_SALARY = 2000;
export const ISLAND_ESCAPE_COST = 500;
export const MAX_ISLAND_TURNS = 3;

// ─── Property Group → Cell Indices ────────────────────────────
export const PROPERTY_GROUPS: Record<PropertyGroup, number[]> = {
  brown: [1, 3],
  light_blue: [5, 7],
  purple: [10, 11],
  orange: [13, 15],
  red: [17, 19],
  yellow: [21, 23],
  green: [25, 26, 29, 30],
  dark_blue: [31, 33, 35],
};

// All ownable cells per board edge (PROPERTY + STATION + UTILITY)
// Used for edge-domination victory condition
export const EDGE_OWNABLE_CELLS: number[][] = [
  [1, 2, 3, 5, 6, 7],        // TOP: brown + station + light_blue + utility
  [10, 11, 13, 15, 17],       // RIGHT: purple + orange + red
  [19, 21, 22, 23, 25, 26],   // BOTTOM: red + yellow + utility + green
  [29, 30, 31, 33, 35],       // LEFT: green + dark_blue
];

// Minimum completed monopoly groups for monopoly-domination victory
export const MONOPOLY_WIN_THRESHOLD = 6;

// ─── 36-Cell Board ────────────────────────────────────────────
// Pricing curve: brown (cheapest) → dark_blue (most expensive)
export const BOARD_CELLS: IBoardCell[] = [
  // === TOP EDGE (cells 0-8) ===
  { index: 0, type: 'GO', name: 'tinhTuy.cells.go' },
  { index: 1, type: 'PROPERTY', name: 'tinhTuy.cells.benThanh', group: 'brown',
    price: 600, rentBase: 20, rentGroup: 40, rentHouse: [100, 300, 900, 1600], rentHotel: 2500,
    houseCost: 500, hotelCost: 500, icon: 'ben-thanh.png' },
  { index: 2, type: 'STATION', name: 'tinhTuy.cells.canTho',
    price: 2000, rentBase: 250, icon: 'can-tho.png' },
  { index: 3, type: 'PROPERTY', name: 'tinhTuy.cells.hoGuom', group: 'brown',
    price: 600, rentBase: 40, rentGroup: 80, rentHouse: [200, 600, 1800, 3200], rentHotel: 4500,
    houseCost: 500, hotelCost: 500, icon: 'ho-guom.png' },
  { index: 4, type: 'KHI_VAN', name: 'tinhTuy.cells.khiVan' },
  { index: 5, type: 'PROPERTY', name: 'tinhTuy.cells.hoiAn', group: 'light_blue',
    price: 1000, rentBase: 60, rentGroup: 120, rentHouse: [300, 900, 2700, 4000], rentHotel: 5500,
    houseCost: 500, hotelCost: 500, icon: 'hoi-an.png' },
  { index: 6, type: 'UTILITY', name: 'tinhTuy.cells.dienLuc',
    price: 1500, rentBase: 0 },
  { index: 7, type: 'PROPERTY', name: 'tinhTuy.cells.hue', group: 'light_blue',
    price: 1000, rentBase: 60, rentGroup: 120, rentHouse: [300, 900, 2700, 4000], rentHotel: 5500,
    houseCost: 500, hotelCost: 500, icon: 'hue.png' },
  { index: 8, type: 'CO_HOI', name: 'tinhTuy.cells.coHoi' },

  // === RIGHT EDGE (cells 9-17) ===
  { index: 9, type: 'TRAVEL', name: 'tinhTuy.cells.duLich' },
  { index: 10, type: 'PROPERTY', name: 'tinhTuy.cells.ducBa', group: 'purple',
    price: 1400, rentBase: 100, rentGroup: 200, rentHouse: [500, 1500, 4500, 6250], rentHotel: 7500,
    houseCost: 1000, hotelCost: 1000, icon: 'duc-ba.png' },
  { index: 11, type: 'PROPERTY', name: 'tinhTuy.cells.vanMieu', group: 'purple',
    price: 1400, rentBase: 100, rentGroup: 200, rentHouse: [500, 1500, 4500, 6250], rentHotel: 7500,
    houseCost: 1000, hotelCost: 1000, icon: 'van-mieu.png' },
  { index: 12, type: 'CO_HOI', name: 'tinhTuy.cells.coHoi' },
  { index: 13, type: 'PROPERTY', name: 'tinhTuy.cells.cauVang', group: 'orange',
    price: 1800, rentBase: 140, rentGroup: 280, rentHouse: [700, 2000, 5500, 7500], rentHotel: 9500,
    houseCost: 1000, hotelCost: 1000, icon: 'cau-vang.png' },
  { index: 14, type: 'KHI_VAN', name: 'tinhTuy.cells.khiVan' },
  { index: 15, type: 'PROPERTY', name: 'tinhTuy.cells.muiNe', group: 'orange',
    price: 1800, rentBase: 140, rentGroup: 280, rentHouse: [700, 2000, 5500, 7500], rentHotel: 9500,
    houseCost: 1000, hotelCost: 1000, icon: 'mui-ne.png' },
  { index: 16, type: 'KHI_VAN', name: 'tinhTuy.cells.khiVan' },
  { index: 17, type: 'PROPERTY', name: 'tinhTuy.cells.nhaTrang', group: 'red',
    price: 2200, rentBase: 180, rentGroup: 360, rentHouse: [900, 2500, 7000, 8750], rentHotel: 10500,
    houseCost: 1500, hotelCost: 1500, icon: 'nha-trang.png' },

  // === BOTTOM EDGE (cells 18-26) ===
  { index: 18, type: 'FESTIVAL', name: 'tinhTuy.cells.leHoi' },
  { index: 19, type: 'PROPERTY', name: 'tinhTuy.cells.phongNha', group: 'red',
    price: 2200, rentBase: 180, rentGroup: 360, rentHouse: [900, 2500, 7000, 8750], rentHotel: 10500,
    houseCost: 1500, hotelCost: 1500, icon: 'phong-nha.png' },
  { index: 20, type: 'CO_HOI', name: 'tinhTuy.cells.coHoi' },
  { index: 21, type: 'PROPERTY', name: 'tinhTuy.cells.daLat', group: 'yellow',
    price: 2600, rentBase: 220, rentGroup: 440, rentHouse: [1100, 3300, 8000, 9750], rentHotel: 11500,
    houseCost: 1500, hotelCost: 1500, icon: 'da-lat.png' },
  { index: 22, type: 'UTILITY', name: 'tinhTuy.cells.nhaNuoc',
    price: 1500, rentBase: 0 },
  { index: 23, type: 'PROPERTY', name: 'tinhTuy.cells.sapa', group: 'yellow',
    price: 2600, rentBase: 220, rentGroup: 440, rentHouse: [1100, 3300, 8000, 9750], rentHotel: 11500,
    houseCost: 1500, hotelCost: 1500, icon: 'sapa.png' },
  { index: 24, type: 'KHI_VAN', name: 'tinhTuy.cells.khiVan' },
  { index: 25, type: 'PROPERTY', name: 'tinhTuy.cells.haLong', group: 'green',
    price: 3000, rentBase: 260, rentGroup: 520, rentHouse: [1300, 3900, 9000, 11000], rentHotel: 12750,
    houseCost: 2000, hotelCost: 2000, icon: 'ha-long.png' },
  { index: 26, type: 'PROPERTY', name: 'tinhTuy.cells.phuQuoc', group: 'green',
    price: 3000, rentBase: 260, rentGroup: 520, rentHouse: [1300, 3900, 9000, 11000], rentHotel: 12750,
    houseCost: 2000, hotelCost: 2000, icon: 'phu-quoc.png' },

  // === LEFT EDGE (cells 27-35) ===
  { index: 27, type: 'ISLAND', name: 'tinhTuy.cells.raDao' },
  { index: 28, type: 'KHI_VAN', name: 'tinhTuy.cells.khiVan' },
  { index: 29, type: 'PROPERTY', name: 'tinhTuy.cells.conDao', group: 'green',
    price: 3200, rentBase: 280, rentGroup: 560, rentHouse: [1500, 4500, 10000, 12000], rentHotel: 14000,
    houseCost: 2000, hotelCost: 2000, icon: 'con-dao.png' },
  { index: 30, type: 'PROPERTY', name: 'tinhTuy.cells.bienHo', group: 'green',
    price: 3200, rentBase: 280, rentGroup: 560, rentHouse: [1500, 4500, 10000, 12000], rentHotel: 14000,
    houseCost: 2000, hotelCost: 2000, icon: 'pleiku.png' },
  { index: 31, type: 'PROPERTY', name: 'tinhTuy.cells.trangAn', group: 'dark_blue',
    price: 3500, rentBase: 350, rentGroup: 700, rentHouse: [1750, 5000, 11000, 13000], rentHotel: 15000,
    houseCost: 2000, hotelCost: 2000, icon: 'ninh-binh.png' },
  { index: 32, type: 'CO_HOI', name: 'tinhTuy.cells.coHoi' },
  { index: 33, type: 'PROPERTY', name: 'tinhTuy.cells.quangTri', group: 'dark_blue',
    price: 3500, rentBase: 350, rentGroup: 700, rentHouse: [1750, 5000, 11000, 13000], rentHotel: 15000,
    houseCost: 2000, hotelCost: 2000, icon: 'quang-tri.png' },
  { index: 34, type: 'TAX', name: 'tinhTuy.cells.thue', taxPerHouse: 500, taxPerHotel: 1000 },
  { index: 35, type: 'PROPERTY', name: 'tinhTuy.cells.landmark81', group: 'dark_blue',
    price: 4000, rentBase: 500, rentGroup: 1000, rentHouse: [2000, 6000, 14000, 17000], rentHotel: 20000,
    houseCost: 2000, hotelCost: 2000, icon: 'landmark-81.png' },
];

// ─── Helpers ──────────────────────────────────────────────────

/** Get cell by index */
export function getCell(index: number): IBoardCell | undefined {
  return BOARD_CELLS[index];
}

/** Check if player owns entire color group */
export function ownsFullGroup(group: PropertyGroup, ownedCells: number[]): boolean {
  return PROPERTY_GROUPS[group].every(idx => ownedCells.includes(idx));
}

/** Check if adding a cell completes a monopoly. Returns the group name if completed, null otherwise. */
export function checkMonopolyCompleted(cellIndex: number, ownedCells: number[]): PropertyGroup | null {
  const cell = getCell(cellIndex);
  if (!cell || cell.type !== 'PROPERTY' || !cell.group) return null;
  const group = cell.group as PropertyGroup;
  if (ownsFullGroup(group, ownedCells)) {
    // Verify this cell was the last piece (other cells were already owned before)
    const otherCells = PROPERTY_GROUPS[group].filter(idx => idx !== cellIndex);
    if (otherCells.every(idx => ownedCells.includes(idx))) return group;
  }
  return null;
}

/** Monopoly rent bonus multiplier */
export const MONOPOLY_BONUS = 0.15;

/** Count how many stations a player owns */
export function countStationsOwned(ownedCells: number[]): number {
  return ownedCells.filter(idx => BOARD_CELLS[idx]?.type === 'STATION').length;
}

/** Station rent: base 250 per station owned, scales with completed rounds (same 8% as utility) */
export function getStationRent(stationsOwned: number, completedRounds: number = 0): number {
  const base = stationsOwned * 250;
  return Math.floor(base * (1 + UTILITY_ROUND_MULTIPLIER * Math.max(completedRounds, 0)));
}

/** Utility rent: price scales with completed rounds.
 *  Formula: price × (1 + 0.08 × completedRounds), completedRounds = max(round - 1, 0) */
export const UTILITY_ROUND_MULTIPLIER = 0.08;

export function getUtilityRent(price: number, completedRounds: number): number {
  return Math.floor(price * (1 + UTILITY_ROUND_MULTIPLIER * Math.max(completedRounds, 0)));
}
