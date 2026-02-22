/**
 * TinhTuyFreeHotelModal — Player picks which owned property gets instant hotel upgrade (Co Hoi card).
 * Shows grid of eligible properties with icons, name, and current state.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent,
  Typography, Box, ButtonBase,
} from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PropertyGroup } from '../tinh-tuy-types';

export const TinhTuyFreeHotelModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, chooseFreeHotel } = useTinhTuy();

  const prompt = state.freeHotelPrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  if (!prompt || !isMyTurn) return null;

  return (
    <Dialog
      open={true}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ timeout: 400 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: '4px solid #e74c3c' } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        <ApartmentIcon sx={{ fontSize: 32, color: '#e74c3c', mb: 0.5 }} />
        <br />
        {t('tinhTuy.game.freeHotelTitle' as any)}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 2 }}>
          {t('tinhTuy.game.freeHotelDesc' as any)}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.5 }}>
          {prompt.buildableCells.map(cellIndex => {
            const cell = BOARD_CELLS[cellIndex];
            if (!cell) return null;
            const groupColor = cell.group ? GROUP_COLORS[cell.group as PropertyGroup] : '#9b59b6';
            const myPlayer = state.players.find(p => p.slot === state.mySlot);
            const houses = myPlayer?.houses?.[String(cellIndex)] || 0;

            return (
              <ButtonBase
                key={cellIndex}
                onClick={() => chooseFreeHotel(cellIndex)}
                sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  p: 1.5, borderRadius: 2, border: `2px solid ${groupColor}`,
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: `${groupColor}15`, transform: 'scale(1.03)' },
                }}
              >
                {cell.icon && (
                  <Box
                    component="img"
                    src={`/location/${cell.icon}`}
                    alt=""
                    sx={{ width: 56, height: 56, objectFit: 'contain', mb: 0.5, borderRadius: 1 }}
                  />
                )}
                <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
                  {t(cell.name as any)}
                </Typography>
                {houses > 0 && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    🏠 ×{houses} → 🏨
                  </Typography>
                )}
                {houses === 0 && (
                  <Typography variant="caption" sx={{ color: '#e74c3c', fontWeight: 600 }}>
                    → 🏨
                  </Typography>
                )}
              </ButtonBase>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
