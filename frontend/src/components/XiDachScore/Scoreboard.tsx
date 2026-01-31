/**
 * Blackjack Score Tracker - Scoreboard
 * Grid display of all players with scores
 */

import React, { useCallback, useMemo } from 'react';
import { Box, Button, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayerCard from './PlayerCard';
import { XiDachPlayer } from '../../types/xi-dach-score.types';
import { useLanguage } from '../../i18n';

interface ScoreboardProps {
  players: XiDachPlayer[];
  currentDealerId: string | null;
  onEditPlayer: (player: XiDachPlayer) => void;
  onRemovePlayer: (playerId: string) => void;
  onAddPlayer: () => void;
}

const Scoreboard: React.FC<ScoreboardProps> = ({
  players,
  currentDealerId,
  onEditPlayer,
  onRemovePlayer,
  onAddPlayer,
}) => {
  const { t } = useLanguage();

  // Memoize active players to prevent recalculation on every render
  const activePlayers = useMemo(
    () => players.filter((p) => p.isActive),
    [players]
  );

  // Stable callbacks to work with memoized PlayerCard
  const handleEditPlayer = useCallback(
    (player: XiDachPlayer) => onEditPlayer(player),
    [onEditPlayer]
  );

  const handleRemovePlayer = useCallback(
    (playerId: string) => onRemovePlayer(playerId),
    [onRemovePlayer]
  );

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            color: '#7f8c8d',
            textTransform: 'uppercase',
            letterSpacing: 1,
            fontSize: '0.75rem',
          }}
        >
          {t('xiDachScore.scoreboard')}
        </Typography>
        <Typography variant="caption" sx={{ color: '#95a5a6' }}>
          {t('xiDachScore.playersCount', { count: activePlayers.length })}
        </Typography>
      </Box>

      {/* Players Grid */}
      {activePlayers.length > 0 ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 2,
            mb: 2,
          }}
        >
          {activePlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isDealer={player.id === currentDealerId}
              onEdit={handleEditPlayer}
              onRemove={handleRemovePlayer}
            />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            color: '#95a5a6',
            bgcolor: 'rgba(255, 138, 101, 0.05)',
            borderRadius: 3,
            border: '2px dashed rgba(255, 138, 101, 0.2)',
            mb: 2,
          }}
        >
          <Typography variant="body1" sx={{ mb: 1 }}>
            {t('xiDachScore.noPlayers')}
          </Typography>
          <Typography variant="body2">
            {t('xiDachScore.noPlayersHint')}
          </Typography>
        </Box>
      )}

      {/* Add Player Button */}
      <Button
        variant="outlined"
        fullWidth
        startIcon={<AddIcon />}
        onClick={onAddPlayer}
        sx={{
          py: 1.5,
          borderRadius: 2,
          borderColor: '#FF8A65',
          color: '#FF8A65',
          bgcolor: '#fff',
          borderStyle: 'dashed',
          '&:hover': {
            borderColor: '#E64A19',
            bgcolor: '#fff',
          },
        }}
      >
        {t('xiDachScore.player.add')}
      </Button>
    </Box>
  );
};

export default Scoreboard;
