import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { Box, Container, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { gameApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_BOARD_SIZE } from '../../utils/constants';
import { validateRoomCode, formatRoomCode } from '../../utils/roomCode';
import HistoryModal from '../HistoryModal/HistoryModal';
import PasswordDialog from '../PasswordDialog/PasswordDialog';
import { socketService } from '../../services/socketService';
import { useSocket } from '../../contexts/SocketContext';
import { logger } from '../../utils/logger';
import { useToast } from '../../contexts/ToastContext';
import { useMainLayout } from './MainLayoutContext';
import {
  HeroSection,
  CreateGameCard,
  JoinGameCard,
  WaitingGamesSection,
  GAMES,
  WaitingGame,
} from '../HomePage';

const HomePageContent: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isConnected: socketConnected } = useSocket();
  const { openGuestNameDialog } = useMainLayout();
  const toast = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Create game state
  const [boardSize, setBoardSize] = useState<number>(DEFAULT_BOARD_SIZE);
  const [blockTwoEnds, setBlockTwoEnds] = useState(false);

  // Join game state
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingJoinRoomId, setPendingJoinRoomId] = useState<string | null>(null);

  // Waiting games state
  const [waitingGames, setWaitingGames] = useState<WaitingGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);

  // UI state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Listen to context events
  useEffect(() => {
    // This will be handled by a ref or event system
    // For now, we'll use a simple approach with a custom event
    const handleOpenHistory = () => setHistoryModalOpen(true);

    window.addEventListener('openHistoryModal', handleOpenHistory);

    return () => {
      window.removeEventListener('openHistoryModal', handleOpenHistory);
    };
  }, []);

  // Refs for tracking mounted games and cleanup
  const mountedGamesRef = useRef<Set<string>>(new Set());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const currentGame = GAMES.find(g => g.id === 'caro');

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
      if (!silent && isMountedRef.current) setLoadingGames(true);
      const games = await gameApi.getWaitingGames();
      if (!isMountedRef.current) return;
      startTransition(() => {
        if (isMountedRef.current) {
          setWaitingGames(prev => smartMergeGames(games, prev));
        }
      });
    } catch (error) {
      logger.error('Failed to load waiting games:', error);
    } finally {
      if (!silent && isMountedRef.current) setLoadingGames(false);
    }
  }, [smartMergeGames]);

  // Socket.IO and polling setup
  useEffect(() => {
    isMountedRef.current = true;
    loadWaitingGames();
    const interval = setInterval(() => loadWaitingGames(true), 30000);

    const capturedTimeoutRef = updateTimeoutRef.current;

    const cleanup = () => {
      clearInterval(interval);
      if (capturedTimeoutRef) {
        clearTimeout(capturedTimeoutRef);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      mountedGamesRef.current.clear();
    };

    const socket = socketService.getSocket();

    const handleGameCreated = () => {
      if (!isMountedRef.current) return;
      logger.log('[HomePage] Game created event received');
      loadWaitingGames(true);
    };

    const handleGameStatusUpdated = () => {
      if (!isMountedRef.current) return;
      logger.log('[HomePage] Game status updated event received');
      loadWaitingGames(true);
    };

    const handleGameDeleted = (data: { roomId: string }) => {
      if (!isMountedRef.current) return;
      if (!data || !data.roomId || typeof data.roomId !== 'string') {
        logger.error('[HomePage] Invalid game-deleted data:', data);
        return;
      }

      logger.log('[HomePage] Game deleted event received:', data.roomId);
      setWaitingGames(prev => {
        if (!Array.isArray(prev)) return prev;
        const filtered = prev.filter(game => game && game.roomId !== data.roomId);
        mountedGamesRef.current.delete(data.roomId);
        return filtered;
      });
    };

    if (socket && socketConnected) {
      socket.on('game-created', handleGameCreated);
      socket.on('game-status-updated', handleGameStatusUpdated);
      socket.on('game-deleted', handleGameDeleted);
    }

    return () => {
      isMountedRef.current = false;
      cleanup();
      const currentSocket = socketService.getSocket();
      if (currentSocket) {
        currentSocket.off('game-created', handleGameCreated);
        currentSocket.off('game-status-updated', handleGameStatusUpdated);
        currentSocket.off('game-deleted', handleGameDeleted);
      }
    };
  }, [loadWaitingGames, socketConnected]);

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
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create game';
      toast.error('toast.createFailed', { params: { message: errorMessage } });
    }
  };

  const handleJoinGame = async (password?: string): Promise<void> => {
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

      await gameApi.joinGame(game.roomId, password);
      navigate(`/game/${game.roomId}`);
    } catch (err: any) {
      setJoinError(err.response?.data?.message || 'Game not found. Please check the room code.');
      setJoinLoading(false);
    }
  };

  const handleQuickJoin = async (game: WaitingGame, password?: string): Promise<void> => {
    setJoiningGameId(game.roomId);
    try {
      await gameApi.joinGame(game.roomId, password);
      navigate(`/game/${game.roomId}`);
    } catch (error: any) {
      logger.error('Failed to join game:', error);
      if (error.response?.status === 401 && error.response?.data?.requiresPassword) {
        setPendingJoinRoomId(game.roomId);
        setShowPasswordDialog(true);
        setJoiningGameId(null);
        return;
      }
      toast.error('toast.joinFailed', { params: { message: error.response?.data?.message || 'Failed to join game' } });
      loadWaitingGames();
    } finally {
      if (!showPasswordDialog) {
        setJoiningGameId(null);
      }
    }
  };

  const handlePasswordConfirm = async (password: string): Promise<void> => {
    if (!pendingJoinRoomId) return;
    setShowPasswordDialog(false);
    const roomId = pendingJoinRoomId;
    setPendingJoinRoomId(null);
    await handleQuickJoin({ roomId } as WaitingGame, password);
  };

  const handlePasswordCancel = (): void => {
    setShowPasswordDialog(false);
    setPendingJoinRoomId(null);
    setJoiningGameId(null);
  };

  const handleJoinCodeChange = (code: string): void => {
    setJoinRoomCode(code);
    setJoinError('');
  };

  return (
    <>
      <Box
        sx={{
          flex: 1,
          bgcolor: '#f8fbff',
          // Thêm padding-top trên mobile để tránh bị header đè lên
          pt: { xs: isMobile ? '80px' : 0, md: 0 },
        }}
      >
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
              onHistoryClick={() => setHistoryModalOpen(true)}
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

      {/* History Modal */}
      <HistoryModal open={historyModalOpen} onClose={() => setHistoryModalOpen(false)} />

      {/* Guest Name Dialog */}


      {/* Password Dialog */}
      <PasswordDialog
        open={showPasswordDialog}
        onConfirm={handlePasswordConfirm}
        onCancel={handlePasswordCancel}
      />
    </>
  );
};

export default HomePageContent;
