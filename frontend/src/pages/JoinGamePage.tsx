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
        sx={{
          background: 'linear-gradient(135deg, #b3d9e6 0%, #d4e8f0 100%)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#1a4a5c', fontWeight: 'bold' }}>
            Caro
          </Typography>
          <Button 
            component={Link} 
            to="/"
            sx={{ color: '#1a4a5c', fontWeight: 600 }}
          >
            Home
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography 
            variant="h4" 
            gutterBottom
            sx={{
              background: 'linear-gradient(135deg, #8fc4d6 0%, #b3d9e6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 'bold',
            }}
          >
            Join Game
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: '#555' }}>
            Enter the room code to join a game
          </Typography>

          <Paper 
            elevation={3} 
            sx={{ 
              p: 4,
              background: 'linear-gradient(135deg, rgba(179, 217, 230, 0.25) 0%, rgba(212, 232, 240, 0.25) 100%)',
              border: '1px solid rgba(179, 217, 230, 0.4)',
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
                  fontSize: '24px',
                  fontFamily: 'monospace',
                  letterSpacing: 4,
                  fontWeight: 'bold',
                },
              }}
              sx={{ mb: 3 }}
              autoFocus
            />

            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleJoin}
              disabled={loading || roomCode.length !== 6}
              sx={{ mb: 2 }}
            >
              {loading ? 'Joining...' : 'Join Game'}
            </Button>

            <Button component={Link} to="/" fullWidth variant="outlined">
              Back to Home
            </Button>
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default JoinGamePage;

