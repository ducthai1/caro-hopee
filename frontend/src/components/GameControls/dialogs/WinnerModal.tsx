/**
 * WinnerModal - Modal displayed when game is finished showing winner
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { Winner, PlayerNumber } from '../../../types/game.types';

interface WinnerModalProps {
  open: boolean;
  winner: Winner | null;
  myPlayerNumber: PlayerNumber | null;
  score: { player1: number; player2: number };
  winnerMessage: string;
  isLeaving: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
  t: (key: string) => string;
}

const WinnerModal: React.FC<WinnerModalProps> = ({
  open,
  winner,
  myPlayerNumber,
  score,
  winnerMessage,
  isLeaving,
  onPlayAgain,
  onLeaveRoom,
  t,
}) => {
  return (
    <Dialog
      open={open}
      onClose={() => {}}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: '#ffffff',
          borderRadius: 4,
          boxShadow: '0 20px 60px rgba(126, 200, 227, 0.25)',
          border: '2px solid transparent',
          backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          overflow: 'hidden',
        }
      }}
    >
      <DialogTitle
        sx={{
          textAlign: 'center',
          pt: 5,
          pb: 2,
          background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.05) 0%, rgba(168, 230, 207, 0.05) 100%)',
        }}
      >
        <Typography
          variant="h3"
          sx={{
            background: winner === 'draw'
              ? 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)'
              : myPlayerNumber === winner
              ? 'linear-gradient(135deg, #a8e6cf 0%, #7ec8e3 100%)'
              : 'linear-gradient(135deg, #ffb88c 0%, #ffaaa5 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 800,
            mb: 2,
            fontSize: { xs: '2rem', md: '2.5rem' },
          }}
        >
          {winnerMessage}
        </Typography>
        {winner !== 'draw' && (
          <Typography
            variant="h6"
            sx={{
              color: '#5a6a7a',
              mt: 1,
              fontWeight: 500,
              fontSize: '1.1rem',
            }}
          >
            {myPlayerNumber === winner ? `🎉 ${t('gameControls.congratulations')}` : `😔 ${t('gameControls.betterLuckNextTime')}`}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pb: 3, px: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 3,
              color: '#2c3e50',
              fontSize: '1.1rem',
            }}
          >
            🏆 {t('gameControls.finalScore')}
          </Typography>
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 4,
          }}>
            <Box sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: 'rgba(126, 200, 227, 0.1)',
              border: '1px solid rgba(126, 200, 227, 0.3)',
              minWidth: 120,
            }}>
              <Typography variant="body2" sx={{ color: '#5a6a7a', mb: 1, fontWeight: 600 }}>
                {t('game.player1')}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#7ec8e3' }}>
                {score.player1}
              </Typography>
            </Box>
            <Box sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: 'rgba(168, 230, 207, 0.1)',
              border: '1px solid rgba(168, 230, 207, 0.3)',
              minWidth: 120,
            }}>
              <Typography variant="body2" sx={{ color: '#5a6a7a', mb: 1, fontWeight: 600 }}>
                {t('game.player2')}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#a8e6cf' }}>
                {score.player2}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 5, px: 4, gap: 2 }}>
        <Button
          variant="outlined"
          onClick={onLeaveRoom}
          disabled={isLeaving}
          startIcon={isLeaving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{
            minWidth: 160,
            py: 1.5,
            borderRadius: 2,
            borderColor: '#7ec8e3',
            borderWidth: 2,
            color: '#2c3e50',
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '1rem',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: '#5ba8c7',
              borderWidth: 2,
              backgroundColor: 'rgba(126, 200, 227, 0.08)',
            },
          }}
        >
          {t('gameControls.leaveRoom')}
        </Button>
        <Button
          variant="contained"
          onClick={onPlayAgain}
          sx={{
            minWidth: 160,
            py: 1.5,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            color: '#ffffff',
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '1rem',
            boxShadow: '0 4px 14px rgba(126, 200, 227, 0.4)',
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
              boxShadow: '0 6px 20px rgba(126, 200, 227, 0.5)',
            },
          }}
        >
          {t('game.playAgain')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WinnerModal;
