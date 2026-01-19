/**
 * GameRoomPage - Main game room with board, controls, and player info
 * Refactored from 916 lines to use modular components
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Container, Box, CircularProgress, Typography, Button, useMediaQuery, useTheme } from '@mui/material';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { gameApi } from '../services/api';
import { useLanguage } from '../i18n';
import GameBoard from '../components/GameBoard/GameBoard';
import GameInfo from '../components/GameInfo/GameInfo';
import GameControls from '../components/GameControls/GameControls';
import RoomCodeDisplay from '../components/RoomCodeDisplay';
import GameErrorBoundary from '../components/GameErrorBoundary';
import MarkerSelector from '../components/MarkerSelector';
import GuestNameDialog from '../components/GuestNameDialog/GuestNameDialog';
import { logger } from '../utils/logger';
import { getGuestName, hasGuestName } from '../utils/guestName';
import {
  MobileBottomSheet,
  LeaveConfirmDialog,
  PlayersScoreSidebar,
} from '../components/GameRoomPage';
import { WaitingState } from './GameRoomPage/WaitingState';
import { ReadyToStartState } from './GameRoomPage/ReadyToStartState';

const GameRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const { game, players, joinRoom, setGame, myPlayerNumber, leaveRoom, startGame, refreshPlayers } = useGame();
  const { isAuthenticated } = useAuth();
  
  // Guest name dialog state
  const [showGuestNameDialog, setShowGuestNameDialog] = useState(false);
  const [guestNameSet, setGuestNameSet] = useState(false);
  
  // Marker selection handler - memoized to prevent re-render loops
  // Only depend on roomId, not game object to avoid re-creating on every game update
  const handleMarkerSelect = useCallback(async (marker: string): Promise<void> => {
    if (!roomId) return;
    
    // Validate marker before sending
    if (!marker || typeof marker !== 'string') {
      logger.error('Invalid marker provided:', marker);
      alert('Invalid marker. Please select a valid marker.');
      return;
    }
    
    // Check if it's a base64 image
    const isBase64Image = marker.startsWith('data:image/');
    
    if (isBase64Image) {
      // Validate base64 image size (max ~150KB)
      if (marker.length > 200000) {
        logger.error('Image too large:', marker.length);
        alert('Image is too large. Maximum size is 150KB.');
        return;
      }
      // Send base64 image as-is
    } else {
      // Text marker validation
      const trimmedMarker = marker.trim();
      if (trimmedMarker.length === 0) {
        logger.error('Empty marker provided');
        alert('Invalid marker. Please select a valid marker.');
        return;
      }
      if (trimmedMarker.length > 10) {
        logger.error('Marker too long:', trimmedMarker);
        alert('Marker is too long. Maximum 10 characters allowed.');
        return;
      }
      // Use trimmed marker for text
      marker = trimmedMarker;
    }
    
    try {
      await gameApi.updateMarker(roomId, marker);
      // Game state will be updated via socket event
    } catch (error: any) {
      logger.error('Failed to update marker:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update marker';
      alert(errorMessage);
    }
  }, [roomId]);

  // State
  const [loading, setLoading] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false);

  // Refs
  const hasLeftRef = useRef(false);
  const pendingNavigation = useRef<(() => void) | null>(null);
  const initialLoadCompleteRef = useRef(false);

  // Derived state
  const isWaiting = game && game.gameStatus === 'waiting' && players.length < 2;
  const canStartGame = game && game.gameStatus === 'waiting' && players.length === 2;

  // Block navigation when in game
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      game !== null &&
      !hasLeftRef.current &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Handle blocked navigation
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowLeaveConfirm(true);
      pendingNavigation.current = blocker.proceed;
    }
  }, [blocker]);

  // Handle browser tab close
  // CRITICAL FIX: Always register cleanup to prevent memory leak
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only prevent unload if game is active and playing
      if (game && !hasLeftRef.current && roomId && game.gameStatus === 'playing') {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [game, roomId]);

  // Load game on mount
  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    let isMounted = true;

    const loadGame = async (): Promise<void> => {
      try {
        setLoading(true);
        logger.log('[GameRoomPage] Loading game with roomId:', roomId);
        const gameData = await gameApi.getGame(roomId);
        logger.log('[GameRoomPage] Game loaded successfully:', gameData);
        if (isMounted) {
          setGame(gameData);
          joinRoom(roomId);
          setLoading(false);
        }
      } catch (error: any) {
        logger.error('[GameRoomPage] Failed to load game:', error);
        if (isMounted) {
          setLoading(false);
          navigate('/');
        }
      }
    };

    loadGame();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Track initial load complete
  useEffect(() => {
    if (!loading && game) {
      initialLoadCompleteRef.current = true;
    }
  }, [loading, game]);

  // Navigate home if game is deleted
  useEffect(() => {
    if (game === null && roomId && !hasLeftRef.current && !loading && initialLoadCompleteRef.current) {
      logger.log('[GameRoomPage] Game is null and initial load completed - navigating to home');
      navigate('/');
    }
  }, [game, roomId, navigate, loading]);

  // Check if guest needs to set name when entering game room
  useEffect(() => {
    if (!loading && game && !isAuthenticated && !guestNameSet) {
      // Check if guest name is already set in sessionStorage
      if (!hasGuestName()) {
        // Show dialog to let guest choose name
        setShowGuestNameDialog(true);
      } else {
        // Guest name already exists, mark as set
        setGuestNameSet(true);
      }
    }
  }, [loading, game, isAuthenticated, guestNameSet]);

  // Event handlers
  const handleLeaveGame = async (): Promise<void> => {
    hasLeftRef.current = true;
    try {
      await leaveRoom();
      navigate('/');
    } catch (error) {
      logger.error('Error leaving game:', error);
      navigate('/');
    }
  };

  const handleLeaveConfirm = async (): Promise<void> => {
    setShowLeaveConfirm(false);
    try {
      setIsLeaving(true);
      await handleLeaveGame();
    } catch (error) {
      logger.error('Error leaving game:', error);
    } finally {
      setIsLeaving(false);
    }
  };

  const handleLeaveCancel = (): void => {
    setShowLeaveConfirm(false);
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
    pendingNavigation.current = null;
  };

  const handleGuestNameSet = useCallback((name: string) => {
    setGuestNameSet(true);
    setShowGuestNameDialog(false);
    logger.log('[GameRoomPage] Guest name set:', name);
    // Immediately refresh players to update the name
    refreshPlayers();
  }, [refreshPlayers]);

  // Loading state
  if (loading || !game) {
    return (
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            gap: 2,
          }}
        >
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            {t('gameRoom.loading')}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <>
      {/* Leave Confirmation Dialog */}
      <LeaveConfirmDialog
        open={showLeaveConfirm}
        isLeaving={isLeaving}
        isGamePlaying={game.gameStatus === 'playing'}
        onConfirm={handleLeaveConfirm}
        onCancel={handleLeaveCancel}
      />

      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 30%, #f0f9ff 100%)',
          position: 'relative',
          overflow: 'hidden',
          contain: 'layout style paint',
          transform: 'translateZ(0)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -50,
            right: -50,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(126, 200, 227, 0.1) 0%, transparent 70%)',
            transform: 'translateZ(0)',
            pointerEvents: 'none',
            zIndex: 0,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -100,
            left: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 230, 207, 0.1) 0%, transparent 70%)',
            transform: 'translateZ(0)',
            pointerEvents: 'none',
            zIndex: 0,
          },
        }}
      >
        {/* Left Sidebar - Room Code, Game Info & Controls */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            gap: 2,
            position: 'fixed',
            left: { lg: 24 },
            top: { lg: 24 },
            width: { lg: '280px' },
            height: { lg: 'calc(100vh - 48px)' },
            maxHeight: { lg: 'calc(100vh - 48px)' },
            overflowY: 'auto',
            zIndex: 10,
            '&::-webkit-scrollbar': { width: '6px' },
            '&::-webkit-scrollbar-track': { background: 'rgba(126, 200, 227, 0.05)', borderRadius: '3px' },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(126, 200, 227, 0.2)',
              borderRadius: '3px',
              '&:hover': { background: 'rgba(126, 200, 227, 0.3)' },
            },
          }}
        >
          <RoomCodeDisplay roomCode={game.roomCode} />
          <GameInfo />
          <GameControls onLeaveGame={handleLeaveGame} />
        </Box>

        {/* Main Content Area */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            ml: { lg: '328px' },
            mr: { lg: '328px' },
            display: 'flex',
            justifyContent: 'center',
            alignItems: { xs: 'flex-start', lg: 'center' },
            minHeight: { xs: 'calc(100vh - 80px)', lg: 'calc(100vh - 40px)' },
            py: { xs: 2, md: 3 },
            pb: { xs: '100px', lg: 3 },
            width: { lg: 'calc(100% - 656px)' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', position: 'relative' }}>
            {isWaiting ? (
              <WaitingState
                game={game}
                onLeaveClick={() => setShowLeaveConfirm(true)}
                onMarkerSelect={handleMarkerSelect}
                myPlayerNumber={myPlayerNumber}
                t={t}
              />
            ) : canStartGame ? (
              <ReadyToStartState
                roomId={roomId}
                startGame={startGame}
                onMarkerSelect={handleMarkerSelect}
                game={game}
                myPlayerNumber={myPlayerNumber}
                t={t}
              />
            ) : (
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <GameErrorBoundary roomId={roomId}>
                  <GameBoard />
                </GameErrorBoundary>
              </Box>
            )}
          </Box>
        </Box>

        {/* Right Sidebar - Players & Score */}
        <PlayersScoreSidebar
          game={game}
          players={players}
          myPlayerNumber={myPlayerNumber}
        />

        {/* Mobile Bottom Sheet */}
        {isMobile && (
          <MobileBottomSheet
            game={game}
            players={players}
            myPlayerNumber={myPlayerNumber}
            expanded={mobileSheetExpanded}
            setExpanded={setMobileSheetExpanded}
            onLeaveGame={handleLeaveGame}
          />
        )}
      </Box>

      {/* Guest Name Dialog */}
      <GuestNameDialog
        open={showGuestNameDialog}
        onClose={handleGuestNameSet}
      />
    </>
  );
};

// WaitingState and ReadyToStartState components moved to separate files

export default GameRoomPage;
