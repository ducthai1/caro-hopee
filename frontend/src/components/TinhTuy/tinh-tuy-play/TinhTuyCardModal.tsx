/**
 * TinhTuyCardModal — Card reveal with 3D flip animation + auto-dismiss.
 * Auto-dismiss timer starts only when the card is actually visible
 * (after pendingMove + animatingToken clear).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, Typography, Box } from '@mui/material';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import './tinh-tuy-board.css';

const CARD_DISPLAY_MS = 3500;

export const TinhTuyCardModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, clearCard } = useTinhTuy();
  const card = state.drawnCard;
  const [flipped, setFlipped] = useState(false);
  const dismissTimerRef = useRef<number | null>(null);

  const canShow = !!card && !state.pendingMove && !state.animatingToken;

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  // Flip card 300ms after it becomes VISIBLE (canShow=true, i.e. after movement animation finishes)
  useEffect(() => {
    if (!canShow) {
      setFlipped(false);
      return;
    }
    setFlipped(false);
    const timer = setTimeout(() => setFlipped(true), 300);
    return () => clearTimeout(timer);
  }, [canShow]);

  // Auto-dismiss: start timer only when card becomes visible
  useEffect(() => {
    if (!canShow) return;
    clearDismissTimer();
    dismissTimerRef.current = window.setTimeout(() => {
      clearCard();
      dismissTimerRef.current = null;
    }, CARD_DISPLAY_MS);
    return clearDismissTimer;
  }, [canShow, clearDismissTimer, clearCard]);

  // Cleanup on unmount
  useEffect(() => clearDismissTimer, [clearDismissTimer]);

  // Wait for dice + movement animation to fully finish before showing card
  if (!canShow) return null;

  const isKhiVan = card.type === 'KHI_VAN';
  const gradient = isKhiVan
    ? 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)'
    : 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)';

  const iconSrc = isKhiVan ? '/location/khi-van.png' : '/location/co-hoi.png';

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 400 }}
      PaperProps={{
        sx: { borderRadius: 3, overflow: 'visible', background: 'none', boxShadow: 'none', border: 0, outline: 'none' },
      }}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.5)' } } }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <div className="tt-card-flip-container">
          <div className={`tt-card-inner ${flipped ? 'flipped' : ''}`}>
            {/* Back face */}
            <div className="tt-card-face tt-card-back" style={{ background: gradient }}>
              <Box
                component="img"
                src={iconSrc}
                alt=""
                sx={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 2, opacity: 0.9 }}
              />
            </div>
            {/* Front face */}
            <div className="tt-card-face tt-card-front">
              <Box
                component="img"
                src={iconSrc}
                alt=""
                sx={{ width: 56, height: 56, objectFit: 'contain', mb: 1.5, borderRadius: 1 }}
              />
              <Typography variant="caption" sx={{ color: isKhiVan ? '#8e44ad' : '#e67e22', fontWeight: 700, letterSpacing: 1, mb: 0.5 }}>
                {isKhiVan ? t('tinhTuy.cards.khiVanTitle' as any) : t('tinhTuy.cards.coHoiTitle' as any)}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.3 }}>
                {t(card.nameKey as any)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t(card.descriptionKey as any)}
              </Typography>
            </div>
          </div>
        </div>
      </Box>
    </Dialog>
  );
};
