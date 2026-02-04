/**
 * Blackjack Score Tracker - End Match Modal
 * Modal to input results for all players after a match
 * Features:
 * - Separate win/lose input for each player
 * - Dealer score is auto-calculated as inverse of other players' total
 * - Dealer xì bàn/xì lác mode: win from all or selected players
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
  Snackbar,
  useMediaQuery,
  useTheme,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Collapse,
} from '@mui/material';
import { useXiDachScore } from './XiDachScoreContext';
import PlayerResultInput, { PlayerResultInputData } from './PlayerResultInput';
import { createPlayerResult, calculateScoreChange } from '../../utils/xi-dach-score-storage';
import { useLanguage } from '../../i18n';
import { XiDachPlayerResult } from '../../types/xi-dach-score.types';

// Dealer special mode types
type DealerMode = 'normal' | 'xiBan' | 'nguLinh';
type DealerWinScope = 'all' | 'selected';

interface EndMatchModalProps {
  open: boolean;
  onClose: () => void;
}

const EndMatchModal: React.FC<EndMatchModalProps> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentSession, addMatch } = useXiDachScore();

  const [playerResults, setPlayerResults] = useState<
    Record<string, PlayerResultInputData>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Dealer special mode states
  const [dealerMode, setDealerMode] = useState<DealerMode>('normal');
  const [dealerWinScope, setDealerWinScope] = useState<DealerWinScope>('all');
  const [dealerWinTargets, setDealerWinTargets] = useState<string[]>([]); // Player IDs dealer wins from

  // Get stable IDs for memoization (prevents infinite re-render loops)
  const activePlayerIds = useMemo(
    () => (currentSession?.players.filter((p) => p.isActive) || []).map(p => p.id).join(','),
    [currentSession?.players]
  );

  // Get active players and dealer using stable IDs
  const activePlayers = useMemo(
    () => currentSession?.players.filter((p) => p.isActive) || [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePlayerIds, currentSession?.players]
  );

  const currentDealerId = currentSession?.currentDealerId;

  const currentDealer = useMemo(
    () => activePlayers.find((p) => p.id === currentDealerId),
    [activePlayers, currentDealerId]
  );

  // Non-dealer players (those who need to input results)
  const nonDealerPlayers = useMemo(
    () => activePlayers.filter((p) => p.id !== currentDealerId),
    [activePlayers, currentDealerId]
  );

  // Stable ID string for nonDealerPlayers
  const nonDealerPlayerIds = useMemo(
    () => nonDealerPlayers.map(p => p.id).join(','),
    [nonDealerPlayers]
  );

  // Check if dealer is in special mode (xì bàn or ngũ linh)
  const isDealerSpecialMode = dealerMode !== 'normal';

  // Players who are disabled (auto-lose to dealer in special mode) - use stable ID string
  const disabledPlayerIdStr = useMemo(() => {
    if (!isDealerSpecialMode) return '';
    if (dealerWinScope === 'all') return nonDealerPlayerIds;
    return dealerWinTargets.join(',');
  }, [isDealerSpecialMode, dealerWinScope, dealerWinTargets, nonDealerPlayerIds]);

  // Convert to array for use in component
  const disabledPlayerIds = useMemo(
    () => disabledPlayerIdStr ? disabledPlayerIdStr.split(',') : [],
    [disabledPlayerIdStr]
  );

  // Players who can still input (not disabled)
  const enabledPlayers = useMemo(
    () => nonDealerPlayers.filter(p => !disabledPlayerIds.includes(p.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nonDealerPlayerIds, disabledPlayerIdStr]
  );

  // Calculate dealer's score as inverse of all other players' scores
  // Using stable ID strings instead of arrays to prevent infinite re-render loops
  const dealerPreviewScore = useMemo(() => {
    if (!currentSession || !currentDealer) return 0;

    // In special mode (xì bàn/ngũ linh), calculate dealer's winning from disabled players
    if (isDealerSpecialMode) {
      const multiplier = dealerMode === 'xiBan' ? 2 : dealerMode === 'nguLinh' ? 2 : 1;

      // Score from disabled players (they all lose 1 tụ to dealer, using each player's bet amount)
      const disabledIds = disabledPlayerIdStr ? disabledPlayerIdStr.split(',') : [];
      let dealerScore = 0;
      for (const playerId of disabledIds) {
        const player = activePlayers.find(p => p.id === playerId);
        if (player) {
          const playerBet = player.betAmount ?? currentSession.settings.pointsPerTu;
          dealerScore += playerBet * multiplier; // 1 tụ × betAmount × multiplier
        }
      }

      // Score from enabled players (inverse of their results)
      const enabledIds = nonDealerPlayerIds.split(',').filter(id =>
        !disabledPlayerIdStr.split(',').includes(id)
      );
      for (const playerId of enabledIds) {
        const data = playerResults[playerId];
        const player = activePlayers.find(p => p.id === playerId);
        if (data && player) {
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
          dealerScore -= score; // Inverse
        }
      }

      return dealerScore;
    }

    // Normal mode: dealer score = inverse of all players' total
    let totalOtherPlayersScore = 0;

    // Sum up all non-dealer players' scores using stable IDs
    const nonDealerIds = nonDealerPlayerIds ? nonDealerPlayerIds.split(',') : [];
    for (const playerId of nonDealerIds) {
      const data = playerResults[playerId];
      const player = activePlayers.find(p => p.id === playerId);
      if (data && player) {
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

    // Dealer's score is the inverse
    return -totalOtherPlayersScore;
  }, [playerResults, nonDealerPlayerIds, currentSession, currentDealer, isDealerSpecialMode, dealerMode, disabledPlayerIdStr, activePlayers]);

  // Initialize player results when modal opens
  // Using stable ID string instead of array to prevent infinite loops
  useEffect(() => {
    if (open && currentSession && nonDealerPlayerIds) {
      const initialResults: Record<string, PlayerResultInputData> = {};
      // Only initialize for non-dealer players using stable IDs
      const ids = nonDealerPlayerIds.split(',').filter(Boolean);
      ids.forEach((playerId) => {
        initialResults[playerId] = {
          playerId: playerId,
          winTuCount: 0,
          winXiBanCount: 0,
          winNguLinhCount: 0,
          loseTuCount: 0,
          loseXiBanCount: 0,
          loseNguLinhCount: 0,
          penalty28: false,
          penalty28Recipients: [],
        };
      });
      setPlayerResults(initialResults);
      setError(null);
      // Reset dealer mode
      setDealerMode('normal');
      setDealerWinScope('all');
      setDealerWinTargets([]);
    }
  }, [open, currentSession, nonDealerPlayerIds]);

  const handlePlayerResultChange = (data: PlayerResultInputData) => {
    setPlayerResults((prev) => ({
      ...prev,
      [data.playerId]: data,
    }));
    setError(null);
  };

  const validateResults = (): string | null => {
    // Validate dealer special mode
    if (isDealerSpecialMode) {
      // Dealer xì bàn/ngũ linh always plays 1 tụ - no need to validate tuCount
      if (dealerWinScope === 'selected' && dealerWinTargets.length === 0) {
        return t('xiDachScore.dealer.selectTargets');
      }
    }

    // Enabled players can have any combination of win/lose (including 0/0)
    // Only validate penalty28 if used
    for (const player of enabledPlayers) {
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

    if (!currentSession || !currentDealer) return;

    const allResults: XiDachPlayerResult[] = [];

    // Create dealer result
    // Dealer xì bàn/ngũ linh always plays 1 tụ
    const dealerTuForResult = isDealerSpecialMode ? 1 : 0;
    const dealerXiBan = dealerMode === 'xiBan' ? 1 : 0;
    const dealerNguLinh = dealerMode === 'nguLinh' ? 1 : 0;
    const dealerResult: XiDachPlayerResult = {
      playerId: currentDealer.id,
      winTuCount: dealerPreviewScore >= 0 ? dealerTuForResult : 0,
      winXiBanCount: dealerPreviewScore >= 0 ? dealerXiBan : 0,
      winNguLinhCount: dealerPreviewScore >= 0 ? dealerNguLinh : 0,
      loseTuCount: dealerPreviewScore < 0 ? dealerTuForResult : 0,
      loseXiBanCount: dealerPreviewScore < 0 ? dealerXiBan : 0,
      loseNguLinhCount: dealerPreviewScore < 0 ? dealerNguLinh : 0,
      penalty28: false,
      penalty28Recipients: [],
      scoreChange: dealerPreviewScore,
    };
    allResults.push(dealerResult);

    // Create results for disabled players (auto-lose 1 tụ to dealer in special mode)
    if (isDealerSpecialMode) {
      const multiplier = dealerMode === 'xiBan' ? 2 : dealerMode === 'nguLinh' ? 2 : 1;

      for (const playerId of disabledPlayerIds) {
        const player = activePlayers.find(p => p.id === playerId);
        const playerBet = player?.betAmount ?? currentSession.settings.pointsPerTu;
        const lossAmount = playerBet * multiplier; // 1 tụ × betAmount × multiplier

        const disabledResult: XiDachPlayerResult = {
          playerId,
          winTuCount: 0,
          winXiBanCount: 0,
          winNguLinhCount: 0,
          loseTuCount: 1, // Dealer xì bàn/ngũ linh always wins 1 tụ
          loseXiBanCount: dealerMode === 'xiBan' ? 1 : 0,
          loseNguLinhCount: dealerMode === 'nguLinh' ? 1 : 0,
          penalty28: false,
          penalty28Recipients: [],
          scoreChange: -lossAmount,
        };
        allResults.push(disabledResult);
      }
    }

    // Create results for enabled players (normal input)
    for (const player of enabledPlayers) {
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

    // In normal mode, add results for all non-dealer players
    if (!isDealerSpecialMode) {
      // Clear and re-add since we already added enabled players above
      allResults.length = 1; // Keep dealer result
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
    }

    // Add match
    addMatch(allResults);
    setShowSuccess(true);

    // Close modal after short delay
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 500);
  };

  if (!currentSession) return null;

  const matchNumber = currentSession.matches.length + 1;

  return (
    <>
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
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#2c3e50' }}>
            {t('xiDachScore.match.endTitle', { number: matchNumber })}
          </Typography>
          {currentDealer && (
            <Typography variant="body2" sx={{ color: '#7f8c8d', mt: 0.5 }}>
              {t('xiDachScore.dealer.label')}: 👑 {currentDealer.name}
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
                ? `${t('xiDachScore.penalty28Short')}: ${currentSession.settings.penalty28Amount}đ`
                : t('xiDachScore.penalty28ByBet')}
            </Typography>
          </Box>

          {/* Dealer Card - Mode selection and score preview */}
          {currentDealer && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: '#fff',
                borderRadius: 2,
                border: `2px solid ${isDealerSpecialMode ? '#FFB74D' : '#FF8A65'}`,
              }}
            >
              {/* Dealer header with score preview */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, pl: 0.5 }}>
                <span style={{ marginRight: 8 }}>👑</span>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                  {currentDealer.name}
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
                    {dealerPreviewScore >= 0 ? '+' : ''}{dealerPreviewScore}đ
                  </Typography>
                </Box>
              </Box>

              {/* Dealer Mode Toggle */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#7f8c8d', mb: 1, display: 'block' }}>
                  {t('xiDachScore.dealer.modeLabel')}
                </Typography>
                <ToggleButtonGroup
                  value={dealerMode}
                  exclusive
                  onChange={(_, newMode) => newMode && setDealerMode(newMode)}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="normal" sx={{ flex: 1, fontSize: '0.75rem' }}>
                    {t('xiDachScore.dealer.modeNormal')}
                  </ToggleButton>
                  <ToggleButton
                    value="xiBan"
                    sx={{
                      flex: 1,
                      fontSize: '0.75rem',
                      '&.Mui-selected': { bgcolor: '#FFB74D', color: '#fff', '&:hover': { bgcolor: '#F57C00' } },
                    }}
                  >
                    {t('xiDachScore.dealer.modeXiBan')}
                  </ToggleButton>
                  <ToggleButton
                    value="nguLinh"
                    sx={{
                      flex: 1,
                      fontSize: '0.75rem',
                      '&.Mui-selected': { bgcolor: '#FFCC80', color: '#fff', '&:hover': { bgcolor: '#FF9800' } },
                    }}
                  >
                    {t('xiDachScore.dealer.modeNguLinh')}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Special mode options */}
              <Collapse in={isDealerSpecialMode}>
                {/* Info: Dealer xì bàn/ngũ linh always plays 1 tụ */}
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(255, 138, 101, 0.08)', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: '#FF8A65' }}>
                    {t('xiDachScore.dealer.xiBanInfo')}
                  </Typography>
                </Box>

                {/* Win scope selection */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#7f8c8d', mb: 1, display: 'block' }}>
                    {t('xiDachScore.dealer.winScopeLabel')}
                  </Typography>
                  <ToggleButtonGroup
                    value={dealerWinScope}
                    exclusive
                    onChange={(_, newScope) => newScope && setDealerWinScope(newScope)}
                    size="small"
                    fullWidth
                  >
                    <ToggleButton
                      value="all"
                      sx={{
                        flex: 1,
                        fontSize: '0.75rem',
                        '&.Mui-selected': { bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: '#1b5e20' } },
                      }}
                    >
                      {t('xiDachScore.dealer.winAll')}
                    </ToggleButton>
                    <ToggleButton
                      value="selected"
                      sx={{
                        flex: 1,
                        fontSize: '0.75rem',
                        '&.Mui-selected': { bgcolor: '#2e7d32', color: '#fff', '&:hover': { bgcolor: '#1b5e20' } },
                      }}
                    >
                      {t('xiDachScore.dealer.winSelected')}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* Player selection for "selected" scope */}
                <Collapse in={dealerWinScope === 'selected'}>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: '#f8f9fa',
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#7f8c8d', mb: 1, display: 'block' }}>
                      {t('xiDachScore.dealer.selectTargetsLabel')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {nonDealerPlayers.map((player) => (
                        <Chip
                          key={player.id}
                          label={player.name}
                          size="small"
                          onClick={() => {
                            if (dealerWinTargets.includes(player.id)) {
                              setDealerWinTargets(dealerWinTargets.filter(id => id !== player.id));
                            } else {
                              setDealerWinTargets([...dealerWinTargets, player.id]);
                            }
                          }}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: dealerWinTargets.includes(player.id) ? '#2e7d32' : '#e0e0e0',
                            color: dealerWinTargets.includes(player.id) ? '#fff' : '#666',
                            '&:hover': {
                              bgcolor: dealerWinTargets.includes(player.id) ? '#1b5e20' : '#d0d0d0',
                            },
                          }}
                        />
                      ))}
                    </Box>
                    {dealerWinTargets.length > 0 && (
                      <Typography variant="caption" sx={{ color: '#2e7d32', mt: 1, display: 'block' }}>
                        {t('xiDachScore.dealer.selectedCount', { count: dealerWinTargets.length })}
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </Collapse>

              {/* Auto-calculate hint for normal mode */}
              {!isDealerSpecialMode && (
                <Typography variant="caption" sx={{ color: '#95a5a6' }}>
                  {t('xiDachScore.dealer.autoCalculateHint')}
                </Typography>
              )}
            </Box>
          )}

          {/* Player Results */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {nonDealerPlayers.map((player) => {
              const isDisabled = disabledPlayerIds.includes(player.id);
              const multiplier = dealerMode === 'xiBan' ? 2 : dealerMode === 'nguLinh' ? 2 : 1;
              // Use player's individual bet amount or session default
              const playerBet = player.betAmount ?? currentSession.settings.pointsPerTu;
              const lossAmount = playerBet * multiplier; // 1 tụ × betAmount × multiplier

              // Show disabled player card (auto-lose to dealer)
              if (isDisabled) {
                return (
                  <Box
                    key={player.id}
                    sx={{
                      bgcolor: '#fff',
                      borderRadius: 2,
                      p: 2,
                      border: '1px solid #e0e0e0',
                      opacity: 0.7,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#7f8c8d' }}>
                          {player.name}
                        </Typography>
                        {player.betAmount && (
                          <Typography variant="caption" sx={{ color: '#FF8A65' }}>
                            {player.betAmount}đ/tụ
                          </Typography>
                        )}
                      </Box>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          bgcolor: 'rgba(255, 138, 101, 0.1)',
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 700, color: '#FF8A65' }}
                        >
                          -{lossAmount}đ
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#95a5a6' }}>
                      {t('xiDachScore.dealer.autoLose')}
                    </Typography>
                  </Box>
                );
              }

              // Show normal player input
              const otherPlayers = activePlayers.filter((p) => p.id !== player.id);
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
              px: 3,
              borderColor: '#FF8A65',
              color: '#FF8A65',
              background: '#fff',
              '&:hover': {
                borderColor: '#E64A19',
                background: 'rgba(0, 0, 0, 0.04)',
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
              background: '#FF8A65',
              color: '#fff',
              '&:hover': { background: '#E64A19' },
            }}
          >
            {t('xiDachScore.match.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          {t('xiDachScore.match.saved', { number: matchNumber })}
        </Alert>
      </Snackbar>
    </>
  );
};

export default EndMatchModal;
