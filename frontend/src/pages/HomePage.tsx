import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  TextField, 
  CircularProgress, 
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton,
  Fade,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import LoginIcon from '@mui/icons-material/Login';
import { useNavigate, Link } from 'react-router-dom';
import { gameApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { BOARD_SIZES, DEFAULT_BOARD_SIZE } from '../utils/constants';
import { validateRoomCode, formatRoomCode } from '../utils/roomCode';

interface WaitingGame {
  _id: string;
  roomId: string;
  roomCode: string;
  boardSize: number;
  gameStatus: string;
  hasPlayer1: boolean;
  hasPlayer2: boolean;
  player1Username: string | null;
  createdAt: string;
}

interface GameItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  available: boolean;
  color: string;
}

const GAMES: GameItem[] = [
  {
    id: 'caro',
    name: 'Caro',
    icon: '🎯',
    description: 'Classic strategy game',
    available: true,
    color: '#7ec8e3',
  },
  // Future games will be added here
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedGame, setSelectedGame] = useState<string>('caro');
  const [boardSize, setBoardSize] = useState<number>(DEFAULT_BOARD_SIZE);
  const [blockTwoEnds, setBlockTwoEnds] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [waitingGames, setWaitingGames] = useState<WaitingGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const handleCreateGame = async (): Promise<void> => {
    try {
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
      
      const canJoin = game.gameStatus === 'waiting' || 
                     (game.gameStatus === 'playing' && (!game.player2 && !game.player2GuestId));

      if (!canJoin && game.gameStatus !== 'waiting') {
        setJoinError('This game is already full or finished');
        setJoinLoading(false);
        return;
      }

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

  const loadWaitingGames = async (): Promise<void> => {
    try {
      setLoadingGames(true);
      const games = await gameApi.getWaitingGames();
      setWaitingGames(games);
    } catch (error) {
      console.error('Failed to load waiting games:', error);
    } finally {
      setLoadingGames(false);
    }
  };

  useEffect(() => {
    loadWaitingGames();
    const interval = setInterval(loadWaitingGames, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickJoin = async (game: WaitingGame): Promise<void> => {
    setJoiningGameId(game.roomId);
    try {
      await gameApi.joinGame(game.roomId);
      navigate(`/game/${game.roomId}`);
    } catch (error: any) {
      console.error('Failed to join game:', error);
      alert(error.response?.data?.message || 'Failed to join game');
      loadWaitingGames();
    } finally {
      setJoiningGameId(null);
    }
  };

  const drawerWidth = 280;
  const currentGame = GAMES.find(g => g.id === selectedGame);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fbff' }}>
      {/* Sidebar - Game Selection */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: '#ffffff',
            borderRight: '1px solid rgba(126, 200, 227, 0.12)',
            boxShadow: 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(126, 200, 227, 0.05)',
              // borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(126, 200, 227, 0.2)',
              // borderRadius: '3px',
              '&:hover': {
                background: 'rgba(126, 200, 227, 0.3)',
              },
            },
          },
        }}
      >
        <Box sx={{ p: 3, pb: 2.5, pt: 3.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                // borderRadius: 2.5,
                background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(126, 200, 227, 0.25)',
              }}
            >
              <Typography sx={{ fontSize: '1.5rem' }}>🎮</Typography>
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  lineHeight: 1.2,
                  mb: 0.25,
                }}
              >
                Game Hub
              </Typography>
              <Typography variant="caption" sx={{ color: '#8a9ba8', fontSize: '0.75rem', fontWeight: 500 }}>
                Select a game
              </Typography>
            </Box>
          </Box>
        </Box>
        <Divider sx={{ borderColor: 'rgba(126, 200, 227, 0.12)', mx: 0 }} />
        <List sx={{ px: 2, py: 2 }}>
          {GAMES.map((game) => (
            <ListItem key={game.id} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                selected={selectedGame === game.id}
                onClick={() => setSelectedGame(game.id)}
                disabled={!game.available}
                sx={{
                  borderRadius: 2.5,
                  py: 1.75,
                  px: 2,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    background: 'linear-gradient(180deg, #7ec8e3 0%, #a8e6cf 100%)',
                    opacity: selectedGame === game.id ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                  },
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.12) 0%, rgba(168, 230, 207, 0.12) 100%)',
                    border: '1px solid rgba(126, 200, 227, 0.2)',
                    boxShadow: '0 4px 12px rgba(126, 200, 227, 0.15)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.18) 0%, rgba(168, 230, 207, 0.18) 100%)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(126, 200, 227, 0.06)',
                  },
                  '&.Mui-disabled': {
                    opacity: 0.5,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 44 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: selectedGame === game.id 
                        ? 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)'
                        : 'rgba(126, 200, 227, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <Typography sx={{ fontSize: '1.4rem' }}>{game.icon}</Typography>
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={game.name}
                  secondary={game.description}
                  primaryTypographyProps={{
                    fontWeight: selectedGame === game.id ? 700 : 600,
                    fontSize: '0.95rem',
                    color: selectedGame === game.id ? '#2c3e50' : '#5a6a7a',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                    color: '#8a9ba8',
                    mt: 0.25,
                  }}
                />
                {!game.available && (
                  <Chip
                    label="Soon"
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.65rem',
                      bgcolor: 'rgba(255, 170, 165, 0.15)',
                      color: '#ffaaa5',
                      fontWeight: 600,
                      border: '1px solid rgba(255, 170, 165, 0.3)',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        
        {/* Auth Section */}
        <Divider sx={{ borderColor: 'rgba(126, 200, 227, 0.12)', mx: 0, mt: 'auto' }} />
        <Box sx={{ p: 2 }}>
          {isAuthenticated ? (
            <>
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.12) 0%, rgba(168, 230, 207, 0.12) 100%)',
                    border: '1px solid rgba(126, 200, 227, 0.2)',
                    mb: 1.5,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#5a6a7a',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      mb: 0.5,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    👤 Logged in as
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#2c3e50',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      wordBreak: 'break-word',
                    }}
                  >
                    {user?.username || 'User'}
                  </Typography>
                </Box>
              </Box>
              <Button
                component={Link}
                to="/profile"
                fullWidth
                startIcon={<PersonIcon />}
                sx={{
                  mb: 1.5,
                  py: 1.5,
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.1) 0%, rgba(168, 230, 207, 0.1) 100%)',
                  border: '1px solid rgba(126, 200, 227, 0.3)',
                  color: '#2c3e50',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.2) 0%, rgba(168, 230, 207, 0.2) 100%)',
                    borderColor: 'rgba(126, 200, 227, 0.5)',
                  },
                }}
              >
                Profile
              </Button>
              <Button
                component={Link}
                to="/leaderboard"
                fullWidth
                startIcon={<LeaderboardIcon />}
                sx={{
                  mb: 1.5,
                  py: 1.5,
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.1) 0%, rgba(168, 230, 207, 0.1) 100%)',
                  border: '1px solid rgba(126, 200, 227, 0.3)',
                  color: '#2c3e50',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.2) 0%, rgba(168, 230, 207, 0.2) 100%)',
                    borderColor: 'rgba(126, 200, 227, 0.5)',
                  },
                }}
              >
                Leaderboard
              </Button>
              <Button
                onClick={logout}
                fullWidth
                sx={{
                  py: 1.5,
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: '#ffaaa5',
                  border: '1px solid rgba(255, 170, 165, 0.3)',
                  '&:hover': {
                    background: 'rgba(255, 170, 165, 0.1)',
                    borderColor: 'rgba(255, 170, 165, 0.5)',
                  },
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <Button
              component={Link}
              to="/login"
              fullWidth
              startIcon={<LoginIcon />}
              sx={{
                py: 1.75,
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(126, 200, 227, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
                  boxShadow: '0 6px 16px rgba(126, 200, 227, 0.4)',
                },
              }}
            >
              Login / Register
            </Button>
          )}
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          ml: { md: 0 }, // Ensure no margin overlap
        }}
      >
        {/* Mobile Menu Button */}
        {isMobile && (
          <Box
            sx={{
              position: 'fixed',
              top: 16,
              left: 16,
              zIndex: (theme) => theme.zIndex.drawer + 1,
            }}
          >
            <IconButton
              onClick={() => setSidebarOpen(true)}
              sx={{
                width: 48,
                height: 48,
                background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(126, 200, 227, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
                  boxShadow: '0 6px 16px rgba(126, 200, 227, 0.4)',
                },
              }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        )}

        {/* Page Content */}
        <Box sx={{ flex: 1, background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 50%, #f0f9ff 100%)' }}>
          <Container maxWidth="xl" sx={{ py: { xs: 4, md: 5 }, px: { xs: 2, md: 3 } }}>
            {/* Hero Section */}
            <Fade in timeout={600}>
              <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 6 } }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                    boxShadow: '0 8px 24px rgba(126, 200, 227, 0.3)',
                    mb: 2,
                  }}
                >
                  <Typography sx={{ fontSize: '3rem' }}>{currentGame?.icon}</Typography>
                </Box>
                <Typography 
                  variant="h2" 
                  sx={{
                    background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 900,
                    mb: 1.5,
                    fontSize: { xs: '2.25rem', sm: '3rem', md: '3.5rem' },
                    letterSpacing: '-1px',
                    lineHeight: 1.1,
                  }}
                >
                  {currentGame?.name} Game
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: '#5a6a7a', 
                    fontWeight: 400, 
                    fontSize: { xs: '1rem', md: '1.15rem' },
                    maxWidth: '650px',
                    mx: 'auto',
                    lineHeight: 1.7,
                  }}
                >
                  Challenge your friends to an exciting game of strategy and skill
                </Typography>
              </Box>
            </Fade>

            {/* Action Cards */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, 
              gap: { xs: 3, md: 4 },
              mb: 6,
              maxWidth: '1200px',
              mx: 'auto',
            }}>
              {/* Create Game Card */}
              <Fade in timeout={800}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: { xs: 3.5, md: 4.5 },
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    willChange: 'transform',
                    border: '1px solid rgba(126, 200, 227, 0.2)',
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(126, 200, 227, 0.12)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      boxShadow: '0 16px 48px rgba(126, 200, 227, 0.2)',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '5px',
                      background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                      borderRadius: '16px 16px 0 0',
                    },
                  }}
                >
                  <Box sx={{ mb: 3.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2.5,
                          background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(126, 200, 227, 0.3)',
                        }}
                      >
                        <Typography sx={{ fontSize: '1.5rem' }}>✨</Typography>
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
                          Create New Game
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#5a6a7a', fontSize: '0.9rem' }}>
                          Set up your game board and invite friends
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ fontWeight: 500, color: '#5a6a7a' }}>Board Size</InputLabel>
                    <Select
                      value={boardSize}
                      onChange={(e) => setBoardSize(Number(e.target.value))}
                      label="Board Size"
                      sx={{ 
                        borderRadius: 2.5,
                        bgcolor: 'rgba(126, 200, 227, 0.05)',
                      }}
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
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        // Ensure consistent spacing to prevent layout shift
                        boxSizing: 'border-box',
                        minHeight: '48px', // Fixed height to prevent layout shift
                        // For contained variant, no border at all
                        ...(blockTwoEnds && {
                          border: 'none',
                          borderWidth: 0,
                          '&:hover': {
                            border: 'none',
                            borderWidth: 0,
                          },
                          '&:focus': {
                            border: 'none',
                            borderWidth: 0,
                          },
                          '&:focus-visible': {
                            outline: '2px solid rgba(126, 200, 227, 0.5)',
                            outlineOffset: '2px',
                          },
                        }),
                        // For outlined variant, border is visible
                        ...(!blockTwoEnds && {
                          borderWidth: 2,
                          borderColor: '#7ec8e3',
                          borderStyle: 'solid',
                          '&:hover': {
                            borderColor: '#5ba8c7',
                            borderWidth: 2,
                            borderStyle: 'solid',
                          },
                          '&:focus': {
                            borderWidth: 2,
                            borderStyle: 'solid',
                          },
                        }),
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
                      py: 2,
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                      boxShadow: '0 6px 20px rgba(126, 200, 227, 0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
                        boxShadow: '0 8px 28px rgba(126, 200, 227, 0.5)',
                      },
                    }}
                  >
                    🚀 Create Game
                  </Button>
                </Paper>
              </Fade>

              {/* Join Game Card */}
              <Fade in timeout={1000}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: { xs: 3.5, md: 4.5 },
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    willChange: 'transform',
                    border: '1px solid rgba(168, 230, 207, 0.2)',
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(168, 230, 207, 0.12)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
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
                          Join Game
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#5a6a7a', fontSize: '0.9rem' }}>
                          Enter a room code to join an existing game
                        </Typography>
                      </Box>
                    </Box>
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
                  {joinError && (
                    <Box sx={{ 
                      mb: 2.5, 
                      p: 2, 
                      borderRadius: 2.5, 
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
                        Joining...
                      </>
                    ) : (
                      '🎮 Join Game'
                    )}
                  </Button>
                  <Button
                    component={Link}
                    to="/join"
                    variant="outlined"
                    fullWidth
                    sx={{ 
                      borderRadius: 2.5,
                      textTransform: 'none',
                      py: 1.5,
                      borderColor: 'rgba(126, 200, 227, 0.3)',
                      color: '#5a6a7a',
                      '&:hover': {
                        borderColor: '#7ec8e3',
                        bgcolor: 'rgba(126, 200, 227, 0.05)',
                      },
                    }}
                  >
                    Or use join page
                  </Button>
                </Paper>
              </Fade>
            </Box>

            {/* Waiting Games Section */}
            <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
              <Fade in timeout={1200}>
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
                    <Typography
                      component="span"
                      sx={{
                        fontSize: { xs: '1.5rem', md: '1.75rem' },
                        lineHeight: 1,
                      }}
                    >
                      🎮
                    </Typography>
                    <Typography 
                      variant="h4" 
                      sx={{
                        background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontWeight: 800,
                        fontSize: { xs: '1.5rem', md: '2rem' },
                        m: 0,
                      }}
                    >
                      Available Games
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ color: '#5a6a7a', fontSize: '0.95rem', fontWeight: 500 }}>
                    Join a game that's waiting for players
                  </Typography>
                </Box>
              </Fade>

              {loadingGames ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress sx={{ color: '#7ec8e3' }} />
                </Box>
              ) : waitingGames.length === 0 ? (
                <Fade in timeout={1400}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 5,
                      textAlign: 'center',
                      bgcolor: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    willChange: 'transform',
                      border: '1px solid rgba(126, 200, 227, 0.2)',
                      borderRadius: 4,
                      boxShadow: '0 8px 32px rgba(126, 200, 227, 0.1)',
                    }}
                  >
                    <Typography variant="body1" sx={{ color: '#5a6a7a', fontSize: '1rem' }}>
                      No games waiting for players at the moment. Create a new game to get started!
                    </Typography>
                  </Paper>
                </Fade>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                    gap: 2.5,
                  }}
                >
                  {waitingGames.map((game, index) => (
                    <Fade in timeout={1400 + index * 100} key={game._id}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    willChange: 'transform',
                          border: '1px solid rgba(126, 200, 227, 0.2)',
                          borderRadius: 3,
                          boxShadow: '0 4px 16px rgba(126, 200, 227, 0.1)',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          '&:hover': {
                            boxShadow: '0 8px 24px rgba(126, 200, 227, 0.2)',
                            transform: 'translateY(-4px)',
                            borderColor: 'rgba(126, 200, 227, 0.4)',
                          },
                        }}
                        onClick={() => handleQuickJoin(game)}
                      >
                        <Box sx={{ mb: 2.5 }}>
                          <Typography
                            variant="h5"
                            sx={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              letterSpacing: 2,
                              background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                              fontSize: '1.75rem',
                              mb: 1.5,
                            }}
                          >
                            {game.roomCode}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                            <Chip
                              label={`${game.boardSize}x${game.boardSize}`}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(126, 200, 227, 0.15)',
                                color: '#7ec8e3',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                height: 24,
                              }}
                            />
                            <Chip
                              label={game.hasPlayer1 && !game.hasPlayer2 ? '1/2 Players' : 'Waiting'}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(168, 230, 207, 0.15)',
                                color: '#a8e6cf',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                height: 24,
                              }}
                            />
                          </Box>
                          {game.player1Username && (
                            <Typography variant="caption" sx={{ color: '#5a6a7a', fontSize: '0.8rem' }}>
                              Host: {game.player1Username}
                            </Typography>
                          )}
                        </Box>
                        <Button
                          variant="contained"
                          fullWidth
                          disabled={joiningGameId === game.roomId}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickJoin(game);
                          }}
                          sx={{
                            py: 1.25,
                            borderRadius: 2.5,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                            boxShadow: '0 4px 12px rgba(126, 200, 227, 0.3)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
                              boxShadow: '0 6px 16px rgba(126, 200, 227, 0.4)',
                            },
                          }}
                        >
                          {joiningGameId === game.roomId ? (
                            <>
                              <CircularProgress size={16} sx={{ mr: 1, color: '#ffffff' }} />
                              Joining...
                            </>
                          ) : (
                            'Join Game'
                          )}
                        </Button>
                      </Paper>
                    </Fade>
                  ))}
                </Box>
              )}
            </Box>
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
