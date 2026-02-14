/**
 * TinhTuyJoinRoom — Inline join-by-code input.
 */
import React, { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';

export const TinhTuyJoinRoom: React.FC = () => {
  const { t } = useLanguage();
  const { joinRoom } = useTinhTuy();
  const [code, setCode] = useState('');

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 6) {
      joinRoom(trimmed);
      setCode('');
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <TextField
        size="small"
        placeholder={t('tinhTuy.lobby.roomCode')}
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
        inputProps={{ maxLength: 6, style: { fontFamily: 'monospace', letterSpacing: '0.15em', fontWeight: 700 } }}
        sx={{ width: 140 }}
      />
      <Button
        variant="outlined"
        startIcon={<LoginIcon />}
        onClick={handleJoin}
        disabled={code.trim().length !== 6}
        sx={{
          borderColor: 'rgba(155, 89, 182, 0.5)', color: '#8e44ad',
          '&:hover': { borderColor: '#8e44ad', bgcolor: 'rgba(155, 89, 182, 0.08)' },
          height: 40, fontWeight: 700, borderRadius: 2,
        }}
      >
        {t('tinhTuy.lobby.joinRoom')}
      </Button>
    </Box>
  );
};
