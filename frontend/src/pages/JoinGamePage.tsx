import React, { useState } from 'react';
import { Box, Container, Paper, TextField, Button, Typography, AppBar, Toolbar } from '@mui/material';
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
    <>
      <AppBar 
        position="static"
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          boxShadow: '0 8px 32px rgba(126, 200, 227, 0.2)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar sx={{ py: 1.5, px: { xs: 2, md: 4 } }}>
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              color: '#ffffff', 
              fontWeight: 700, 
              fontSize: { xs: '1.5rem', md: '2rem' },
              letterSpacing: '-0.5px',
            }}
          >
            🎮 Caro
          </Typography>
          <Button 
            component={Link} 
            to="/"
            sx={{ 
              color: '#ffffff', 
              fontWeight: 600,
              px: 2,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.95rem',
              transition: 'all 0.3s ease',
              '&:hover': { 
                backgroundColor: 'rgba(255,255,255,0.2)',
                transform: 'translateY(-2px)',
              } 
            }}
          >
            Home
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography 
            variant="h3" 
            gutterBottom
            sx={{
              background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '3rem' },
              mb: 2,
            }}
          >
            🎯 Join Game
          </Typography>
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
              transform: 'translateY(-4px)',
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
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
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
            }}
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
      </Container>
    </>
  );
};

export default JoinGamePage;

