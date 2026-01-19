/**
 * SetPasswordDialog - Dialog for host to set/remove game room password
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  IconButton,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useLanguage } from '../../i18n';

interface SetPasswordDialogProps {
  open: boolean;
  onConfirm: (password: string | null) => void;
  onCancel: () => void;
  hasPassword: boolean;
}

const SetPasswordDialog: React.FC<SetPasswordDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  hasPassword,
}) => {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = (): void => {
    const trimmedPassword = password.trim();
    
    // If removing password
    if (!trimmedPassword && hasPassword) {
      onConfirm(null);
      setPassword('');
      setError(null);
      return;
    }

    // If setting password
    if (!trimmedPassword) {
      setError(t('game.passwordRequired') || 'Password is required');
      return;
    }

    if (trimmedPassword.length < 4 || trimmedPassword.length > 50) {
      setError(t('game.passwordInvalidLength') || 'Password must be between 4 and 50 characters');
      return;
    }

    setError(null);
    onConfirm(trimmedPassword);
    setPassword(''); // Clear password after confirm
  };

  const handleCancel = (): void => {
    setPassword('');
    setError(null);
    onCancel();
  };

  const handleRemovePassword = (): void => {
    onConfirm(null);
    setPassword('');
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        {hasPassword 
          ? (t('game.changePassword') || 'Change Game Password')
          : (t('game.setPassword') || 'Set Game Password')
        }
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {hasPassword
            ? (t('game.changePasswordDescription') || 'Change or remove the password for this game room. Only the host can set the password.')
            : (t('game.setPasswordDescription') || 'Set a password to protect this game room. Only players with the password can join.')
          }
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            autoFocus
            fullWidth
            type={showPassword ? 'text' : 'password'}
            label={t('game.password') || 'Password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            onKeyPress={handleKeyPress}
            error={!!error}
            helperText={error || (t('game.passwordHelper') || 'Enter a password between 4 and 50 characters. Leave empty to remove password.')}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  size="small"
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              ),
            }}
          />
          {hasPassword && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleRemovePassword}
              fullWidth
            >
              {t('game.removePassword') || 'Remove Password'}
            </Button>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>{t('common.cancel') || 'Cancel'}</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          disabled={!password.trim() && !hasPassword}
        >
          {hasPassword && !password.trim()
            ? (t('game.removePassword') || 'Remove')
            : (t('common.confirm') || 'Confirm')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SetPasswordDialog;

