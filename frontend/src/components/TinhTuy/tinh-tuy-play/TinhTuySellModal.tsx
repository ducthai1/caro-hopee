/**
 * TinhTuySellModal — Shown when player must sell assets to cover debt.
 * Player can sell individual buildings (house/hotel) or entire properties (land + buildings).
 * When selling a property, all buildings on it are included automatically.
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Chip, IconButton, LinearProgress, Divider,
} from '@mui/material';
import SellIcon from '@mui/icons-material/Sell';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import ApartmentIcon from '@mui/icons-material/Apartment';
import TerrainIcon from '@mui/icons-material/Terrain';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PropertyGroup } from '../tinh-tuy-types';

type SellType = 'house' | 'hotel' | 'property';

interface SellSelection {
  cellIndex: number;
  type: SellType;
  count: number;
}

const SELL_RATIO = 0.8; // Sell at 80% of cost/value

/** Calculate total value when selling a property (land + all buildings) */
function calcPropertySellValue(cell: typeof BOARD_CELLS[0], houses: number, hasHotel: boolean): number {
  let total = Math.floor((cell.price || 0) * SELL_RATIO);
  if (hasHotel) total += Math.floor((cell.hotelCost || 0) * SELL_RATIO);
  if (houses > 0) total += houses * Math.floor((cell.houseCost || 0) * SELL_RATIO);
  return total;
}

