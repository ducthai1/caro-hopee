/**
 * TinhTuyShibaRerollModal — Shiba active: reroll dice then choose original or new result.
 * Shows when state.shibaRerollPrompt is non-null (only for current player).
 * No auto-dismiss — user picks manually. Backend turn timer is the safety net.
 */
import React, { useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Paper, Typography } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { useLanguage } from '../../../i18n';

/** Map dice value 1-6 to Unicode die face emoji */
const DICE_EMOJI: Record<number, string> = {
  1: '⚀',
  2: '⚁',
  3: '⚂',
  4: '⚃',
  5: '⚄',
  6: '⚅',
};

function getDiceFace(value: number): string {
  return DICE_EMOJI[value] ?? String(value);
}

interface DiceOptionProps {
  label: string;
  dice1: number;
  dice2: number;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}

const DiceOption: React.FC<DiceOptionProps> = ({ label, dice1, dice2, isSelected, disabled, onClick }) => {
  const total = dice1 + dice2;
  return (
    <Paper
      onClick={disabled ? undefined : onClick}
      elevation={isSelected ? 6 : 2}
      sx={{
        flex: 1,
        minWidth: 0,
        p: { xs: 1.5, sm: 2 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        borderRadius: 2,
        border: isSelected ? '3px solid #9b59b6' : '2px solid transparent',
        bgcolor: isSelected ? 'rgba(155, 89, 182, 0.08)' : 'background.paper',
        transition: 'all 0.2s ease',
        '&:hover': !disabled
          ? { boxShadow: 6, border: '2px solid #9b59b6', transform: 'translateY(-2px)' }
          : {},
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: '#9b59b6', fontWeight: 700, mb: 0.5, letterSpacing: 0.5, textTransform: 'uppercase' }}
      >
        {label}
      </Typography>

      {/* Dice faces */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
        <Typography sx={{ fontSize: { xs: '2rem', sm: '2.5rem' }, lineHeight: 1 }}>
          {getDiceFace(dice1)}
        </Typography>
        <Typography sx={{ fontSize: { xs: '2rem', sm: '2.5rem' }, lineHeight: 1 }}>
          {getDiceFace(dice2)}
        </Typography>
      </Box>

      {/* Total */}
      <Typography
        variant="h5"
        sx={{ fontWeight: 800, color: '#2c3e50', lineHeight: 1 }}
      >
        {total}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {dice1} + {dice2}
      </Typography>
    </Paper>
  );
};

export const TinhTuyShibaRerollModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, shibaRerollPick } = useTinhTuy();

  const prompt = state.shibaRerollPrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  const [selected, setSelected] = useState<'original' | 'rerolled' | null>(null);
  const pickedRef = useRef(false);

  const handlePick = (choice: 'original' | 'rerolled') => {
    if (pickedRef.current) return;
    pickedRef.current = true;
    setSelected(choice);
    shibaRerollPick(choice);
  };

  if (!prompt || !isMyTurn) return null;

  return (
    <Dialog
      open={true}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ timeout: 300 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: '4px solid #9b59b6' } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        🐕 {t('tinhTuy.abilities.ui.shibaRerollTitle' as any)}
      </DialogTitle>

      <DialogContent>
        {/* Two options side-by-side */}
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mt: 1 }}>
          <DiceOption
            label={t('tinhTuy.abilities.ui.shibaOriginal' as any)}
            dice1={prompt.original.dice1}
            dice2={prompt.original.dice2}
            isSelected={selected === 'original'}
            disabled={selected !== null}
            onClick={() => handlePick('original')}
          />
          <DiceOption
            label={t('tinhTuy.abilities.ui.shibaRerolled' as any)}
            dice1={prompt.rerolled.dice1}
            dice2={prompt.rerolled.dice2}
            isSelected={selected === 'rerolled'}
            disabled={selected !== null}
            onClick={() => handlePick('rerolled')}
          />
        </Box>

        {/* Hint */}
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1.5, color: 'text.secondary' }}>
          {(t as any)('tinhTuy.abilities.ui.tapToChoose')}
        </Typography>
      </DialogContent>
    </Dialog>
  );
};
