/**
 * PasswordChangeForm - Dialog for changing user password
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { userApi } from '../../../services/api';
import { useLanguage } from '../../../i18n';
import { useToast } from '../../../contexts/ToastContext';

interface PasswordChangeFormProps {
  open: boolean;
  onClose: () => void;
}

const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const toast = useToast();

  // Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Visibility state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('profile.allFieldsRequired'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('profile.passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('profile.passwordMismatch'));
      return;
    }

    setSaving(true);

    try {
      await userApi.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success('toast.passwordChanged');
      handleClose();
    } catch (err: any) {
      toast.error('toast.passwordChangeError', { params: { message: err.response?.data?.message || '' } });
    } finally {
      setSaving(false);
    }
  };

  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmPassword === newPassword;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: '2px solid transparent',
          backgroundImage:
            'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(126, 200, 227, 0.2)',
          pb: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {t('profile.changePassword')}
        </Typography>
        <IconButton
          onClick={handleClose}
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

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Current Password */}
        <Box sx={{ my: 2 }}>
          <TextField
            fullWidth
            type={showCurrentPassword ? 'text' : 'password'}
            label={t('profile.currentPassword')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={saving}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                    size="small"
                  >
                    {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': { borderColor: '#7ec8e3' },
                '&.Mui-focused fieldset': { borderColor: '#7ec8e3' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#7ec8e3' },
            }}
          />
        </Box>

        {/* New Password */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            type={showNewPassword ? 'text' : 'password'}
            label={t('profile.newPassword')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={saving}
            helperText={t('profile.passwordHelper')}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                    size="small"
                  >
                    {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': { borderColor: '#7ec8e3' },
                '&.Mui-focused fieldset': { borderColor: '#7ec8e3' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#7ec8e3' },
            }}
          />
        </Box>

        {/* Confirm Password */}
        <Box sx={{ mb: 1 }}>
          <TextField
            fullWidth
            type={showConfirmPassword ? 'text' : 'password'}
            label={t('profile.confirmNewPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={saving}
            error={confirmPassword.length > 0 && confirmPassword !== newPassword}
            helperText={
              confirmPassword.length > 0 && confirmPassword !== newPassword
                ? t('profile.passwordMismatch')
                : ''
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    size="small"
                  >
                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': { borderColor: '#7ec8e3' },
                '&.Mui-focused fieldset': { borderColor: '#7ec8e3' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#7ec8e3' },
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            borderColor: 'rgba(255, 170, 165, 0.5)',
            color: '#ffaaa5',
            '&:hover': {
              borderColor: 'rgba(255, 170, 165, 0.8)',
              background: 'rgba(255, 170, 165, 0.1)',
            },
          }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !isValid}
          sx={{
            background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            color: '#fff',
            '&:hover': {
              background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
            },
            '&:disabled': {
              background: '#e0e0e0',
            },
          }}
        >
          {saving ? (
            <CircularProgress size={20} sx={{ color: '#fff' }} />
          ) : (
            t('profile.changePassword')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PasswordChangeForm;
