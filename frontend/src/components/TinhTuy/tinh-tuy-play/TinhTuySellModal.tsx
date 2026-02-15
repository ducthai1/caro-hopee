/**
 * TinhTuySellModal — Shown when player must sell buildings to cover debt.
 * Player selects which buildings to sell; confirm disabled until total >= deficit.
 */
import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Chip, IconButton, LinearProgress,
} from '@mui/material';
import SellIcon from '@mui/icons-material/Sell';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PropertyGroup } from '../tinh-tuy-types';

interface SellSelection {
  cellIndex: number;
  type: 'house' | 'hotel';
  count: number;
}

export const TinhTuySellModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, sellBuildings } = useTinhTuy();
  const [selections, setSelections] = useState<SellSelection[]>([]);

  const sp = state.sellPrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const myPlayer = state.players.find(p => p.slot === state.mySlot);

  // Build list of sellable items from my properties
  const sellableItems = useMemo(() => {
    if (!myPlayer) return [];
    const items: Array<{
      cellIndex: number; type: 'house' | 'hotel';
      maxCount: number; priceEach: number;
      cellName: string; icon?: string; group?: PropertyGroup;
    }> = [];
    for (const cellIdx of myPlayer.properties) {
      const cell = BOARD_CELLS.find(c => c.index === cellIdx);
      if (!cell) continue;
      const key = String(cellIdx);
      if (myPlayer.hotels[key]) {
        items.push({
          cellIndex: cellIdx, type: 'hotel', maxCount: 1,
          priceEach: Math.floor((cell.hotelCost || 0) / 2),
          cellName: cell.name, icon: cell.icon, group: cell.group as PropertyGroup,
        });
      }
      const houses = myPlayer.houses[key] || 0;
      if (houses > 0) {
        items.push({
          cellIndex: cellIdx, type: 'house', maxCount: houses,
          priceEach: Math.floor((cell.houseCost || 0) / 2),
          cellName: cell.name, icon: cell.icon, group: cell.group as PropertyGroup,
        });
      }
    }
    return items;
  }, [myPlayer]);

  // Calculate total sell value from selections
  const totalSellValue = useMemo(() => {
    let total = 0;
    for (const sel of selections) {
      const item = sellableItems.find(i => i.cellIndex === sel.cellIndex && i.type === sel.type);
      if (item) total += sel.count * item.priceEach;
    }
    return total;
  }, [selections, sellableItems]);

  const deficit = sp?.deficit ?? 0;
  const canConfirm = totalSellValue >= deficit;
  const progress = deficit > 0 ? Math.min((totalSellValue / deficit) * 100, 100) : 0;

  const getSelCount = (cellIndex: number, type: 'house' | 'hotel') => {
    return selections.find(s => s.cellIndex === cellIndex && s.type === type)?.count ?? 0;
  };

  const updateSelection = (cellIndex: number, type: 'house' | 'hotel', delta: number, max: number) => {
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
    const filtered = selections.filter(s => s.count > 0);
    sellBuildings(filtered);
  };

  if (!sp || !isMyTurn) return null;

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
        {/* Deficit display */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="body2" sx={{ color: '#e74c3c', fontWeight: 700 }}>
            {t('tinhTuy.game.sellDeficit' as any)}: {deficit.toLocaleString()} TT
          </Typography>
        </Box>

        {/* Sellable buildings list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sellableItems.map((item) => {
            const count = getSelCount(item.cellIndex, item.type);
            const groupColor = item.group ? GROUP_COLORS[item.group] : '#999';
            return (
              <Box
                key={`${item.cellIndex}-${item.type}`}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  p: 1, borderRadius: 2,
                  bgcolor: count > 0 ? 'rgba(231,76,60,0.06)' : 'rgba(0,0,0,0.02)',
                  border: count > 0 ? '1px solid rgba(231,76,60,0.3)' : '1px solid rgba(0,0,0,0.08)',
                  transition: 'all 0.2s',
                }}
              >
                {/* Cell icon */}
                {item.icon && (
                  <Box
                    component="img"
                    src={`/location/${item.icon}`}
                    alt=""
                    sx={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 1 }}
                  />
                )}

                {/* Cell name + type */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.2 }} noWrap>
                    {t(item.cellName as any)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                      icon={item.type === 'hotel' ? <ApartmentIcon sx={{ fontSize: 14 }} /> : <HomeWorkIcon sx={{ fontSize: 14 }} />}
                      label={item.type === 'hotel' ? t('tinhTuy.game.sellHotel' as any) : t('tinhTuy.game.sellHouse' as any)}
                      size="small"
                      sx={{
                        height: 20, fontSize: '0.65rem',
                        bgcolor: `${groupColor}20`, color: groupColor, fontWeight: 600,
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#e67e22', fontWeight: 600 }}>
                      {item.priceEach.toLocaleString()} TT
                    </Typography>
                    {item.maxCount > 1 && (
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        x{item.maxCount}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Count selector */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => updateSelection(item.cellIndex, item.type, -1, item.maxCount)}
                    disabled={count === 0}
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
                    disabled={count >= item.maxCount}
                    sx={{ p: 0.5 }}
                  >
                    <AddIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
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
