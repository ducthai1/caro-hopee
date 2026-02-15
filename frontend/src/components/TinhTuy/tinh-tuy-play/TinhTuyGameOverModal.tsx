/**
 * TinhTuyGameOverModal — Celebratory overlay when game ends.
 * Board remains visible behind blurred backdrop.
 * Animated trophy, winner spotlight, medal-ranked players.
 */
import React from 'react';
import {
  Dialog, DialogContent, DialogActions,
  Button, Typography, Box,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, PLAYER_COLORS, TinhTuyPlayer } from '../tinh-tuy-types';

/** Net worth = cash + property values + building values (mirrors backend) */
function calcNetWorth(player: TinhTuyPlayer): number {
  let worth = player.points;
  for (const cellIdx of player.properties) {
    const cell = BOARD_CELLS[cellIdx];
    if (!cell) continue;
    worth += cell.price || 0;
    const houses = player.houses[String(cellIdx)] || 0;
    worth += houses * (cell.houseCost || 0);
    if (player.hotels[String(cellIdx)]) worth += cell.hotelCost || 0;
  }
  return worth;
}

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_BG = [
  'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.04) 100%)',
  'linear-gradient(135deg, rgba(192,192,192,0.15) 0%, rgba(192,192,192,0.04) 100%)',
  'linear-gradient(135deg, rgba(205,127,50,0.12) 0%, rgba(205,127,50,0.03) 100%)',
];
const MEDAL_BORDER = ['rgba(255,215,0,0.4)', 'rgba(192,192,192,0.4)', 'rgba(205,127,50,0.3)'];

