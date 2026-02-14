/**
 * TinhTuyCardModal — Card reveal with 3D flip animation + auto-dismiss.
 */
import React, { useState, useEffect } from 'react';
import { Dialog, Typography, Box } from '@mui/material';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import './tinh-tuy-board.css';

export const TinhTuyCardModal: React.FC = () => {
  const { t } = useLanguage();
  const { state } = useTinhTuy();
  const card = state.drawnCard;
  const [flipped, setFlipped] = useState(false);

  // Reset flip state when new card appears, flip after 300ms
  useEffect(() => {
    if (!card) {
      setFlipped(false);
      return;
    }
    setFlipped(false);
    const timer = setTimeout(() => setFlipped(true), 300);
    return () => clearTimeout(timer);
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!card) return null;

  const isKhiVan = card.type === 'KHI_VAN';
  const gradient = isKhiVan
    ? 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)'
    : 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)';

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: 'visible', bgcolor: 'transparent', boxShadow: 'none' },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <div className="tt-card-flip-container">
          <div className={`tt-card-inner ${flipped ? 'flipped' : ''}`}>
            {/* Back face */}
            <div className="tt-card-face tt-card-back" style={{ background: gradient }}>
              <Typography sx={{ fontSize: '3rem' }}>
                {isKhiVan ? '🎲' : '💎'}
              </Typography>
            </div>
            {/* Front face */}
            <div className="tt-card-face tt-card-front">
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ color: isKhiVan ? '#8e44ad' : '#e67e22', fontWeight: 700, letterSpacing: 1 }}>
                  {isKhiVan ? t('tinhTuy.cards.khiVanTitle' as any) : t('tinhTuy.cards.coHoiTitle' as any)}
                </Typography>
              </Box>
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
