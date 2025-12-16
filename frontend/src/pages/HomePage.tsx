import React, { useState } from 'react';
import { Box, Container, Typography, Button, Paper, Select, MenuItem, FormControl, InputLabel, AppBar, Toolbar, TextField } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { gameApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { BOARD_SIZES, DEFAULT_BOARD_SIZE } from '../utils/constants';
import { validateRoomCode, formatRoomCode } from '../utils/roomCode';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [boardSize, setBoardSize] = useState<number>(DEFAULT_BOARD_SIZE);
  const [blockTwoEnds, setBlockTwoEnds] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  const handleCreateGame = async (): Promise<void> => {
    try {
      // getGuestId() is called inside gameApi.create
      const game = await gameApi.create(boardSize, {
        blockTwoEnds,
        allowUndo: true,
        maxUndoPerGame: 3,
        timeLimit: null,
      });

      navigate(`/game/${game.roomId}`);
    } catch (error) {
      console.error('Failed to create game:', error);
      alert('Failed to create game');
    }
  };

  const handleJoinGame = async (): Promise<void> => {
    setJoinError('');
    
    const formattedCode = formatRoomCode(joinRoomCode);
    if (!validateRoomCode(formattedCode)) {
      setJoinError('Room code must be 6 characters (A-Z, 0-9)');
      return;
    }

    setJoinLoading(true);
    try {
      const game = await gameApi.getGameByCode(formattedCode);
      
      // Allow joining if game is waiting OR if it's playing but not full
      const canJoin = game.gameStatus === 'waiting' || 
                     (game.gameStatus === 'playing' && (!game.player2 && !game.player2GuestId));

      if (!canJoin && game.gameStatus !== 'waiting') {
        setJoinError('This game is already full or finished');
        setJoinLoading(false);
        return;
      }

      // Join the game
      await gameApi.joinGame(game.roomId);
      navigate(`/game/${game.roomId}`);
    } catch (err: any) {
      setJoinError(err.response?.data?.message || 'Game not found. Please check the room code.');
      setJoinLoading(false);
    }
  };

  const handleJoinCodeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setJoinRoomCode(value);
    setJoinError('');
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
          {isAuthenticated ? (
            <>
              <Button 
                component={Link} 
                to="/profile"
                sx={{ color: '#1a4a5c', fontWeight: 600, mr: 1 }}
              >
                Profile
              </Button>
              <Button 
                component={Link} 
                to="/leaderboard"
                sx={{ color: '#1a4a5c', fontWeight: 600 }}
              >
                Leaderboard
              </Button>
            </>
          ) : (
            <Button 
              component={Link} 
              to="/login"
              sx={{ color: '#1a4a5c', fontWeight: 600 }}
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="md">
        <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography 
          variant="h3" 
          gutterBottom
          sx={{
            background: 'linear-gradient(135deg, #8fc4d6 0%, #b3d9e6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 'bold',
            mb: 2,
          }}
        >
          Caro Game
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: '#555' }}>
          Welcome! Create a new game or join an existing one.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mb: 4 }}>
          <Box sx={{ flex: 1, maxWidth: { md: '500px' } }}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 4,
                background: 'linear-gradient(135deg, rgba(179, 217, 230, 0.25) 0%, rgba(212, 232, 240, 0.25) 100%)',
                border: '1px solid rgba(179, 217, 230, 0.4)',
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ color: '#1a4a5c', fontWeight: 'bold' }}>
                Create New Game
              </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Board Size</InputLabel>
            <Select
              value={boardSize}
              onChange={(e) => setBoardSize(Number(e.target.value))}
              label="Board Size"
            >
              {BOARD_SIZES.map((size) => (
                <MenuItem key={size} value={size}>
                  {size}x{size}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mb: 2 }}>
            <Button
              variant={blockTwoEnds ? 'contained' : 'outlined'}
              onClick={() => setBlockTwoEnds(!blockTwoEnds)}
              fullWidth
            >
              Block Two Ends: {blockTwoEnds ? 'ON' : 'OFF'}
            </Button>
          </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleCreateGame}
                sx={{ mt: 2 }}
              >
                Create Game
              </Button>
            </Paper>
          </Box>

          <Box sx={{ flex: 1, maxWidth: { md: '500px' } }}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 4,
                background: 'linear-gradient(135deg, rgba(168, 213, 226, 0.25) 0%, rgba(200, 229, 239, 0.25) 100%)',
                border: '1px solid rgba(179, 217, 230, 0.4)',
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ color: '#1a4a5c', fontWeight: 'bold' }}>
                Join Game
              </Typography>
              <TextField
                fullWidth
                label="Room Code"
                value={joinRoomCode}
                onChange={handleJoinCodeChange}
                placeholder="ABC123"
                inputProps={{
                  maxLength: 6,
                  style: {
                    textAlign: 'center',
                    fontSize: '20px',
                    fontFamily: 'monospace',
                    letterSpacing: 3,
                    fontWeight: 'bold',
                  },
                }}
                sx={{ mb: 2 }}
              />
              {joinError && (
                <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                  {joinError}
                </Typography>
              )}
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleJoinGame}
                disabled={joinLoading || joinRoomCode.length !== 6}
                sx={{ mb: 1 }}
              >
                {joinLoading ? 'Joining...' : 'Join Game'}
              </Button>
              <Button
                component={Link}
                to="/join"
                variant="outlined"
                fullWidth
                size="small"
              >
                Or use join page
              </Button>
            </Paper>
          </Box>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Button component={Link} to="/leaderboard" variant="outlined" sx={{ mr: 1 }}>
            View Leaderboard
          </Button>
        </Box>
      </Box>
    </Container>
    </>
  );
};

export default HomePage;

