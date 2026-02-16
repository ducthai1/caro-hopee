/**
 * TinhTuyAttackPropertyModal — Target selection for attack cards.
 * Player chooses which opponent's property to destroy or downgrade.
 * Grouped by opponent, shows property details + current buildings.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent,
  Button, Typography, Box, Divider,
} from '@mui/material';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PLAYER_COLORS, PropertyGroup } from '../tinh-tuy-types';

export const TinhTuyAttackPropertyModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, attackPropertyChoose } = useTinhTuy();

  const ap = state.attackPrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  // Only show after card modal dismissed
  if (!ap || !isMyTurn || state.drawnCard) return null;

  const isDestroy = ap.attackType === 'DESTROY_PROPERTY';
  const accentColor = isDestroy ? '#e74c3c' : '#e67e22';

  // Group target cells by owner
  const cellsByOwner = new Map<number, number[]>();
  for (const cellIdx of ap.targetCells) {
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
        {isDestroy
          ? <WhatshotIcon sx={{ fontSize: 32, color: accentColor, mb: 0.5 }} />
          : <TrendingDownIcon sx={{ fontSize: 32, color: accentColor, mb: 0.5 }} />
        }
        <br />
        {isDestroy ? t('tinhTuy.game.attackDestroyTitle' as any) : t('tinhTuy.game.attackDowngradeTitle' as any)}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 2 }}>
          {isDestroy ? t('tinhTuy.game.attackDestroyDesc' as any) : t('tinhTuy.game.attackDowngradeDesc' as any)}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[...cellsByOwner.entries()].map(([ownerSlot, cells], gi) => {
            const owner = state.players.find(p => p.slot === ownerSlot);
            if (!owner) return null;
            const ownerColor = PLAYER_COLORS[ownerSlot] || '#999';

            return (
              <Box key={ownerSlot}>
                {gi > 0 && <Divider sx={{ mb: 1 }} />}
                {/* Owner header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ownerColor }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: ownerColor }}>
                    {owner.displayName}
                  </Typography>
                </Box>

                {/* Owner's properties */}
                {cells.map(cellIdx => {
                  const cell = BOARD_CELLS.find(c => c.index === cellIdx);
                  if (!cell) return null;
                  const key = String(cellIdx);
                  const houses = owner.houses[key] || 0;
                  const hasHotel = !!owner.hotels[key];
                  const groupColor = cell.group ? GROUP_COLORS[cell.group as PropertyGroup] : '#999';

                  // For downgrade: show what will happen
                  let downgradeInfo = '';
                  if (!isDestroy) {
                    if (hasHotel) downgradeInfo = t('tinhTuy.game.attackWillRemoveHotel' as any);
                    else if (houses > 0) downgradeInfo = t('tinhTuy.game.attackWillRemoveHouse' as any);
                    else downgradeInfo = t('tinhTuy.game.attackWillDestroy' as any);
                  }

                  return (
                    <Button
                      key={cellIdx}
                      fullWidth
                      onClick={() => attackPropertyChoose(cellIdx)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        p: 1, mb: 0.5, borderRadius: 2, textAlign: 'left', textTransform: 'none',
                        justifyContent: 'flex-start',
                        border: '1px solid rgba(0,0,0,0.08)',
                        '&:hover': { bgcolor: `${accentColor}10`, borderColor: `${accentColor}40` },
                      }}
                    >
                      {/* Cell icon */}
                      {cell.icon && (
                        <Box
                          component="img"
                          src={`/location/${cell.icon}`}
                          alt=""
                          sx={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 1, flexShrink: 0 }}
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.2 }} noWrap>
                          {t(cell.name as any)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: groupColor }} />
                          {hasHotel && <Typography variant="caption" sx={{ color: '#8e44ad', fontWeight: 600 }}>🏨</Typography>}
                          {houses > 0 && <Typography variant="caption" sx={{ color: '#27ae60', fontWeight: 600 }}>🏠 x{houses}</Typography>}
                          {!hasHotel && houses === 0 && <Typography variant="caption" sx={{ color: 'text.disabled' }}>📍</Typography>}
                          {!isDestroy && (
                            <Typography variant="caption" sx={{ color: accentColor, fontWeight: 600, ml: 0.5 }}>
                              → {downgradeInfo}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      {isDestroy
                        ? <WhatshotIcon sx={{ fontSize: 20, color: accentColor }} />
                        : <TrendingDownIcon sx={{ fontSize: 20, color: accentColor }} />
                      }
                    </Button>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
