/**
 * TinhTuyIslandModal — Island escape options + "Sent to Island" alert.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import CasinoIcon from '@mui/icons-material/Casino';
import StyleIcon from '@mui/icons-material/Style';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { PLAYER_COLORS } from '../tinh-tuy-types';

const ESCAPE_COST = 500;

/* ─── "Sent to Island" Alert ───────────────────────────── */
export const TinhTuyIslandAlert: React.FC = () => {
  const { t } = useLanguage();
  const { state } = useTinhTuy();

  const slot = state.islandAlertSlot;
  if (slot == null) return null;

  const player = state.players.find(p => p.slot === slot);
  if (!player) return null;

  const isMe = slot === state.mySlot;

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 400 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: '4px solid #e67e22' } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        🏝️ {isMe
          ? t('tinhTuy.game.islandSentYou' as any)
          : t('tinhTuy.game.islandSentOther' as any, { name: player.displayName } as any)
        }
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pt: 1 }}>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.5,
          bgcolor: `${PLAYER_COLORS[slot]}15`, borderRadius: 2, px: 2, py: 0.5, mb: 1.5,
        }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PLAYER_COLORS[slot] }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {player.displayName}
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {t('tinhTuy.game.islandAlertTurns' as any)}
        </Typography>

        {isMe && (
          <Box sx={{
            bgcolor: 'rgba(230,126,34,0.08)', borderRadius: 2, p: 1.5, mt: 1,
            border: '1px solid rgba(230,126,34,0.2)',
          }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#e67e22', display: 'block', mb: 0.5 }}>
              {t('tinhTuy.game.islandEscapeTitle' as any)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              💰 {t('tinhTuy.game.islandEscapePay' as any)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              🎲 {t('tinhTuy.game.islandEscapeRoll' as any)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              🃏 {t('tinhTuy.game.islandEscapeCard' as any)}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ─── Island Escape Modal (existing) ──────────────────── */
export const TinhTuyIslandModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, escapeIsland, rollDice } = useTinhTuy();

  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const myPlayer = state.players.find(p => p.slot === state.mySlot);
  const isOnIsland = state.turnPhase === 'ISLAND_TURN' && isMyTurn && myPlayer && myPlayer.islandTurns > 0;

  // Wait for dice + movement animation to fully finish before showing
  if (!isOnIsland || !myPlayer || state.pendingMove || state.animatingToken) return null;

  const canAfford = myPlayer.points >= ESCAPE_COST;
  const hasEscapeCard = myPlayer.cards.includes('escape-island');
  const isLastTurn = myPlayer.islandTurns === 1;

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 400 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: '4px solid #e67e22' } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 1 }}>
        {t('tinhTuy.game.islandTitle' as any)}
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {t('tinhTuy.game.islandTurnsLeft' as any, { turns: myPlayer.islandTurns } as any)}
        </Typography>
        {isLastTurn && (
          <Typography variant="caption" sx={{ color: '#e74c3c', fontWeight: 600 }}>
            {t('tinhTuy.game.islandLastTurn' as any)}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ flexDirection: 'column', gap: 1, px: 3, pb: 2.5 }}>
        <Button
          fullWidth variant="contained"
          startIcon={<PaymentIcon />}
          onClick={() => escapeIsland('PAY')}
          disabled={!canAfford}
          sx={{
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            fontWeight: 700,
          }}
        >
          {t('tinhTuy.game.islandPay' as any, { cost: ESCAPE_COST } as any)}
        </Button>
        <Button
          fullWidth variant="outlined"
          startIcon={<CasinoIcon />}
          onClick={() => rollDice()}
          sx={{ borderColor: '#e67e22', color: '#e67e22', fontWeight: 600 }}
        >
          {t('tinhTuy.game.islandRoll' as any)}
        </Button>
        {hasEscapeCard && (
          <Button
            fullWidth variant="outlined"
            startIcon={<StyleIcon />}
            onClick={() => escapeIsland('USE_CARD')}
            sx={{ borderColor: '#27ae60', color: '#27ae60', fontWeight: 600 }}
          >
            {t('tinhTuy.game.islandUseCard' as any)}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
