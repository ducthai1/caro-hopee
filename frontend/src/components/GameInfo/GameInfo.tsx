import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useGame } from '../../contexts/GameContext';

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
    <Paper 
      elevation={0}
      sx={{ 
        p: { xs: 2, md: 2.5 }, 
        background: '#ffffff',
        border: '2px solid transparent',
        borderRadius: 3,
        backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: '0 4px 16px rgba(126, 200, 227, 0.12)',
      }}
    >
      <Box sx={{ mb: 2.5 }}>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: '#2c3e50', 
            fontWeight: 700, 
            fontSize: '0.95rem',
            mb: 1.5,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          📊 Game Status
        </Typography>
        <Box sx={{ 
          p: 1.5, 
          borderRadius: 2, 
          bgcolor: 'rgba(126, 200, 227, 0.08)',
          border: '1px solid rgba(126, 200, 227, 0.2)',
        }}>
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 600, 
              color: '#2c3e50',
              fontSize: '0.95rem',
            }}
          >
            {getStatusText()}
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ mb: 2.5 }}>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {players.map((player, index) => (
            <Box 
              key={index} 
              sx={{ 
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
                variant="body2" 
                sx={{ 
                  fontWeight: 600,
                  color: '#2c3e50',
                  fontSize: '0.9rem',
                }}
              >
                {player.playerNumber === 1 ? '✕' : '○'} {player.username}
                {player.isGuest && ' (Guest)'}
                {myPlayerNumber === player.playerNumber && ' 👤'}
              </Typography>
            </Box>
          ))}
        </Box>
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
          ⚙️ Game Rules
        </Typography>
        <Box sx={{ 
          p: 1.5, 
          borderRadius: 2, 
          bgcolor: 'rgba(168, 230, 207, 0.08)',
          border: '1px solid rgba(168, 230, 207, 0.2)',
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 600,
                  color: '#2c3e50',
                  fontSize: '0.9rem',
                }}
              >
                Block Two Ends:
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 700,
                  color: game.rules.blockTwoEnds ? '#a8e6cf' : '#ffaaa5',
                  fontSize: '0.9rem',
                }}
              >
                {game.rules.blockTwoEnds ? '✓ ON' : '✗ OFF'}
              </Typography>
            </Box>
            {game.rules.allowUndo && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600,
                    color: '#2c3e50',
                    fontSize: '0.9rem',
                  }}
                >
                  Allow Undo:
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#a8e6cf',
                    fontSize: '0.9rem',
                  }}
                >
                  ✓ ON
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default GameInfo;

