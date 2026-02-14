/**
 * TinhTuyIslandModal — Island escape options: Pay, Roll doubles, Use card.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import CasinoIcon from '@mui/icons-material/Casino';
import StyleIcon from '@mui/icons-material/Style';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';

const ESCAPE_COST = 500;

export const TinhTuyIslandModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, escapeIsland, rollDice } = useTinhTuy();

  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const myPlayer = state.players.find(p => p.slot === state.mySlot);
  const isOnIsland = state.turnPhase === 'ISLAND_TURN' && isMyTurn && myPlayer && myPlayer.islandTurns > 0;

  if (!isOnIsland || !myPlayer) return null;

  const canAfford = myPlayer.points >= ESCAPE_COST;
  const hasEscapeCard = myPlayer.cards.includes('escape-island');
  const isLastTurn = myPlayer.islandTurns === 1;

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
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
