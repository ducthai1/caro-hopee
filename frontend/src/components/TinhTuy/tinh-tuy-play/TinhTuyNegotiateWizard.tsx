/**
 * TinhTuyNegotiateWizard — 3-step dialog for the requester to send a negotiate offer.
 * Step 1: Select opponent (non-bankrupt players with properties).
 * Step 2: Select one of opponent's properties.
 * Step 3: Slider to set price + confirm.
 */
import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Slider, Stepper, Step, StepLabel,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PLAYER_COLORS, PropertyGroup } from '../tinh-tuy-types';

export const TinhTuyNegotiateWizard: React.FC = () => {
  const { t } = useLanguage();
  const { state, negotiateSend, closeNegotiateWizard } = useTinhTuy();

  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [offerAmount, setOfferAmount] = useState(1000);

  const open = state.negotiateWizardOpen && !state.pendingNegotiate;
  const mySlot = state.mySlot;
  const myPlayer = state.players.find(p => p.slot === mySlot);
  const maxOffer = myPlayer?.points || 1;

  // Step calc
  const step = selectedPlayer == null ? 0 : selectedCell == null ? 1 : 2;

  // Eligible opponents: non-bankrupt, has properties, not me
  const opponents = useMemo(() =>
    state.players.filter(p => !p.isBankrupt && p.slot !== mySlot && p.properties.length > 0),
    [state.players, mySlot]
  );

  // Selected opponent's properties
  const targetProperties = useMemo(() => {
    if (selectedPlayer == null) return [];
    const target = state.players.find(p => p.slot === selectedPlayer);
    return target?.properties || [];
  }, [selectedPlayer, state.players]);

  const handleClose = () => {
    setSelectedPlayer(null);
    setSelectedCell(null);
    setOfferAmount(1000);
    closeNegotiateWizard();
  };

  const handlePlayerSelect = (slot: number) => {
    setSelectedPlayer(slot);
    setSelectedCell(null);
    setOfferAmount(Math.min(1000, maxOffer));
  };

  const handleCellSelect = (cellIndex: number) => {
    setSelectedCell(cellIndex);
    // Set initial offer to cell price or half the max, whichever is smaller
    const cell = BOARD_CELLS[cellIndex];
    const suggestedPrice = cell?.price ? Math.min(cell.price, maxOffer) : Math.min(1000, maxOffer);
    setOfferAmount(suggestedPrice);
  };

  const handleConfirm = () => {
    if (selectedPlayer == null || selectedCell == null) return;
    negotiateSend(selectedPlayer, selectedCell, offerAmount);
    handleClose();
  };

  const handleBack = () => {
    if (step === 2) setSelectedCell(null);
    else if (step === 1) setSelectedPlayer(null);
  };

  if (!open) return null;

  const accentColor = '#e67e22';
  const steps = [
    t('tinhTuy.game.negotiateSelectPlayer' as any),
    t('tinhTuy.game.negotiateSelectProperty' as any),
    t('tinhTuy.game.negotiateSetPrice' as any),
  ];

  const renderPropertyButton = (cellIdx: number, onClick: () => void, isSelected?: boolean) => {
    const cell = BOARD_CELLS[cellIdx];
    if (!cell) return null;
    const groupColor = cell.group ? GROUP_COLORS[cell.group as PropertyGroup] : '#666';
    const owner = state.players.find(p => p.properties.includes(cellIdx));
    const houses = owner ? (owner.houses || {})[String(cellIdx)] || 0 : 0;
    const hotel = owner ? !!(owner.hotels || {})[String(cellIdx)] : false;
    return (
      <Button
        key={cellIdx}
        onClick={onClick}
        variant="outlined"
        fullWidth
        sx={{
          justifyContent: 'flex-start', textTransform: 'none', mb: 0.5,
          borderColor: isSelected ? accentColor : 'divider',
          bgcolor: isSelected ? 'rgba(230,126,34,0.1)' : 'transparent',
          borderWidth: isSelected ? 2 : 1,
          '&:hover': { bgcolor: 'rgba(230,126,34,0.08)', borderColor: accentColor },
        }}
      >
        <Box sx={{ width: 6, height: '100%', minHeight: 28, bgcolor: groupColor, borderRadius: 1, mr: 1, flexShrink: 0 }} />
        {cell.icon && (
          <Box component="img" src={`/location/${cell.icon}`} alt=""
            sx={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 0.5, mr: 1, flexShrink: 0 }} />
        )}
        <Box sx={{ flex: 1, textAlign: 'left' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {t(cell.name as any)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {hotel ? '🏨' : houses > 0 ? `🏠x${houses}` : t('tinhTuy.game.land' as any)}
            {cell.price ? ` | ${cell.price} TT` : ''}
          </Typography>
        </Box>
      </Button>
    );
  };

  return (
    <Dialog
      open={true}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 400 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: `4px solid ${accentColor}` } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        <HandshakeIcon sx={{ fontSize: 32, color: accentColor, mb: 0.5 }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t('tinhTuy.game.negotiateTitle' as any)}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pb: 1, pt: 0 }}>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 2 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 1: Select opponent */}
        {step === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {opponents.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                {t('tinhTuy.game.negotiateSelectPlayer' as any)}
              </Typography>
            ) : opponents.map(p => (
              <Button
                key={p.slot}
                onClick={() => handlePlayerSelect(p.slot)}
                variant="outlined"
                fullWidth
                sx={{
                  justifyContent: 'flex-start', textTransform: 'none',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'rgba(230,126,34,0.08)', borderColor: accentColor },
                }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PLAYER_COLORS[p.slot], mr: 1.5, flexShrink: 0 }} />
                <Box sx={{ flex: 1, textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {p.displayName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {p.properties.length} properties | {p.points.toLocaleString()} TT
                  </Typography>
                </Box>
              </Button>
            ))}
          </Box>
        )}

        {/* Step 2: Select property */}
        {step === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
            {targetProperties.map(ci => renderPropertyButton(ci, () => handleCellSelect(ci)))}
          </Box>
        )}

        {/* Step 3: Set price */}
        {step === 2 && selectedCell != null && (
          <Box>
            {renderPropertyButton(selectedCell, () => {}, true)}
            <Box sx={{ mt: 2, px: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                {t('tinhTuy.game.negotiateSetPrice' as any)}: {offerAmount.toLocaleString()} TT
              </Typography>
              <Slider
                value={offerAmount}
                onChange={(_e, v) => setOfferAmount(v as number)}
                min={1}
                max={maxOffer}
                step={100}
                valueLabelDisplay="auto"
                valueLabelFormat={v => `${v.toLocaleString()} TT`}
                sx={{ color: accentColor }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>1 TT</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{maxOffer.toLocaleString()} TT</Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {step > 0 && (
          <Button onClick={handleBack} size="small">
            Back
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={handleClose} size="small" color="inherit">
          {t('tinhTuy.game.negotiateCancel' as any)}
        </Button>
        {step === 2 && (
          <Button
            onClick={handleConfirm}
            variant="contained"
            size="small"
            disabled={offerAmount < 1}
            sx={{ bgcolor: accentColor, '&:hover': { bgcolor: '#d35400' } }}
          >
            {t('tinhTuy.game.negotiateConfirm' as any)}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
