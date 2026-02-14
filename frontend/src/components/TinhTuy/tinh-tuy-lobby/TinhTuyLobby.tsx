/**
 * TinhTuyLobby — Main lobby with room list, create, join buttons.
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, IconButton, Paper, Chip,
  CircularProgress,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import { useLanguage } from '../../../i18n';
import { useToast } from '../../../contexts/ToastContext';
import { useTinhTuy } from '../TinhTuyContext';
import { TinhTuyCreateRoom } from './TinhTuyCreateRoom';
import { TinhTuyJoinRoom } from './TinhTuyJoinRoom';

export const TinhTuyLobby: React.FC = () => {
  const { t } = useLanguage();
  const toast = useToast();
  const { refreshRooms, state, joinRoom } = useTinhTuy();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (state.error) {
      toast.error(t(`tinhTuy.errors.${state.error}` as any) || state.error, { raw: true });
    }
  }, [state.error]);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, pt: { xs: '96px', md: 4 }, width: '100%', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 0.5, fontSize: { xs: '1.5rem', sm: '2rem' },
          }}
        >
          {t('tinhTuy.gameName')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tinhTuy.lobby.subtitle')}
        </Typography>
      </Box>

      {/* Action Bar */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, alignItems: { xs: 'stretch', sm: 'center' }, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%)' },
            height: 42, px: 3, fontWeight: 700, flexShrink: 0, borderRadius: 2,
          }}
        >
          {t('tinhTuy.lobby.createRoom')}
        </Button>

        <TinhTuyJoinRoom />

        <IconButton
          onClick={refreshRooms}
          disabled={state.isLoadingRooms}
          sx={{
            border: '1px solid', borderColor: 'rgba(155, 89, 182, 0.4)', color: '#8e44ad',
            '&:hover': { bgcolor: 'rgba(155, 89, 182, 0.08)', borderColor: '#8e44ad' },
            width: 42, height: 42, flexShrink: 0, borderRadius: 2,
            display: { xs: 'none', sm: 'flex' },
          }}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Room List */}
      {state.isLoadingRooms ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: '#9b59b6' }} />
        </Box>
      ) : state.waitingRooms.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: 'rgba(155, 89, 182, 0.04)' }}>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {t('tinhTuy.lobby.noRooms')}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          {state.waitingRooms.map((room) => (
            <Paper
              key={room.roomId}
              elevation={1}
              sx={{
                p: 2, borderRadius: 3, cursor: 'pointer',
                border: '1px solid transparent',
                '&:hover': { borderColor: 'rgba(155, 89, 182, 0.3)', boxShadow: '0 4px 12px rgba(155, 89, 182, 0.15)' },
                transition: 'all 0.2s ease',
              }}
              onClick={() => joinRoom(room.roomCode)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.1em', color: '#9b59b6', fontSize: '1.1rem' }}>
                  {room.roomCode}
                </Typography>
                {room.hasPassword && <LockIcon sx={{ fontSize: 16, color: '#e67e22' }} />}
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                {room.hostName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Chip
                  icon={<PersonIcon sx={{ fontSize: '14px !important' }} />}
                  label={`${room.playerCount}/${room.maxPlayers}`}
                  size="small"
                  sx={{ fontWeight: 600, bgcolor: 'rgba(52, 152, 219, 0.12)', color: '#2980b9' }}
                />
                <Chip
                  label={`${room.settings?.startingPoints?.toLocaleString()} TT`}
                  size="small"
                  sx={{ fontWeight: 600, bgcolor: 'rgba(155, 89, 182, 0.12)', color: '#8e44ad' }}
                />
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      <TinhTuyCreateRoom open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />
    </Box>
  );
};
