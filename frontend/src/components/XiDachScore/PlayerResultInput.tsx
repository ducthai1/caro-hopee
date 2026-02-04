/**
 * Blackjack Score Tracker - Player Result Input
 * Form to input match result for a single player (non-dealer only)
 * Uses separate win/lose input with +/- controls
 */

import React from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Chip,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { XiDachPlayer, XiDachSettings } from '../../types/xi-dach-score.types';
import { calculateScoreChange } from '../../utils/xi-dach-score-storage';
import { useLanguage } from '../../i18n';

export interface PlayerResultInputData {
  playerId: string;
  // Win side
  winTuCount: number;
  winXiBanCount: number;
  winNguLinhCount: number;
  // Lose side
  loseTuCount: number;
  loseXiBanCount: number;
  loseNguLinhCount: number;
  // Penalty
  penalty28: boolean;
  penalty28Recipients: string[];
}

interface PlayerResultInputProps {
  player: XiDachPlayer;
  data: PlayerResultInputData;
  settings: XiDachSettings;
  otherPlayers: XiDachPlayer[];
  onChange: (data: PlayerResultInputData) => void;
  isDealer: boolean;
}

/**
 * Counter Button Component for +/- input
 */
const CounterButton: React.FC<{
  label: string;
  value: number;
  maxValue: number;
  minValue?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  color?: string;
  size?: 'small' | 'normal';
}> = ({ label, value, maxValue, minValue = 0, disabled = false, onChange, color = '#FF8A65', size = 'normal' }) => {
  const canDecrease = value > minValue && !disabled;
  const canIncrease = value < maxValue && !disabled;

  const isSmall = size === 'small';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: isSmall ? 0.5 : 1,
        bgcolor: disabled ? '#f5f5f5' : '#fff',
        borderRadius: isSmall ? 1 : 2,
        border: `1px solid ${disabled ? '#e0e0e0' : '#eee'}`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <IconButton
        size="small"
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        sx={{
          bgcolor: canDecrease ? `${color}15` : 'transparent',
          '&:hover': { bgcolor: canDecrease ? `${color}25` : 'transparent' },
          p: isSmall ? 0.25 : 0.5,
        }}
      >
        <RemoveIcon sx={{ fontSize: isSmall ? 14 : 18, color: canDecrease ? color : '#ccc' }} />
      </IconButton>
      <Box sx={{ textAlign: 'center', minWidth: isSmall ? 40 : 60 }}>
        <Typography variant={isSmall ? 'caption' : 'body2'} sx={{ fontWeight: 600, color: disabled ? '#999' : '#2c3e50' }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: '#95a5a6', fontSize: isSmall ? '0.55rem' : '0.65rem', display: 'block' }}>
          {label}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        sx={{
          bgcolor: canIncrease ? `${color}15` : 'transparent',
          '&:hover': { bgcolor: canIncrease ? `${color}25` : 'transparent' },
          p: isSmall ? 0.25 : 0.5,
        }}
      >
        <AddIcon sx={{ fontSize: isSmall ? 14 : 18, color: canIncrease ? color : '#ccc' }} />
      </IconButton>
    </Box>
  );
};

