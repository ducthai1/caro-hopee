/**
 * GoLobby - Main lobby view: create room, join by code, available rooms list.
 * Desktop: full-width with multi-column room grid.
 * Mobile: stacked single column.
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, IconButton, Paper, Chip,
  Stack, useMediaQuery, useTheme, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import LockIcon from '@mui/icons-material/Lock';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import GridOnIcon from '@mui/icons-material/GridOn';
import PeopleIcon from '@mui/icons-material/People';
import { useLanguage } from '../../../i18n';
import { useToast } from '../../../contexts/ToastContext';
import { useGo } from '../GoContext';
import { GoCreateRoom } from './GoCreateRoom';
import { GoWaitingRoom as GoWaitingRoomInfo } from '../go-types';

const GO_ACCENT = '#2c3e50';
const GO_ACCENT2 = '#34495e';

// ─── Room Card ────────────────────────────────────────────────

interface RoomCardProps {
  room: GoWaitingRoomInfo;
  onJoin: (room: GoWaitingRoomInfo) => void;
  t: (key: string) => string;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onJoin, t }) => (
  <Paper
    elevation={1}
    sx={{
      p: 2,
      borderRadius: 3,
      border: '1px solid',
      borderColor: 'rgba(44, 62, 80, 0.15)',
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 16px rgba(44, 62, 80, 0.15)',
      },
    }}
  >
    {/* Header: room code + lock */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            color: GO_ACCENT,
          }}
        >
          {room.roomCode}
        </Typography>
        {room.hasPassword && <LockIcon sx={{ fontSize: 16, color: '#f39c12' }} />}
      </Box>
      <Chip
        label={t('go.waitingForPlayer')}
        size="small"
        sx={{
          bgcolor: '#f39c12',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.7rem',
        }}
      />
    </Box>

    {/* Info chips */}
    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
      <Chip
        icon={<GridOnIcon sx={{ fontSize: '14px !important', color: `${GO_ACCENT} !important` }} />}
        label={`${room.settings.boardSize}×${room.settings.boardSize}`}
        size="small"
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          bgcolor: 'rgba(44, 62, 80, 0.08)',
          color: GO_ACCENT,
          border: `1px solid rgba(44, 62, 80, 0.2)`,
        }}
      />
      <Chip
        label={`Komi ${room.settings.komi}`}
        size="small"
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          bgcolor: 'rgba(52, 152, 219, 0.1)',
          color: '#2980b9',
          border: '1px solid rgba(52, 152, 219, 0.2)',
        }}
      />
      {room.settings.handicap > 0 && (
        <Chip
          label={`H${room.settings.handicap}`}
          size="small"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 600,
            bgcolor: 'rgba(155, 89, 182, 0.1)',
            color: '#8e44ad',
            border: '1px solid rgba(155, 89, 182, 0.2)',
          }}
        />
      )}
    </Box>

    {/* Host + Join */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('go.host')}: {room.hostName}
      </Typography>
      <Button
        size="small"
        variant="contained"
        onClick={() => onJoin(room)}
        sx={{
          background: `linear-gradient(135deg, ${GO_ACCENT} 0%, ${GO_ACCENT2} 100%)`,
          '&:hover': { background: `linear-gradient(135deg, #1a252f 0%, ${GO_ACCENT} 100%)` },
          px: 2,
          fontSize: '0.75rem',
          minHeight: 28,
        }}
      >
        {t('go.join')}
      </Button>
    </Box>
  </Paper>
);

// ─── Rooms List ───────────────────────────────────────────────

interface RoomsListProps {
  passwordDialog: boolean;
  setPasswordDialog: (v: boolean) => void;
  password: string;
  setPassword: (v: string) => void;
  pendingRoomCode: string;
  setPendingRoomCode: (v: string) => void;
}

