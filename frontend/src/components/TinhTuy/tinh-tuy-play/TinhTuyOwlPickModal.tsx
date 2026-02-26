/**
 * TinhTuyOwlPickModal — Owl passive: draw 2 cards, pick 1.
 * Shows when state.owlPickModal is non-null (only for current player).
 * No auto-dismiss — user picks manually. Backend turn timer is the safety net.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Paper, Typography } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { useLanguage } from '../../../i18n';

const CARD_TYPE_EMOJI: Record<string, string> = {
  KHI_VAN: '🔮',
  CO_HOI: '🍀',
};

export const TinhTuyOwlPickModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, owlPick } = useTinhTuy();

  const modal = state.owlPickModal;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const pickedRef = useRef(false);

  // Reset picked state when a new modal opens (new cards array)
  const modalKey = modal?.cards?.map(c => c.id).join(',') ?? '';
  useEffect(() => {
    pickedRef.current = false;
    setSelectedIndex(null);
  }, [modalKey]);

  const handlePick = useCallback((cardId: string, index: number) => {
    if (pickedRef.current) return;
    pickedRef.current = true;
    setSelectedIndex(index);
    owlPick(cardId);
  }, [owlPick]);

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
                onClick={() => handlePick(card.id, index)}
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

        {/* Hint */}
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1.5, color: 'text.secondary' }}>
          {(t as any)('tinhTuy.abilities.ui.tapToChoose')}
        </Typography>
      </DialogContent>
    </Dialog>
  );
};
