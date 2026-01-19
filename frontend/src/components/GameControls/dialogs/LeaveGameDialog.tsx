/**
 * LeaveGameDialog - Dialog to confirm leaving the game
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';

interface LeaveGameDialogProps {
  open: boolean;
  isLeaving: boolean;
  isGamePlaying: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}

const LeaveGameDialog: React.FC<LeaveGameDialogProps> = ({
  open,
  isLeaving,
  isGamePlaying,
  onConfirm,
  onCancel,
  t,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: 700,
          fontSize: '1.5rem',
          textAlign: 'center',
          pb: 1,
        }}
      >
        ⚠️ {t('gameControls.leaveGameQuestion')}
      </DialogTitle>
      <DialogContent>
        <Typography
          variant="body1"
          sx={{
            color: '#2c3e50',
            textAlign: 'center',
            py: 2,
            fontSize: '1.1rem',
          }}
        >
          {t('game.leaveConfirm')}
          {isGamePlaying && (
            <Box component="span" sx={{ display: 'block', mt: 1, fontWeight: 600, color: '#ffaaa5' }}>
              {t('gameControls.gameInProgress')}
            </Box>
          )}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3, gap: 2 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          sx={{
            minWidth: 120,
            py: 1.25,
            borderRadius: 2,
            borderColor: '#7ec8e3',
            borderWidth: 2,
            color: '#2c3e50',
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '1rem',
            '&:hover': {
              borderColor: '#5ba8c7',
              borderWidth: 2,
              backgroundColor: 'rgba(126, 200, 227, 0.08)',
            },
          }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={isLeaving}
          startIcon={isLeaving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{
            minWidth: 120,
            py: 1.25,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #ffaaa5 0%, #ff8a80 100%)',
            color: '#ffffff',
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '1rem',
            boxShadow: '0 4px 14px rgba(255, 170, 165, 0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #ff8a80 0%, #ff6b6b 100%)',
              boxShadow: '0 6px 20px rgba(255, 170, 165, 0.5)',
            },
          }}
        >
          {isLeaving ? t('gameControls.leaving') : t('gameControls.leave')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeaveGameDialog;
