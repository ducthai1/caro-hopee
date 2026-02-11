/**
 * WordChainResultModal - Game result shown as a dialog overlay on top of
 * the game screen, so players see their win/lose status immediately without
 * losing context of the game they just played.
 */
import React from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, Divider, Slide, IconButton,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import BalanceIcon from '@mui/icons-material/Balance';
import ReplayIcon from '@mui/icons-material/Replay';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import CloseIcon from '@mui/icons-material/Close';
import { useLanguage } from '../../../i18n';
import { useWordChain } from '../WordChainContext';
import { WordChainWinner } from '../word-chain-types';

const MEDAL_ICONS = ['🥇', '🥈', '🥉'];

const SlideUp = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const WordChainResultModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, newGame, leaveRoom, dismissResult } = useWordChain();
  const isDraw = state.winner === 'draw';

  // Determine personal result
  const isWinner = !isDraw && state.winner && typeof state.winner !== 'string'
    && (state.winner as WordChainWinner).slot === state.mySlot;

  // Sort players: winner first, then by score desc, then by lives desc
  const ranked = [...state.players].sort((a, b) => {
    if (!isDraw && state.winner && typeof state.winner !== 'string') {
      const winnerSlot = (state.winner as WordChainWinner).slot;
      if (a.slot === winnerSlot) return -1;
      if (b.slot === winnerSlot) return 1;
    }
    if (b.score !== a.score) return b.score - a.score;
    return b.lives - a.lives;
  });

  const totalWords = state.wordChain.filter(w => w.accepted && w.playerSlot !== 0).length;

  // Personal status config
  const statusConfig = isDraw
    ? { icon: <BalanceIcon sx={{ fontSize: 40, color: '#f39c12' }} />, label: t('wordChain.game.draw'), color: '#f39c12', bg: 'rgba(243, 156, 18, 0.08)' }
    : isWinner
      ? { icon: <EmojiEventsIcon sx={{ fontSize: 40, color: '#f39c12' }} />, label: t('wordChain.game.youWin'), color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.08)' }
      : { icon: <SentimentVeryDissatisfiedIcon sx={{ fontSize: 40, color: '#e74c3c' }} />, label: t('wordChain.game.youLose'), color: '#e74c3c', bg: 'rgba(231, 76, 60, 0.08)' };

  return (
    <Dialog
      open={state.showResult}
      TransitionComponent={SlideUp}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          mx: 2,
          maxHeight: '85vh',
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0, overflow: 'auto' }}>
        {/* Close button */}
        <IconButton
          onClick={dismissResult}
          size="small"
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, color: 'text.secondary' }}
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* Personal Status Banner */}
        <Box
          sx={{
            textAlign: 'center',
            py: 3,
            px: 2,
            background: statusConfig.bg,
            borderBottom: `2px solid ${statusConfig.color}20`,
          }}
        >
          {statusConfig.icon}
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: '1.6rem',
              color: statusConfig.color,
              mt: 0.5,
              lineHeight: 1.2,
            }}
          >
            {statusConfig.label}
          </Typography>
          {!isDraw && state.winner && typeof state.winner !== 'string' && !isWinner && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {(state.winner as WordChainWinner).name || (state.winner as WordChainWinner).guestName || 'Player'}{' '}
              {t('wordChain.game.wins')}
            </Typography>
          )}
        </Box>

        {/* Stats Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-around', py: 1.5, px: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, color: '#2ecc71', fontSize: '1.1rem' }}>
              {totalWords}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('wordChain.game.totalWords')}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, color: '#3498db', fontSize: '1.1rem' }}>
              {state.roundNumber}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('wordChain.game.rounds')}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, color: '#f39c12', fontSize: '1.1rem' }}>
              {state.players.length}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('wordChain.game.playersLabel')}
            </Typography>
          </Box>
        </Box>

        {/* Last Word Display */}
        {state.lastWord && (
          <Box sx={{ mt: 2, mx: 2, textAlign: 'center', p: 1.5, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              {t('wordChain.game.lastWord') || 'Last Word'}
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#34495e' }}>
              {state.lastWord}
            </Typography>
          </Box>
        )}

        {/* Rankings */}
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
            {t('wordChain.game.rankings')}
          </Typography>
          {ranked.map((player, idx) => (
            <Box key={player.slot}>
              {idx > 0 && <Divider sx={{ my: 0.5 }} />}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.75,
                  opacity: player.isEliminated && idx >= 3 ? 0.5 : 1,
                  bgcolor: player.slot === state.mySlot ? 'rgba(46, 204, 113, 0.06)' : 'transparent',
                  borderRadius: 1.5,
                  px: 0.5,
                }}
              >
                {/* Medal / Rank */}
                <Typography sx={{ fontSize: idx < 3 ? '1.3rem' : '0.85rem', width: 30, textAlign: 'center', flexShrink: 0 }}>
                  {idx < 3 ? MEDAL_ICONS[idx] : `#${idx + 1}`}
                </Typography>

                {/* Name */}
                <Typography
                  sx={{
                    flex: 1,
                    fontWeight: player.slot === state.mySlot ? 700 : 500,
                    fontSize: '0.9rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {player.name || 'Player'}
                  {player.slot === state.mySlot && (
                    <Typography component="span" variant="caption" sx={{ ml: 0.5, color: '#2ecc71' }}>
                      ({t('wordChain.you')})
                    </Typography>
                  )}
                  {player.isEliminated && (
                    <Typography component="span" variant="caption" sx={{ ml: 0.5, color: '#e74c3c' }}>
                      ({t('wordChain.game.eliminated')})
                    </Typography>
                  )}
                </Typography>

                {/* Score */}
                <Typography sx={{ fontWeight: 700, color: '#2ecc71', fontSize: '0.9rem', flexShrink: 0 }}>
                  {player.score} {t('wordChain.game.score')}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1.5, p: 2, pt: 1 }}>
          <Button
            variant="contained"
            startIcon={<ReplayIcon />}
            onClick={newGame}
            sx={{
              flex: 1,
              background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #27ae60 0%, #219a52 100%)' },
              py: 1.25,
              fontWeight: 700,
              borderRadius: 2.5,
            }}
          >
            {t('wordChain.game.playAgain')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExitToAppIcon />}
            onClick={leaveRoom}
            sx={{
              flex: 1,
              borderColor: '#e74c3c',
              color: '#e74c3c',
              '&:hover': { borderColor: '#c0392b', background: 'rgba(231, 76, 60, 0.08)' },
              py: 1.25,
              borderRadius: 2.5,
            }}
          >
            {t('wordChain.game.backToLobby')}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
