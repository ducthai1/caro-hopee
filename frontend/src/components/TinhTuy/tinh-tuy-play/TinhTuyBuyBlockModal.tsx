/**
 * TinhTuyBuyBlockModal — Target selection for Economic Sanction card (ch-29).
 * Player picks an opponent to block from buying properties for N rounds.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent,
  Button, Typography, Box,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { PLAYER_COLORS } from '../tinh-tuy-types';

export const TinhTuyBuyBlockModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, chooseBuyBlockTarget } = useTinhTuy();

  const bbp = state.buyBlockPrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  if (!bbp || !isMyTurn || state.drawnCard) return null;

  const accentColor = '#e74c3c';

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 400 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: `4px solid ${accentColor}` } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        <BlockIcon sx={{ fontSize: 32, color: accentColor, mb: 0.5 }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t('tinhTuy.cards.ch29.name' as any)}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pb: 2, pt: 0 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mb: 1.5 }}>
          {(t as any)('tinhTuy.cards.buyBlockHint', { turns: bbp.turns })}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {bbp.targets.map(target => (
            <Button
              key={target.slot}
              onClick={() => chooseBuyBlockTarget(target.slot)}
              variant="outlined"
              fullWidth
              sx={{
                justifyContent: 'flex-start', textTransform: 'none',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'rgba(231,76,60,0.08)', borderColor: accentColor },
              }}
            >
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PLAYER_COLORS[target.slot], mr: 1.5, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, textAlign: 'left' }}>
                {target.displayName}
              </Typography>
              <BlockIcon sx={{ color: accentColor, fontSize: 18, ml: 1, opacity: 0.6 }} />
            </Button>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
