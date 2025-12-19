import React, { useState } from 'react';
import { Box, Container, Paper, TextField, Button, Typography, CircularProgress } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { gameApi } from '../services/api';
import { validateRoomCode, formatRoomCode } from '../utils/roomCode';

const JoinGamePage: React.FC = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (): Promise<void> => {
    setError('');
    
    const formattedCode = formatRoomCode(roomCode);
    if (!validateRoomCode(formattedCode)) {
      setError('Room code must be 6 characters (A-Z, 0-9)');
      return;
    }

    setLoading(true);
    try {
      const game = await gameApi.getGameByCode(formattedCode);
      
      // Allow joining if game is waiting OR if it's playing but not full
      const canJoin = game.gameStatus === 'waiting' || 
                     (game.gameStatus === 'playing' && (!game.player2 && !game.player2GuestId));

      if (!canJoin && game.gameStatus !== 'waiting') {
        setError('This game is already full or finished');
        setLoading(false);
        return;
      }

      // Join the game
      await gameApi.joinGame(game.roomId);
      navigate(`/game/${game.roomId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Game not found. Please check the room code.');
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setRoomCode(value);
    setError('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 50%, #f0f9ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 4, md: 6 },
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 2 }}>
            <Typography
              component="span"
              sx={{
                fontSize: { xs: '2rem', md: '3rem' },
                lineHeight: 1,
              }}
            >
              🎯
            </Typography>
            <Typography 
              variant="h3" 
              sx={{
                background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 700,
                fontSize: { xs: '2rem', md: '3rem' },
                m: 0,
              }}
            >
              Join Game
            </Typography>
          </Box>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#5a6a7a', 
              fontWeight: 400,
              fontSize: { xs: '1rem', md: '1.1rem' },
            }}
          >
            Enter the room code to join a game
          </Typography>
        </Box>

        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 3, md: 5 },
            background: '#ffffff',
            border: '2px solid transparent',
            borderRadius: 4,
            backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #a8e6cf 0%, #7ec8e3 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 12px 40px rgba(168, 230, 207, 0.15)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 16px 48px rgba(168, 230, 207, 0.2)',
            },
          }}
        >
          <TextField
            fullWidth
            label="Room Code"
            value={roomCode}
            onChange={handleCodeChange}
            placeholder="ABC123"
            inputProps={{
              maxLength: 6,
              style: {
                textAlign: 'center',
                fontSize: '28px',
                fontFamily: 'monospace',
                letterSpacing: 5,
                fontWeight: 'bold',
              },
            }}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
              '& .MuiInputLabel-root': {
                transform: 'translate(14px, 20px) scale(1)',
                '&.MuiInputLabel-shrink': {
                  transform: 'translate(14px, -9px) scale(0.75)',
                },
              },
              '& .MuiOutlinedInput-input': {
                padding: '16.5px 14px',
              },
            }}
            autoFocus
          />

          {error && (
            <Box sx={{ 
              mb: 3, 
              p: 2, 
              borderRadius: 2, 
              bgcolor: 'rgba(255, 170, 165, 0.1)',
              border: '1px solid rgba(255, 170, 165, 0.3)',
            }}>
              <Typography color="error" variant="body2" sx={{ textAlign: 'center', fontWeight: 500 }}>
                {error}
              </Typography>
            </Box>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleJoin}
            disabled={loading || roomCode.length !== 6}
            sx={{ 
              mb: 2,
              py: 1.75,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(168, 230, 207, 0.4)',
              background: 'linear-gradient(135deg, #a8e6cf 0%, #7ec8e3 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #88d6b7 0%, #5ba8c7 100%)',
                boxShadow: '0 6px 20px rgba(168, 230, 207, 0.5)',
              },
              '&:disabled': {
                background: 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)',
                color: '#9e9e9e',
                boxShadow: 'none',
                cursor: 'not-allowed',
                opacity: 0.6,
              },
            }}
            startIcon={loading ? <CircularProgress size={20} sx={{ color: '#ffffff' }} /> : null}
          >
            {loading ? 'Joining...' : '🎮 Join Game'}
          </Button>

          <Button 
            component={Link} 
            to="/" 
            fullWidth 
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              py: 1.25,
            }}
          >
            Back to Home
          </Button>
        </Paper>
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button 
            component={Link} 
            to="/" 
            variant="text"
            sx={{ 
              textTransform: 'none',
              color: '#7ec8e3',
              fontWeight: 600,
              '&:hover': {
                background: 'rgba(126, 200, 227, 0.08)',
              },
            }}
          >
            ← Back to Home
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default JoinGamePage;

