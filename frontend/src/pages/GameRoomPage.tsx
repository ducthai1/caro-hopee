import React, { useEffect, useState } from 'react';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { gameApi } from '../services/api';
import GameBoard from '../components/GameBoard/GameBoard';
import GameInfo from '../components/GameInfo/GameInfo';
import GameControls from '../components/GameControls/GameControls';
import RoomCodeDisplay from '../components/RoomCodeDisplay';

const GameRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { game, players, joinRoom, setGame, currentPlayer, myPlayerNumber } = useGame();
  const [loading, setLoading] = useState(true);
  
  const isWaiting = game && game.gameStatus === 'waiting' && players.length < 2;
  
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
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 }, px: { xs: 2, md: 3 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { 
            xs: '1fr', 
            lg: '280px 1fr 280px' 
          },
          gap: { xs: 3, md: 4 },
          minHeight: 'calc(100vh - 100px)',
        }}
      >
        {/* Left Sidebar - Room Code, Game Info & Controls */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            position: { lg: 'sticky' },
            top: { lg: 20 },
            height: { lg: 'fit-content' },
            maxHeight: { lg: 'calc(100vh - 40px)' },
            overflowY: { lg: 'auto' },
          }}
        >
          <RoomCodeDisplay roomCode={game.roomCode} />
          <GameInfo />
          <GameControls />
        </Box>

        {/* Main Content Area - Board Only */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            minWidth: 0, // Prevent grid overflow
          }}
        >
          {/* Game Board - Center, Large */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
              minHeight: { xs: '450px', md: '600px' },
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
              <GameBoard />
            )}
          </Box>
        </Box>

        {/* Right Sidebar - Players Info & Score */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            gap: 2,
            position: { lg: 'sticky' },
            top: { lg: 20 },
            height: { lg: 'fit-content' },
            maxHeight: { lg: 'calc(100vh - 40px)' },
            overflowY: { lg: 'auto' },
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
    </Container>
  );
};

export default GameRoomPage;

