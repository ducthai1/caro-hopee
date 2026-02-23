/**
 * TinhTuyNegotiateModal — Accept/Reject modal shown to the target player.
 * Also shows a "waiting" overlay to the requester while pending.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PLAYER_COLORS, PropertyGroup } from '../tinh-tuy-types';

export const TinhTuyNegotiateModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, negotiateRespond, negotiateCancel } = useTinhTuy();

  const pending = state.pendingNegotiate;
  if (!pending) return null;

  const isTarget = pending.toSlot === state.mySlot;
  const isRequester = pending.fromSlot === state.mySlot;
  if (!isTarget && !isRequester) return null;

  const accentColor = '#e67e22';
  const fromPlayer = state.players.find(p => p.slot === pending.fromSlot);
  const toPlayer = state.players.find(p => p.slot === pending.toSlot);
  const cell = BOARD_CELLS[pending.cellIndex];
  const groupColor = cell?.group ? GROUP_COLORS[cell.group as PropertyGroup] : '#666';
  const owner = state.players.find(p => p.properties.includes(pending.cellIndex));
  const houses = owner ? (owner.houses || {})[String(pending.cellIndex)] || 0 : 0;
  const hotel = owner ? !!(owner.hotels || {})[String(pending.cellIndex)] : false;

  // Requester sees waiting overlay
  if (isRequester) {
    return (
      <Dialog
        open={true}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, borderTop: `4px solid ${accentColor}` } }}
      >
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: accentColor, mb: 2 }} />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {t('tinhTuy.game.negotiateWaiting' as any)}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            {cell ? t(cell.name as any) : ''} — {pending.offerAmount.toLocaleString()} TT
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            onClick={() => negotiateCancel()}
            variant="outlined"
            color="error"
            size="small"
          >
            {t('tinhTuy.game.negotiateCancel' as any)}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Target sees accept/reject
  return (
    <Dialog
      open={true}
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

      <DialogContent sx={{ pb: 1 }}>
        <Typography variant="body2" sx={{ textAlign: 'center', mb: 2 }}>
          {t('tinhTuy.game.negotiateIncoming' as any, {
            player: fromPlayer?.displayName || `P${pending.fromSlot}`,
            property: cell ? t(cell.name as any) : `#${pending.cellIndex}`,
            amount: pending.offerAmount.toLocaleString(),
          })}
        </Typography>

        {/* Property card */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
          border: '1px solid', borderColor: 'divider', borderRadius: 2,
        }}>
          <Box sx={{ width: 6, alignSelf: 'stretch', bgcolor: groupColor, borderRadius: 1, flexShrink: 0 }} />
          {cell?.icon && (
            <Box component="img" src={`/location/${cell.icon}`} alt=""
              sx={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 1, flexShrink: 0 }} />
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {cell ? t(cell.name as any) : ''}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {hotel ? '🏨 Hotel' : houses > 0 ? `🏠 x${houses}` : t('tinhTuy.game.land' as any)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: accentColor }}>
              {pending.offerAmount.toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>TT</Typography>
          </Box>
        </Box>

        {/* Buyer info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PLAYER_COLORS[pending.fromSlot] }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: PLAYER_COLORS[pending.fromSlot] }}>
            {fromPlayer?.displayName || `P${pending.fromSlot}`}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
            {fromPlayer?.points.toLocaleString()} TT
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={() => negotiateRespond(false)}
          variant="outlined"
          color="error"
          fullWidth
          sx={{ fontWeight: 700 }}
        >
          {t('tinhTuy.game.negotiateReject' as any)}
        </Button>
        <Button
          onClick={() => negotiateRespond(true)}
          variant="contained"
          fullWidth
          sx={{ bgcolor: '#27ae60', fontWeight: 700, '&:hover': { bgcolor: '#219a52' } }}
        >
          {t('tinhTuy.game.negotiateAccept' as any)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
