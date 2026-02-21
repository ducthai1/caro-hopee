/**
 * TinhTuyForcedTradeModal — 2-step forced trade selection.
 * Step 1: Pick one of your own properties.
 * Step 2: Pick one of opponent's properties (no hotels).
 * Both properties swap ownership; houses stay on the cells.
 */
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent,
  Button, Typography, Box, Divider,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PLAYER_COLORS, PropertyGroup } from '../tinh-tuy-types';

export const TinhTuyForcedTradeModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, forcedTradeChoose } = useTinhTuy();
  const [selectedMyCell, setSelectedMyCell] = useState<number | null>(null);

  const ftp = state.forcedTradePrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  // Only show after card modal dismissed, only for active player
  if (!ftp || !isMyTurn || state.drawnCard) return null;

  const accentColor = '#9b59b6';
  const step = selectedMyCell == null ? 1 : 2;

  // Group opponent cells by owner for step 2
  const oppCellsByOwner = new Map<number, number[]>();
  for (const cellIdx of ftp.opponentCells) {
    const owner = state.players.find(p => p.properties.includes(cellIdx));
    if (!owner) continue;
    const arr = oppCellsByOwner.get(owner.slot) || [];
    arr.push(cellIdx);
    oppCellsByOwner.set(owner.slot, arr);
  }

  const handleOppSelect = (oppCell: number) => {
    if (selectedMyCell == null) return;
    forcedTradeChoose(selectedMyCell, oppCell);
  };

  const renderPropertyButton = (cellIdx: number, onClick: () => void, isSelected?: boolean) => {
    const cell = BOARD_CELLS[cellIdx];
    if (!cell) return null;
    const groupColor = cell.group ? GROUP_COLORS[cell.group as PropertyGroup] : '#666';
    const ownerSlot = state.players.find(p => p.properties.includes(cellIdx))?.slot;
    const owner = state.players.find(p => p.slot === ownerSlot);
    const houses = owner ? (owner.houses || {})[String(cellIdx)] || 0 : 0;
    const hotel = owner ? !!(owner.hotels || {})[String(cellIdx)] : false;
    return (
      <Button
        key={cellIdx}
        onClick={onClick}
        variant="outlined"
        fullWidth
        sx={{
          justifyContent: 'flex-start', textTransform: 'none', mb: 0.5,
          borderColor: isSelected ? accentColor : 'divider',
          bgcolor: isSelected ? 'rgba(155,89,182,0.1)' : 'transparent',
          borderWidth: isSelected ? 2 : 1,
          '&:hover': { bgcolor: 'rgba(155,89,182,0.08)', borderColor: accentColor },
        }}
      >
        <Box sx={{ width: 6, height: '100%', minHeight: 28, bgcolor: groupColor, borderRadius: 1, mr: 1.5, flexShrink: 0 }} />
        <Box sx={{ flex: 1, textAlign: 'left' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {t(cell.name as any)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {hotel ? '🏨' : houses > 0 ? `🏠×${houses}` : t('tinhTuy.game.land' as any)}
          </Typography>
        </Box>
      </Button>
    );
  };

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 400 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: `4px solid ${accentColor}` } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        <SwapHorizIcon sx={{ fontSize: 32, color: accentColor, mb: 0.5 }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t('tinhTuy.cards.ch23.name' as any)}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pb: 2, pt: 0 }}>
        {step === 1 && (
          <>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mb: 1.5 }}>
              {t('tinhTuy.cards.forcedTradeStep1' as any)}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
              {ftp.myCells.map(ci => renderPropertyButton(ci, () => setSelectedMyCell(ci)))}
            </Box>
          </>
        )}

        {step === 2 && (
          <>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mb: 0.5 }}>
              {t('tinhTuy.cards.forcedTradeStep2' as any)}
            </Typography>
            {/* Show selected own property */}
            <Box sx={{ mb: 1.5, opacity: 0.7 }}>
              <Typography variant="caption" sx={{ color: accentColor, fontWeight: 700 }}>
                {t('tinhTuy.cards.forcedTradeYours' as any)}:
              </Typography>
              {renderPropertyButton(selectedMyCell!, () => setSelectedMyCell(null), true)}
            </Box>
            <Divider sx={{ mb: 1 }} />
            {/* Opponent properties grouped by owner */}
            {Array.from(oppCellsByOwner.entries()).map(([ownerSlot, cells]) => {
              const owner = state.players.find(p => p.slot === ownerSlot);
              return (
                <Box key={ownerSlot} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PLAYER_COLORS[ownerSlot] }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: PLAYER_COLORS[ownerSlot] }}>
                      {owner?.displayName || `P${ownerSlot}`}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                    {cells.map(ci => renderPropertyButton(ci, () => handleOppSelect(ci)))}
                  </Box>
                </Box>
              );
            })}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
