/**
 * TinhTuyCardModal — Shows drawn card with auto-dismiss after 3s.
 */
import React from 'react';
import { Dialog, DialogContent, Typography, Box, LinearProgress } from '@mui/material';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';

export const TinhTuyCardModal: React.FC = () => {
  const { t } = useLanguage();
  const { state } = useTinhTuy();
  const card = state.drawnCard;

  if (!card) return null;

  const isKhiVan = card.type === 'KHI_VAN';
  const gradient = isKhiVan
    ? 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)'
    : 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)';

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ background: gradient, p: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, letterSpacing: 1 }}>
          {isKhiVan ? t('tinhTuy.cards.khiVanTitle' as any) : t('tinhTuy.cards.coHoiTitle' as any)}
        </Typography>
      </Box>

      <DialogContent sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          {t(card.nameKey as any)}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {t(card.descriptionKey as any)}
        </Typography>
      </DialogContent>

      {/* Auto-dismiss progress */}
      <LinearProgress
        variant="determinate"
        value={100}
        sx={{
          height: 3,
          '& .MuiLinearProgress-bar': {
            background: gradient,
            animation: 'shrink 3s linear forwards',
          },
          '@keyframes shrink': { from: { transform: 'scaleX(1)' }, to: { transform: 'scaleX(0)' } },
          '& .MuiLinearProgress-bar1Determinate': { transformOrigin: 'left' },
        }}
      />
    </Dialog>
  );
};
