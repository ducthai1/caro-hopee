/**
 * WordChainWaitingRooms - Grid of available rooms to join.
 * Shows password dialog for password-protected rooms.
 */
import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, CircularProgress, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import LockIcon from '@mui/icons-material/Lock';
import TimerIcon from '@mui/icons-material/Timer';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { useLanguage } from '../../../i18n';
import { useWordChain } from '../WordChainContext';
import { WaitingRoomInfo } from '../word-chain-types';

const WORD_TYPE_KEYS: Record<string, string> = {
  '2+': 'wordChain.wordType2Plus',
  '3+': 'wordChain.wordType3Plus',
  'all': 'wordChain.wordTypeAll',
};

export const WordChainWaitingRooms: React.FC = () => {
  const { t } = useLanguage();
  const { state, joinRoom } = useWordChain();
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingRoomCode, setPendingRoomCode] = useState('');

  const handleJoinClick = (room: WaitingRoomInfo) => {
    if (room.hasPassword) {
      setPendingRoomCode(room.roomCode);
      setPassword('');
      setPasswordDialog(true);
    } else {
      joinRoom(room.roomCode);
    }
  };

  const handlePasswordJoin = () => {
    joinRoom(pendingRoomCode, password);
    setPasswordDialog(false);
    setPassword('');
    setPendingRoomCode('');
  };

  if (state.isLoadingRooms) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CircularProgress size={36} sx={{ color: '#2ecc71' }} />
      </Box>
    );
  }

  if (state.waitingRooms.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <SportsEsportsIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          {t('wordChain.noRooms')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
        {t('wordChain.availableRooms')} ({state.waitingRooms.length})
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        {state.waitingRooms.map((room) => (
          <RoomCard key={room.roomId} room={room} onJoin={handleJoinClick} t={t} />
        ))}
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
            onKeyDown={e => e.key === 'Enter' && password.trim() && handlePasswordJoin()}
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
    </Box>
  );
};

// ─── Room Card ────────────────────────────────────────────────

interface RoomCardProps {
  room: WaitingRoomInfo;
  onJoin: (room: WaitingRoomInfo) => void;
  t: (key: string) => string;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onJoin, t }) => {
  const isPlaying = room.gameStatus === 'playing';

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: isPlaying ? 'rgba(46, 204, 113, 0.3)' : 'rgba(126, 200, 227, 0.15)',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 16px rgba(46, 204, 113, 0.15)',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
              color: '#2ecc71',
            }}
          >
            {room.roomCode}
          </Typography>
          {room.hasPassword && <LockIcon sx={{ fontSize: 16, color: '#f39c12' }} />}
        </Box>
        <Chip
          label={isPlaying ? t('wordChain.statusPlaying') : t('wordChain.statusWaiting')}
          size="small"
          sx={{
            bgcolor: isPlaying ? '#27ae60' : '#f39c12',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.02em',
          }}
        />
      </Box>

      {/* Info */}
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
        <Chip
          icon={<PeopleIcon sx={{ fontSize: '14px !important', color: '#3498db !important' }} />}
          label={`${room.playerCount}/${room.maxPlayers}`}
          size="small"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            bgcolor: 'rgba(52, 152, 219, 0.12)',
            color: '#2980b9',
            border: '1px solid rgba(52, 152, 219, 0.25)',
          }}
        />
        <Chip
          label={t(WORD_TYPE_KEYS[room.rules?.wordType] || '') || room.rules?.wordType}
          size="small"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            bgcolor: 'rgba(155, 89, 182, 0.12)',
            color: '#8e44ad',
            border: '1px solid rgba(155, 89, 182, 0.25)',
          }}
        />
        <Chip
          icon={<TimerIcon sx={{ fontSize: '14px !important', color: '#e67e22 !important' }} />}
          label={`${room.rules?.turnDuration || 60}s`}
          size="small"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            bgcolor: 'rgba(230, 126, 34, 0.12)',
            color: '#d35400',
            border: '1px solid rgba(230, 126, 34, 0.25)',
          }}
        />
      </Box>

      {/* Host + Join */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('wordChain.host')}: {room.hostName}
        </Typography>
        {room.canJoin && (
          <Button
            size="small"
            variant="contained"
            onClick={() => onJoin(room)}
            sx={{
              background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #27ae60 0%, #219a52 100%)' },
              px: 2,
              fontSize: '0.75rem',
              minHeight: 28,
            }}
          >
            {t('wordChain.join')}
          </Button>
        )}
      </Box>
    </Paper>
  );
};
