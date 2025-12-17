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
          {isAuthenticated ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                component={Link} 
                to="/profile"
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
                Profile
              </Button>
              <Button 
                component={Link} 
                to="/leaderboard"
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
                Leaderboard
              </Button>
            </Box>
          ) : (
            <Button 
              component={Link} 
              to="/login"
              sx={{ 
                color: '#ffffff', 
                fontWeight: 600,
                px: 3,
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
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 7 } }}>
          <Typography 
            variant="h2" 
            gutterBottom
            sx={{
              background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 800,
              mb: 2,
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
              letterSpacing: '-1px',
              lineHeight: 1.2,
            }}
          >
            Caro Game
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#5a6a7a', 
              fontWeight: 400, 
              fontSize: { xs: '1rem', md: '1.25rem' },
              maxWidth: '600px',
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Challenge your friends to an exciting game of strategy and skill
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
          gap: { xs: 3, md: 4 },
          mb: 4,
          maxWidth: '1200px',
          mx: 'auto',
        }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: { xs: 3, md: 5 },
              background: '#ffffff',
              border: '2px solid transparent',
              borderRadius: 3,
              position: 'relative',
              backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 20px 40px rgba(126, 200, 227, 0.15)',
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '5px',
                background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                borderRadius: '24px 24px 0 0',
              },
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="h5" 
                gutterBottom 
                sx={{ 
                  color: '#2c3e50', 
                  fontWeight: 700, 
                  fontSize: { xs: '1.5rem', md: '1.75rem' },
                  mb: 1,
                }}
              >
                ✨ Create New Game
              </Typography>
              <Typography variant="body2" sx={{ color: '#5a6a7a', fontSize: '0.95rem' }}>
                Set up your game board and invite friends
              </Typography>
            </Box>

            <FormControl fullWidth sx={{ mb: 2.5 }}>
              <InputLabel sx={{ fontWeight: 500 }}>Board Size</InputLabel>
              <Select
                value={boardSize}
                onChange={(e) => setBoardSize(Number(e.target.value))}
                label="Board Size"
                sx={{ borderRadius: 2 }}
              >
                {BOARD_SIZES.map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}x{size}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ mb: 3 }}>
              <Button
                variant={blockTwoEnds ? 'contained' : 'outlined'}
                onClick={() => setBlockTwoEnds(!blockTwoEnds)}
                fullWidth
                sx={{ 
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Block Two Ends: {blockTwoEnds ? 'ON' : 'OFF'}
              </Button>
            </Box>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleCreateGame}
              sx={{ 
                py: 1.75,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(126, 200, 227, 0.4)',
              }}
            >
              🚀 Create Game
            </Button>
          </Paper>

          <Paper 
            elevation={0}
            sx={{ 
              p: { xs: 3, md: 5 },
              background: '#ffffff',
              border: '2px solid transparent',
              borderRadius: 3,
              position: 'relative',
              backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #a8e6cf 0%, #7ec8e3 100%)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 20px 40px rgba(168, 230, 207, 0.15)',
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '5px',
                background: 'linear-gradient(135deg, #a8e6cf 0%, #7ec8e3 100%)',
                borderRadius: '24px 24px 0 0',
              },
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="h5" 
                gutterBottom 
                sx={{ 
                  color: '#2c3e50', 
                  fontWeight: 700, 
                  fontSize: { xs: '1.5rem', md: '1.75rem' },
                  mb: 1,
                }}
              >
                🎯 Join Game
              </Typography>
              <Typography variant="body2" sx={{ color: '#5a6a7a', fontSize: '0.95rem' }}>
                Enter a room code to join an existing game
              </Typography>
            </Box>
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
                  fontSize: '24px',
                  fontFamily: 'monospace',
                  letterSpacing: 4,
                  fontWeight: 'bold',
                },
              }}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            {joinError && (
              <Box sx={{ 
                mb: 2, 
                p: 1.5, 
                borderRadius: 2, 
                bgcolor: 'rgba(255, 170, 165, 0.1)',
                border: '1px solid rgba(255, 170, 165, 0.3)',
              }}>
                <Typography color="error" variant="body2" sx={{ textAlign: 'center', fontWeight: 500 }}>
                  {joinError}
                </Typography>
              </Box>
            )}
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleJoinGame}
              disabled={joinLoading || joinRoomCode.length !== 6}
              sx={{ 
                mb: 1.5,
                py: 1.75,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(168, 230, 207, 0.4)',
              }}
            >
              {joinLoading ? 'Joining...' : '🎮 Join Game'}
            </Button>
            <Button
              component={Link}
              to="/join"
              variant="outlined"
              fullWidth
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                py: 1.25,
              }}
            >
              Or use join page
            </Button>
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default HomePage;