export const TinhTuyGameOverModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, setView } = useTinhTuy();

  if (state.gameStatus !== 'finished') return null;

  const winner = state.winner;
  const winnerPlayer = winner ? state.players.find(p => p.slot === winner.slot) : null;
  const reason = state.gameEndReason;

  const rankings = [...state.players].sort((a, b) => {
    if (a.isBankrupt && !b.isBankrupt) return 1;
    if (!a.isBankrupt && b.isBankrupt) return -1;
    return calcNetWorth(b) - calcNetWorth(a);
  });

  const reasonText = reason === 'roundsComplete'
    ? t('tinhTuy.result.reasonRoundsComplete' as any)
    : t('tinhTuy.result.reasonLastStanding' as any);

  return (
    <Dialog
      open
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 600 }}
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' } },
      }}
      PaperProps={{
        sx: {
          borderRadius: 5, overflow: 'visible', mx: 2,
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(155,89,182,0.15)',
        },
      }}
    >
      {/* ─── Floating trophy ─── */}
      <Box sx={{
        position: 'absolute', top: -38, left: '50%', transform: 'translateX(-50%)',
        width: 76, height: 76, borderRadius: '50%',
        background: 'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(241,196,15,0.4), 0 0 30px rgba(241,196,15,0.2)',
        border: '3px solid #1a1a2e',
        animation: 'tt-trophy-bounce 2s ease-in-out infinite',
      }}>
        <Box sx={{ fontSize: 36, lineHeight: 1 }}>🏆</Box>
      </Box>

      <DialogContent sx={{ pt: 7, pb: 1, px: { xs: 2, sm: 3 } }}>
        {/* Title + reason */}
        <Typography variant="h6" sx={{
          fontWeight: 800, textAlign: 'center', color: '#fff',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {t('tinhTuy.result.gameOver' as any)}
        </Typography>
        <Typography variant="caption" sx={{
          display: 'block', textAlign: 'center', color: 'rgba(255,255,255,0.45)',
          mb: 2.5, mt: 0.3,
        }}>
          {reasonText}
        </Typography>

        {/* ─── Winner spotlight ─── */}
        {winnerPlayer && (
          <Box sx={{
            textAlign: 'center', mb: 3, py: 2, px: 2, borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(241,196,15,0.12) 0%, rgba(155,89,182,0.1) 100%)',
            border: '1px solid rgba(241,196,15,0.2)',
            position: 'relative',
          }}>
            {/* Glow ring behind name */}
            <Box sx={{
              width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 1,
              background: `linear-gradient(135deg, ${PLAYER_COLORS[winnerPlayer.slot]}40, ${PLAYER_COLORS[winnerPlayer.slot]}10)`,
              border: `2px solid ${PLAYER_COLORS[winnerPlayer.slot]}60`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${PLAYER_COLORS[winnerPlayer.slot]}30`,
            }}>
              <Typography sx={{ fontSize: 28, lineHeight: 1 }}>👑</Typography>
            </Box>
            <Typography variant="h6" sx={{
              fontWeight: 700, color: PLAYER_COLORS[winnerPlayer.slot] || '#e2b0ff',
              textShadow: `0 0 12px ${PLAYER_COLORS[winnerPlayer.slot]}40`,
            }}>
              {winnerPlayer.displayName}
            </Typography>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              mt: 0.5, px: 1.5, py: 0.3, borderRadius: 2,
              bgcolor: 'rgba(155,89,182,0.15)',
            }}>
              <Typography sx={{ fontSize: 14 }}>🔮</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#d4a5ff' }}>
                {(winner?.finalPoints || winnerPlayer.points || 0).toLocaleString()} TT
              </Typography>
            </Box>
          </Box>
        )}

        {/* ─── Rankings ─── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {rankings.map((player, idx) => {
            const netWorth = calcNetWorth(player);
            const hasMedal = idx < 3 && !player.isBankrupt;
            const isMe = player.slot === state.mySlot;

            return (
              <Box
                key={player.slot}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.2,
                  p: 1.2, borderRadius: 2.5,
                  background: player.isBankrupt
                    ? 'rgba(231,76,60,0.06)'
                    : hasMedal ? MEDAL_BG[idx] : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${player.isBankrupt ? 'rgba(231,76,60,0.15)' : hasMedal ? MEDAL_BORDER[idx] : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.2s',
                }}
              >
                {/* Rank / Medal */}
                <Box sx={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: hasMedal ? 'transparent' : 'rgba(255,255,255,0.06)',
                }}>
                  {hasMedal ? (
                    <Typography sx={{ fontSize: 22, lineHeight: 1 }}>{MEDAL[idx]}</Typography>
                  ) : (
                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)' }}>
                      #{idx + 1}
                    </Typography>
                  )}
                </Box>

                {/* Player info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {/* Color dot */}
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      bgcolor: PLAYER_COLORS[player.slot] || '#999',
                      boxShadow: `0 0 6px ${PLAYER_COLORS[player.slot]}50`,
                    }} />
                    <Typography variant="body2" sx={{
                      fontWeight: 600, color: player.isBankrupt ? 'rgba(255,255,255,0.35)' : '#fff',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      textDecoration: player.isBankrupt ? 'line-through' : 'none',
                    }}>
                      {player.displayName}
                    </Typography>
                    {isMe && (
                      <Typography variant="caption" sx={{ color: '#9b59b6', fontWeight: 600, flexShrink: 0 }}>
                        ({t('tinhTuy.lobby.you')})
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.2, mt: 0.2 }}>
                    <Typography variant="caption" sx={{ color: '#d4a5ff', fontWeight: 600 }}>
                      🔮 {player.points.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6fcf97', fontWeight: 600 }}>
                      🏠 {player.properties.length}
                    </Typography>
                    {!player.isBankrupt && (
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                        {t('tinhTuy.result.netWorth' as any)}: {netWorth.toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Bankrupt badge */}
                {player.isBankrupt && (
                  <Box sx={{
                    px: 1, py: 0.3, borderRadius: 1.5, flexShrink: 0,
                    bgcolor: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.25)',
                  }}>
                    <Typography variant="caption" sx={{ color: '#e74c3c', fontWeight: 700, fontSize: '0.65rem' }}>
                      {t('tinhTuy.result.reasonBankrupt' as any)}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 3, pt: 2, px: 3 }}>
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => setView('lobby')}
          sx={{
            width: '100%',
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%)', transform: 'translateY(-1px)' },
            py: 1.3, fontWeight: 700, borderRadius: 3, fontSize: '0.95rem',
            boxShadow: '0 4px 15px rgba(155,89,182,0.3)',
            transition: 'all 0.2s',
          }}
        >
          {t('tinhTuy.result.backToLobby' as any)}
        </Button>
      </DialogActions>

      {/* Trophy bounce animation */}
      <style>{`
        @keyframes tt-trophy-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-6px); }
        }
      `}</style>
    </Dialog>
  );
};
