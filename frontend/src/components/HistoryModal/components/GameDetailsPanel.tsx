/**
 * GameDetailsPanel - Panel showing game details and board
 */
import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { GameHistory } from '../../../types/game.types';
import GameBoardStatic from './GameBoardStatic';

interface GameDetailsPanelProps {
  game: GameHistory;
  formatDate: (dateString: string) => string;
  getResultColor: (result: 'win' | 'loss' | 'draw') => string;
  getResultLabel: (result: 'win' | 'loss' | 'draw') => string;
  t: (key: string) => string;
}

const GameDetailsPanel: React.FC<GameDetailsPanelProps> = ({
  game,
  formatDate,
  getResultColor,
  getResultLabel,
  t,
}) => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 2,
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2c3e50', mb: 0.5 }}>
              {t('history.gameDetails')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#8a9ba8' }}>
              {formatDate(game.finishedAt || game.createdAt)}
            </Typography>
          </Box>
          <Chip
            label={getResultLabel(game.result)}
            sx={{
              bgcolor: getResultColor(game.result),
              color: '#2c3e50',
              fontWeight: 700,
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#8a9ba8', display: 'block' }}>
              {t('history.opponent')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2c3e50' }}>
              {game.opponentUsername}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#8a9ba8', display: 'block' }}>
              {t('history.boardSize')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2c3e50' }}>
              {game.boardSize}x{game.boardSize}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#8a9ba8', display: 'block' }}>
              {t('history.finalScore')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2c3e50' }}>
              {game.score.player1} - {game.score.player2}
            </Typography>
          </Box>
        </Box>
      </Paper>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: 3,
          p: 2,
        }}
      >
        <GameBoardStatic
          board={game.board}
          boardSize={game.boardSize}
          winningLine={game.winningLine}
        />
      </Box>
    </Box>
  );
};

export default GameDetailsPanel;
