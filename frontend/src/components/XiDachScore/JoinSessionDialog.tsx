/**
 * JoinSessionDialog - Dialog for joining Xi Dach sessions by code
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useLanguage } from '../../i18n';
import { xiDachApi, XiDachSessionResponse } from '../../services/api';

interface JoinSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onJoinSuccess: (sessionCode: string, sessionData?: XiDachSessionResponse) => void;
  initialSessionCode?: string;
}

const JoinSessionDialog: React.FC<JoinSessionDialogProps> = ({
  open,
  onClose,
  onJoinSuccess,
  initialSessionCode,
}) => {
  const { t } = useLanguage();
  const [sessionCode, setSessionCode] = useState(initialSessionCode || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);

  useEffect(() => {
    if (open && initialSessionCode) {
      setSessionCode(initialSessionCode);
    }
  }, [open, initialSessionCode]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setSessionCode(value);
    setError(null);
    setRequiresPassword(false);
  };

  const handleJoin = async () => {
    if (sessionCode.length !== 6) {
      setError(t('xiDachScore.multiplayer.sessionCodeInvalid'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to join/get session - returns full session data
      const session = await xiDachApi.joinSession(sessionCode, password || undefined);
      // Pass full session data for creating local session
      onJoinSuccess(session.sessionCode, session);
      handleClose();
    } catch (err: any) {
      const response = err.response?.data;
      if (response?.requiresPassword) {
        setRequiresPassword(true);
        setError(t('xiDachScore.multiplayer.passwordRequired'));
      } else if (err.response?.status === 401) {
        setError(t('xiDachScore.multiplayer.passwordInvalid'));
      } else if (err.response?.status === 404) {
        setError(t('xiDachScore.multiplayer.sessionNotFound'));
      } else {
        setError(response?.message || t('xiDachScore.multiplayer.joinError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSessionCode('');
    setPassword('');
    setError(null);
    setRequiresPassword(false);
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
        <span>🎴</span> {t('xiDachScore.multiplayer.joinSession')}
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" sx={{ color: '#7f8c8d', mb: 2 }}>
          {t('xiDachScore.multiplayer.joinByCode')}
        </Typography>

        <TextField
          fullWidth
          label={t('xiDachScore.multiplayer.sessionCode')}
          value={sessionCode}
          onChange={handleCodeChange}
          placeholder={t('xiDachScore.multiplayer.sessionCodePlaceholder')}
          inputProps={{
            maxLength: 6,
            style: {
              textAlign: 'center',
              fontSize: '24px',
              fontFamily: 'monospace',
              letterSpacing: 4,
              fontWeight: 'bold',
            },
          }}
          InputLabelProps={{ shrink: true }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&.Mui-focused fieldset': {
                borderColor: '#FF8A65',
              },
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#FF8A65',
            },
          }}
        />

        {requiresPassword && (
          <TextField
            fullWidth
            type="password"
            label={t('xiDachScore.multiplayer.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('xiDachScore.multiplayer.passwordPlaceholder')}
            InputProps={{
              startAdornment: <LockIcon sx={{ color: '#95a5a6', mr: 1 }} />,
            }}
            InputLabelProps={{ shrink: true }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&.Mui-focused fieldset': {
                  borderColor: '#FF8A65',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#FF8A65',
              },
            }}
          />
        )}

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          sx={{
            borderColor: '#FF8A65',
            color: '#FF8A65',
            '&:hover': {
              borderColor: '#E64A19',
              bgcolor: 'rgba(255, 138, 101, 0.04)',
            },
          }}
        >
          {t('xiDachScore.actions.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleJoin}
          disabled={loading || sessionCode.length !== 6}
          sx={{
            bgcolor: '#FF8A65',
            '&:hover': { bgcolor: '#E64A19' },
            '&:disabled': { bgcolor: '#ccc' },
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} sx={{ color: '#fff' }} />
              {t('xiDachScore.multiplayer.joining')}
            </Box>
          ) : (
            t('xiDachScore.multiplayer.joinSession')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JoinSessionDialog;
