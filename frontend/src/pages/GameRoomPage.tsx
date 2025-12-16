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
    <Container maxWidth="lg">
      <Box
        sx={{
          mt: 4,
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
            }}
          >
            <Typography
              variant="h4"
              sx={{
                background: 'linear-gradient(135deg, #8fc4d6 0%, #b3d9e6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 'bold',
              }}
            >
              Waiting for player...
            </Typography>
            <Typography variant="body1" sx={{ color: '#555' }}>
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

