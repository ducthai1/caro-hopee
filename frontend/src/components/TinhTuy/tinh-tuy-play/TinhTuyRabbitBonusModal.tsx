/**
 * TinhTuyRabbitBonusModal — Rabbit passive: accept or decline +3 bonus steps on doubles.
 * Shows when state.rabbitBonusPrompt is non-null (only for current player).
 * No auto-dismiss — user picks manually. Backend turn timer is the safety net.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Button, Typography } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { useLanguage } from '../../../i18n';

/** Map dice value 1-6 to Unicode die face emoji */
const DICE_EMOJI: Record<number, string> = {
  1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅',
};

export const TinhTuyRabbitBonusModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, rabbitBonusPick } = useTinhTuy();

  const prompt = state.rabbitBonusPrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  const [picked, setPicked] = useState(false);
  const pickedRef = useRef(false);

  // Reset picked state when a new prompt appears
  const promptKey = prompt ? `${prompt.dice.dice1}-${prompt.dice.dice2}-${prompt.bonus}` : '';
  useEffect(() => {
    pickedRef.current = false;
    setPicked(false);
  }, [promptKey]);

  const handlePick = (accept: boolean) => {
    if (pickedRef.current) return;
    pickedRef.current = true;
    setPicked(true);
    rabbitBonusPick(accept);
  };

  if (!prompt || !isMyTurn) return null;

  const { dice, bonus } = prompt;
  const withBonus = dice.total + bonus;

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 300 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: '4px solid #9b59b6' } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        🐇 {(t as any)('tinhTuy.abilities.ui.rabbitBonusTitle')}
      </DialogTitle>

      <DialogContent>
        {/* Dice display */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, mb: 1 }}>
          <Typography sx={{ fontSize: '2.5rem', lineHeight: 1 }}>
            {DICE_EMOJI[dice.dice1] ?? dice.dice1}
          </Typography>
          <Typography sx={{ fontSize: '2.5rem', lineHeight: 1 }}>
            {DICE_EMOJI[dice.dice2] ?? dice.dice2}
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 2 }}>
          {(t as any)('tinhTuy.abilities.ui.rabbitBonusDesc', { total: dice.total, bonus, withBonus })}
        </Typography>

        {/* Accept / Decline buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            disabled={picked}
            onClick={() => handlePick(true)}
            sx={{ bgcolor: '#9b59b6', '&:hover': { bgcolor: '#8e44ad' }, fontWeight: 700, px: 3 }}
          >
            +{bonus} ({withBonus} {(t as any)('tinhTuy.abilities.ui.rabbitSteps')})
          </Button>
          <Button
            variant="outlined"
            disabled={picked}
            onClick={() => handlePick(false)}
            sx={{ borderColor: '#95a5a6', color: '#7f8c8d', fontWeight: 700, px: 3 }}
          >
            {dice.total} {(t as any)('tinhTuy.abilities.ui.rabbitSteps')}
          </Button>
        </Box>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1.5, color: 'text.secondary' }}>
          {(t as any)('tinhTuy.abilities.ui.tapToChoose')}
        </Typography>
      </DialogContent>
    </Dialog>
  );
};
