/**
 * Blackjack Score Tracker - Player Card
 * Displays single player with score and dealer indicator
 */

import React, { useCallback } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { XiDachPlayer } from '../../types/xi-dach-score.types';
import { useLanguage } from '../../i18n';

interface PlayerCardProps {
  player: XiDachPlayer;
  isDealer: boolean;
  onEdit: (player: XiDachPlayer) => void;
  onRemove: (playerId: string) => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isDealer,
  onEdit,
  onRemove,
}) => {
  const { t } = useLanguage();
  const netScore = player.currentScore - player.baseScore;
  const isPositive = netScore >= 0;

  // Stable callbacks that call parent with player data
  const handleEdit = useCallback(() => onEdit(player), [onEdit, player]);
  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering card click (edit)
    onRemove(player.id);
  }, [onRemove, player.id]);

  return (
    <Box
      onClick={handleEdit}
      sx={{
        position: 'relative',
        bgcolor: '#fff',
        borderRadius: 3,
        p: 2,
        cursor: 'pointer',
        boxShadow: isDealer
          ? '0 4px 16px rgba(255, 138, 101, 0.25)'
          : '0 2px 8px rgba(0, 0, 0, 0.08)',
        border: isDealer ? '2px solid #FF8A65' : '1px solid rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(255, 138, 101, 0.2)',
        },
      }}
    >
      {/* Remove Button */}
      <IconButton
        size="small"
        onClick={handleRemove}
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 24,
          height: 24,
          color: '#bdc3c7',
          '&:hover': {
            color: '#FF8A65',
            bgcolor: 'rgba(255, 138, 101, 0.1)',
          },
        }}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>

      {/* Dealer Crown */}
      {isDealer && (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '1.2rem',
          }}
        >
          👑
        </Box>
      )}

      {/* Player Name */}
      <Box
        sx={{
          textAlign: 'center',
          mb: 1,
          pt: isDealer ? 2.5 : 0,
        }}
      >
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            color: '#2c3e50',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {player.name}
        </Typography>
      </Box>

      {/* Score */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          textAlign: 'center',
          color: isPositive ? '#2e7d32' : '#E64A19',
          mb: 1,
        }}
      >
        {isPositive ? '+' : ''}{netScore} điểm
      </Typography>

      {/* Current Score (smaller) */}
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          textAlign: 'center',
          color: '#95a5a6',
        }}
      >
        {t('xiDachScore.total')}: {player.currentScore} điểm
      </Typography>

      {/* Bet Amount - only show for non-dealers with custom bet */}
      {!isDealer && player.betAmount && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            color: '#FF8A65',
            fontWeight: 500,
            mt: 0.5,
          }}
        >
          {t('xiDachScore.player.betAmount')}: {player.betAmount} điểm
        </Typography>
      )}

      {/* Edit Icon Indicator */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
        <EditIcon sx={{ fontSize: 18, color: '#bdc3c7' }} />
      </Box>
    </Box>
  );
};

// Memoize to prevent unnecessary re-renders when parent re-renders
// PlayerCard will only re-render when its props (player, isDealer, onEdit, onRemove) change
export default React.memo(PlayerCard);