const PlayerResultInput: React.FC<PlayerResultInputProps> = ({
  player,
  data,
  settings,
  otherPlayers,
  onChange,
  isDealer,
}) => {
  const { t } = useLanguage();

  // Use player's individual bet amount or session default
  const effectiveBetAmount = player.betAmount ?? settings.pointsPerTu;

  // Calculate preview score
  const previewScore = calculateScoreChange(
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
    settings,
    player.betAmount // Pass player's individual bet amount
  );

  // Calculate penalty amount (based on lose amount)
  const loseAmount = (data.loseTuCount + data.loseXiBanCount + data.loseNguLinhCount) * effectiveBetAmount;
  const penaltyAmountPerRecipient = settings.penalty28Enabled
    ? settings.penalty28Amount
    : loseAmount;

  // Max constraint: xiBan + nguLinh <= tuCount (for each side)
  const maxWinXiBan = Math.max(0, data.winTuCount - data.winNguLinhCount);
  const maxWinNguLinh = Math.max(0, data.winTuCount - data.winXiBanCount);
  const maxLoseXiBan = Math.max(0, data.loseTuCount - data.loseNguLinhCount);
  const maxLoseNguLinh = Math.max(0, data.loseTuCount - data.loseXiBanCount);

  // Handle win tu count change
  const handleWinTuCountChange = (value: number) => {
    const newTuCount = Math.max(0, value);
    let newXiBan = data.winXiBanCount;
    let newNguLinh = data.winNguLinhCount;

    // Adjust multipliers if they exceed new tuCount
    if (newXiBan + newNguLinh > newTuCount) {
      const excess = (newXiBan + newNguLinh) - newTuCount;
      if (newXiBan >= excess) {
        newXiBan -= excess;
      } else {
        newNguLinh -= (excess - newXiBan);
        newXiBan = 0;
      }
    }

    onChange({
      ...data,
      winTuCount: newTuCount,
      winXiBanCount: Math.max(0, newXiBan),
      winNguLinhCount: Math.max(0, newNguLinh),
    });
  };

  // Handle lose tu count change
  const handleLoseTuCountChange = (value: number) => {
    const newTuCount = Math.max(0, value);
    let newXiBan = data.loseXiBanCount;
    let newNguLinh = data.loseNguLinhCount;

    // Adjust multipliers if they exceed new tuCount
    if (newXiBan + newNguLinh > newTuCount) {
      const excess = (newXiBan + newNguLinh) - newTuCount;
      if (newXiBan >= excess) {
        newXiBan -= excess;
      } else {
        newNguLinh -= (excess - newXiBan);
        newXiBan = 0;
      }
    }

    onChange({
      ...data,
      loseTuCount: newTuCount,
      loseXiBanCount: Math.max(0, newXiBan),
      loseNguLinhCount: Math.max(0, newNguLinh),
    });
  };

  const handlePenalty28Toggle = (checked: boolean) => {
    onChange({
      ...data,
      penalty28: checked,
      penalty28Recipients: checked ? data.penalty28Recipients : [],
    });
  };

  const handleRecipientToggle = (recipientId: string) => {
    const isSelected = data.penalty28Recipients.includes(recipientId);
    const newRecipients = isSelected
      ? data.penalty28Recipients.filter((id) => id !== recipientId)
      : [...data.penalty28Recipients, recipientId];
    onChange({ ...data, penalty28Recipients: newRecipients });
  };

  // Dealer card shows different UI - just displays that score will be auto-calculated
  if (isDealer) {
    return (
      <Box
        sx={{
          bgcolor: '#fff',
          borderRadius: 2,
          p: 2,
          border: '2px solid #FF8A65',
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <span style={{ marginRight: 4 }}>👑</span>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2c3e50' }}>
            {player.name}
          </Typography>
          <Chip
            label={t('xiDachScore.dealer.label')}
            size="small"
            sx={{
              ml: 1,
              height: 20,
              fontSize: '0.65rem',
              bgcolor: '#FF8A65',
              color: '#fff',
            }}
          />
        </Box>
        <Box
          sx={{
            p: 2,
            bgcolor: 'rgba(255, 138, 101, 0.05)',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
            {t('xiDachScore.dealer.autoCalculate')}
          </Typography>
          <Typography variant="caption" sx={{ color: '#95a5a6' }}>
            {t('xiDachScore.dealer.autoCalculateHint')}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        borderRadius: 2,
        p: 2,
        border: '1px solid #eee',
        position: 'relative',
      }}
    >
      {/* Player Name and Bet Amount */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2c3e50' }}>
          {player.name}
        </Typography>
        {player.betAmount && (
          <Chip
            label={`${player.betAmount}đ/tụ`}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              bgcolor: 'rgba(255, 138, 101, 0.1)',
              color: '#FF8A65',
              fontWeight: 600,
            }}
          />
        )}
      </Box>

      {/* Win Section */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: '#2e7d32',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            mb: 1,
            display: 'block',
          }}
        >
          {t('xiDachScore.match.win')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ flex: 2 }}>
            <CounterButton
              label={t('xiDachScore.match.tuCount')}
              value={data.winTuCount}
              maxValue={10}
              minValue={0}
              onChange={handleWinTuCountChange}
              color="#2e7d32"
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <CounterButton
              label={t('xiDachScore.match.xiBanShort')}
              value={data.winXiBanCount}
              maxValue={maxWinXiBan}
              minValue={0}
              disabled={data.winTuCount === 0}
              onChange={(v) => onChange({ ...data, winXiBanCount: Math.max(0, Math.min(v, maxWinXiBan)) })}
              color="#66bb6a"
              size="small"
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <CounterButton
              label={t('xiDachScore.match.nguLinhShort')}
              value={data.winNguLinhCount}
              maxValue={maxWinNguLinh}
              minValue={0}
              disabled={data.winTuCount === 0}
              onChange={(v) => onChange({ ...data, winNguLinhCount: Math.max(0, Math.min(v, maxWinNguLinh)) })}
              color="#81c784"
              size="small"
            />
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Lose Section */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: '#E64A19',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            mb: 1,
            display: 'block',
          }}
        >
          {t('xiDachScore.match.lose')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ flex: 2 }}>
            <CounterButton
              label={t('xiDachScore.match.tuCount')}
              value={data.loseTuCount}
              maxValue={10}
              minValue={0}
              onChange={handleLoseTuCountChange}
              color="#E64A19"
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <CounterButton
              label={t('xiDachScore.match.xiBanShort')}
              value={data.loseXiBanCount}
              maxValue={maxLoseXiBan}
              minValue={0}
              disabled={data.loseTuCount === 0}
              onChange={(v) => onChange({ ...data, loseXiBanCount: Math.max(0, Math.min(v, maxLoseXiBan)) })}
              color="#ff7043"
              size="small"
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <CounterButton
              label={t('xiDachScore.match.nguLinhShort')}
              value={data.loseNguLinhCount}
              maxValue={maxLoseNguLinh}
              minValue={0}
              disabled={data.loseTuCount === 0}
              onChange={(v) => onChange({ ...data, loseNguLinhCount: Math.max(0, Math.min(v, maxLoseNguLinh)) })}
              color="#ff8a65"
              size="small"
            />
          </Box>
        </Box>
      </Box>

      {/* Penalty 28 - only show when there are losses */}
      <Collapse in={data.loseTuCount > 0}>
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={data.penalty28}
                onChange={(e) => handlePenalty28Toggle(e.target.checked)}
                sx={{
                  color: '#FF8A65',
                  '&.Mui-checked': { color: '#FF8A65' },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                {settings.penalty28Enabled
                  ? t('xiDachScore.match.penalty28LabelFixed', { amount: settings.penalty28Amount })
                  : t('xiDachScore.match.penalty28LabelBet', { amount: penaltyAmountPerRecipient })}
              </Typography>
            }
          />

          <Collapse in={data.penalty28}>
            <Box
              sx={{
                ml: 4,
                mt: 1,
                p: 1.5,
                bgcolor: '#f8f9fa',
                borderRadius: 1,
              }}
            >
              <Typography variant="caption" sx={{ color: '#7f8c8d', mb: 1, display: 'block' }}>
                {t('xiDachScore.match.penalty28To')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {otherPlayers.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    size="small"
                    onClick={() => handleRecipientToggle(p.id)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: data.penalty28Recipients.includes(p.id)
                        ? '#FF8A65'
                        : '#e0e0e0',
                      color: data.penalty28Recipients.includes(p.id)
                        ? '#fff'
                        : '#666',
                      '&:hover': {
                        bgcolor: data.penalty28Recipients.includes(p.id)
                          ? '#E64A19'
                          : '#d0d0d0',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Collapse>
        </Box>
      </Collapse>

      {/* Score Preview */}
      <Box
        sx={{
          p: 1.5,
          bgcolor: previewScore >= 0 ? 'rgba(39, 174, 96, 0.1)' : 'rgba(255, 138, 101, 0.1)',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
          {t('xiDachScore.match.scoreChange')}
        </Typography>
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: previewScore >= 0 ? '#2e7d32' : '#E64A19',
            }}
          >
            {previewScore >= 0 ? '+' : ''}
            {previewScore}đ
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default PlayerResultInput;
