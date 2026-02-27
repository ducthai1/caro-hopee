/**
 * TinhTuyHorseAdjustModal — Horse passive: choose -1, 0, or +1 step after dice roll.
 * Shows when state.horseAdjustPrompt is non-null (only for current player).
 * No auto-dismiss — user picks manually. Backend turn timer is the safety net.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Paper, Typography } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { useLanguage } from '../../../i18n';

const OPTIONS = [-1, 0, 1] as const;

export const TinhTuyHorseAdjustModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, horseAdjustPick } = useTinhTuy();

  const prompt = state.horseAdjustPrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  const [selected, setSelected] = useState<number | null>(null);
  const pickedRef = useRef(false);

  // Reset picked state when a new prompt appears
  const promptKey = prompt ? `${prompt.diceTotal}` : '';
  useEffect(() => {
    pickedRef.current = false;
    setSelected(null);
  }, [promptKey]);

  const handlePick = (adj: -1 | 0 | 1) => {
    if (pickedRef.current) return;
    pickedRef.current = true;
    setSelected(adj);
    horseAdjustPick(adj);
  };

  if (!prompt || !isMyTurn) return null;

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 300 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: '4px solid #9b59b6' } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        🐎 {(t as any)('tinhTuy.abilities.ui.horseAdjustTitle')}
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 2 }}>
          {(t as any)('tinhTuy.abilities.ui.horseAdjustDesc', { total: prompt.diceTotal })}
        </Typography>

        {/* Three option buttons */}
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
          {OPTIONS.map((adj) => {
            const finalTotal = Math.max(2, prompt.diceTotal + adj);
            const isSelected = selected === adj;
            const label = adj === -1 ? '-1' : adj === 0 ? '0' : '+1';
            return (
              <Paper
                key={adj}
                onClick={() => handlePick(adj)}
                elevation={isSelected ? 6 : 2}
                sx={{
                  flex: 1,
                  p: { xs: 1.5, sm: 2 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: selected !== null ? 'default' : 'pointer',
                  borderRadius: 2,
                  border: isSelected ? '3px solid #9b59b6' : '2px solid transparent',
                  bgcolor: isSelected ? 'rgba(155, 89, 182, 0.08)' : 'background.paper',
                  transition: 'border-color 0.2s ease, background-color 0.2s ease',
                  ...(selected === null ? {
                    '&:hover': { borderColor: '#9b59b6', bgcolor: 'rgba(155, 89, 182, 0.04)' },
                  } : {}),
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, color: adj < 0 ? '#e74c3c' : adj > 0 ? '#27ae60' : '#7f8c8d' }}
                >
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#2c3e50' }}>
                  = {finalTotal}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {(t as any)('tinhTuy.abilities.ui.rabbitSteps')}
                </Typography>
              </Paper>
            );
          })}
        </Box>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1.5, color: 'text.secondary' }}>
          {(t as any)('tinhTuy.abilities.ui.tapToChoose')}
        </Typography>
      </DialogContent>
    </Dialog>
  );
};
