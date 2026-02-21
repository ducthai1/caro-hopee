/**
 * TinhTuyGoBonusModal — Shown when player lands exactly on GO.
 * Displays random 3000-5000 TT bonus notification (auto-dismiss).
 */
import React, { useEffect, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, Box } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';

const AUTO_DISMISS_MS = 3000;

export const TinhTuyGoBonusModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, clearGoBonus } = useTinhTuy();
  const prompt = state.goBonusPrompt;
  const dismissRef = useRef<number | null>(null);

  useEffect(() => {
    if (!prompt) return;
    dismissRef.current = window.setTimeout(() => {
      clearGoBonus();
    }, AUTO_DISMISS_MS);
    return () => { if (dismissRef.current) clearTimeout(dismissRef.current); };
  }, [prompt, clearGoBonus]);

  if (!prompt) return null;

  const accentColor = '#f1c40f';

  return (
    <Dialog
      open={true}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ timeout: 400 }}
      PaperProps={{
        sx: {
          borderRadius: 3, borderTop: `4px solid ${accentColor}`,
          animation: 'tt-travel-pulse 1.5s ease-in-out infinite',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        <MonetizationOnIcon sx={{ fontSize: 40, color: accentColor }} />
        <br />
        <Typography variant="h6" sx={{ fontWeight: 800, color: accentColor }}>
          {t('tinhTuy.game.goBonusTitle' as any)}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: accentColor, mb: 1 }}>
            +{(prompt.amount || 0).toLocaleString()} TT
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tinhTuy.game.goBonusPointsDesc' as any)}
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
