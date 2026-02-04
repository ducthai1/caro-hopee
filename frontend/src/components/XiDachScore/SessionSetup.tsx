/**
 * Blackjack Score Tracker - Session Setup
 * Form to create a new session with settings
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Switch,
  FormControlLabel,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudIcon from '@mui/icons-material/Cloud';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import LockIcon from '@mui/icons-material/Lock';
import { useXiDachScore } from './XiDachScoreContext';
import { DEFAULT_XI_DACH_SETTINGS } from '../../types/xi-dach-score.types';
import { useLanguage } from '../../i18n';
import { xiDachApi } from '../../services/api';

const SessionSetup: React.FC = () => {
  const { t } = useLanguage();
  const { goToList, setSessionFromApi } = useXiDachScore();

  const [name, setName] = useState('');
  const [pointsPerTu, setPointsPerTu] = useState(DEFAULT_XI_DACH_SETTINGS.pointsPerTu);
  const [penalty28Enabled, setPenalty28Enabled] = useState(
    DEFAULT_XI_DACH_SETTINGS.penalty28Enabled
  );
  const [penalty28Amount, setPenalty28Amount] = useState(
    DEFAULT_XI_DACH_SETTINGS.penalty28Amount
  );
  const [autoRotateDealer, setAutoRotateDealer] = useState(
    DEFAULT_XI_DACH_SETTINGS.autoRotateDealer
  );
  const [autoRotateAfter, setAutoRotateAfter] = useState(
    DEFAULT_XI_DACH_SETTINGS.autoRotateAfter
  );
  const [error, setError] = useState('');

  const [onlinePassword, setOnlinePassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdSessionData, setCreatedSessionData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('xiDachScore.sessionNameRequired'));
      return;
    }

    if (pointsPerTu <= 0) {
      setError(t('xiDachScore.pointsPerTuMin'));
      return;
    }

    const settings = {
      pointsPerTu,
      penalty28Enabled,
      penalty28Amount,
      autoRotateDealer,
      autoRotateAfter,
    };

    setLoading(true);
    setError('');
    try {
      const response = await xiDachApi.createSession(
        trimmedName,
        onlinePassword || undefined,
        settings
      );
      setCreatedSessionData(response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!createdSessionData?.sessionCode) return;
    try {
      await navigator.clipboard.writeText(createdSessionData.sessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = createdSessionData.sessionCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseSuccessDialog = () => {
    setCreatedSessionData(null);
    goToList();
  };

  const handleEnterSession = () => {
    if (createdSessionData) {
      setSessionFromApi(createdSessionData);
      setCreatedSessionData(null);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#FFF8F5',
        pt: { xs: 10, md: 4 },
        pb: 4,
        px: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 500, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton
            onClick={goToList}
            sx={{
              mr: 1,
              color: '#FF8A65',
              '&:hover': {
                bgcolor: 'rgba(255, 138, 101, 0.1)',
              },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: '#2c3e50',
            }}
          >
            {t('xiDachScore.createSession')}
          </Typography>
        </Box>

        {/* Form */}
        <Box
          sx={{
            bgcolor: '#fff',
            borderRadius: 3,
            p: 3,
            boxShadow: '0 2px 8px rgba(255, 138, 101, 0.1)',
            border: '1px solid rgba(255, 138, 101, 0.1)',
          }}
        >
          {/* Optional password */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'rgba(255, 138, 101, 0.06)',
              borderRadius: 2,
              mb: 3,
              border: '1px solid rgba(255, 138, 101, 0.2)',
            }}
          >
            <Typography variant="body2" sx={{ color: '#7f8c8d', mb: 2 }}>
              {t('xiDachScore.multiplayer.passwordHint')}
            </Typography>
            <TextField
              fullWidth
              type="password"
              label={t('xiDachScore.multiplayer.password') + ' (tùy chọn)'}
              placeholder={t('xiDachScore.multiplayer.passwordPlaceholder')}
              value={onlinePassword}
              onChange={(e) => setOnlinePassword(e.target.value)}
              size="small"
              helperText={t('xiDachScore.multiplayer.passwordOptionalHint')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ fontSize: 18, color: '#95a5a6' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
            />
          </Box>

          {/* Session Name */}
          <TextField
            fullWidth
            label={t('xiDachScore.sessionName')}
            placeholder={t('xiDachScore.sessionNamePlaceholder')}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            error={!!error && !name.trim()}
            sx={{ mb: 3 }}
            InputProps={{
              sx: { borderRadius: 2 },
            }}
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

          {/* Penalty 28 - Optional fixed amount */}
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
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#FF8A65',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: '#FF8A65',
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ fontWeight: 500 }}>{t('xiDachScore.penalty28Fixed')}</Typography>
              }
            />
            <Typography variant="caption" sx={{ color: '#7f8c8d', display: 'block', mt: 0.5 }}>
              {penalty28Enabled
                ? t('xiDachScore.penalty28FixedHelper')
                : t('xiDachScore.penalty28ByBetHelper')}
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
              mb: 3,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={autoRotateDealer}
                  onChange={(e) => setAutoRotateDealer(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#FF8A65',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: '#FF8A65',
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ fontWeight: 500 }}>{t('xiDachScore.autoRotateDealer')}</Typography>
              }
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

          {/* Error Message */}
          {error && (
            <Typography
              variant="body2"
              sx={{
                color: '#FF8A65',
                mb: 2,
                textAlign: 'center',
              }}
            >
              {error}
            </Typography>
          )}

          {/* Create Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleCreate}
            disabled={loading}
            startIcon={<CloudIcon />}
            sx={{
              py: 1.5,
              borderRadius: 3,
              background: '#FF8A65',
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              boxShadow: '0 4px 12px rgba(255, 138, 101, 0.3)',
              '&:hover': {
                background: '#E64A19',
                boxShadow: '0 6px 16px rgba(255, 138, 101, 0.4)',
              },
              '&:disabled': {
                background: 'rgba(255, 138, 101, 0.5)',
              },
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} sx={{ color: '#fff' }} />
                Đang tạo...
              </Box>
            ) : (
              t('xiDachScore.createTable')
            )}
          </Button>
        </Box>
      </Box>

      {/* Success Dialog - Show session code after creating online session */}
      <Dialog
        open={!!createdSessionData}
        onClose={handleCloseSuccessDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            textAlign: 'center',
            fontWeight: 700,
            color: '#2e7d32',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <CheckIcon sx={{ color: '#2e7d32' }} />
          Tạo bàn thành công!
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ textAlign: 'center', color: '#7f8c8d', mb: 3 }}>
            Chia sẻ mã bàn này cho bạn bè để cùng tham gia:
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              p: 3,
              bgcolor: 'rgba(255, 138, 101, 0.08)',
              borderRadius: 3,
              mb: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: '36px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                letterSpacing: 6,
                color: '#FF8A65',
              }}
            >
              {createdSessionData?.sessionCode}
            </Typography>
            <IconButton
              onClick={handleCopyCode}
              sx={{
                bgcolor: copied ? '#4caf50' : '#FF8A65',
                color: '#fff',
                '&:hover': {
                  bgcolor: copied ? '#43a047' : '#E64A19',
                },
              }}
            >
              {copied ? <CheckIcon /> : <ContentCopyIcon />}
            </IconButton>
          </Box>

          {copied && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              {t('xiDachScore.multiplayer.codeCopied')}
            </Alert>
          )}

          {onlinePassword && (
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              Bàn này có mật khẩu bảo vệ. Hãy chia sẻ mật khẩu riêng cho bạn bè.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleCloseSuccessDialog}
            sx={{
              px: 3,
              borderColor: '#95a5a6',
              color: '#7f8c8d',
              '&:hover': { borderColor: '#7f8c8d', bgcolor: 'rgba(0,0,0,0.04)' },
            }}
          >
            Đóng
          </Button>
          <Button
            variant="contained"
            onClick={handleEnterSession}
            sx={{
              px: 4,
              bgcolor: '#FF8A65',
              '&:hover': { bgcolor: '#E64A19' },
            }}
          >
            Vào bàn ngay
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionSetup;
