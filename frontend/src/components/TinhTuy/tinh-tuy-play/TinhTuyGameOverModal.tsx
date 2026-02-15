/**
 * TinhTuyGameOverModal — Overlay shown on top of the game board when game ends.
 * Shows winner, rankings with net worth, reason for ending.
 * Board remains visible behind the semi-transparent overlay.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Chip,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HomeIcon from '@mui/icons-material/Home';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, PLAYER_COLORS, TinhTuyPlayer } from '../tinh-tuy-types';

/** Calculate net worth (cash + property values + building values) — mirrors backend */
function calcNetWorth(player: TinhTuyPlayer): number {
  let worth = player.points;
  for (const cellIdx of player.properties) {
    const cell = BOARD_CELLS[cellIdx];
    if (!cell) continue;
    worth += cell.price || 0;
    const houses = player.houses[String(cellIdx)] || 0;
    worth += houses * (cell.houseCost || 0);
    if (player.hotels[String(cellIdx)]) {
      worth += cell.hotelCost || 0;
    }
  }
  return worth;
}

export const TinhTuyGameOverModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, setView } = useTinhTuy();

  if (state.gameStatus !== 'finished') return null;

  const winner = state.winner;
  const winnerPlayer = winner ? state.players.find(p => p.slot === winner.slot) : null;
  const reason = state.gameEndReason;

  // Rankings: active players sorted by net worth desc, then bankrupt at bottom
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
      maxWidth="sm"
      fullWidth
      TransitionProps={{ timeout: 500 }}
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' } },
      }}
      PaperProps={{
        sx: {
          borderRadius: 4,
          borderTop: '4px solid #f1c40f',
          background: 'linear-gradient(180deg, rgba(241,196,15,0.06) 0%, #fff 30%)',
        },
      }}
    >
      {/* Winner section */}
      <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
        <EmojiEventsIcon sx={{ fontSize: 56, color: '#f1c40f', mb: 0.5 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#2c3e50' }}>
          {t('tinhTuy.result.gameOver' as any)}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
          {reasonText}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Winner card */}
        {winnerPlayer && (
          <Box sx={{
            textAlign: 'center', mb: 2.5, p: 2, borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(241,196,15,0.12) 0%, rgba(155,89,182,0.08) 100%)',
            border: '1px solid rgba(241,196,15,0.3)',
          }}>
            <Typography variant="overline" sx={{ color: '#f1c40f', fontWeight: 800, letterSpacing: 2 }}>
              {t('tinhTuy.result.winner' as any)}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: PLAYER_COLORS[winnerPlayer.slot] || '#9b59b6' }}>
              {winnerPlayer.displayName}
            </Typography>
            <Typography variant="body1" sx={{ color: '#9b59b6', fontWeight: 600, mt: 0.5 }}>
              🔮 {(winner?.finalPoints || winnerPlayer.points || 0).toLocaleString()} TT
            </Typography>
          </Box>
        )}

        {/* Rankings */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          {t('tinhTuy.result.rankings' as any)}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {rankings.map((player, idx) => {
            const netWorth = calcNetWorth(player);
            return (
              <Box
                key={player.slot}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  p: 1.5, borderRadius: 2,
                  borderLeft: `4px solid ${PLAYER_COLORS[player.slot] || '#999'}`,
                  bgcolor: idx === 0 && !player.isBankrupt ? 'rgba(241,196,15,0.06)' : 'rgba(0,0,0,0.02)',
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: 'text.secondary', width: 28, textAlign: 'center' }}>
                  #{idx + 1}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.displayName}
                    {player.slot === state.mySlot && (
                      <Typography component="span" variant="caption" sx={{ color: '#9b59b6', ml: 0.5 }}>
                        ({t('tinhTuy.lobby.you')})
                      </Typography>
                    )}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.25 }}>
                    <Typography variant="caption" sx={{ color: '#9b59b6', fontWeight: 600 }}>
                      🔮 {player.points.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#27ae60', fontWeight: 600 }}>
                      🏠 {player.properties.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {t('tinhTuy.result.netWorth' as any)}: {netWorth.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                {player.isBankrupt && (
                  <Chip
                    label={t('tinhTuy.result.reasonBankrupt' as any)}
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(231,76,60,0.15)', color: '#e74c3c', fontWeight: 600 }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3, px: 3 }}>
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => setView('lobby')}
          sx={{
            flex: 1,
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%)' },
            py: 1.2, fontWeight: 700, borderRadius: 3,
          }}
        >
          {t('tinhTuy.result.backToLobby' as any)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
