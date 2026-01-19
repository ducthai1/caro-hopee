/**
 * LeaveConfirmDialog - Dialog to confirm leaving the game
 */
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { useLanguage } from '../../i18n';

interface LeaveConfirmDialogProps {
  open: boolean;
  isLeaving: boolean;
  isGamePlaying: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LeaveConfirmDialog: React.FC<LeaveConfirmDialogProps> = ({
  open,
  isLeaving,
  isGamePlaying,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage();

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown={isLeaving}
    >
      <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          ⚠️ {t('gameRoom.leaveTitle')}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
        <Typography variant="body1" sx={{ color: '#5a6a7a', mb: 2 }}>
          {t('gameRoom.leaveConfirm')}
        </Typography>
        {isGamePlaying && (
          <Typography variant="body2" sx={{ color: '#ffaaa5', fontWeight: 600 }}>
            {t('gameRoom.gameInProgress')}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 4, px: 3, gap: 2 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={isLeaving}
          sx={{
            minWidth: 120,
            py: 1.25,
            borderRadius: 2,
            borderColor: '#7ec8e3',
            borderWidth: 2,
            color: '#2c3e50',
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '0.95rem',
            transition: 'all 0.3s ease',
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
          sx={{
            minWidth: 120,
            py: 1.25,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #ffaaa5 0%, #ffb88c 100%)',
            color: '#ffffff',
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '0.95rem',
            boxShadow: '0 4px 14px rgba(255, 170, 165, 0.4)',
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, #e08a85 0%, #e09a7c 100%)',
              boxShadow: '0 6px 20px rgba(255, 170, 165, 0.5)',
            },
          }}
        >
          {isLeaving ? t('gameRoom.leaving') : t('game.leaveGame')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeaveConfirmDialog;