export const TinhTuySellModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, sellBuildings } = useTinhTuy();
  const [selections, setSelections] = useState<SellSelection[]>([]);

  const sp = state.sellPrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const myPlayer = state.players.find(p => p.slot === state.mySlot);

  // Reset selections when a new sell session starts (sp changes from null → object)
  useEffect(() => {
    if (sp) setSelections([]);
  }, [sp]);

  // Set of properties selected for full sell (land + buildings)
  const propertySellSet = useMemo(
    () => new Set(selections.filter(s => s.type === 'property' && s.count > 0).map(s => s.cellIndex)),
    [selections],
  );

  // Build sellable items: buildings first, then property (land)
  const sellableItems = useMemo(() => {
    if (!myPlayer) return [];
    const items: Array<{
      cellIndex: number; type: SellType;
      maxCount: number; priceEach: number;
      cellName: string; icon?: string; group?: PropertyGroup;
    }> = [];
    for (const cellIdx of myPlayer.properties) {
      const cell = BOARD_CELLS.find(c => c.index === cellIdx);
      if (!cell) continue;
      const key = String(cellIdx);
      const houses = myPlayer.houses[key] || 0;
      const hasHotel = !!myPlayer.hotels[key];

      // Building items
      if (hasHotel) {
        items.push({
          cellIndex: cellIdx, type: 'hotel', maxCount: 1,
          priceEach: Math.floor((cell.hotelCost || 0) * SELL_RATIO),
          cellName: cell.name, icon: cell.icon, group: cell.group as PropertyGroup,
        });
      }
      if (houses > 0) {
        items.push({
          cellIndex: cellIdx, type: 'house', maxCount: houses,
          priceEach: Math.floor((cell.houseCost || 0) * SELL_RATIO),
          cellName: cell.name, icon: cell.icon, group: cell.group as PropertyGroup,
        });
      }

      // Property (land) item — selling the whole property
      items.push({
        cellIndex: cellIdx, type: 'property', maxCount: 1,
        priceEach: calcPropertySellValue(cell, houses, hasHotel),
        cellName: cell.name, icon: cell.icon, group: cell.group as PropertyGroup,
      });
    }
    return items;
  }, [myPlayer]);

  // Calculate total sell value
  const totalSellValue = useMemo(() => {
    let total = 0;
    for (const sel of selections) {
      if (sel.count <= 0) continue;
      const item = sellableItems.find(i => i.cellIndex === sel.cellIndex && i.type === sel.type);
      if (!item) continue;
      // If property is sold, only count property value (buildings already included)
      if (sel.type === 'property') {
        total += item.priceEach;
      } else if (!propertySellSet.has(sel.cellIndex)) {
        // Only count building sells if property isn't being sold entirely
        total += sel.count * item.priceEach;
      }
    }
    return total;
  }, [selections, sellableItems, propertySellSet]);

  const deficit = sp?.deficit ?? 0;
  const canConfirm = totalSellValue >= deficit;
  const progress = deficit > 0 ? Math.min((totalSellValue / deficit) * 100, 100) : 0;

  const getSelCount = (cellIndex: number, type: SellType) => {
    return selections.find(s => s.cellIndex === cellIndex && s.type === type)?.count ?? 0;
  };

  const updateSelection = (cellIndex: number, type: SellType, delta: number, max: number) => {
    setSelections(prev => {
      const existing = prev.find(s => s.cellIndex === cellIndex && s.type === type);
      const current = existing?.count ?? 0;
      const newCount = Math.max(0, Math.min(max, current + delta));
      if (newCount === 0) return prev.filter(s => !(s.cellIndex === cellIndex && s.type === type));
      if (existing) return prev.map(s => s.cellIndex === cellIndex && s.type === type ? { ...s, count: newCount } : s);
      return [...prev, { cellIndex, type, count: newCount }];
    });
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    // Filter: if property is sold, remove individual building selections for that property
    const filtered = selections.filter(s => {
      if (s.count <= 0) return false;
      if (s.type !== 'property' && propertySellSet.has(s.cellIndex)) return false;
      return true;
    });
    sellBuildings(filtered);
  };

  /** Select all properties (whole sell) to quickly cover deficit */
  const handleSelectAll = () => {
    const allProps: SellSelection[] = sellableItems
      .filter(i => i.type === 'property')
      .map(i => ({ cellIndex: i.cellIndex, type: 'property' as SellType, count: 1 }));
    setSelections(allProps);
  };

  if (!sp || !isMyTurn) return null;

  // Group items by cellIndex for visual grouping
  const groupedByCell = new Map<number, typeof sellableItems>();
  for (const item of sellableItems) {
    const arr = groupedByCell.get(item.cellIndex) || [];
    arr.push(item);
    groupedByCell.set(item.cellIndex, arr);
  }

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 400 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: '4px solid #e74c3c' } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        <SellIcon sx={{ fontSize: 32, color: '#e74c3c', mb: 0.5 }} />
        <br />
        {t('tinhTuy.game.sellPrompt' as any)}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {/* Deficit display + Select All */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="body2" sx={{ color: '#e74c3c', fontWeight: 700, mb: 1 }}>
            {t('tinhTuy.game.sellDeficit' as any)}: {deficit.toLocaleString()} TT
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={handleSelectAll}
            sx={{
              fontSize: '0.7rem', fontWeight: 600,
              borderColor: 'rgba(155,89,182,0.4)', color: '#9b59b6',
              '&:hover': { borderColor: '#9b59b6', bgcolor: 'rgba(155,89,182,0.08)' },
            }}
          >
            {t('tinhTuy.game.sellSelectAll' as any)}
          </Button>
        </Box>

        {/* Sellable items grouped by property */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {Array.from(groupedByCell.entries()).map(([cellIndex, items]: [number, typeof sellableItems], gi: number) => {
            const isPropertySold = propertySellSet.has(cellIndex);
            const propertyItem = items.find((i: typeof sellableItems[0]) => i.type === 'property')!;
            const groupColor = propertyItem.group ? GROUP_COLORS[propertyItem.group as PropertyGroup] : '#999';

            return (
              <Box key={cellIndex}>
                {gi > 0 && <Divider sx={{ mb: 1 }} />}
                {/* Property header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  {propertyItem.icon && (
                    <Box
                      component="img"
                      src={`/location/${propertyItem.icon}`}
                      alt=""
                      sx={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 1 }}
                    />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', flex: 1 }} noWrap>
                    {t(propertyItem.cellName as any)}
                  </Typography>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: groupColor, flexShrink: 0 }} />
                </Box>

                {/* Individual items for this property */}
                {items.map((item: typeof sellableItems[0]) => {
                  const count = getSelCount(item.cellIndex, item.type);
                  const isBuilding = item.type !== 'property';
                  // Disable building toggles if property is being sold
                  const disabled = isBuilding && isPropertySold;

                  return (
                    <Box
                      key={`${item.cellIndex}-${item.type}`}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        p: 0.75, pl: 1.5, borderRadius: 2, ml: 1,
                        bgcolor: count > 0 && !disabled
                          ? item.type === 'property' ? 'rgba(155,89,182,0.06)' : 'rgba(231,76,60,0.06)'
                          : 'rgba(0,0,0,0.02)',
                        border: count > 0 && !disabled
                          ? item.type === 'property' ? '1px solid rgba(155,89,182,0.3)' : '1px solid rgba(231,76,60,0.3)'
                          : '1px solid rgba(0,0,0,0.08)',
                        opacity: disabled ? 0.4 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip
                            icon={
                              item.type === 'property' ? <TerrainIcon sx={{ fontSize: 14 }} /> :
                              item.type === 'hotel' ? <ApartmentIcon sx={{ fontSize: 14 }} /> :
                              <HomeWorkIcon sx={{ fontSize: 14 }} />
                            }
                            label={
                              item.type === 'property' ? t('tinhTuy.game.sellProperty' as any) :
                              item.type === 'hotel' ? t('tinhTuy.game.sellHotel' as any) :
                              t('tinhTuy.game.sellHouse' as any)
                            }
                            size="small"
                            sx={{
                              height: 20, fontSize: '0.65rem', fontWeight: 600,
                              bgcolor: item.type === 'property' ? 'rgba(155,89,182,0.12)' : `${groupColor}20`,
                              color: item.type === 'property' ? '#8e44ad' : groupColor,
                            }}
                          />
                          <Typography variant="caption" sx={{ color: '#e67e22', fontWeight: 600 }}>
                            {item.priceEach.toLocaleString()} TT
                          </Typography>
                          {isBuilding && item.maxCount > 1 && (
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              x{item.maxCount}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* Toggle for property (checkbox-like) or +/- for buildings */}
                      {item.type === 'property' ? (
                        <Button
                          size="small"
                          variant={count > 0 ? 'contained' : 'outlined'}
                          onClick={() => updateSelection(cellIndex, 'property', count > 0 ? -1 : 1, 1)}
                          sx={{
                            minWidth: 56, py: 0.25, fontSize: '0.7rem', fontWeight: 700,
                            ...(count > 0 ? {
                              background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                              '&:hover': { background: 'linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%)' },
                            } : {
                              borderColor: 'rgba(155,89,182,0.4)', color: '#9b59b6',
                              '&:hover': { borderColor: '#9b59b6', bgcolor: 'rgba(155,89,182,0.08)' },
                            }),
                          }}
                        >
                          {count > 0 ? t('tinhTuy.game.sellSelected' as any) : t('tinhTuy.game.sellSelect' as any)}
                        </Button>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => updateSelection(item.cellIndex, item.type, -1, item.maxCount)}
                            disabled={count === 0 || disabled}
                            sx={{ p: 0.5 }}
                          >
                            <RemoveIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                          <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                            {count}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => updateSelection(item.cellIndex, item.type, 1, item.maxCount)}
                            disabled={count >= item.maxCount || disabled}
                            sx={{ p: 0.5 }}
                          >
                            <AddIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>

        {/* Progress bar */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: canConfirm ? '#27ae60' : '#e67e22' }}>
              {t('tinhTuy.game.sellTotal' as any)}: {totalSellValue.toLocaleString()} TT
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#e74c3c' }}>
              {deficit.toLocaleString()} TT
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8, borderRadius: 4,
              bgcolor: 'rgba(0,0,0,0.08)',
              '& .MuiLinearProgress-bar': {
                bgcolor: canConfirm ? '#27ae60' : '#e67e22',
                borderRadius: 4,
              },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ pb: 2.5, px: 3 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<SellIcon />}
          onClick={handleConfirm}
          disabled={!canConfirm}
          sx={{
            background: canConfirm
              ? 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)'
              : undefined,
            '&:hover': canConfirm
              ? { background: 'linear-gradient(135deg, #c0392b 0%, #a93226 100%)' }
              : undefined,
            fontWeight: 700, py: 1,
          }}
        >
          {t('tinhTuy.game.sellConfirm' as any)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