const RoomsList: React.FC<RoomsListProps> = ({
  passwordDialog, setPasswordDialog, password, setPassword, pendingRoomCode, setPendingRoomCode,
}) => {
  const { t } = useLanguage();
  const { state, joinRoom } = useGo();

  const handleJoinClick = (room: GoWaitingRoomInfo) => {
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
        <CircularProgress size={36} sx={{ color: GO_ACCENT }} />
      </Box>
    );
  }

  if (state.waitingRooms.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <SportsEsportsIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          {t('go.noRooms')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
        {t('go.availableRooms')} ({state.waitingRooms.length})
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2,
        }}
      >
        {state.waitingRooms.map(room => (
          <RoomCard key={room.roomId} room={room} onJoin={handleJoinClick} t={t} />
        ))}
      </Box>

      {/* Password dialog */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('go.password')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('go.password')}
            onKeyDown={e => e.key === 'Enter' && password.trim() && handlePasswordJoin()}
            autoFocus
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>{t('common.cancel')}</Button>
          <Button
            onClick={handlePasswordJoin}
            variant="contained"
            disabled={!password.trim()}
            sx={{
              background: `linear-gradient(135deg, ${GO_ACCENT} 0%, ${GO_ACCENT2} 100%)`,
              '&:hover': { background: `linear-gradient(135deg, #1a252f 0%, ${GO_ACCENT} 100%)` },
            }}
          >
            {t('go.join')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ─── Main Lobby ───────────────────────────────────────────────

export const GoLobby: React.FC = () => {
  const { t } = useLanguage();
  const toast = useToast();
  const { refreshRooms, state, joinRoom } = useGo();
  const theme = useTheme();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingRoomCode, setPendingRoomCode] = useState('');

  // Show toast for errors
  useEffect(() => {
    if (state.error) {
      toast.error(t(`go.errors.${state.error}` as any) || state.error, { raw: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.error]);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.view === 'lobby') refreshRooms();
    }, 10000);
    return () => clearInterval(interval);
  }, [state.view, refreshRooms]);

  const handleJoinByCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) return;
    joinRoom(code);
    setJoinCode('');
  };

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        pt: { xs: '96px', md: 4 },
        width: '100%',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            background: `linear-gradient(135deg, ${GO_ACCENT} 0%, #4a6fa5 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 0.5,
            fontSize: { xs: '1.5rem', sm: '2rem' },
          }}
        >
          {t('go.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('go.waitingForOpponent')}
        </Typography>
      </Box>

      {/* Action Bar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          alignItems: { xs: 'stretch', sm: 'center' },
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        {/* Create Room */}
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            background: `linear-gradient(135deg, ${GO_ACCENT} 0%, ${GO_ACCENT2} 100%)`,
            '&:hover': { background: `linear-gradient(135deg, #1a252f 0%, ${GO_ACCENT} 100%)` },
            height: 42,
            px: 3,
            fontWeight: 700,
            flexShrink: 0,
            borderRadius: 2,
          }}
        >
          {t('go.createRoom')}
        </Button>

        {/* Join by code */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1, maxWidth: { sm: 340 } }}>
          <TextField
            size="small"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder={t('go.enterCode')}
            onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
            inputProps={{ maxLength: 6, style: { fontFamily: 'monospace', letterSpacing: '0.15em', fontWeight: 700 } }}
            sx={{ flex: 1 }}
          />
          <Button
            variant="outlined"
            onClick={handleJoinByCode}
            disabled={joinCode.trim().length !== 6}
            sx={{
              borderColor: `rgba(44, 62, 80, 0.4)`,
              color: GO_ACCENT,
              '&:hover': { borderColor: GO_ACCENT, bgcolor: 'rgba(44, 62, 80, 0.06)' },
              height: 40,
              px: 2,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {t('go.join')}
          </Button>
        </Box>

        {/* Refresh */}
        <IconButton
          onClick={refreshRooms}
          disabled={state.isLoadingRooms}
          sx={{
            border: '1px solid',
            borderColor: `rgba(44, 62, 80, 0.3)`,
            color: GO_ACCENT,
            '&:hover': { bgcolor: 'rgba(44, 62, 80, 0.06)', borderColor: GO_ACCENT },
            width: 42,
            height: 42,
            flexShrink: 0,
            borderRadius: 2,
            display: { xs: 'none', sm: 'flex' },
          }}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Rooms List */}
      <RoomsList
        passwordDialog={passwordDialog}
        setPasswordDialog={setPasswordDialog}
        password={password}
        setPassword={setPassword}
        pendingRoomCode={pendingRoomCode}
        setPendingRoomCode={setPendingRoomCode}
      />

      {/* Create Room Dialog */}
      <GoCreateRoom
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </Box>
  );
};
