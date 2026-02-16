/**
 * TinhTuyBuybackModal — Shown after paying rent on opponent's property.
 * Offers player the option to buy the property from the owner at 110% of total value.
 * If canAfford=false, shows a brief "can't afford" notification that auto-dismisses.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PLAYER_COLORS, PropertyGroup } from '../tinh-tuy-types';

export const TinhTuyBuybackModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, buybackProperty } = useTinhTuy();
  const prompt = state.buybackPrompt;

  if (!prompt) return null;

  // Only show to the player whose turn it is
  const isMe = prompt.slot === state.mySlot;
  const cell = BOARD_CELLS.find(c => c.index === prompt.cellIndex);
  const ownerPlayer = state.players.find(p => p.slot === prompt.ownerSlot);
  const cellName = cell ? (t as any)(cell.name) : `#${prompt.cellIndex}`;
  const groupColor = cell?.group ? GROUP_COLORS[cell.group as PropertyGroup] : '#999';

  // Show "can't afford" brief notification (auto-dismiss via useEffect in context)
  if (!prompt.canAfford && isMe) {
    return (
      <Dialog open maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, textAlign: 'center', p: 2 } }}>
        <DialogContent>
          <MoneyOffIcon sx={{ fontSize: 48, color: '#e74c3c', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#e74c3c', mb: 1 }}>
            {(t as any)('tinhTuy.game.buybackCantAfford')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {cellName} — {prompt.price.toLocaleString()} TT
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  // Only the current player sees the full buyback dialog
  if (!isMe) return null;

  // Show building status
  const ownerHouses = ownerPlayer?.houses[String(prompt.cellIndex)] || 0;
  const ownerHotel = !!ownerPlayer?.hotels[String(prompt.cellIndex)];
  const buildingDesc = ownerHotel
    ? '🏨'
    : ownerHouses > 0
      ? `🏠 x${ownerHouses}`
      : '📍';

  return (
    <Dialog open maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <ShoppingCartIcon sx={{ color: '#9b59b6' }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {(t as any)('tinhTuy.game.buybackTitle')}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {/* Property info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, p: 1.5, bgcolor: 'rgba(155,89,182,0.06)', borderRadius: 2 }}>
          {cell?.icon && (
            <Box
              component="img"
              src={`/location/${cell.icon}`}
              alt={cellName}
              sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover' }}
            />
          )}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: groupColor }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{cellName}</Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {(t as any)('tinhTuy.game.buybackOwner')}: <span style={{ color: PLAYER_COLORS[prompt.ownerSlot], fontWeight: 600 }}>{ownerPlayer?.displayName}</span>
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              {buildingDesc}
            </Typography>
          </Box>
        </Box>

        {/* Price */}
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#9b59b6' }}>
            {prompt.price.toLocaleString()} TT
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {(t as any)('tinhTuy.game.buybackPriceDesc')}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center', gap: 1 }}>
        <Button
          variant="outlined"
          onClick={() => buybackProperty(prompt.cellIndex, false)}
          sx={{ borderColor: 'rgba(0,0,0,0.2)', color: 'text.secondary', fontWeight: 600, flex: 1 }}
        >
          {(t as any)('tinhTuy.game.buybackDecline')}
        </Button>
        <Button
          variant="contained"
          onClick={() => buybackProperty(prompt.cellIndex, true)}
          sx={{
            bgcolor: '#9b59b6', fontWeight: 700, flex: 1,
            '&:hover': { bgcolor: '#8e44ad' },
          }}
        >
          {(t as any)('tinhTuy.game.buybackAccept')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
