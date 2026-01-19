/**
 * PasswordDialog - Dialog for entering game room password
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
} from '@mui/material';
import { useLanguage } from '../../i18n';

interface PasswordDialogProps {
  open: boolean;
  onConfirm: (password: string) => void;
  onCancel: () => void;
  error?: string | null;
}

const PasswordDialog: React.FC<PasswordDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  error,
}) => {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleConfirm = (): void => {
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      setLocalError(t('game.passwordRequired') || 'Password is required');
      return;
    }
    if (trimmedPassword.length < 4 || trimmedPassword.length > 50) {
      setLocalError(t('game.passwordInvalidLength') || 'Password must be between 4 and 50 characters');
      return;
    }
    setLocalError(null);
    onConfirm(trimmedPassword);
    setPassword(''); // Clear password after confirm
  };

  const handleCancel = (): void => {
    setPassword('');
    setLocalError(null);
    onCancel();
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  const displayError = error || localError;

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{t('game.enterPassword') || 'Enter Game Password'}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('game.passwordRequiredToJoin') || 'This game room is password protected. Please enter the password to join.'}
        </Typography>
        {displayError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {displayError}
          </Alert>
        )}
        <TextField
          autoFocus
          fullWidth
          type="password"
          label={t('game.password') || 'Password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setLocalError(null);
          }}
          onKeyPress={handleKeyPress}
          error={!!displayError}
          helperText={displayError || (t('game.passwordHelper') || 'Enter the game room password')}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>{t('common.cancel') || 'Cancel'}</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!password.trim()}>
          {t('common.confirm') || 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordDialog;

