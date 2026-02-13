/**
 * ReadyToStartState - Component shown when both players are ready
 */
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import MarkerSelector from '../../components/MarkerSelector';
import GameBoard from '../../components/GameBoard/GameBoard';
import GameErrorBoundary from '../../components/GameErrorBoundary';

interface ReadyToStartStateProps {
  roomId: string | undefined;
  startGame: () => void;
  onMarkerSelect: (marker: string) => void;
  game: { player1Marker?: string | null; player2Marker?: string | null };
  myPlayerNumber: 1 | 2 | null;
  t: (key: string) => string;
}

export const ReadyToStartState: React.FC<ReadyToStartStateProps> = ({ 
  roomId, 
  startGame, 
  onMarkerSelect, 
  game, 
  myPlayerNumber, 
  t 
}) => {
  const myMarker = myPlayerNumber === 1 
    ? (game.player1Marker ?? null) 
    : myPlayerNumber === 2 
    ? (game.player2Marker ?? null) 
    : null;
  const otherPlayerMarker = myPlayerNumber === 1 
    ? (game.player2Marker ?? null) 
    : myPlayerNumber === 2 
    ? (game.player1Marker ?? null) 
    : null;
  
  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', position: 'relative', minHeight: { xs: '50vh', lg: '60vh' } }}>
      <GameErrorBoundary roomId={roomId}>
        <GameBoard />
      </GameErrorBoundary>
      <>
        {/* Overlay */}
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
        {/* Marker Selector and Start Game Button */}
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
            gap: 3,
            width: '90%',
            maxWidth: '600px',
          }}
        >
          {/* Marker Selector */}
          {myPlayerNumber && (
            <Box
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.98)',
                p: 3,
                borderRadius: 3,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                width: '100%',
                maxWidth: '500px',
              }}
            >
              <MarkerSelector
                selectedMarker={myMarker}
                otherPlayerMarker={otherPlayerMarker}
                onSelectMarker={onMarkerSelect}
              />
            </Box>
          )}
          
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
            🎮 {t('game.startGame')}
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
            <Typography variant="body2" sx={{ color: '#2c3e50', fontWeight: 600, mb: 0.5, fontSize: '0.95rem' }}>
              {t('gameRoom.readyToPlay')}
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
              ⚡ {t('gameRoom.firstClickGoesFirst')}
            </Typography>
          </Box>
        </Box>
      </>
    </Box>
  );
};

