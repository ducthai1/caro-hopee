/**
 * Blackjack Score Tracker - Session Settings Modal
 * Edit session name and game settings
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  InputAdornment,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import { useXiDachScore } from './XiDachScoreContext';
import { useLanguage } from '../../i18n';

interface SessionSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SessionSettingsModal: React.FC<SessionSettingsModalProps> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const { currentSession, updateCurrentSession } = useXiDachScore();

  // Form state
  const [name, setName] = useState('');
  const [pointsPerTu, setPointsPerTu] = useState(10);
  const [penalty28Enabled, setPenalty28Enabled] = useState(false);
  const [penalty28Amount, setPenalty28Amount] = useState(50);
  const [autoRotateDealer, setAutoRotateDealer] = useState(false);
  const [autoRotateAfter, setAutoRotateAfter] = useState(1);

  // Initialize form with current session values
  useEffect(() => {
    if (open && currentSession) {
      setName(currentSession.name);
      setPointsPerTu(currentSession.settings.pointsPerTu);
      setPenalty28Enabled(currentSession.settings.penalty28Enabled);
      setPenalty28Amount(currentSession.settings.penalty28Amount);
      setAutoRotateDealer(currentSession.settings.autoRotateDealer);
      setAutoRotateAfter(currentSession.settings.autoRotateAfter);
    }
  }, [open, currentSession]);

  const handleSave = () => {
    if (!currentSession) return;

    const trimmedName = name.trim();
    if (!trimmedName) return;

    updateCurrentSession({
      name: trimmedName,
      settings: {
        ...currentSession.settings,
        pointsPerTu: Math.max(1, pointsPerTu),
        penalty28Enabled,
        penalty28Amount,
        autoRotateDealer,
        autoRotateAfter: Math.max(1, autoRotateAfter),
      },
    });

    onClose();
  };

  if (!currentSession) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 700,
          color: '#2c3e50',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon sx={{ color: '#FF8A65' }} />
          {t('xiDachScore.settings.title')}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Session Name */}
        <TextField
          fullWidth
          label={t('xiDachScore.sessionName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{ sx: { borderRadius: 2 } }}
        />

        {/* Points per Tu */}
        <TextField
          fullWidth
          label={t('xiDachScore.pointsPerTu')}
          type="number"
          value={pointsPerTu === 0 ? '' : pointsPerTu}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              setPointsPerTu(0);
            } else {
              setPointsPerTu(Math.max(0, parseInt(val) || 0));
            }
          }}
          onBlur={() => {
            if (pointsPerTu < 1) setPointsPerTu(1);
          }}
          InputProps={{
            endAdornment: <InputAdornment position="end">đ</InputAdornment>,
            sx: { borderRadius: 2 },
            inputProps: { min: 1 },
          }}
          sx={{ mb: 3 }}
        />

        {/* Penalty 28 */}
        <Box
          sx={{
            p: 2,
            bgcolor: '#f8f9fa',
            borderRadius: 2,
            mb: 3,
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={penalty28Enabled}
                onChange={(e) => setPenalty28Enabled(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#FF8A65' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#FF8A65' },
                }}
              />
            }
            label={<Typography sx={{ fontWeight: 500 }}>{t('xiDachScore.penalty28Fixed')}</Typography>}
          />
          <Typography variant="caption" sx={{ color: '#7f8c8d', display: 'block', mt: 0.5 }}>
            {penalty28Enabled ? t('xiDachScore.penalty28FixedHelper') : t('xiDachScore.penalty28ByBetHelper')}
          </Typography>

          {penalty28Enabled && (
            <TextField
              fullWidth
              label={t('xiDachScore.penalty28Amount')}
              type="number"
              value={penalty28Amount === 0 ? '' : penalty28Amount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setPenalty28Amount(0);
                } else {
                  setPenalty28Amount(Math.max(0, parseInt(val) || 0));
                }
              }}
              InputProps={{
                endAdornment: <InputAdornment position="end">đ</InputAdornment>,
                sx: { borderRadius: 2 },
                inputProps: { min: 0 },
              }}
              sx={{ mt: 2 }}
              size="small"
            />
          )}
        </Box>

        {/* Auto Rotate Dealer */}
        <Box
          sx={{
            p: 2,
            bgcolor: '#f8f9fa',
            borderRadius: 2,
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={autoRotateDealer}
                onChange={(e) => setAutoRotateDealer(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#FF8A65' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#FF8A65' },
                }}
              />
            }
            label={<Typography sx={{ fontWeight: 500 }}>{t('xiDachScore.autoRotateDealer')}</Typography>}
          />

          {autoRotateDealer && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                {t('xiDachScore.autoRotateAfter')}
              </Typography>
              <TextField
                type="number"
                value={autoRotateAfter === 0 ? '' : autoRotateAfter}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setAutoRotateAfter(0);
                  } else {
                    setAutoRotateAfter(Math.max(0, parseInt(val) || 0));
                  }
                }}
                onBlur={() => {
                  if (autoRotateAfter < 1) setAutoRotateAfter(1);
                }}
                InputProps={{
                  sx: { borderRadius: 2 },
                  inputProps: { min: 1, style: { textAlign: 'center' } },
                }}
                sx={{ width: 80 }}
                size="small"
              />
              <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                {t('xiDachScore.matchesUnit')}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          sx={{ color: '#7f8c8d' }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!name.trim()}
          sx={{
            bgcolor: '#FF8A65',
            '&:hover': { bgcolor: '#E64A19' },
          }}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionSettingsModal;
