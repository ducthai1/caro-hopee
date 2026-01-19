/**
 * JoinGameCard - Card component for joining existing games by room code
 */
import React from 'react';
import { Box, Typography, Button, Paper, TextField, CircularProgress } from '@mui/material';
import { useLanguage } from '../../i18n';

interface JoinGameCardProps {
  joinRoomCode: string;
  setJoinRoomCode: (code: string) => void;
  joinError: string;
  joinLoading: boolean;
  onJoinGame: () => void;
}

const JoinGameCard: React.FC<JoinGameCardProps> = ({
  joinRoomCode,
  setJoinRoomCode,
  joinError,
  joinLoading,
  onJoinGame,
}) => {
  const { t } = useLanguage();

  const handleJoinCodeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setJoinRoomCode(value);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3.5, md: 4.5 },
        background: '#ffffff',
        border: '1px solid rgba(168, 230, 207, 0.2)',
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(168, 230, 207, 0.12)',
        transition: 'box-shadow 0.3s ease',
        '&:hover': {
          boxShadow: '0 16px 48px rgba(168, 230, 207, 0.2)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '5px',
          background: 'linear-gradient(135deg, #a8e6cf 0%, #7ec8e3 100%)',
          borderRadius: '16px 16px 0 0',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #a8e6cf 0%, #7ec8e3 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(168, 230, 207, 0.3)',
            }}
          >
            <Typography sx={{ fontSize: '1.5rem' }}>🎯</Typography>
          </Box>
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: '#2c3e50',
                fontWeight: 700,
                fontSize: { xs: '1.4rem', md: '1.6rem' },
                mb: 0.25,
              }}
            >
              {t('home.joinGame')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#5a6a7a', fontSize: '0.9rem' }}>
              {t('home.joinGameDescription')}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Room Code Input */}
      <TextField
        fullWidth
        label={t('home.roomCode')}
        value={joinRoomCode}
        onChange={handleJoinCodeChange}
        placeholder="ABC123"
        inputProps={{
          maxLength: 6,
          style: {
            textAlign: 'center',
            fontSize: '26px',
            fontFamily: 'monospace',
            letterSpacing: 5,
            fontWeight: 'bold',
          },
        }}
        InputLabelProps={{
          shrink: true,
        }}
        sx={{
          mb: 2.5,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2.5,
            bgcolor: 'rgba(168, 230, 207, 0.05)',
            '& fieldset': {
              borderColor: 'rgba(168, 230, 207, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(168, 230, 207, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#a8e6cf',
              borderWidth: 2,
            },
          },
          '& .MuiInputLabel-root': {
            transform: 'translate(14px, 20px) scale(1)',
            '&.MuiInputLabel-shrink': {
              transform: 'translate(14px, -9px) scale(0.75)',
            },
          },
          '& .MuiOutlinedInput-input': {
            padding: '18px 14px',
          },
        }}
      />

      {/* Error Message */}
      {joinError && (
        <Box
          sx={{
            mb: 2.5,
            p: 2,
            borderRadius: 2.5,
            bgcolor: 'rgba(255, 170, 165, 0.1)',
            border: '1px solid rgba(255, 170, 165, 0.3)',
          }}
        >
          <Typography color="error" variant="body2" sx={{ textAlign: 'center', fontWeight: 500 }}>
            {joinError}
          </Typography>
        </Box>
      )}

      {/* Join Game Button */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={onJoinGame}
        disabled={joinLoading || joinRoomCode.length !== 6}
        sx={{
          mb: 1.5,
          py: 2,
          borderRadius: 2.5,
          textTransform: 'none',
          fontSize: '1.05rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #a8e6cf 0%, #7ec8e3 100%)',
          boxShadow: '0 6px 20px rgba(168, 230, 207, 0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #88d6b7 0%, #5ba8c7 100%)',
            boxShadow: '0 8px 28px rgba(168, 230, 207, 0.5)',
          },
          '&:disabled': {
            background: 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)',
            color: '#9e9e9e',
            boxShadow: 'none',
            cursor: 'not-allowed',
            opacity: 0.6,
          },
        }}
      >
        {joinLoading ? (
          <>
            <CircularProgress size={20} sx={{ mr: 1.5, color: '#ffffff' }} />
            {t('home.joining')}
          </>
        ) : (
          t('home.joinGame')
        )}
      </Button>
    </Paper>
  );
};

export default JoinGameCard;
