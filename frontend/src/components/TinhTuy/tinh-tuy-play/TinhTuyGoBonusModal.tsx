/**
 * TinhTuyGoBonusModal — Shown when player lands exactly on GO.
 * Random bonus: FREE_UPGRADE (pick property to build free) or BONUS_ROLL/BONUS_POINTS (auto-dismiss).
 */
import React, { useEffect, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, Box, ButtonBase } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PropertyGroup } from '../tinh-tuy-types';

const AUTO_DISMISS_MS = 3000;

export const TinhTuyGoBonusModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, goBonusChoose, clearGoBonus } = useTinhTuy();
  const prompt = state.goBonusPrompt;
  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const dismissRef = useRef<number | null>(null);

  // Auto-dismiss for BONUS_ROLL and BONUS_POINTS (no user interaction needed)
  useEffect(() => {
    if (!prompt || prompt.bonusType === 'FREE_UPGRADE') return;
    dismissRef.current = window.setTimeout(() => {
      clearGoBonus();
    }, AUTO_DISMISS_MS);
    return () => { if (dismissRef.current) clearTimeout(dismissRef.current); };
  }, [prompt, clearGoBonus]);

  if (!prompt) return null;

  const isFreeUpgrade = prompt.bonusType === 'FREE_UPGRADE';
  const isBonusRoll = prompt.bonusType === 'BONUS_ROLL';
  const accentColor = isFreeUpgrade ? '#27ae60' : isBonusRoll ? '#e67e22' : '#f1c40f';
  const icon = isFreeUpgrade
    ? <HomeWorkIcon sx={{ fontSize: 40, color: accentColor }} />
    : isBonusRoll
      ? <CasinoIcon sx={{ fontSize: 40, color: accentColor }} />
      : <MonetizationOnIcon sx={{ fontSize: 40, color: accentColor }} />;

  return (
    <Dialog
      open={true}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ timeout: 400 }}
      PaperProps={{
        sx: {
          borderRadius: 3, borderTop: `4px solid ${accentColor}`,
          animation: 'tt-travel-pulse 1.5s ease-in-out infinite',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5 }}>
        {icon}
        <br />
        <Typography variant="h6" sx={{ fontWeight: 800, color: accentColor }}>
          🎯 {t('tinhTuy.game.goBonusTitle' as any)}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {/* BONUS_ROLL */}
        {isBonusRoll && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: accentColor, mb: 1 }}>
              🎲 {t('tinhTuy.game.goBonusRoll' as any)}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('tinhTuy.game.goBonusRollDesc' as any)}
            </Typography>
          </Box>
        )}

        {/* BONUS_POINTS */}
        {prompt.bonusType === 'BONUS_POINTS' && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: accentColor, mb: 1 }}>
              💰 +{(prompt.amount || 0).toLocaleString()} TT
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('tinhTuy.game.goBonusPointsDesc' as any)}
            </Typography>
          </Box>
        )}

        {/* FREE_UPGRADE — pick a property */}
        {isFreeUpgrade && isMyTurn && prompt.buildableCells && (
          <>
            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 2 }}>
              {t('tinhTuy.game.goBonusUpgradeDesc' as any)}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.5 }}>
              {prompt.buildableCells.map(cellIndex => {
                const cell = BOARD_CELLS[cellIndex];
                if (!cell) return null;
                const groupColor = cell.group ? GROUP_COLORS[cell.group as PropertyGroup] : '#27ae60';
                const myPlayer = state.players.find(p => p.slot === state.mySlot);
                const houses = myPlayer?.houses?.[String(cellIndex)] || 0;
                const isUpgradeToHotel = houses === 4;

                return (
                  <ButtonBase
                    key={cellIndex}
                    onClick={() => goBonusChoose(cellIndex)}
                    sx={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      p: 1.5, borderRadius: 2, border: `2px solid ${groupColor}`,
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: `${groupColor}15`, transform: 'scale(1.03)' },
                    }}
                  >
                    {cell.icon && (
                      <Box
                        component="img"
                        src={`/location/${cell.icon}`}
                        alt=""
                        sx={{ width: 56, height: 56, objectFit: 'contain', mb: 0.5, borderRadius: 1 }}
                      />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
                      {t(cell.name as any)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: isUpgradeToHotel ? '#e67e22' : 'text.secondary', fontWeight: 600 }}>
                      {isUpgradeToHotel ? '🏠×4 → 🏨' : `🏠 ×${houses} → ×${houses + 1}`}
                    </Typography>
                  </ButtonBase>
                );
              })}
            </Box>
          </>
        )}

        {/* Non-current player sees waiting message for FREE_UPGRADE */}
        {isFreeUpgrade && !isMyTurn && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('tinhTuy.game.goBonusWaiting' as any)}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
