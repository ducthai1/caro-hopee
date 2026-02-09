/**
 * WordChainJoinRoom - Join room by 6-char room code input.
 */
import React, { useState } from 'react';
import { Box, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import { useLanguage } from '../../../i18n';
import { useWordChain } from '../WordChainContext';

export const WordChainJoinRoom: React.FC = () => {
  const { t } = useLanguage();
  const { joinRoom, state } = useWordChain();
  const [code, setCode] = useState('');
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingCode, setPendingCode] = useState('');

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) return;
    // Join directly, if password needed the server will respond with error
    joinRoom(trimmed);
    setCode('');
  };

  const handlePasswordJoin = () => {
    joinRoom(pendingCode, password);
    setPasswordDialog(false);
    setPassword('');
    setPendingCode('');
  };

  // Listen for password-required error
  React.useEffect(() => {
    if (state.error === 'passwordRequired') {
      const codeFromError = code.trim().toUpperCase() || pendingCode;
      if (codeFromError) {
        setPendingCode(codeFromError);
        setPasswordDialog(true);
      }
    }
  }, [state.error]);

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder={t('wordChain.enterRoomCode')}
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          inputProps={{
            maxLength: 6,
            style: { textAlign: 'center', letterSpacing: '0.15em', fontWeight: 700, textTransform: 'uppercase' },
          }}
          sx={{
            width: { xs: '100%', sm: 220 },
            '& .MuiOutlinedInput-root': { height: 42, borderRadius: 2 },
          }}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />
        <Button
          variant="outlined"
          startIcon={<LoginIcon />}
          onClick={handleJoin}
          disabled={code.trim().length !== 6}
          sx={{
            borderColor: '#2ecc71',
            color: '#27ae60',
            '&:hover': { borderColor: '#27ae60', background: 'rgba(46, 204, 113, 0.08)' },
            height: 42,
            flexShrink: 0,
            borderRadius: 2,
          }}
        >
          {t('wordChain.join')}
        </Button>
      </Box>

      {/* Password Dialog */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('wordChain.enterPassword')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {t('wordChain.roomRequiresPassword')}
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('wordChain.password')}
            onKeyDown={e => e.key === 'Enter' && handlePasswordJoin()}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>{t('common.cancel')}</Button>
          <Button onClick={handlePasswordJoin} variant="contained" disabled={!password.trim()}>
            {t('wordChain.join')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
