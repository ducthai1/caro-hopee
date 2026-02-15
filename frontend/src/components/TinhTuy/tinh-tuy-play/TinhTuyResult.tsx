/**
 * TinhTuyResult — Game result screen: winner + rankings + chat + play again.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Chip,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HomeIcon from '@mui/icons-material/Home';
import ReplayIcon from '@mui/icons-material/Replay';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { PLAYER_COLORS } from '../tinh-tuy-types';
import {
  TinhTuyChatButton,
  TinhTuyFloatingMessage,
  TinhTuyChatOverlay,
} from './TinhTuyChat';

export const TinhTuyResult: React.FC = () => {
  const { t } = useLanguage();
  const { state, setView, sendChat } = useTinhTuy();

  const winner = state.winner;
  const winnerPlayer = winner ? state.players.find(p => p.slot === winner.slot) : null;

  // Sort players by points (descending) for rankings
  const rankings = [...state.players].sort((a, b) => {
    if (a.isBankrupt && !b.isBankrupt) return 1;
    if (!a.isBankrupt && b.isBankrupt) return -1;
    return b.points - a.points;
  });

  // ─── Floating chat messages (same enrichment as WaitingRoom) ───
  const [floatingMsgs, setFloatingMsgs] = useState<Array<{ key: string; msg: any }>>([]);
  const prevLenRef = useRef(state.chatMessages.length);

  useEffect(() => {
    if (state.chatMessages.length > prevLenRef.current) {
      const newMsgs = state.chatMessages.slice(prevLenRef.current);
      const enriched = newMsgs.map((m, i) => {
        const player = state.players.find(p => p.slot === m.slot);
        return {
          key: `${m.timestamp}-${m.slot}-${i}`,
          msg: {
            ...m,
            displayName: player?.displayName || `P${m.slot}`,
            isSelf: m.slot === state.mySlot,
          },
        };
      });
      setFloatingMsgs(prev => [...prev, ...enriched].slice(-20));
    }
    prevLenRef.current = state.chatMessages.length;
  }, [state.chatMessages.length, state.players, state.mySlot]);

  const dismissMsg = useCallback((key: string) => {
    setFloatingMsgs(prev => prev.filter(m => m.key !== key));
  }, []);

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        pt: { xs: '96px', md: 4 },
        width: '100%',
        maxWidth: { xs: '100%', md: 1200 },
        mx: 'auto',
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        position: 'relative',
      }}
    >
      {/* Chat button fallback — when no winner card to host it */}
      {!winner && (
        <Box sx={{ position: 'absolute', top: { xs: 100, md: 16 }, right: { xs: 8, md: 16 }, zIndex: 10 }}>
          <TinhTuyChatButton onSend={sendChat} />
        </Box>
      )}

      {/* Winner Card */}
      {winner && (
        <Paper
          elevation={3}
          sx={{
            p: 3, borderRadius: 4, textAlign: 'center', width: '100%',
            background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.08) 0%, rgba(241, 196, 15, 0.08) 100%)',
            border: '2px solid rgba(241, 196, 15, 0.3)',
            position: 'relative',
          }}
        >
          {/* Chat button — inside winner card top-right */}
          <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
            <TinhTuyChatButton onSend={sendChat} />
          </Box>
          <EmojiEventsIcon sx={{ fontSize: 64, color: '#f1c40f', mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#2c3e50', mb: 0.5 }}>
            {t('tinhTuy.result.winner')}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: PLAYER_COLORS[winner.slot] || '#9b59b6' }}>
            {winnerPlayer?.displayName || winner.guestName || 'Player'}
          </Typography>
          <Typography variant="h6" sx={{ color: '#9b59b6', fontWeight: 600, mt: 0.5 }}>
            🔮 {(winner.finalPoints || winnerPlayer?.points || 0).toLocaleString()} TT
          </Typography>
        </Paper>
      )}

      {/* Rankings */}
      <Paper elevation={1} sx={{ p: 2.5, borderRadius: 3, width: '100%' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t('tinhTuy.result.rankings')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {rankings.map((player, idx) => (
            <Box
              key={player.slot}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                p: 1.5, borderRadius: 2,
                borderLeft: `4px solid ${PLAYER_COLORS[player.slot] || '#999'}`,
                bgcolor: idx === 0 && !player.isBankrupt ? 'rgba(241, 196, 15, 0.06)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'text.secondary', width: 24 }}>
                #{idx + 1}
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {player.displayName}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#9b59b6' }}>
                🔮 {player.points.toLocaleString()}
              </Typography>
              <Chip
                label={`🏠 ${player.properties.length}`}
                size="small"
                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
              />
              {player.isBankrupt && (
                <Chip label={t('tinhTuy.game.bankrupt')} size="small" sx={{ height: 20, bgcolor: 'rgba(231, 76, 60, 0.15)', color: '#e74c3c', fontSize: '0.6rem' }} />
              )}
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
        <Button
          variant="contained"
          startIcon={<ReplayIcon />}
          onClick={() => setView('lobby')}
          sx={{
            flex: 1,
            background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #219a52 0%, #27ae60 100%)' },
            py: 1.5, fontWeight: 700, borderRadius: 3, fontSize: '1rem',
          }}
        >
          {t('tinhTuy.result.playAgain' as any)}
        </Button>
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => setView('lobby')}
          sx={{
            flex: 1,
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%)' },
            py: 1.5, fontWeight: 700, borderRadius: 3, fontSize: '1rem',
          }}
        >
          {t('tinhTuy.result.backToLobby')}
        </Button>
      </Box>

      {/* Floating Chat Messages */}
      <TinhTuyChatOverlay>
        {floatingMsgs.map(({ key, msg }) => (
          <TinhTuyFloatingMessage
            key={key}
            msg={msg}
            msgKey={key}
            onDismiss={() => dismissMsg(key)}
          />
        ))}
      </TinhTuyChatOverlay>
    </Box>
  );
};
