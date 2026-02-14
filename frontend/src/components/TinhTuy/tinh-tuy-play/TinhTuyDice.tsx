/**
 * TinhTuyDice — Simple dice display + roll button. Phase 2: no 3D.
 */
import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';

// Dice face using dots
const DiceFace: React.FC<{ value: number }> = ({ value }) => (
  <Box
    sx={{
      width: 48, height: 48,
      borderRadius: 2,
      bgcolor: '#fff',
      border: '2px solid',
      borderColor: '#9b59b6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: '1.4rem',
      color: '#2c3e50',
      boxShadow: '0 2px 6px rgba(155, 89, 182, 0.2)',
    }}
  >
    {value}
  </Box>
);

export const TinhTuyDice: React.FC = () => {
  const { t } = useLanguage();
  const { state, rollDice } = useTinhTuy();
  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const canRoll = isMyTurn && state.turnPhase === 'ROLL_DICE';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
      {/* Dice display */}
      {state.lastDiceResult && (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <DiceFace value={state.lastDiceResult.dice1} />
          <DiceFace value={state.lastDiceResult.dice2} />
          {state.lastDiceResult.dice1 === state.lastDiceResult.dice2 && (
            <Typography variant="caption" sx={{ color: '#e74c3c', fontWeight: 700, fontSize: '0.75rem' }}>
              DOUBLES!
            </Typography>
          )}
        </Box>
      )}

      {/* Roll button */}
      {canRoll && (
        <Button
          variant="contained"
          startIcon={<CasinoIcon />}
          onClick={rollDice}
          sx={{
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%)' },
            px: 4, py: 1.25, fontWeight: 700, fontSize: '1rem',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(155, 89, 182, 0.4)',
          }}
        >
          {t('tinhTuy.game.rollDice')}
        </Button>
      )}

      {/* Status text */}
      {!canRoll && (
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {isMyTurn
            ? state.turnPhase === 'AWAITING_ACTION'
              ? t('tinhTuy.game.chooseAction')
              : t('tinhTuy.game.waitingPhase')
            : t('tinhTuy.game.waitingTurn')
          }
        </Typography>
      )}
    </Box>
  );
};
