/**
 * TinhTuyRentFreezeModal — Target selection for Rent Freeze card (ch-25).
 * Player picks an opponent's property to freeze rent for 2 turns.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent,
  Button, Typography, Box,
} from '@mui/material';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PLAYER_COLORS, PropertyGroup } from '../tinh-tuy-types';

export const TinhTuyRentFreezeModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, rentFreezeChoose } = useTinhTuy();

  const rfp = state.rentFreezePrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  if (!rfp || !isMyTurn || state.drawnCard) return null;

  const accentColor = '#3498db';

  // Group target cells by owner
  const cellsByOwner = new Map<number, number[]>();
  for (const cellIdx of rfp.targetCells) {
    const owner = state.players.find(p => p.properties.includes(cellIdx));
    if (!owner) continue;
    const arr = cellsByOwner.get(owner.slot) || [];
    arr.push(cellIdx);
    cellsByOwner.set(owner.slot, arr);
  }

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 400 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: `4px solid ${accentColor}` } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        <AcUnitIcon sx={{ fontSize: 32, color: accentColor, mb: 0.5 }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t('tinhTuy.cards.ch25.name' as any)}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pb: 2, pt: 0 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mb: 1.5 }}>
          {t('tinhTuy.cards.rentFreezeHint' as any)}
        </Typography>

        {Array.from(cellsByOwner.entries()).map(([ownerSlot, cells]) => {
          const owner = state.players.find(p => p.slot === ownerSlot);
          return (
            <Box key={ownerSlot} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PLAYER_COLORS[ownerSlot] }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: PLAYER_COLORS[ownerSlot] }}>
                  {owner?.displayName || `P${ownerSlot}`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                {cells.map(cellIdx => {
                  const cell = BOARD_CELLS[cellIdx];
                  if (!cell) return null;
                  const groupColor = cell.group ? GROUP_COLORS[cell.group as PropertyGroup] : '#666';
                  const houses = owner ? (owner.houses || {})[String(cellIdx)] || 0 : 0;
                  const hotel = owner ? !!(owner.hotels || {})[String(cellIdx)] : false;
                  return (
                    <Button
                      key={cellIdx}
                      onClick={() => rentFreezeChoose(cellIdx)}
                      variant="outlined"
                      fullWidth
                      sx={{
                        justifyContent: 'flex-start', textTransform: 'none',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'rgba(52,152,219,0.08)', borderColor: accentColor },
                      }}
                    >
                      <Box sx={{ width: 6, height: '100%', minHeight: 28, bgcolor: groupColor, borderRadius: 1, mr: 1.5, flexShrink: 0 }} />
                      <Box sx={{ flex: 1, textAlign: 'left' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                          {t(cell.name as any)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {hotel ? '🏨' : houses > 0 ? `🏠×${houses}` : t('tinhTuy.game.land' as any)}
                        </Typography>
                      </Box>
                      <AcUnitIcon sx={{ color: accentColor, fontSize: 18, ml: 1, opacity: 0.6 }} />
                    </Button>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </DialogContent>
    </Dialog>
  );
};
