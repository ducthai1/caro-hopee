/**
 * ToastContent - Custom notistack snackbar content.
 * Features: close button, progress bar countdown, click-to-dismiss.
 */
import React, { forwardRef, useCallback } from 'react';
import { CustomContentProps, useSnackbar } from 'notistack';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// Variant colors matching reference design (white bg + thick left border)
const VARIANT_STYLES: Record<string, { accent: string; icon: React.ReactNode }> = {
  success: {
    accent: '#4caf50',
    icon: <CheckCircleIcon sx={{ fontSize: 28, color: '#4caf50' }} />,
  },
  error: {
    accent: '#ef5350',
    icon: <ErrorOutlineIcon sx={{ fontSize: 28, color: '#ef5350' }} />,
  },
  warning: {
    accent: '#ff9800',
    icon: <WarningAmberIcon sx={{ fontSize: 28, color: '#ff9800' }} />,
  },
  info: {
    accent: '#2196f3',
    icon: <InfoOutlinedIcon sx={{ fontSize: 28, color: '#2196f3' }} />,
  },
  default: {
    accent: '#9e9e9e',
    icon: <InfoOutlinedIcon sx={{ fontSize: 28, color: '#9e9e9e' }} />,
  },
};

const ToastContent = forwardRef<HTMLDivElement, CustomContentProps>((props, ref) => {
  const { id, message, variant = 'default', style } = props;
  const { closeSnackbar } = useSnackbar();
  const colors = VARIANT_STYLES[variant] || VARIANT_STYLES.default;

  const handleDismiss = useCallback(() => {
    closeSnackbar(id);
  }, [id, closeSnackbar]);

  return (
    <Box
      ref={ref}
      role="alert"
      style={style}
      onClick={handleDismiss}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: '16px 14px 16px 18px',
        borderRadius: '10px',
        bgcolor: '#fff',
        borderLeft: `3.5px solid ${colors.accent}`,
        color: '#424242',
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.5,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        minWidth: 280,
        maxWidth: 400,
        // Progress bar pseudo-element
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '3px',
          bgcolor: colors.accent,
          opacity: 0.5,
          transformOrigin: 'left',
          animation: 'toast-shrink var(--toast-duration, 3000ms) linear forwards',
        },
      }}
    >
      {/* Variant icon */}
      <Box sx={{ display: 'flex', flexShrink: 0 }}>{colors.icon}</Box>

      {/* Message */}
      <Box sx={{ flex: 1, wordBreak: 'break-word' }}>{message}</Box>

      {/* Close button */}
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
        sx={{
          color: '#9e9e9e',
          p: 0.5,
          flexShrink: 0,
          alignSelf: 'flex-start',
          '&:hover': { color: '#616161', bgcolor: 'rgba(0,0,0,0.06)' },
        }}
      >
        <CloseIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
});

ToastContent.displayName = 'ToastContent';
export default ToastContent;
