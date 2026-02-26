/**
 * TinhTuyHorseAdjustPrompt — Horse passive: adjust dice total ±1 after rolling.
 * Snackbar-style fixed overlay at bottom of screen (only for current player).
 * No auto-dismiss — user picks manually. Backend turn timer is the safety net.
 */
import React, { useRef } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { useLanguage } from '../../../i18n';

export const TinhTuyHorseAdjustPrompt: React.FC = () => {
  const { t } = useLanguage();
  const { state, horseAdjust } = useTinhTuy();

  const prompt = state.horseAdjustPrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const resolvedRef = useRef(false);

  const handleAdjust = (direction: 1 | -1 | 0) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    horseAdjust(direction);
  };

  if (!prompt || !isMyTurn) return null;

  // Reset resolved flag when prompt changes
  resolvedRef.current = false;

  const total = prompt.diceTotal;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 140,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1100,
        width: { xs: 320, sm: 380 },
        maxWidth: '95vw',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          borderRadius: 3,
          border: '2px solid #9b59b6',
          bgcolor: 'background.paper',
          p: 2,
          boxShadow: '0 4px 20px rgba(155, 89, 182, 0.25)',
        }}
      >
        {/* Title */}
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: '#9b59b6', mb: 0.5, textAlign: 'center' }}
        >
          🐎 {t('tinhTuy.abilities.ui.horseAdjust' as any)}
        </Typography>

        {/* Current total */}
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, textAlign: 'center', mb: 1.5 }}
        >
          🎲 {total}
        </Typography>

        {/* Buttons */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleAdjust(-1)}
            sx={{
              minWidth: 64,
              fontWeight: 700,
              fontSize: '1.1rem',
              borderColor: '#e74c3c',
              color: '#e74c3c',
              '&:hover': { borderColor: '#c0392b', bgcolor: 'rgba(231, 76, 60, 0.06)' },
            }}
          >
            −1
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={() => handleAdjust(0)}
            sx={{
              minWidth: 72,
              fontWeight: 700,
              bgcolor: '#9b59b6',
              '&:hover': { bgcolor: '#8e44ad' },
            }}
          >
            {t('tinhTuy.abilities.ui.horseAdjustKeep' as any)}
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={() => handleAdjust(1)}
            sx={{
              minWidth: 64,
              fontWeight: 700,
              fontSize: '1.1rem',
              borderColor: '#27ae60',
              color: '#27ae60',
              '&:hover': { borderColor: '#219a52', bgcolor: 'rgba(39, 174, 96, 0.06)' },
            }}
          >
            +1
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
