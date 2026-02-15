/**
 * TinhTuyBuildPrompt — Modal shown when landing on own buildable property.
 * Offers house/hotel upgrade or skip for the specific cell landed on.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box,
} from '@mui/material';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import ApartmentIcon from '@mui/icons-material/Apartment';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PropertyGroup } from '../tinh-tuy-types';

export const TinhTuyBuildPrompt: React.FC = () => {
  const { t } = useLanguage();
  const { state, buildHouse, buildHotel, skipBuild } = useTinhTuy();

  const bp = state.buildPrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  if (!bp || !isMyTurn) return null;

  const cell = BOARD_CELLS[bp.cellIndex];
  const groupColor = cell?.group ? GROUP_COLORS[cell.group as PropertyGroup] : '#9b59b6';
  const myPlayer = state.players.find(p => p.slot === state.mySlot);
  const myPoints = myPlayer?.points ?? 0;

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 400 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: `4px solid ${groupColor}` } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        {cell?.icon && (
          <Box
            component="img"
            src={`/location/${cell.icon}`}
            alt=""
            sx={{ width: {xs: 260, md: 360}, height: {xs: 260, md: 360}, objectFit: 'contain', display: 'block', mx: 'auto', mb: 1, borderRadius: 2 }}
          />
        )}
        {t('tinhTuy.game.buildTitle' as any)}
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pt: 1 }}>
        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
          {cell ? t(cell.name as any) : `Cell ${bp.cellIndex}`}
        </Typography>

        {/* Current state */}
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          {bp.hasHotel
            ? t('tinhTuy.game.buildHasHotel' as any)
            : bp.currentHouses > 0
              ? t('tinhTuy.game.buildCurrentHouses' as any, { count: bp.currentHouses } as any)
              : t('tinhTuy.game.buildNoHouses' as any)
          }
        </Typography>
      </DialogContent>
      <DialogActions sx={{ flexDirection: 'column', gap: 1, pb: 2.5, px: 3 }}>
        {/* Build House */}
        {bp.canBuildHouse && (
          <Button
            variant="contained"
            fullWidth
            startIcon={<HomeWorkIcon />}
            onClick={() => buildHouse(bp.cellIndex)}
            disabled={myPoints < (bp.houseCost || 0)}
            sx={{
              background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #219a52 0%, #27ae60 100%)' },
              fontWeight: 700, py: 1,
            }}
          >
            {t('tinhTuy.game.buildHouse' as any)} — {(bp.houseCost || 0).toLocaleString()} TT
          </Button>
        )}

        {/* Build Hotel */}
        {bp.canBuildHotel && (
          <Button
            variant="contained"
            fullWidth
            startIcon={<ApartmentIcon />}
            onClick={() => buildHotel(bp.cellIndex)}
            disabled={myPoints < (bp.hotelCost || 0)}
            sx={{
              background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #c0392b 0%, #a93226 100%)' },
              fontWeight: 700, py: 1,
            }}
          >
            {t('tinhTuy.game.buildHotel' as any)} — {(bp.hotelCost || 0).toLocaleString()} TT
          </Button>
        )}

        {/* Skip */}
        <Button
          variant="outlined"
          fullWidth
          startIcon={<SkipNextIcon />}
          onClick={skipBuild}
          sx={{
            borderColor: 'rgba(0,0,0,0.2)', color: 'text.secondary',
            '&:hover': { borderColor: 'rgba(0,0,0,0.4)', bgcolor: 'rgba(0,0,0,0.04)' },
            fontWeight: 600,
          }}
        >
          {t('tinhTuy.game.skipBuild' as any)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
