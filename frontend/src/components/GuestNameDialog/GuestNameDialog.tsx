/**
 * GuestNameDialog - Dialog for guest users to choose their display name
 */
import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { useLanguage } from '../../i18n';
import { setGuestName } from '../../utils/guestName';

interface GuestNameDialogProps {
  open: boolean;
  onClose: (name: string) => void;
}

const GuestNameDialog: React.FC<GuestNameDialogProps> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    const trimmedName = name.trim();
    
    if (!trimmedName || trimmedName.length === 0) {
      setError(t('game.guestNameRequired') || 'Vui lòng nhập tên của bạn');
      return;
    }
    
    if (trimmedName.length > 20) {
      setError(t('game.guestNameTooLong') || 'Tên quá dài. Tối đa 20 ký tự');
      return;
    }
    
    // Save to sessionStorage
    setGuestName(trimmedName);
    onClose(trimmedName);
    setName('');
    setError(null);
  }, [name, onClose, t]);

  const handleCancel = useCallback(() => {
    // Use default name if user cancels
    const defaultName = `Guest ${Date.now().toString().slice(-6)}`;
    setGuestName(defaultName);
    onClose(defaultName);
    setName('');
    setError(null);
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
        },
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          color: '#ffffff',
          fontWeight: 700,
          textAlign: 'center',
          py: 2,
        }}
      >
        {t('game.chooseGuestName') || 'Chọn tên hiển thị'}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Typography
          variant="body2"
          sx={{
            color: '#5a6a7a',
            mb: 2,
            textAlign: 'center',
          }}
        >
          {t('game.guestNameDescription') || 'Nhập tên của bạn để hiển thị trong trận đấu. Tên này sẽ được lưu trong phiên làm việc hiện tại.'}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
          placeholder={t('game.guestNamePlaceholder') || 'Nhập tên của bạn (tối đa 20 ký tự)'}
          error={!!error}
          helperText={error}
          inputProps={{
            maxLength: 20,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover fieldset': {
                borderColor: '#7ec8e3',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#7ec8e3',
              },
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={handleCancel}
          variant="outlined"
          sx={{
            borderRadius: 2,
            borderColor: 'rgba(126, 200, 227, 0.3)',
            color: '#7ec8e3',
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!name.trim()}
          sx={{
            borderRadius: 2,
            background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            color: '#ffffff',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': {
              background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
            },
            '&:disabled': {
              background: 'rgba(126, 200, 227, 0.3)',
            },
          }}
        >
          {t('common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GuestNameDialog;

