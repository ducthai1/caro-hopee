/**
 * HomePage - Main landing page with game selection, creation, and joining
 * Refactored from 1474 lines to use modular components
 */
import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { Box, Container, IconButton, useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import { gameApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_BOARD_SIZE } from '../utils/constants';
import { validateRoomCode, formatRoomCode } from '../utils/roomCode';
import HistoryModal from '../components/HistoryModal/HistoryModal';
import { socketService } from '../services/socketService';
import { logger } from '../utils/logger';
import {
  HomeSidebar,
  HeroSection,
  CreateGameCard,
  JoinGameCard,
  WaitingGamesSection,
  GAMES,
  WaitingGame,
  DRAWER_WIDTH_EXPANDED,
  DRAWER_WIDTH_COLLAPSED,
} from '../components/HomePage';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Game selection state
  const [selectedGame, setSelectedGame] = useState<string>('caro');

  // Create game state
  const [boardSize, setBoardSize] = useState<number>(DEFAULT_BOARD_SIZE);
  const [blockTwoEnds, setBlockTwoEnds] = useState(false);

  // Join game state
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  // Waiting games state
  const [waitingGames, setWaitingGames] = useState<WaitingGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Refs for tracking mounted games and cleanup
  const mountedGamesRef = useRef<Set<string>>(new Set());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate drawer width
  const drawerWidth = isMobile ? DRAWER_WIDTH_EXPANDED : (sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED);
  const currentGame = GAMES.find(g => g.id === selectedGame);

  // Cleanup stale entries from mountedGamesRef
  useEffect(() => {
    const currentGameIds = new Set(waitingGames.map(g => g.roomId));
    mountedGamesRef.current.forEach(roomId => {
      if (!currentGameIds.has(roomId)) {
        mountedGamesRef.current.delete(roomId);
      }
    });
  }, [waitingGames]);

  // Smart merge function for games list
  const smartMergeGames = useCallback((newGames: WaitingGame[], currentGames: WaitingGame[]): WaitingGame[] => {
    const gameMap = new Map<string, WaitingGame>();
    currentGames.forEach(game => gameMap.set(game.roomId, game));

    const newGameIds = new Set<string>();
    newGames.forEach(newGame => {
      const existing = gameMap.get(newGame.roomId);
      if (existing) {
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
        gameMap.set(newGame.roomId, newGame);
        newGameIds.add(newGame.roomId);
      }
    });

    // Remove deleted games
    const currentRoomIds = new Set(currentGames.map(g => g.roomId));
    const newRoomIds = new Set(newGames.map(g => g.roomId));
    newRoomIds.forEach(roomId => {
      if (!currentRoomIds.has(roomId)) {
        mountedGamesRef.current.delete(roomId);
      }
    });

    newGameIds.forEach(roomId => mountedGamesRef.current.add(roomId));

    return Array.from(gameMap.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, []);

  // Load waiting games
  const loadWaitingGames = useCallback(async (silent: boolean = false): Promise<void> => {
    try {
      if (!silent) setLoadingGames(true);
      const games = await gameApi.getWaitingGames();
      startTransition(() => {
        setWaitingGames(prev => smartMergeGames(games, prev));
      });
    } catch (error) {
      logger.error('Failed to load waiting games:', error);
    } finally {
      if (!silent) setLoadingGames(false);
    }
  }, [smartMergeGames]);

  // Socket.IO and polling setup
  useEffect(() => {
    loadWaitingGames();
    const interval = setInterval(() => loadWaitingGames(true), 30000);
    const socket = socketService.getSocket();
    const currentTimeoutRef = updateTimeoutRef.current;

    if (socket) {
      const handleGameCreated = () => {
        logger.log('[HomePage] Game created event received');
        loadWaitingGames(true);
      };

      const handleGameStatusUpdated = () => {
        logger.log('[HomePage] Game status updated event received');
        loadWaitingGames(true);
      };

      const handleGameDeleted = (data: { roomId: string }) => {
        logger.log('[HomePage] Game deleted event received:', data.roomId);
        setWaitingGames(prev => {
          const filtered = prev.filter(game => game.roomId !== data.roomId);
          mountedGamesRef.current.delete(data.roomId);
          return filtered;
        });
      };

      socket.on('game-created', handleGameCreated);
      socket.on('game-status-updated', handleGameStatusUpdated);
      socket.on('game-deleted', handleGameDeleted);

      return () => {
        clearInterval(interval);
        if (currentTimeoutRef) clearTimeout(currentTimeoutRef);
        socket.off('game-created', handleGameCreated);
        socket.off('game-status-updated', handleGameStatusUpdated);
        socket.off('game-deleted', handleGameDeleted);
      };
    }

    return () => {
      clearInterval(interval);
      if (currentTimeoutRef) clearTimeout(currentTimeoutRef);
    };
  }, [loadWaitingGames]);

  // Event handlers
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

  const handleJoinCodeChange = (code: string): void => {
    setJoinRoomCode(code);
    setJoinError('');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fbff' }}>
      {/* Sidebar */}
      <HomeSidebar
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        selectedGame={selectedGame}
        setSelectedGame={setSelectedGame}
        isAuthenticated={isAuthenticated}
        user={user}
        logout={logout}
        onHistoryClick={() => setHistoryModalOpen(true)}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          ml: { md: 0 },
        }}
      >
        {/* Mobile Menu Button */}
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: (theme) => theme.zIndex.drawer + 1,
            display: { xs: 'block', md: 'none' },
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

        {/* Page Content */}
        <Box sx={{ flex: 1, bgcolor: '#f8fbff' }}>
          <Container maxWidth="xl" sx={{ py: { xs: 4, md: 5 }, px: { xs: 2, md: 3 } }}>
            {/* Hero Section */}
            <HeroSection currentGame={currentGame} />

            {/* Action Cards */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                gap: { xs: 3, md: 4 },
                mb: 6,
                maxWidth: '1200px',
                mx: 'auto',
              }}
            >
              <CreateGameCard
                boardSize={boardSize}
                setBoardSize={setBoardSize}
                blockTwoEnds={blockTwoEnds}
                setBlockTwoEnds={setBlockTwoEnds}
                onCreateGame={handleCreateGame}
              />
              <JoinGameCard
                joinRoomCode={joinRoomCode}
                setJoinRoomCode={handleJoinCodeChange}
                joinError={joinError}
                joinLoading={joinLoading}
                onJoinGame={handleJoinGame}
              />
            </Box>

            {/* Waiting Games Section */}
            <WaitingGamesSection
              waitingGames={waitingGames}
              loadingGames={loadingGames}
              joiningGameId={joiningGameId}
              mountedGamesRef={mountedGamesRef}
              onJoin={handleQuickJoin}
            />
          </Container>
        </Box>
      </Box>

      {/* History Modal */}
      <HistoryModal open={historyModalOpen} onClose={() => setHistoryModalOpen(false)} />
    </Box>
  );
};

export default HomePage;
