import React, { useEffect, useState } from 'react';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { gameApi } from '../services/api';
import GameBoard from '../components/GameBoard/GameBoard';
import GameInfo from '../components/GameInfo/GameInfo';
import GameControls from '../components/GameControls/GameControls';

const GameRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { game, players, joinRoom, setGame } = useGame();
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
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '80vh',
        }}
      >
        <GameInfo />
        {isWaiting ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              gap: 3,
              p: 4,
              borderRadius: 3,
              bgcolor: 'rgba(126, 200, 227, 0.05)',
              border: '2px dashed rgba(126, 200, 227, 0.3)',
              maxWidth: '500px',
              width: '100%',
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
                maxWidth: '400px',
              }}
            >
              Share the room code with another player to start the game
            </Typography>
          </Box>
        ) : (
          <GameBoard />
        )}
        <GameControls />
      </Box>
    </Container>
  );
};

export default GameRoomPage;

