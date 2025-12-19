import React, { useEffect, useState, useRef } from 'react';
import { Container, Box, CircularProgress, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { gameApi } from '../services/api';
import GameBoard from '../components/GameBoard/GameBoard';
import GameInfo from '../components/GameInfo/GameInfo';
import GameControls from '../components/GameControls/GameControls';
import RoomCodeDisplay from '../components/RoomCodeDisplay';

const GameRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { game, players, joinRoom, setGame, myPlayerNumber, leaveRoom, startGame } = useGame();
  const [loading, setLoading] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const hasLeftRef = useRef(false);
  const pendingNavigation = useRef<(() => void) | null>(null);
  
  const isWaiting = game && game.gameStatus === 'waiting' && players.length < 2;
  const canStartGame = game && game.gameStatus === 'waiting' && players.length === 2;
  
  // Block navigation (back button, programmatic navigation) using useBlocker
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
  
  // Handle browser tab close (but not reload)
  // Note: We don't call leave game API here because we can't distinguish
  // between reload and closing tab. Socket will handle disconnect automatically.
  useEffect(() => {
    if (!game || hasLeftRef.current || !roomId) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning if game is in progress
      // Don't call leave game API - let socket handle disconnect
      // This way, reload won't remove player from game
      if (game.gameStatus === 'playing') {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return ''; // Some browsers require return value
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [game, roomId]);
  
  // Wrapper function to handle leave game with proper flag setting
  const handleLeaveGame = async (): Promise<void> => {
    // Set flag first to prevent blocker from blocking navigation
    hasLeftRef.current = true;
    try {
      await leaveRoom();
      // Navigate to home after leaving
      navigate('/');
    } catch (error) {
      console.error('Error leaving game:', error);
      // Still navigate even if there's an error
      navigate('/');
    }
  };

  const handleLeaveConfirm = async (): Promise<void> => {
    setShowLeaveConfirm(false);
    try {
      setIsLeaving(true);
      await handleLeaveGame();
    } catch (error) {
      console.error('Error leaving game:', error);
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
  
  // Debug logging
  React.useEffect(() => {
    console.log('GameRoomPage - isWaiting:', isWaiting, 'gameStatus:', game?.gameStatus, 'players.length:', players.length, 'players:', players);
  }, [isWaiting, game?.gameStatus, players.length, players]);

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    let isMounted = true;

    const loadGame = async (): Promise<void> => {
      try {
        setLoading(true);
        const gameData = await gameApi.getGame(roomId);
        if (isMounted) {
          setGame(gameData);
          joinRoom(roomId);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load game:', error);
        if (isMounted) {
          navigate('/');
        }
      }
    };

    loadGame();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

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
            Loading game...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <>
      {/* Leave Confirmation Dialog */}
      <Dialog 
        open={showLeaveConfirm} 
        onClose={handleLeaveCancel} 
        maxWidth="xs" 
        fullWidth
        disableEscapeKeyDown={isLeaving}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#2c3e50' }}>
            ⚠️ Leave Game?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
          <Typography variant="body1" sx={{ color: '#5a6a7a', mb: 2 }}>
            Are you sure you want to leave this game?
          </Typography>
          {game && game.gameStatus === 'playing' && (
            <Typography variant="body2" sx={{ color: '#ffaaa5', fontWeight: 600 }}>
              The game is still in progress!
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 4, px: 3, gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleLeaveCancel}
            disabled={isLeaving}
            sx={{
              minWidth: 120,
              py: 1.25,
              borderRadius: 2,
              borderColor: '#7ec8e3',
              borderWidth: 2,
              color: '#2c3e50',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.95rem',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: '#5ba8c7',
                borderWidth: 2,
                backgroundColor: 'rgba(126, 200, 227, 0.08)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleLeaveConfirm}
            disabled={isLeaving}
            sx={{
              minWidth: 120,
              py: 1.25,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #ffaaa5 0%, #ffb88c 100%)',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.95rem',
              boxShadow: '0 4px 14px rgba(255, 170, 165, 0.4)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #e08a85 0%, #e09a7c 100%)',
                boxShadow: '0 6px 20px rgba(255, 170, 165, 0.5)',
              },
            }}
          >
            {isLeaving ? 'Leaving...' : 'Leave'}
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 30%, #f0f9ff 100%)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -50,
            right: -50,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(126, 200, 227, 0.1) 0%, transparent 70%)',
            animation: 'float 20s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
              '50%': { transform: 'translate(-30px, -30px) scale(1.1)' },
            },
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
            animation: 'float 25s ease-in-out infinite reverse',
            '@keyframes float': {
              '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
              '50%': { transform: 'translate(30px, 30px) scale(1.1)' },
            },
          },
        }}
      >
        {/* Left Sidebar - Room Code, Game Info & Controls - Fixed */}
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
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(126, 200, 227, 0.05)',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(126, 200, 227, 0.2)',
              borderRadius: '3px',
              '&:hover': {
                background: 'rgba(126, 200, 227, 0.3)',
              },
            },
          }}
        >
          <RoomCodeDisplay roomCode={game.roomCode} />
          <GameInfo />
          <GameControls onLeaveGame={handleLeaveGame} />
        </Box>

        {/* Main Content Area - Board Only */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            ml: { lg: '328px' }, // Margin for fixed left sidebar (280px + 48px gap)
            mr: { lg: '328px' }, // Margin for fixed right sidebar (280px + 48px gap)
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'calc(100vh - 40px)',
            py: { xs: 2, md: 3 },
            width: { lg: 'calc(100% - 656px)' }, // 328px * 2 for both sidebars
          }}
        >
          {/* Game Board - Center, Large */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              position: 'relative',
            }}
          >
            {isWaiting ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  p: 5,
                  borderRadius: 3,
                  bgcolor: 'rgba(126, 200, 227, 0.05)',
                  border: '2px dashed rgba(126, 200, 227, 0.3)',
                  width: '100%',
                  maxWidth: '600px',
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700,
                    fontSize: { xs: '1.75rem', md: '2.25rem' },
                    textAlign: 'center',
                  }}
                >
                  ⏳ Waiting for player...
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: '#5a6a7a', 
                    fontWeight: 500,
                    fontSize: '1.1rem',
                    textAlign: 'center',
                  }}
                >
                  Share the room code with another player to start the game
                </Typography>
              </Box>
            ) : (
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <GameBoard />
                {canStartGame && (
                  <>
                    {/* Semi-transparent overlay */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        bgcolor: 'rgba(0, 0, 0, 0.3)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                        willChange: 'transform',
                        zIndex: 5,
                        borderRadius: 4,
                        pointerEvents: 'none',
                      }}
                    />
                    {/* Start Game Button */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <Button
                        variant="contained"
                        size="large"
                        onClick={startGame}
                        sx={{
                          minWidth: 200,
                          py: 2,
                          px: 4,
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '1.2rem',
                          textTransform: 'none',
                          boxShadow: '0 8px 24px rgba(126, 200, 227, 0.4)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
                            boxShadow: '0 12px 32px rgba(126, 200, 227, 0.5)',
                            transform: 'translateY(-2px)',
                          },
                        }}
                      >
                        🎮 Start Game
                      </Button>
                      <Box
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.95)',
                          px: 2,
                          py: 1.5,
                          borderRadius: 2,
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          willChange: 'transform',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          textAlign: 'center',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#2c3e50',
                            fontWeight: 600,
                            mb: 0.5,
                            fontSize: '0.95rem',
                          }}
                        >
                          Ready to play! Click to start
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#7ec8e3',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.5,
                          }}
                        >
                          ⚡ Who clicks Start goes first!
                        </Typography>
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* Right Sidebar - Players Info & Score - Fixed */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            gap: 2,
            position: 'fixed',
            right: { lg: 24 },
            top: { lg: 24 },
            width: { lg: '280px' },
            height: { lg: 'calc(100vh - 48px)' },
            maxHeight: { lg: 'calc(100vh - 48px)' },
            overflowY: 'auto',
            zIndex: 10,
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(126, 200, 227, 0.05)',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(126, 200, 227, 0.2)',
              borderRadius: '3px',
              '&:hover': {
                background: 'rgba(126, 200, 227, 0.3)',
              },
            },
          }}
        >
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              bgcolor: '#ffffff',
              border: '2px solid transparent',
              backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: '0 4px 16px rgba(126, 200, 227, 0.12)',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                mb: 2.5,
                color: '#2c3e50',
                fontSize: '0.95rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                textAlign: 'center',
              }}
            >
              👥 Players & Score
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
              }}
            >
              {players.map((player) => {
                const isCurrentTurn = game.gameStatus === 'playing' && game.currentPlayer === player.playerNumber;
                const isPlayer1 = player.playerNumber === 1;
                
                return (
                  <Box
                    key={player.playerNumber}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: isPlayer1 
                        ? 'rgba(126, 200, 227, 0.08)' 
                        : 'rgba(168, 230, 207, 0.08)',
                      border: isCurrentTurn
                        ? `2px solid ${isPlayer1 ? '#7ec8e3' : '#a8e6cf'}`
                        : isPlayer1
                        ? '1px solid rgba(126, 200, 227, 0.2)'
                        : '1px solid rgba(168, 230, 207, 0.2)',
                      textAlign: 'center',
                      position: 'relative',
                      boxShadow: isCurrentTurn 
                        ? `0 4px 16px ${isPlayer1 ? 'rgba(126, 200, 227, 0.3)' : 'rgba(168, 230, 207, 0.3)'}`
                        : 'none',
                      transform: isCurrentTurn ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.3s ease',
                      animation: isCurrentTurn ? 'pulse 2s ease-in-out infinite' : 'none',
                      '@keyframes pulse': {
                        '0%, 100%': {
                          boxShadow: isCurrentTurn 
                            ? `0 4px 16px ${isPlayer1 ? 'rgba(126, 200, 227, 0.3)' : 'rgba(168, 230, 207, 0.3)'}`
                            : 'none',
                        },
                        '50%': {
                          boxShadow: isCurrentTurn 
                            ? `0 6px 24px ${isPlayer1 ? 'rgba(126, 200, 227, 0.5)' : 'rgba(168, 230, 207, 0.5)'}`
                            : 'none',
                        },
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#5a6a7a',
                        fontWeight: 600,
                        display: 'block',
                        mb: 1,
                        fontSize: '0.8rem',
                      }}
                    >
                      Player {player.playerNumber}
                      {myPlayerNumber === player.playerNumber && ' 👤 (You)'}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: isCurrentTurn ? (isPlayer1 ? '#7ec8e3' : '#a8e6cf') : '#2c3e50',
                        fontWeight: isCurrentTurn ? 700 : 600,
                        display: 'block',
                        mb: 1.5,
                        fontSize: isCurrentTurn ? '1rem' : '0.9rem',
                        wordBreak: 'break-word',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {isCurrentTurn && '🎯 '}
                      {player.username}
                      {player.isGuest && ' (Guest)'}
                      {isCurrentTurn && myPlayerNumber === player.playerNumber && ' - Your Turn!'}
                      {isCurrentTurn && myPlayerNumber !== player.playerNumber && ' - Their Turn'}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        color: isPlayer1 ? '#7ec8e3' : '#a8e6cf',
                        fontSize: '2rem',
                      }}
                    >
                      {isPlayer1 ? game.score.player1 : game.score.player2}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default GameRoomPage;

