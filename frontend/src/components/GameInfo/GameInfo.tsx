import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useGame } from '../../contexts/GameContext';
import RoomCodeDisplay from '../RoomCodeDisplay';

const GameInfo: React.FC = () => {
  const { game, players, currentPlayer, myPlayerNumber } = useGame();

  if (!game) {
    return null;
  }

  const getStatusText = (): string => {
    switch (game.gameStatus) {
      case 'waiting':
        return 'Waiting for players...';
      case 'playing':
        return `Player ${currentPlayer}'s turn`;
      case 'finished':
        if (game.winner === 'draw') {
          return 'Draw!';
        }
        return `Player ${game.winner} wins!`;
      case 'abandoned':
        return 'Game abandoned';
      default:
        return '';
    }
  };

  return (
    <Box sx={{ mb: 4, width: '100%', maxWidth: 700 }}>
      <RoomCodeDisplay roomCode={game.roomCode} />
      
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 2.5, md: 3.5 }, 
          mt: 3,
          background: '#ffffff',
          border: '2px solid transparent',
          borderRadius: 3,
          backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: '0 8px 24px rgba(126, 200, 227, 0.12)',
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              color: '#2c3e50', 
              fontWeight: 700, 
              fontSize: '1.25rem',
              mb: 1.5,
            }}
          >
            📊 Game Status
          </Typography>
          <Box sx={{ 
            p: 2, 
            borderRadius: 2, 
            bgcolor: 'rgba(126, 200, 227, 0.08)',
            border: '1px solid rgba(126, 200, 227, 0.2)',
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600, 
                color: '#2c3e50',
                fontSize: '1.1rem',
              }}
            >
              {getStatusText()}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
          gap: 3,
        }}>
          <Box>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 700, 
                mb: 1.5,
                color: '#2c3e50',
                fontSize: '0.95rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              👥 Players
            </Typography>
            {players.map((player, index) => (
              <Box 
                key={index} 
                sx={{ 
                  mb: 1,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: myPlayerNumber === player.playerNumber 
                    ? 'rgba(126, 200, 227, 0.1)' 
                    : 'rgba(0,0,0,0.02)',
                  border: myPlayerNumber === player.playerNumber 
                    ? '1px solid rgba(126, 200, 227, 0.3)' 
                    : '1px solid transparent',
                }}
              >
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 600,
                    color: '#2c3e50',
                    fontSize: '0.95rem',
                  }}
                >
                  {player.username} {player.isGuest && '(Guest)'} {myPlayerNumber === player.playerNumber && '👤 (You)'}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 700, 
                mb: 1.5,
                color: '#2c3e50',
                fontSize: '0.95rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              🏆 Score
            </Typography>
            <Box sx={{ 
              p: 1.5, 
              borderRadius: 2,
              bgcolor: 'rgba(168, 230, 207, 0.08)',
              border: '1px solid rgba(168, 230, 207, 0.2)',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                  Player 1:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#7ec8e3', fontSize: '1.1rem' }}>
                  {game.score.player1}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                  Player 2:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#a8e6cf', fontSize: '1.1rem' }}>
                  {game.score.player2}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default GameInfo;

