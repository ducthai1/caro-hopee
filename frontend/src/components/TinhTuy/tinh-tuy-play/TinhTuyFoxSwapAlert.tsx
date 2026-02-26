/**
 * TinhTuyFoxSwapAlert — Modal shown when Fox swaps positions with another player.
 * Shown to all players. Auto-dismiss 5s (handled by context timer).
 */
import React from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, Box } from '@mui/material';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { PLAYER_COLORS, BOARD_CELLS, CHARACTER_IMAGES } from '../tinh-tuy-types';

export const TinhTuyFoxSwapAlert: React.FC = () => {
  const { t } = useLanguage();
  const { state, clearFoxSwapAlert } = useTinhTuy();

  const alert = state.foxSwapAlert;
  if (!alert) return null;

  const fox = state.players.find(p => p.slot === alert.foxSlot);
  const target = state.players.find(p => p.slot === alert.targetSlot);
  if (!fox || !target) return null;

  const isMySlotFox = state.mySlot === alert.foxSlot;
  const isMySlotTarget = state.mySlot === alert.targetSlot;

  const foxCell = BOARD_CELLS[alert.foxNewPos];
  const targetCell = BOARD_CELLS[alert.targetNewPos];
  const foxCellName = foxCell ? (t as any)(foxCell.name) : `#${alert.foxNewPos}`;
  const targetCellName = targetCell ? (t as any)(targetCell.name) : `#${alert.targetNewPos}`;

  // Contextual message
  let message: string;
  if (isMySlotTarget) {
    message = (t as any)('tinhTuy.abilities.notifications.foxSwapYouAre', { fox: fox.displayName });
  } else if (isMySlotFox) {
    message = (t as any)('tinhTuy.abilities.notifications.foxSwapYouDid', { target: target.displayName });
  } else {
    message = (t as any)('tinhTuy.abilities.notifications.foxSwap', { name: fox.displayName, target: target.displayName });
  }

  return (
    <Dialog
      open={true}
      onClose={clearFoxSwapAlert}
      maxWidth="xs"
      fullWidth
      hideBackdrop
      disableEnforceFocus
      TransitionProps={{ timeout: 400 }}
      sx={{ pointerEvents: 'none' }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: '4px solid #e67e22', pointerEvents: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        🦊 {(t as any)('tinhTuy.abilities.notifications.foxSwapTitle')}
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pt: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {message}
        </Typography>

        {/* Visual swap: Fox → Target positions */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
          {/* Fox player */}
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Box
              component="img"
              src={CHARACTER_IMAGES[fox.character]}
              alt={fox.character}
              sx={{ width: 48, height: 48, objectFit: 'contain', borderRadius: '50%', border: `3px solid ${PLAYER_COLORS[alert.foxSlot]}`, mb: 0.5 }}
            />
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: PLAYER_COLORS[alert.foxSlot] }}>
              {fox.displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              → {foxCellName}
            </Typography>
          </Box>

          {/* Swap icon */}
          <Typography sx={{ fontSize: 28, lineHeight: 1 }}>🔄</Typography>

          {/* Target player */}
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Box
              component="img"
              src={CHARACTER_IMAGES[target.character]}
              alt={target.character}
              sx={{ width: 48, height: 48, objectFit: 'contain', borderRadius: '50%', border: `3px solid ${PLAYER_COLORS[alert.targetSlot]}`, mb: 0.5 }}
            />
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: PLAYER_COLORS[alert.targetSlot] }}>
              {target.displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              → {targetCellName}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
