/**
 * Blackjack Score Tracker - Edit Player Modal
 * Form to edit player name and base score
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  InputAdornment,
  Box,
  Typography,
} from '@mui/material';
import { XiDachPlayer } from '../../types/xi-dach-score.types';
import { useLanguage } from '../../i18n';

interface EditPlayerModalProps {
  open: boolean;
  player: XiDachPlayer | null;
  onClose: () => void;
  onSave: (playerId: string, updates: { name?: string; baseScore?: number; betAmount?: number }) => void;
  onRemove: (playerId: string) => void;
  existingNames: string[];
  defaultBetAmount?: number; // Session's default pointsPerTu for display
  isDealer?: boolean; // Whether this player is the dealer
}

const EditPlayerModal: React.FC<EditPlayerModalProps> = ({
  open,
  player,
  onClose,
  onSave,
  onRemove,
  existingNames,
  defaultBetAmount,
  isDealer = false,
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [baseScore, setBaseScore] = useState(0);
  const [betAmount, setBetAmount] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (player) {
      setName(player.name);
      setBaseScore(player.baseScore);
      setBetAmount(player.betAmount);
      setError('');
    }
  }, [player]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSave = () => {
    if (!player) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(t('xiDachScore.player.nameRequired'));
      return;
    }

    // Check duplicate name (excluding current player)
    const otherNames = existingNames.filter(n => n !== player.name);
    if (otherNames.some(n => n.toLowerCase() === trimmedName.toLowerCase())) {
      setError(t('xiDachScore.player.nameExists'));
      return;
    }

    const updates: { name?: string; baseScore?: number; betAmount?: number } = {};

    if (trimmedName !== player.name) {
      updates.name = trimmedName;
    }

    if (baseScore !== player.baseScore) {
      updates.baseScore = baseScore;
    }

    // Only save betAmount for non-dealers
    if (!isDealer && betAmount !== player.betAmount) {
      updates.betAmount = betAmount;
    }

    if (Object.keys(updates).length > 0) {
      onSave(player.id, updates);
    }

    handleClose();
  };

  const handleRemove = () => {
    if (!player) return;
    onRemove(player.id);
    handleClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  if (!player) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: { borderRadius: 3, minWidth: 320 },
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
        {t('xiDachScore.player.edit')}
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <TextField
          autoFocus
          fullWidth
          label={t('xiDachScore.player.name')}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          onKeyPress={handleKeyPress}
          error={!!error}
          helperText={error}
          sx={{ mb: 2, mt: 1 }}
          InputProps={{
            sx: { borderRadius: 2 },
          }}
        />

        <TextField
          fullWidth
          label={t('xiDachScore.player.baseScore')}
          type="number"
          value={baseScore === 0 ? '' : baseScore}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || val === '-') {
              setBaseScore(0);
            } else {
              setBaseScore(parseInt(val) || 0);
            }
          }}
          onKeyPress={handleKeyPress}
          InputProps={{
            endAdornment: <InputAdornment position="end">đ</InputAdornment>,
            sx: { borderRadius: 2 },
          }}
          helperText={t('xiDachScore.player.baseScoreEditHelper')}
          sx={{ mb: 2 }}
        />

        {/* Bet Amount - only show for non-dealers */}
        {!isDealer && (
          <TextField
            fullWidth
            label={t('xiDachScore.player.betAmount')}
            type="number"
            value={betAmount ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setBetAmount(undefined);
              } else {
                const num = parseInt(val);
                setBetAmount(num > 0 ? num : undefined);
              }
            }}
            onKeyPress={handleKeyPress}
            InputProps={{
              endAdornment: <InputAdornment position="end">đ</InputAdornment>,
              sx: { borderRadius: 2 },
            }}
            placeholder={defaultBetAmount ? `${defaultBetAmount}` : ''}
            helperText={t('xiDachScore.player.betAmountEditHelper')}
            sx={{ mb: 2 }}
          />
        )}

        {/* Current Score Info */}
        <Box
          sx={{
            p: 2,
            bgcolor: '#f8f9fa',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: '#7f8c8d', mb: 0.5 }}>
            {t('xiDachScore.player.currentScore')}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
            {player.currentScore}đ
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color:
                player.currentScore - player.baseScore >= 0 ? '#2e7d32' : '#E64A19',
            }}
          >
            {t('xiDachScore.player.netScore')}: {player.currentScore - player.baseScore >= 0 ? '+' : ''}
            {player.currentScore - player.baseScore}đ
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={handleRemove}
          sx={{
            borderColor: '#d32f2f',
            color: '#d32f2f',
            bgcolor: '#fff',
            '&:hover': {
              borderColor: '#b71c1c',
              bgcolor: 'rgba(211, 47, 47, 0.08)',
            },
          }}
        >
          {t('xiDachScore.player.remove')}
        </Button>
        <Box>
          <Button
            variant="outlined"
            onClick={handleClose}
            sx={{
              borderColor: '#FF8A65',
              color: '#FF8A65',
              bgcolor: '#fff',
              mr: 1,
              '&:hover': {
                borderColor: '#E64A19',
                bgcolor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            {t('xiDachScore.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              bgcolor: '#FF8A65',
              '&:hover': { bgcolor: '#E64A19' },
            }}
          >
            {t('xiDachScore.actions.save')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EditPlayerModal;
