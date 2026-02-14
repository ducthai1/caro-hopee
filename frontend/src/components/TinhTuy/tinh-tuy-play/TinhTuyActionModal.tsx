/**
 * TinhTuyActionModal — Buy/skip modal when landing on unowned property.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PropertyGroup } from '../tinh-tuy-types';

export const TinhTuyActionModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, buyProperty, skipBuy } = useTinhTuy();

  const action = state.pendingAction;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  // Only show for buy action and current player
  if (!action || action.type !== 'BUY_PROPERTY' || !isMyTurn) return null;

  const cell = BOARD_CELLS[action.cellIndex];
  const groupColor = cell?.group ? GROUP_COLORS[cell.group as PropertyGroup] : '#9b59b6';

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, borderTop: `4px solid ${groupColor}` } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 1 }}>
        {t('tinhTuy.game.buyProperty')}
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center' }}>
        {/* Property image */}
        {cell?.icon && (
          <Box
            component="img"
            src={`/location/${cell.icon}`}
            alt=""
            sx={{ width: 80, height: 80, objectFit: 'contain', mx: 'auto', mb: 1, borderRadius: 2 }}
          />
        )}
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          {cell ? t(cell.name as any) : `Cell ${action.cellIndex}`}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#9b59b6', mb: 1 }}>
          {action.price.toLocaleString()} TT
        </Typography>
        {!action.canAfford && (
          <Typography variant="body2" sx={{ color: '#e74c3c', fontWeight: 600 }}>
            {t('tinhTuy.errors.cannotAfford')}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 2.5 }}>
        <Button
          variant="outlined"
          startIcon={<SkipNextIcon />}
          onClick={skipBuy}
          sx={{
            borderColor: 'rgba(0,0,0,0.2)', color: 'text.secondary',
            '&:hover': { borderColor: 'rgba(0,0,0,0.4)', bgcolor: 'rgba(0,0,0,0.04)' },
            px: 3, fontWeight: 600,
          }}
        >
          {t('tinhTuy.game.skipBuy')}
        </Button>
        <Button
          variant="contained"
          startIcon={<ShoppingCartIcon />}
          onClick={buyProperty}
          disabled={!action.canAfford}
          sx={{
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%)' },
            px: 3, fontWeight: 700,
          }}
        >
          {t('tinhTuy.game.buyProperty')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
