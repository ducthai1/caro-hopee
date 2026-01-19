import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
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
  Divider,
  useTheme,
  useMediaQuery,
  IconButton,
  Skeleton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import LoginIcon from '@mui/icons-material/Login';
import HistoryIcon from '@mui/icons-material/History';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate, Link } from 'react-router-dom';
import GameCard from '../components/GameCard/GameCard';
import { gameApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { BOARD_SIZES, DEFAULT_BOARD_SIZE } from '../utils/constants';
import { validateRoomCode, formatRoomCode } from '../utils/roomCode';
import HistoryModal from '../components/HistoryModal/HistoryModal';
import { socketService } from '../services/socketService';
import { logger } from '../utils/logger';
import { useLanguage } from '../i18n';

interface WaitingGame {
  _id: string;
  roomId: string;
  roomCode: string;
  boardSize: number;
  gameStatus: string;
  displayStatus?: 'waiting' | 'ready' | 'playing';
  statusLabel?: string;
  canJoin?: boolean;
  hasPlayer1: boolean;
  hasPlayer2: boolean;
  playerCount?: number;
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

// Games list defined outside component
// Note: descriptions are keys for i18n
const GAMES: GameItem[] = [
  {
    id: 'caro',
    name: 'Caro',
    icon: '🎯',
    description: 'home.caroDescription',
    available: true,
    color: '#7ec8e3',
  },
  {
    id: 'lucky-wheel',
    name: 'games.luckyWheel',
    icon: '🎡',
    description: 'home.luckyWheelDescription',
    available: false,
    color: '#f39c12',
  },
  {
    id: 'werewolf',
    name: 'games.werewolf',
    icon: '🐺',
    description: 'home.werewolfDescription',
    available: false,
    color: '#9b59b6',
  },
  {
    id: 'uno',
    name: 'games.uno',
    icon: '🃏',
    description: 'home.unoDescription',
    available: false,
    color: '#e74c3c',
  },
  {
    id: 'other',
    name: 'games.otherGames',
    icon: '🎮',
    description: 'home.otherGamesDescription',
    available: false,
    color: '#95a5a6',
  },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useLanguage();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Track mounted games to only animate new ones (fixes Issue #5: Unbounded Set Growth)
  // Using WeakRef-like pattern with manual cleanup when games are removed
  const mountedGamesRef = useRef<Set<string>>(new Set());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup stale entries from mountedGamesRef when games list changes
  useEffect(() => {
    const currentGameIds = new Set(waitingGames.map(g => g.roomId));
    // Remove any tracked games that no longer exist
    mountedGamesRef.current.forEach(roomId => {
      if (!currentGameIds.has(roomId)) {
        mountedGamesRef.current.delete(roomId);
      }
    });
  }, [waitingGames]);

  // Smart merge function - chỉ update phần thay đổi, không replace toàn bộ array
  const smartMergeGames = useCallback((newGames: WaitingGame[], currentGames: WaitingGame[]): WaitingGame[] => {
    const gameMap = new Map<string, WaitingGame>();
    
    // Add all current games to map
    currentGames.forEach(game => {
      gameMap.set(game.roomId, game);
    });
    
    // Track which games are new (for animation)
    const newGameIds = new Set<string>();
    
    // Update or add new games
    newGames.forEach(newGame => {
      const existing = gameMap.get(newGame.roomId);
      if (existing) {
        // Only update if something actually changed
        const hasChanged = 
          existing.gameStatus !== newGame.gameStatus ||
          existing.displayStatus !== newGame.displayStatus ||
          existing.statusLabel !== newGame.statusLabel ||
          existing.playerCount !== newGame.playerCount ||
          existing.canJoin !== newGame.canJoin;
        
        if (hasChanged) {
          gameMap.set(newGame.roomId, newGame);
        }
      } else {
        // New game - add it
        gameMap.set(newGame.roomId, newGame);
        newGameIds.add(newGame.roomId);
      }
    });
    
    // Remove games that no longer exist
    const currentRoomIds = new Set(currentGames.map(g => g.roomId));
    const newRoomIds = new Set(newGames.map(g => g.roomId));
    newRoomIds.forEach(roomId => {
      if (!currentRoomIds.has(roomId)) {
        mountedGamesRef.current.delete(roomId);
      }
    });
    
    // Mark new games as mounted
    newGameIds.forEach(roomId => {
      mountedGamesRef.current.add(roomId);
    });
    
    // Sort by createdAt (newest first)
    return Array.from(gameMap.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, []);

  const handleCreateGame = async (): Promise<void> => {
    try {
      logger.log('[HomePage] Creating game with:', { boardSize, blockTwoEnds });
      const game = await gameApi.create(boardSize, {
        blockTwoEnds,
        allowUndo: true,
        maxUndoPerGame: 3,
        timeLimit: null,
      });

      logger.log('[HomePage] Game created successfully:', game.roomId);
      navigate(`/game/${game.roomId}`);
    } catch (error: any) {
      logger.error('[HomePage] Failed to create game:', error);
      logger.error('[HomePage] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create game. Please try again.';
      alert(`Failed to create game: ${errorMessage}`);
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

  const loadWaitingGames = useCallback(async (silent: boolean = false): Promise<void> => {
    try {
      if (!silent) {
        setLoadingGames(true);
      }
      const games = await gameApi.getWaitingGames();

      // Use startTransition for non-urgent UI updates (improves INP)
      startTransition(() => {
        setWaitingGames(prev => smartMergeGames(games, prev));
      });
    } catch (error) {
      logger.error('Failed to load waiting games:', error);
    } finally {
      if (!silent) {
        setLoadingGames(false);
      }
    }
  }, [smartMergeGames]);

  useEffect(() => {
    // Initial load
    loadWaitingGames();
    
    // Fallback interval - tăng lên 30s (chỉ dùng khi socket không hoạt động)
    const interval = setInterval(() => loadWaitingGames(true), 30000);
    
    // Socket.IO listeners for real-time updates
    const socket = socketService.getSocket();
    // Capture ref value at effect start to avoid stale closure
    const currentTimeoutRef = updateTimeoutRef.current;
    
    if (socket) {
      const handleGameCreated = () => {
        logger.log('[HomePage] Game created event received');
        loadWaitingGames(true); // Silent update - không hiển thị loading
      };
      
      const handleGameStatusUpdated = () => {
        logger.log('[HomePage] Game status updated event received');
        loadWaitingGames(true); // Silent update
      };
      
      const handleGameDeleted = (data: { roomId: string }) => {
        logger.log('[HomePage] Game deleted event received:', data.roomId);
        // Remove game from list immediately without API call
        setWaitingGames(prev => {
          const filtered = prev.filter(game => game.roomId !== data.roomId);
          // Also remove from mounted games ref
          mountedGamesRef.current.delete(data.roomId);
          return filtered;
        });
      };
      
      socket.on('game-created', handleGameCreated);
      socket.on('game-status-updated', handleGameStatusUpdated);
      socket.on('game-deleted', handleGameDeleted);
      
      return () => {
        clearInterval(interval);
        if (currentTimeoutRef) {
          clearTimeout(currentTimeoutRef);
        }
        if (socket) {
          socket.off('game-created', handleGameCreated);
          socket.off('game-status-updated', handleGameStatusUpdated);
          socket.off('game-deleted', handleGameDeleted);
        }
      };
    }
    
    return () => {
      clearInterval(interval);
      if (currentTimeoutRef) {
        clearTimeout(currentTimeoutRef);
      }
    };
  }, [loadWaitingGames]);

  const handleQuickJoin = async (game: WaitingGame): Promise<void> => {
    setJoiningGameId(game.roomId);
    try {
      await gameApi.joinGame(game.roomId);
      navigate(`/game/${game.roomId}`);
    } catch (error: any) {
      logger.error('Failed to join game:', error);
      alert(error.response?.data?.message || 'Failed to join game');
      loadWaitingGames();
    } finally {
      setJoiningGameId(null);
    }
  };

  const drawerWidthExpanded = 340;
  const drawerWidthCollapsed = 112;
  const drawerWidth = isMobile ? drawerWidthExpanded : (sidebarCollapsed ? drawerWidthCollapsed : drawerWidthExpanded);
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
          transition: 'width 0.3s ease',
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
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s ease',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(126, 200, 227, 0.05)',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(126, 200, 227, 0.2)',
              '&:hover': {
                background: 'rgba(126, 200, 227, 0.3)',
              },
            },
          },
        }}
      >
        {/* Header with Toggle Button at TOP */}
        <Box sx={{ p: 2, pb: 2 }}>
          {/* Toggle Button - Desktop only - AT TOP - use transform for smooth slide animation */}
          {!isMobile && (
            <Box sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              mb: 2,
              position: 'relative',
              height: 36,
            }}>
              <IconButton
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                size="small"
                sx={{
                  width: 36,
                  height: 36,
                  position: 'absolute',
                  right: sidebarCollapsed ? `calc(50% - 18px)` : 0, // 18px = half of 36px button width
                  background: 'rgba(126, 200, 227, 0.1)',
                  border: '1px solid rgba(126, 200, 227, 0.2)',
                  color: '#7ec8e3',
                  transition: 'background 0.2s ease, right 0.25s ease',
                  '&:hover': {
                    background: 'rgba(126, 200, 227, 0.2)',
                  },
                }}
              >
                {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </IconButton>
            </Box>
          )}
          {/* Logo and Title - Full width box that matches game items */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1.5,
            borderRadius: 2.5,
            background: 'transparent',
            border: '1px solid transparent',
            justifyContent: sidebarCollapsed && !isMobile ? 'center' : 'flex-start',
          }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                minWidth: 48,
                flexShrink: 0,
                background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(126, 200, 227, 0.25)',
                borderRadius: 2,
              }}
            >
              <Typography sx={{ fontSize: '1.5rem' }}>🎮</Typography>
            </Box>
            <Box
              sx={{
                flex: sidebarCollapsed && !isMobile ? 0 : 1,
                minWidth: 0,
                opacity: sidebarCollapsed && !isMobile ? 0 : 1,
                width: sidebarCollapsed && !isMobile ? 0 : 'auto',
                marginLeft: sidebarCollapsed && !isMobile ? 0 : 1.5,
                overflow: 'hidden',
                transition: 'opacity 0.25s ease, width 0.25s ease, flex 0.25s ease, margin-left 0.25s ease',
              }}
            >
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
                  whiteSpace: 'nowrap',
                }}
              >
                {t('home.title')}
              </Typography>
              <Typography variant="caption" sx={{ color: '#8a9ba8', fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {t('home.subtitle')}
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
                  py: 1.5,
                  px: 2,
                  justifyContent: 'flex-start',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease',
                  // Enhanced styling for Coming Soon games
                  ...((!game.available) && {
                    background: `linear-gradient(135deg, ${game.color}08 0%, ${game.color}04 100%)`,
                    border: `1px solid ${game.color}20`,
                  }),
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    background: game.available
                      ? 'linear-gradient(180deg, #7ec8e3 0%, #a8e6cf 100%)'
                      : `linear-gradient(180deg, ${game.color} 0%, ${game.color}80 100%)`,
                    opacity: selectedGame === game.id ? 1 : (!game.available ? 0.6 : 0),
                    transition: 'opacity 0.25s ease',
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
                    backgroundColor: game.available ? 'rgba(126, 200, 227, 0.06)' : `${game.color}10`,
                  },
                  '&.Mui-disabled': {
                    opacity: 0.7,
                  },
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 56,
                  justifyContent: 'flex-start',
                }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      minWidth: 48,
                      flexShrink: 0,
                      borderRadius: 2,
                      background: selectedGame === game.id
                        ? 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)'
                        : game.available
                          ? 'rgba(126, 200, 227, 0.1)'
                          : `${game.color}15`,
                      border: !game.available ? `1px solid ${game.color}30` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <Typography sx={{ fontSize: '1.5rem' }}>{game.icon}</Typography>
                  </Box>
                </ListItemIcon>
                {/* Text content with smooth fade */}
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    opacity: sidebarCollapsed && !isMobile ? 0 : 1,
                    width: sidebarCollapsed && !isMobile ? 0 : 'auto',
                    overflow: 'hidden',
                    transition: 'opacity 0.2s ease, width 0.25s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: selectedGame === game.id ? 700 : 600,
                        fontSize: '0.9rem',
                        color: selectedGame === game.id ? '#2c3e50' : '#5a6a7a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {game.name.startsWith('games.') ? t(game.name) : game.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.72rem',
                        color: '#8a9ba8',
                        mt: 0.25,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t(game.description)}
                    </Typography>
                  </Box>
                  {!game.available && (
                    <Chip
                      label={t('home.comingSoon')}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.6rem',
                        bgcolor: 'rgba(255, 170, 165, 0.15)',
                        color: '#ffaaa5',
                        fontWeight: 600,
                        border: '1px solid rgba(255, 170, 165, 0.3)',
                        flexShrink: 0,
                        '& .MuiChip-label': {
                          px: 1,
                        },
                      }}
                    />
                  )}
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        
        {/* Auth Section */}
        <Divider sx={{ borderColor: 'rgba(126, 200, 227, 0.12)', mx: 0, mt: 'auto' }} />
        <Box sx={{ p: 2 }}>
          {isAuthenticated ? (
            <>
              {/* User info - with fade transition */}
              <Box
                sx={{
                  mb: 2,
                  opacity: sidebarCollapsed && !isMobile ? 0 : 1,
                  height: sidebarCollapsed && !isMobile ? 0 : 'auto',
                  overflow: 'hidden',
                  transition: 'opacity 0.25s ease, height 0.25s ease',
                }}
              >
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
                      whiteSpace: 'nowrap',
                    }}
                  >
                    👤 {t('home.loggedInAs')}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#2c3e50',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user?.username || 'User'}
                  </Typography>
                </Box>
              </Box>
              {/* Auth buttons - center icons when collapsed, center content when expanded */}
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}>
                <Button
                  component={Link}
                  to="/profile"
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.1) 0%, rgba(168, 230, 207, 0.1) 100%)',
                    border: '1px solid rgba(126, 200, 227, 0.3)',
                    color: '#2c3e50',
                    justifyContent: 'center',
                    width: '100%',
                    minHeight: 56,
                    '&:hover': {
                      background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.2) 0%, rgba(168, 230, 207, 0.2) 100%)',
                      borderColor: 'rgba(126, 200, 227, 0.5)',
                    },
                  }}
                >
                  <PersonIcon sx={{ mr: sidebarCollapsed && !isMobile ? 0 : 1, transition: 'margin 0.25s ease' }} />
                  <Box
                    component="span"
                    sx={{
                      opacity: sidebarCollapsed && !isMobile ? 0 : 1,
                      width: sidebarCollapsed && !isMobile ? 0 : 'auto',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      transition: 'opacity 0.25s ease, width 0.25s ease',
                    }}
                  >
                    {t('home.profile')}
                  </Box>
                </Button>
                <Button
                  component={Link}
                  to="/leaderboard"
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.1) 0%, rgba(168, 230, 207, 0.1) 100%)',
                    border: '1px solid rgba(126, 200, 227, 0.3)',
                    color: '#2c3e50',
                    justifyContent: 'center',
                    width: '100%',
                    minHeight: 56,
                    '&:hover': {
                      background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.2) 0%, rgba(168, 230, 207, 0.2) 100%)',
                      borderColor: 'rgba(126, 200, 227, 0.5)',
                    },
                  }}
                >
                  <LeaderboardIcon sx={{ mr: sidebarCollapsed && !isMobile ? 0 : 1, transition: 'margin 0.25s ease' }} />
                  <Box
                    component="span"
                    sx={{
                      opacity: sidebarCollapsed && !isMobile ? 0 : 1,
                      width: sidebarCollapsed && !isMobile ? 0 : 'auto',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      transition: 'opacity 0.25s ease, width 0.25s ease',
                    }}
                  >
                    {t('home.leaderboard')}
                  </Box>
                </Button>
                <Button
                  onClick={() => setHistoryModalOpen(true)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.1) 0%, rgba(168, 230, 207, 0.1) 100%)',
                    border: '1px solid rgba(126, 200, 227, 0.3)',
                    color: '#2c3e50',
                    justifyContent: 'center',
                    width: '100%',
                    minHeight: 56,
                    '&:hover': {
                      background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.2) 0%, rgba(168, 230, 207, 0.2) 100%)',
                      borderColor: 'rgba(126, 200, 227, 0.5)',
                    },
                  }}
                >
                  <HistoryIcon sx={{ mr: sidebarCollapsed && !isMobile ? 0 : 1, transition: 'margin 0.25s ease' }} />
                  <Box
                    component="span"
                    sx={{
                      opacity: sidebarCollapsed && !isMobile ? 0 : 1,
                      width: sidebarCollapsed && !isMobile ? 0 : 'auto',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      transition: 'opacity 0.25s ease, width 0.25s ease',
                    }}
                  >
                    {t('home.history')}
                  </Box>
                </Button>
                <Button
                  onClick={logout}
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: '#ffaaa5',
                    border: '1px solid rgba(255, 170, 165, 0.3)',
                    justifyContent: 'center',
                    width: '100%',
                    minHeight: 56,
                    '&:hover': {
                      background: 'rgba(255, 170, 165, 0.1)',
                      borderColor: 'rgba(255, 170, 165, 0.5)',
                    },
                  }}
                >
                  <LoginIcon sx={{ mr: sidebarCollapsed && !isMobile ? 0 : 1, transition: 'margin 0.25s ease' }} />
                  <Box
                    component="span"
                    sx={{
                      opacity: sidebarCollapsed && !isMobile ? 0 : 1,
                      width: sidebarCollapsed && !isMobile ? 0 : 'auto',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      transition: 'opacity 0.25s ease, width 0.25s ease',
                    }}
                  >
                    {t('auth.logout')}
                  </Box>
                </Button>
              </Box>
            </>
          ) : (
            <>
              {/* Non-authenticated: History and Login buttons - full width always, center content */}
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}>
                <Button
                  onClick={() => setHistoryModalOpen(true)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.1) 0%, rgba(168, 230, 207, 0.1) 100%)',
                    border: '1px solid rgba(126, 200, 227, 0.3)',
                    color: '#2c3e50',
                    justifyContent: 'center',
                    width: '100%',
                    minHeight: 56,
                    '&:hover': {
                      background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.2) 0%, rgba(168, 230, 207, 0.2) 100%)',
                      borderColor: 'rgba(126, 200, 227, 0.5)',
                    },
                  }}
                >
                  <HistoryIcon sx={{ mr: sidebarCollapsed && !isMobile ? 0 : 1, transition: 'margin 0.25s ease' }} />
                  <Box
                    component="span"
                    sx={{
                      opacity: sidebarCollapsed && !isMobile ? 0 : 1,
                      width: sidebarCollapsed && !isMobile ? 0 : 'auto',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      transition: 'opacity 0.25s ease, width 0.25s ease',
                    }}
                  >
                    {t('home.history')}
                  </Box>
                </Button>
                <Button
                  component={Link}
                  to="/login"
                  sx={{
                    py: 1.75,
                    px: 2,
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(126, 200, 227, 0.3)',
                    justifyContent: 'center',
                    width: '100%',
                    minHeight: 56,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
                      boxShadow: '0 6px 16px rgba(126, 200, 227, 0.4)',
                    },
                  }}
                >
                  <LoginIcon sx={{ mr: sidebarCollapsed && !isMobile ? 0 : 1, transition: 'margin 0.25s ease' }} />
                  <Box
                    component="span"
                    sx={{
                      opacity: sidebarCollapsed && !isMobile ? 0 : 1,
                      width: sidebarCollapsed && !isMobile ? 0 : 'auto',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      transition: 'opacity 0.25s ease, width 0.25s ease',
                    }}
                  >
                    {t('auth.login')} / {t('auth.register')}
                  </Box>
                </Button>
              </Box>
            </>
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
        {/* Mobile Menu Button - Always render, visibility controlled by CSS to prevent CLS */}
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: (theme) => theme.zIndex.drawer + 1,
            // Hide on desktop, show on mobile - CSS-based visibility prevents CLS
            display: { xs: 'block', md: 'none' },
            // Containment to isolate from layout calculations
            contain: 'layout style',
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

        {/* Page Content - Use solid color background for better paint performance */}
        <Box
          sx={{
            flex: 1,
            // Solid color instead of gradient for better paint performance
            bgcolor: '#f8fbff',
          }}
        >
          <Container maxWidth="xl" sx={{ py: { xs: 4, md: 5 }, px: { xs: 2, md: 3 } }}>
            {/* Hero Section - Removed Fade for better INP */}
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
                  {currentGame?.name} {t('home.game')}
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
                  {t('home.heroDescription')}
                </Typography>
              </Box>

            {/* Action Cards */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, 
              gap: { xs: 3, md: 4 },
              mb: 6,
              maxWidth: '1200px',
              mx: 'auto',
            }}>
              {/* Create Game Card - Optimized: removed Fade, backdropFilter, willChange */}
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 3.5, md: 4.5 },
                    background: '#ffffff',
                    border: '1px solid rgba(126, 200, 227, 0.2)',
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(126, 200, 227, 0.12)',
                    // Specific transition instead of 'all'
                    transition: 'box-shadow 0.3s ease',
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
                          {t('home.createNewGame')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#5a6a7a', fontSize: '0.9rem' }}>
                          {t('home.createGameDescription')}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ fontWeight: 500, color: '#5a6a7a' }}>{t('home.boardSize')}</InputLabel>
                    <Select
                      value={boardSize}
                      onChange={(e) => setBoardSize(Number(e.target.value))}
                      label={t('home.boardSize')}
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
                    {/* Fixed button that doesn't change variant to prevent CLS */}
                    <Button
                      variant="contained"
                      onClick={() => setBlockTwoEnds(!blockTwoEnds)}
                      fullWidth
                      sx={{
                        py: 1.5,
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        minHeight: 48,
                        // Use background color change instead of variant change
                        background: blockTwoEnds
                          ? 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)'
                          : 'transparent',
                        color: blockTwoEnds ? '#ffffff' : '#7ec8e3',
                        border: '2px solid #7ec8e3',
                        boxShadow: blockTwoEnds ? '0 4px 12px rgba(126, 200, 227, 0.3)' : 'none',
                        transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                        '&:hover': {
                          background: blockTwoEnds
                            ? 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)'
                            : 'rgba(126, 200, 227, 0.1)',
                          borderColor: '#5ba8c7',
                        },
                      }}
                    >
                      {t('home.blockTwoEnds')}: {blockTwoEnds ? t('gameInfo.on') : t('gameInfo.off')}
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
                    {t('home.createGame')}
                  </Button>
                </Paper>

              {/* Join Game Card - Optimized: removed Fade, backdropFilter, willChange */}
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
                        {t('home.joining')}
                      </>
                    ) : (
                      t('home.joinGame')
                    )}
                  </Button>
                </Paper>
            </Box>

            {/* Waiting Games Section - Optimized with CSS containment for better paint performance */}
            <Box
              sx={{
                maxWidth: '1200px',
                mx: 'auto',
                // CSS containment isolates this section from parent repaints
                contain: 'layout style paint',
                // Force compositor layer for smoother updates
                transform: 'translateZ(0)',
              }}
            >
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
                      {t('home.availableGames')}
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ color: '#5a6a7a', fontSize: '0.95rem', fontWeight: 500 }}>
                    {t('home.joinGameSubtitle')}
                  </Typography>
                </Box>

              {/* Games container - optimized for paint performance */}
              <Box
                sx={{
                  // Fixed height matching 1 row of cards to prevent CLS
                  minHeight: 200,
                  // Isolate this container from parent paint operations
                  contain: 'layout paint',
                }}
              >
                {loadingGames ? (
                  /* Skeleton loaders - same dimensions as real cards to prevent CLS */
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                      gap: 2.5,
                    }}
                  >
                    {[1, 2, 3, 4].map((i) => (
                      <Paper
                        key={i}
                        elevation={0}
                        sx={{
                          p: 3,
                          bgcolor: '#ffffff',
                          border: '1px solid rgba(126, 200, 227, 0.2)',
                          borderRadius: 3,
                          boxShadow: '0 4px 16px rgba(126, 200, 227, 0.1)',
                        }}
                      >
                        <Skeleton variant="text" width="60%" height={40} sx={{ mb: 1.5 }} />
                        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                          <Skeleton variant="rounded" width={60} height={24} />
                          <Skeleton variant="rounded" width={80} height={24} />
                        </Box>
                        <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2.5 }} />
                        <Skeleton variant="rounded" width="100%" height={42} />
                      </Paper>
                    ))}
                  </Box>
                ) : waitingGames.length === 0 ? (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                      gap: 2.5,
                    }}
                  >
                    {/* Empty state card matches skeleton card dimensions */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#ffffff',
                        border: '1px solid rgba(126, 200, 227, 0.2)',
                        borderRadius: 3,
                        boxShadow: '0 4px 16px rgba(126, 200, 227, 0.1)',
                        gridColumn: { xs: '1', sm: '1 / -1' },
                        minHeight: 158, // Match skeleton card height
                      }}
                    >
                      <Typography variant="body1" sx={{ color: '#5a6a7a', fontSize: '1rem', textAlign: 'center' }}>
                        {t('home.noGamesAvailable')}
                      </Typography>
                    </Paper>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                      gap: 2.5,
                    }}
                  >
                    {waitingGames.map((game) => {
                      const isNewGame = !mountedGamesRef.current.has(game.roomId);
                      return (
                        <GameCard
                          key={game.roomId}
                          game={game}
                          isNewGame={isNewGame}
                          joiningGameId={joiningGameId}
                          onJoin={handleQuickJoin}
                        />
                      );
                    })}
                  </Box>
                )}
              </Box>
            </Box>
          </Container>
        </Box>
      </Box>

      {/* History Modal */}
      <HistoryModal open={historyModalOpen} onClose={() => setHistoryModalOpen(false)} />
    </Box>
  );
};

export default HomePage;
