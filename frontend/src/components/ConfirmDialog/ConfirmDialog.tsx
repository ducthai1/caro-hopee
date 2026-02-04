/**
 * ConfirmDialog - Reusable confirmation dialog component
 *
 * Variants:
 * - danger: Red colors for destructive actions (delete, remove)
 * - warning: Coral colors for warning actions (leave, logout)
 * - primary: Blue/teal colors for normal confirmations
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useLanguage } from '../../i18n';

type DialogVariant = 'danger' | 'warning' | 'primary';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Color schemes for each variant
const VARIANT_COLORS = {
  danger: {
    gradient: 'linear-gradient(135deg, #ef5350 0%, #e53935 100%)',
    gradientHover: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
    shadow: 'rgba(239, 83, 80, 0.4)',
    shadowHover: 'rgba(239, 83, 80, 0.5)',
    border: '#ef5350',
    borderLight: 'rgba(239, 83, 80, 0.5)',
  },
  warning: {
    gradient: 'linear-gradient(135deg, #ffaaa5 0%, #ff8a80 100%)',
    gradientHover: 'linear-gradient(135deg, #ff8a80 0%, #ff6b6b 100%)',
    shadow: 'rgba(255, 170, 165, 0.4)',
    shadowHover: 'rgba(255, 170, 165, 0.5)',
    border: '#ffaaa5',
    borderLight: 'rgba(255, 170, 165, 0.5)',
  },
  primary: {
    gradient: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
    gradientHover: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
    shadow: 'rgba(126, 200, 227, 0.4)',
    shadowHover: 'rgba(126, 200, 227, 0.5)',
    border: '#7ec8e3',
    borderLight: 'rgba(126, 200, 227, 0.5)',
  },
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'warning',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage();
  const colors = VARIANT_COLORS[variant];

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown={loading}
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: '#2c3e50',
          }}
        >
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
        <Typography variant="body1" sx={{ color: '#5a6a7a' }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3, gap: 2 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
          sx={{
            minWidth: 100,
            py: 1,
            borderRadius: 2,
            borderColor: colors.borderLight,
            borderWidth: 1.5,
            color: '#5a6a7a',
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '0.9rem',
            '&:hover': {
              borderColor: colors.border,
              borderWidth: 1.5,
              backgroundColor: `${colors.border}10`,
            },
          }}
        >
          {cancelText || t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
          sx={{
            minWidth: 100,
            py: 1,
            borderRadius: 2,
            background: colors.gradient,
            color: '#ffffff',
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '0.9rem',
            boxShadow: `0 4px 14px ${colors.shadow}`,
            '&:hover': {
              background: colors.gradientHover,
              boxShadow: `0 6px 20px ${colors.shadowHover}`,
            },
            '&:disabled': {
              background: colors.gradient,
              opacity: 0.7,
            },
          }}
        >
          {loading ? (
            <CircularProgress size={20} sx={{ color: '#fff' }} />
          ) : (
            confirmText || t('common.confirm')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
