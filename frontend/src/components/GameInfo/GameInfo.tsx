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
    <Box sx={{ mb: 3, width: '100%', maxWidth: 600 }}>
      <RoomCodeDisplay roomCode={game.roomCode} />
      
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          mt: 2,
          background: 'linear-gradient(135deg, rgba(179, 217, 230, 0.2) 0%, rgba(212, 232, 240, 0.2) 100%)',
          border: '1px solid rgba(179, 217, 230, 0.4)',
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ color: '#1a4a5c', fontWeight: 'bold' }}>
          Game Status
        </Typography>
        <Typography variant="body1" sx={{ mb: 2, fontWeight: 'medium' }}>
          {getStatusText()}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Players:</Typography>
          {players.map((player, index) => (
            <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
              {player.username} {player.isGuest && '(Guest)'} {myPlayerNumber === player.playerNumber && '(You)'}
            </Typography>
          ))}
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Score:</Typography>
          <Typography variant="body2">Player 1: {game.score.player1}</Typography>
          <Typography variant="body2">Player 2: {game.score.player2}</Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default GameInfo;

