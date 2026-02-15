/**
 * TinhTuyBuildModal — Build houses/hotels on owned properties (END_TURN phase).
 */
import React, { useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Chip,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PropertyGroup } from '../tinh-tuy-types';

interface BuildableProperty {
  cellIndex: number;
  name: string;
  group: PropertyGroup;
  houses: number;
  hasHotel: boolean;
  houseCost: number;
  canBuildHouse: boolean;
  canBuildHotel: boolean;
}

export const TinhTuyBuildModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const { state, buildHouse, buildHotel } = useTinhTuy();

  const myPlayer = state.players.find(p => p.slot === state.mySlot);

  const buildable = useMemo((): BuildableProperty[] => {
    if (!myPlayer) return [];
    const result: BuildableProperty[] = [];

    // Group owned properties by group
    const groupProps: Record<string, number[]> = {};
    for (const idx of myPlayer.properties) {
      const cell = BOARD_CELLS[idx];
      if (cell?.group) {
        if (!groupProps[cell.group]) groupProps[cell.group] = [];
        groupProps[cell.group].push(idx);
      }
    }

    // Check complete groups
    for (const [group, props] of Object.entries(groupProps)) {
      const allInGroup = BOARD_CELLS.filter(c => c.group === group);
      if (props.length < allInGroup.length) continue; // Not complete set

      for (const idx of props) {
        const cell = BOARD_CELLS[idx];
        if (!cell) continue;
        const houses = (myPlayer.houses || {})[String(idx)] || 0;
        const hasHotel = !!(myPlayer.hotels || {})[String(idx)];
        const houseCost = cell.houseCost || Math.round((cell.price || 0) * 0.5);

        // Even-build: can only build if this is at min level in group
        const minHouses = Math.min(...props.map(i => (myPlayer.houses || {})[String(i)] || 0));
        const canBuildHouse = !hasHotel && houses < 4 && houses <= minHouses && myPlayer.points >= houseCost;
        const canBuildHotel = !hasHotel && houses === 4 && myPlayer.points >= houseCost;

        result.push({
          cellIndex: idx, name: cell.name, group: cell.group as PropertyGroup,
          houses, hasHotel, houseCost, canBuildHouse, canBuildHotel,
        });
      }
    }

    return result;
  }, [myPlayer]);

  if (!open) return null;

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 1 }}>
        {t('tinhTuy.game.buildTitle' as any)}
      </DialogTitle>
      <DialogContent>
        {buildable.length === 0 ? (
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', py: 2 }}>
            {t('tinhTuy.game.noBuildable' as any)}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {buildable.map((prop) => (
              <Box
                key={prop.cellIndex}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
                  borderRadius: 2, bgcolor: 'rgba(0,0,0,0.02)',
                  borderLeft: `4px solid ${GROUP_COLORS[prop.group]}`,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {t(prop.name as any)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    {prop.hasHotel ? (
                      <Chip icon={<ApartmentIcon />} label={t('tinhTuy.game.hotel' as any)} size="small" color="warning" />
                    ) : (
                      <Chip
                        icon={<HomeIcon />}
                        label={`${prop.houses}/4`}
                        size="small"
                        sx={{ bgcolor: 'rgba(39,174,96,0.15)', color: '#27ae60' }}
                      />
                    )}
                    <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
                      {prop.houseCost.toLocaleString()} TT
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {prop.canBuildHouse && (
                    <Button
                      size="small" variant="contained"
                      startIcon={<HomeIcon />}
                      onClick={() => buildHouse(prop.cellIndex)}
                      sx={{
                        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                        fontSize: '0.7rem', px: 1.5,
                      }}
                    >
                      {t('tinhTuy.game.buildHouse' as any)}
                    </Button>
                  )}
                  {prop.canBuildHotel && (
                    <Button
                      size="small" variant="contained"
                      startIcon={<ApartmentIcon />}
                      onClick={() => buildHotel(prop.cellIndex)}
                      sx={{
                        background: 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)',
                        fontSize: '0.7rem', px: 1.5,
                      }}
                    >
                      {t('tinhTuy.game.buildHotel' as any)}
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button onClick={onClose} sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {t('tinhTuy.game.close' as any)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
