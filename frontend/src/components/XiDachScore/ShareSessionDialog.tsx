/**
 * ShareSessionDialog - Dialog for sharing Xi Dach session code and managing password
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CheckIcon from '@mui/icons-material/Check';
import { useLanguage } from '../../i18n';
import { xiDachApi } from '../../services/api';

interface ShareSessionDialogProps {
  open: boolean;
  onClose: () => void;
  sessionCode: string;
  hasPassword: boolean;
  onPasswordChange?: (hasPassword: boolean) => void;
}

const ShareSessionDialog: React.FC<ShareSessionDialogProps> = ({
  open,
  onClose,
  sessionCode,
  hasPassword,
  onPasswordChange,
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = sessionCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await xiDachApi.setPassword(sessionCode, newPassword);
      setSuccess(t('xiDachScore.multiplayer.passwordSet'));
      setNewPassword('');
      setShowPasswordInput(false);
      onPasswordChange?.(true);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    setLoading(true);
    setError(null);
    try {
      await xiDachApi.setPassword(sessionCode, null);
      setSuccess(t('xiDachScore.multiplayer.passwordRemoved'));
      onPasswordChange?.(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowPasswordInput(false);
    setNewPassword('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          color: '#FF8A65',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <span>🔗</span> {t('xiDachScore.multiplayer.shareSession')}
      </DialogTitle>

      <DialogContent>
        {/* Session Code Display */}
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
              fontSize: '32px',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              letterSpacing: 6,
              color: '#FF8A65',
            }}
          >
            {sessionCode}
          </Typography>
          <Tooltip title={copied ? t('xiDachScore.multiplayer.codeCopied') : t('xiDachScore.multiplayer.copyCode')}>
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
          </Tooltip>
        </Box>

        <Typography variant="body2" sx={{ color: '#7f8c8d', textAlign: 'center', mb: 2 }}>
          {t('xiDachScore.multiplayer.joinByCode')}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Password Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {hasPassword ? (
            <LockIcon sx={{ color: '#FF8A65' }} />
          ) : (
            <LockOpenIcon sx={{ color: '#95a5a6' }} />
          )}
          <Typography variant="body2" sx={{ color: hasPassword ? '#FF8A65' : '#95a5a6' }}>
            {hasPassword ? t('xiDachScore.multiplayer.hasPassword') : t('xiDachScore.multiplayer.noPassword')}
          </Typography>
        </Box>

        {showPasswordInput ? (
          <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'stretch' }}>
            <TextField
              fullWidth
              size="small"
              type="password"
              placeholder={t('xiDachScore.multiplayer.passwordPlaceholder')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  height: 40,
                  '&.Mui-focused fieldset': {
                    borderColor: '#FF8A65',
                  },
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleSetPassword}
              disabled={loading || newPassword.length < 4}
              sx={{
                bgcolor: '#FF8A65',
                '&:hover': { bgcolor: '#E64A19' },
                minWidth: 60,
                height: 40,
              }}
            >
              {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : t('xiDachScore.actions.save')}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setShowPasswordInput(false);
                setNewPassword('');
              }}
              sx={{
                borderColor: '#95a5a6',
                color: '#95a5a6',
                height: 40,
              }}
            >
              {t('xiDachScore.actions.cancel')}
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {hasPassword ? (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowPasswordInput(true)}
                  sx={{
                    borderColor: '#FF8A65',
                    color: '#FF8A65',
                    '&:hover': {
                      borderColor: '#E64A19',
                      bgcolor: 'rgba(255, 138, 101, 0.04)',
                    },
                  }}
                >
                  {t('xiDachScore.multiplayer.changePassword')}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleRemovePassword}
                  disabled={loading}
                  sx={{
                    borderColor: '#e74c3c',
                    color: '#e74c3c',
                    '&:hover': {
                      borderColor: '#c0392b',
                      bgcolor: 'rgba(231, 76, 60, 0.04)',
                    },
                  }}
                >
                  {loading ? <CircularProgress size={16} /> : t('xiDachScore.multiplayer.removePassword')}
                </Button>
              </>
            ) : (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowPasswordInput(true)}
                startIcon={<LockIcon />}
                sx={{
                  borderColor: '#FF8A65',
                  color: '#FF8A65',
                  '&:hover': {
                    borderColor: '#E64A19',
                    bgcolor: 'rgba(255, 138, 101, 0.04)',
                  },
                }}
              >
                {t('xiDachScore.multiplayer.setPassword')}
              </Button>
            )}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
            {success}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="contained"
          onClick={handleClose}
          sx={{
            bgcolor: '#FF8A65',
            '&:hover': { bgcolor: '#E64A19' },
          }}
        >
          {t('xiDachScore.actions.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareSessionDialog;
