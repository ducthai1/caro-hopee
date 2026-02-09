/**
 * Xì Dách Score Tracker - Edit Match Modal
 * Modal to edit the last match results (pre-filled with existing data)
 * Supports both new format (separate win/lose) and legacy format
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useXiDachScore } from './XiDachScoreContext';
import PlayerResultInput, { PlayerResultInputData } from './PlayerResultInput';
import { createPlayerResult, calculateScoreChange } from '../../utils/xi-dach-score-storage';
import { useLanguage } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';
import { XiDachPlayerResult } from '../../types/xi-dach-score.types';

interface EditMatchModalProps {
  open: boolean;
  matchId: string | null;
  onClose: () => void;
}

const EditMatchModal: React.FC<EditMatchModalProps> = ({ open, matchId, onClose }) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentSession, editMatch } = useXiDachScore();

  const [playerResults, setPlayerResults] = useState<
    Record<string, PlayerResultInputData>
  >({});
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  // Get the match to edit
  const matchToEdit = useMemo(() => {
    if (!currentSession || !matchId) return null;
    return currentSession.matches.find((m) => m.id === matchId) || null;
  }, [currentSession, matchId]);

  // Get active players
  const activePlayers = useMemo(
    () => currentSession?.players.filter((p) => p.isActive) || [],
    [currentSession?.players]
  );

  // Non-dealer players
  const nonDealerPlayers = useMemo(
    () => activePlayers.filter((p) => p.id !== matchToEdit?.dealerId),
    [activePlayers, matchToEdit?.dealerId]
  );

  const dealer = useMemo(
    () => activePlayers.find((p) => p.id === matchToEdit?.dealerId),
    [activePlayers, matchToEdit?.dealerId]
  );

  // Convert legacy format result to new format
  const convertLegacyResult = (result: XiDachPlayerResult): PlayerResultInputData => {
    // New format: has winTuCount/loseTuCount
    if (result.winTuCount !== undefined && result.loseTuCount !== undefined) {
      return {
        playerId: result.playerId,
        winTuCount: result.winTuCount,
        winXiBanCount: result.winXiBanCount,
        winNguLinhCount: result.winNguLinhCount,
        loseTuCount: result.loseTuCount,
        loseXiBanCount: result.loseXiBanCount,
        loseNguLinhCount: result.loseNguLinhCount,
        penalty28: result.penalty28,
        penalty28Recipients: result.penalty28Recipients,
      };
    }

    // Legacy format: convert based on outcome
    if (result.outcome === 'win') {
      return {
        playerId: result.playerId,
        winTuCount: result.tuCount || 0,
        winXiBanCount: result.xiBanCount || 0,
        winNguLinhCount: result.nguLinhCount || 0,
        loseTuCount: 0,
        loseXiBanCount: 0,
        loseNguLinhCount: 0,
        penalty28: result.penalty28,
        penalty28Recipients: result.penalty28Recipients,
      };
    } else {
      return {
        playerId: result.playerId,
        winTuCount: 0,
        winXiBanCount: 0,
        winNguLinhCount: 0,
        loseTuCount: result.tuCount || 0,
        loseXiBanCount: result.xiBanCount || 0,
        loseNguLinhCount: result.nguLinhCount || 0,
        penalty28: result.penalty28,
        penalty28Recipients: result.penalty28Recipients,
      };
    }
  };

  // Calculate dealer preview score (inverse of other players)
  const dealerPreviewScore = useMemo(() => {
    if (!currentSession || !dealer) return 0;

    let totalOtherPlayersScore = 0;

    for (const player of nonDealerPlayers) {
      const data = playerResults[player.id];
      if (data) {
        const score = calculateScoreChange(
          {
            playerId: data.playerId,
            winTuCount: data.winTuCount,
            winXiBanCount: data.winXiBanCount,
            winNguLinhCount: data.winNguLinhCount,
            loseTuCount: data.loseTuCount,
            loseXiBanCount: data.loseXiBanCount,
            loseNguLinhCount: data.loseNguLinhCount,
            penalty28: data.penalty28,
            penalty28Recipients: data.penalty28Recipients,
          },
          currentSession.settings,
          player.betAmount // Pass player's individual bet amount
        );
        totalOtherPlayersScore += score;
      }
    }

    return -totalOtherPlayersScore;
  }, [playerResults, nonDealerPlayers, currentSession, dealer]);

  // Initialize player results when modal opens with existing match data
  useEffect(() => {
    if (open && matchToEdit && currentSession) {
      const initialResults: Record<string, PlayerResultInputData> = {};

      // Pre-fill with existing match results (convert legacy if needed)
      matchToEdit.results.forEach((result) => {
        initialResults[result.playerId] = convertLegacyResult(result);
      });

      // Add any players who weren't in the original match (unlikely but safe)
      activePlayers.forEach((player) => {
        if (!initialResults[player.id]) {
          initialResults[player.id] = {
            playerId: player.id,
            winTuCount: 0,
            winXiBanCount: 0,
            winNguLinhCount: 0,
            loseTuCount: 0,
            loseXiBanCount: 0,
            loseNguLinhCount: 0,
            penalty28: false,
            penalty28Recipients: [],
          };
        }
      });

      setPlayerResults(initialResults);
      setError(null);
    }
  }, [open, matchToEdit, currentSession, activePlayers]);

  const handlePlayerResultChange = (data: PlayerResultInputData) => {
    setPlayerResults((prev) => ({
      ...prev,
      [data.playerId]: data,
    }));
    setError(null);
  };

  const validateResults = (): string | null => {
    // Only validate penalty28 if used
    for (const player of nonDealerPlayers) {
      const result = playerResults[player.id];
      if (!result) {
        return t('xiDachScore.match.missingResult', { name: player.name });
      }
      if (result.penalty28 && result.penalty28Recipients.length === 0) {
        return t('xiDachScore.match.penalty28NoRecipient', { name: player.name });
      }
    }
    return null;
  };

  const handleSubmit = () => {
    const validationError = validateResults();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!currentSession || !matchId || !dealer) return;

    const allResults: XiDachPlayerResult[] = [];

    // Create dealer result (auto-calculated)
    const dealerResult: XiDachPlayerResult = {
      playerId: dealer.id,
      winTuCount: dealerPreviewScore >= 0 ? 0 : 0,
      winXiBanCount: 0,
      winNguLinhCount: 0,
      loseTuCount: 0,
      loseXiBanCount: 0,
      loseNguLinhCount: 0,
      penalty28: false,
      penalty28Recipients: [],
      scoreChange: dealerPreviewScore,
    };
    allResults.push(dealerResult);

    // Create results for non-dealer players
    for (const player of nonDealerPlayers) {
      const data = playerResults[player.id];
      const result = createPlayerResult(
        player.id,
        {
          winTuCount: data.winTuCount,
          winXiBanCount: data.winXiBanCount,
          winNguLinhCount: data.winNguLinhCount,
          loseTuCount: data.loseTuCount,
          loseXiBanCount: data.loseXiBanCount,
          loseNguLinhCount: data.loseNguLinhCount,
          penalty28: data.penalty28,
          penalty28Recipients: data.penalty28Recipients,
        },
        currentSession.settings,
        player.betAmount // Pass player's individual bet amount
      );
      allResults.push(result);
    }

    // Edit match
    editMatch(matchId, allResults);
    toast.success('toast.matchUpdated');
    onClose();
  };

  if (!currentSession || !matchToEdit) return null;

  return (
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 3,
            maxHeight: isMobile ? '100%' : '90vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            borderBottom: '1px solid #eee',
            pb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2c3e50' }}>
              {t('xiDachScore.history.editTitle', { number: matchToEdit.matchNumber })}
            </Typography>
            <Chip
              label={t('xiDachScore.history.editing')}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: '#FFB74D',
                color: '#fff',
              }}
            />
          </Box>
          {dealer && (
            <Typography variant="body2" sx={{ color: '#7f8c8d', mt: 0.5 }}>
              {t('xiDachScore.dealer.label')}: 👑 {dealer.name}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent
          sx={{
            p: 2,
            bgcolor: '#f8f9fa',
          }}
        >
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Settings Info */}
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              bgcolor: '#fff',
              borderRadius: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: '#95a5a6' }}>
              {currentSession.settings.pointsPerTu}{t('xiDachScore.game.perTu')}
            </Typography>
            <Typography variant="caption" sx={{ color: '#95a5a6' }}>
              {currentSession.settings.penalty28Enabled
                ? `${t('xiDachScore.penalty28Short')}: ${currentSession.settings.penalty28Amount} điểm`
                : t('xiDachScore.penalty28ByBet')}
            </Typography>
          </Box>

          {/* Dealer Card - Score preview */}
          {dealer && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: '#fff',
                borderRadius: 2,
                border: '2px solid #FF8A65',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <span style={{ marginRight: 8 }}>👑</span>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                  {dealer.name}
                </Typography>
                <Box
                  sx={{
                    ml: 'auto',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    bgcolor: dealerPreviewScore >= 0 ? 'rgba(39, 174, 96, 0.1)' : 'rgba(255, 138, 101, 0.1)',
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: dealerPreviewScore >= 0 ? '#2e7d32' : '#E64A19',
                    }}
                  >
                    {dealerPreviewScore >= 0 ? '+' : ''}{dealerPreviewScore} điểm
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: '#95a5a6' }}>
                {t('xiDachScore.dealer.autoCalculateHint')}
              </Typography>
            </Box>
          )}

          {/* Player Results */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {nonDealerPlayers.map((player) => {
              const otherPlayers = activePlayers.filter(
                (p) => p.id !== player.id
              );
              return (
                <PlayerResultInput
                  key={player.id}
                  player={player}
                  data={
                    playerResults[player.id] || {
                      playerId: player.id,
                      winTuCount: 0,
                      winXiBanCount: 0,
                      winNguLinhCount: 0,
                      loseTuCount: 0,
                      loseXiBanCount: 0,
                      loseNguLinhCount: 0,
                      penalty28: false,
                      penalty28Recipients: [],
                    }
                  }
                  settings={currentSession.settings}
                  otherPlayers={otherPlayers}
                  onChange={handlePlayerResultChange}
                  isDealer={false}
                />
              );
            })}
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid #eee',
            bgcolor: '#fff',
          }}
        >
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              borderColor: '#FF8A65',
              color: '#FF8A65',
              bgcolor: '#fff',
              px: 3,
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
            onClick={handleSubmit}
            sx={{
              px: 4,
              bgcolor: '#FF8A65',
              '&:hover': { bgcolor: '#E64A19' },
            }}
          >
            {t('xiDachScore.history.saveChanges')}
          </Button>
        </DialogActions>
      </Dialog>
  );
};

export default EditMatchModal;
