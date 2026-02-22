/**
 * TinhTuyEminentDomainModal — Target selection for Eminent Domain card (ch-30).
 * Player picks an opponent's property to force-buy at market price.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent,
  Button, Typography, Box,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PLAYER_COLORS, PropertyGroup } from '../tinh-tuy-types';

export const TinhTuyEminentDomainModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, chooseEminentDomain } = useTinhTuy();

  const edp = state.eminentDomainPrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  if (!edp || !isMyTurn || state.drawnCard) return null;

  const accentColor = '#8e44ad';

  // Group target cells by owner
  const cellsByOwner = new Map<number, number[]>();
  for (const cellIdx of edp.targetCells) {
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
        <GavelIcon sx={{ fontSize: 32, color: accentColor, mb: 0.5 }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t('tinhTuy.cards.ch30.name' as any)}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pb: 2, pt: 0 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mb: 1.5 }}>
          {t('tinhTuy.cards.eminentDomainHint' as any)}
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
                  return (
                    <Button
                      key={cellIdx}
                      onClick={() => chooseEminentDomain(cellIdx)}
                      variant="outlined"
                      fullWidth
                      sx={{
                        justifyContent: 'flex-start', textTransform: 'none',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'rgba(142,68,173,0.08)', borderColor: accentColor },
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
                          {houses > 0 ? `🏠×${houses}` : t('tinhTuy.game.land' as any)}
                          {' · '}{cell.price?.toLocaleString()} TT
                        </Typography>
                      </Box>
                      <GavelIcon sx={{ color: accentColor, fontSize: 18, ml: 1, opacity: 0.6 }} />
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
