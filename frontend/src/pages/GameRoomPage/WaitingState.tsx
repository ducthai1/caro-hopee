/**
 * WaitingState - Component shown when waiting for second player
 */
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import MarkerSelector from '../../components/MarkerSelector';
import RoomCodeDisplay from '../../components/RoomCodeDisplay';

interface WaitingStateProps {
  game: { roomCode: string; player1Marker?: string | null; player2Marker?: string | null };
  onLeaveClick: () => void;
  onMarkerSelect: (marker: string) => void;
  myPlayerNumber: 1 | 2 | null;
  t: (key: string) => string;
}

export const WaitingState: React.FC<WaitingStateProps> = ({ 
  game, 
  onLeaveClick, 
  onMarkerSelect, 
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        p: { xs: 3, md: 5 },
        borderRadius: 3,
        bgcolor: 'rgba(126, 200, 227, 0.05)',
        border: '2px dashed rgba(126, 200, 227, 0.3)',
        width: '100%',
        maxWidth: '600px',
        minHeight: { xs: '50vh', lg: '60vh' },
        mb: { xs: '120px', lg: 0 },
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
          fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.25rem' },
          textAlign: 'center',
        }}
      >
        ⏳ {t('gameRoom.waitingForPlayer')}
      </Typography>

      <Box sx={{ display: { xs: 'block', lg: 'none' }, width: '100%', maxWidth: '320px' }}>
        <RoomCodeDisplay roomCode={game.roomCode} />
      </Box>

      <Typography
        variant="body1"
        sx={{ color: '#5a6a7a', fontWeight: 500, fontSize: { xs: '0.95rem', md: '1.1rem' }, textAlign: 'center' }}
      >
        {t('gameRoom.shareRoomCode')}
      </Typography>

      {/* Marker Selector */}
      {myPlayerNumber && (
        <Box sx={{ width: '100%', maxWidth: '500px', mt: 2 }}>
          <MarkerSelector
            selectedMarker={myMarker}
            otherPlayerMarker={otherPlayerMarker}
            onSelectMarker={onMarkerSelect}
          />
        </Box>
      )}

      <Box sx={{ display: { xs: 'block', lg: 'none' }, width: '100%', maxWidth: '280px', mt: 1 }}>
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          onClick={onLeaveClick}
          sx={{ py: 1.5, borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
        >
          {t('game.leaveGame')}
        </Button>
      </Box>
    </Box>
  );
};

