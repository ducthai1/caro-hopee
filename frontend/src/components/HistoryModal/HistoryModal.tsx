/**
 * HistoryModal - Modal dialog for viewing game history
 * Refactored to use modular sub-components
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { gameApi } from '../../services/api';
import { GameHistory } from '../../types/game.types';
import { useLanguage } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';
import { logger } from '../../utils/logger';
import { HistoryList, GameDetailsPanel } from './components';

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ open, onClose }) => {
  const { t, language } = useLanguage();
  const toast = useToast();
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameHistory | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  useEffect(() => {
    if (open) {
      loadHistory();
    } else {
      // Reset when modal closes
      setHistory([]);
      setSelectedGame(null);
      setViewMode('list');
    }
  }, [open]);

  const loadHistory = async (): Promise<void> => {
    setLoading(true);
    try {
      logger.log('[HistoryModal] Loading game history...');
      const data = await gameApi.getGameHistory();
      logger.log('[HistoryModal] History loaded:', data);
      setHistory(data.history || []);
    } catch (error: any) {
      logger.error('[HistoryModal] Failed to load game history:', error);
      toast.error('toast.historyLoadFailed');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBoard = (game: GameHistory): void => {
    setSelectedGame(game);
    setViewMode('board');
  };

  const handleBackToList = (): void => {
    setViewMode('list');
    setSelectedGame(null);
  };

  const getResultColor = (result: 'win' | 'loss' | 'draw'): string => {
    switch (result) {
      case 'win':
        return '#a8e6cf';
      case 'loss':
        return '#ffaaa5';
      case 'draw':
        return '#ffd93d';
      default:
        return '#8a9ba8';
    }
  };

  const getResultLabel = (result: 'win' | 'loss' | 'draw'): string => {
    switch (result) {
      case 'win':
        return t('history.win');
      case 'loss':
        return t('history.loss');
      case 'draw':
        return t('leaderboard.draws');
      default:
        return t('history.unknown');
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const locale = language === 'vi' ? 'vi-VN' : 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: '#f5f7f9',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
          borderBottom: '2px solid rgba(126, 200, 227, 0.2)',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          {viewMode === 'list' ? `📜 ${t('history.title')}` : `🎯 ${t('history.gameBoard')}`}
        </Typography>
        {viewMode === 'board' && (
          <Button
            onClick={handleBackToList}
            size="small"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            ← {t('history.backToList')}
          </Button>
        )}
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: '#ffaaa5',
            '&:hover': {
              background: 'rgba(255, 170, 165, 0.15)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : viewMode === 'list' ? (
          <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <HistoryList
              history={history}
              onViewBoard={handleViewBoard}
              formatDate={formatDate}
              getResultColor={getResultColor}
              getResultLabel={getResultLabel}
              t={t}
            />
          </Box>
        ) : selectedGame ? (
          <GameDetailsPanel
            game={selectedGame}
            formatDate={formatDate}
            getResultColor={getResultColor}
            getResultLabel={getResultLabel}
            t={t}
          />
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(126, 200, 227, 0.1)' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderColor: 'rgba(255, 170, 165, 0.5)',
            color: '#ffaaa5',
            '&:hover': {
              borderColor: 'rgba(255, 170, 165, 0.8)',
              background: 'rgba(255, 170, 165, 0.1)',
            },
          }}
        >
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HistoryModal;
