/**
 * TinhTuyOwlPickModal — Owl passive: draw 2 cards, pick 1.
 * Shows when state.owlPickModal is non-null (only for current player).
 * 15s countdown — auto-picks index 0 on timeout.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Paper, Typography } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { useLanguage } from '../../../i18n';

const PICK_TIMEOUT_MS = 15000;

const CARD_TYPE_EMOJI: Record<string, string> = {
  KHI_VAN: '🔮',
  CO_HOI: '🍀',
};

export const TinhTuyOwlPickModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, owlPick } = useTinhTuy();

  const modal = state.owlPickModal;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  const [secondsLeft, setSecondsLeft] = useState(15);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const pickedRef = useRef(false);

  const handlePick = (index: number) => {
    if (pickedRef.current) return;
    pickedRef.current = true;
    setSelectedIndex(index);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    owlPick(index);
  };

  useEffect(() => {
    if (!modal || !isMyTurn) return;

    // Reset state when modal opens
    pickedRef.current = false;
    setSelectedIndex(null);
    setSecondsLeft(15);

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = window.setTimeout(() => {
      if (!pickedRef.current) {
        handlePick(0);
      }
    }, PICK_TIMEOUT_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, isMyTurn]);

  if (!modal || !isMyTurn) return null;

  return (
    <Dialog
      open={true}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ timeout: 300 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: '4px solid #9b59b6' } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        🦉 {t('tinhTuy.abilities.ui.owlPickTitle' as any)}
      </DialogTitle>

      <DialogContent>
        {/* Cards side-by-side */}
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, justifyContent: 'center', mt: 1 }}>
          {modal.cards.map((card, index) => {
            const emoji = CARD_TYPE_EMOJI[card.type] || '🎴';
            const isSelected = selectedIndex === index;
            return (
              <Paper
                key={card.id}
                onClick={() => handlePick(index)}
                elevation={isSelected ? 6 : 2}
                sx={{
                  width: { xs: 150, md: 200 },
                  minHeight: { xs: 180, md: 220 },
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: selectedIndex !== null ? 'default' : 'pointer',
                  borderRadius: 2,
                  border: isSelected
                    ? '3px solid #9b59b6'
                    : '2px solid transparent',
                  bgcolor: isSelected ? 'rgba(155, 89, 182, 0.08)' : 'background.paper',
                  transition: 'all 0.2s ease',
                  '&:hover': selectedIndex === null
                    ? { boxShadow: 6, border: '2px solid #9b59b6', transform: 'translateY(-2px)' }
                    : {},
                }}
              >
                <Typography sx={{ fontSize: '2.5rem', mb: 1, lineHeight: 1 }}>
                  {emoji}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, textAlign: 'center', mb: 0.5, color: '#9b59b6' }}
                >
                  {t(card.nameKey as any)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', textAlign: 'center', lineHeight: 1.4 }}
                >
                  {t(card.descriptionKey as any)}
                </Typography>
              </Paper>
            );
          })}
        </Box>

        {/* Countdown */}
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography
            variant="body2"
            sx={{
              color: secondsLeft <= 5 ? '#e74c3c' : 'text.secondary',
              fontWeight: secondsLeft <= 5 ? 700 : 400,
              transition: 'color 0.3s',
            }}
          >
            {secondsLeft}s
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
