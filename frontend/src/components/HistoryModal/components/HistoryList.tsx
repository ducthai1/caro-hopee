/**
 * HistoryList - List view of game history
 */
import React from 'react';
import { Box, Typography, List, ListItem, ListItemButton, Chip } from '@mui/material';
import { GameHistory } from '../../../types/game.types';

interface HistoryListProps {
  history: GameHistory[];
  onViewBoard: (game: GameHistory) => void;
  formatDate: (dateString: string) => string;
  getResultColor: (result: 'win' | 'loss' | 'draw') => string;
  getResultLabel: (result: 'win' | 'loss' | 'draw') => string;
  t: (key: string) => string;
}

const HistoryList: React.FC<HistoryListProps> = ({
  history,
  onViewBoard,
  formatDate,
  getResultColor,
  getResultLabel,
  t,
}) => {
  if (history.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ color: '#8a9ba8' }}>
          {t('history.noHistory')}
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ p: 0 }}>
      {history.map((game, index) => (
        <ListItem
          key={game._id}
          disablePadding
          sx={{
            borderBottom: '1px solid rgba(126, 200, 227, 0.1)',
            '&:last-child': { borderBottom: 'none' },
          }}
        >
          <ListItemButton
            onClick={() => onViewBoard(game)}
            sx={{
              py: 2,
              px: 3,
              '&:hover': {
                bgcolor: 'rgba(126, 200, 227, 0.08)',
              },
            }}
          >
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: getResultColor(game.result),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#2c3e50',
                  fontSize: '0.9rem',
                }}
              >
                {index + 1}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip
                    label={getResultLabel(game.result)}
                    size="small"
                    sx={{
                      bgcolor: getResultColor(game.result),
                      color: '#2c3e50',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      height: 24,
                    }}
                  />
                  <Typography variant="body2" sx={{ color: '#8a9ba8', fontSize: '0.8rem' }}>
                    {t('history.versus')} {game.opponentUsername}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#8a9ba8', fontSize: '0.75rem' }}>
                  {formatDate(game.finishedAt || game.createdAt)} • {game.boardSize}x{game.boardSize} {t('history.board')}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#5a6a7a', fontWeight: 600 }}>
                {t('game.score')}: {game.score.player1} - {game.score.player2}
              </Typography>
            </Box>
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
};

export default HistoryList;
