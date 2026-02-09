/**
 * WordChainLobby - Main lobby view with create room, join by code, and rooms list.
 * Desktop: full-width with proper proportions and multi-column room grid.
 * Mobile: stacked single column.
 */
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, useMediaQuery, useTheme } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useLanguage } from '../../../i18n';
import { useToast } from '../../../contexts/ToastContext';
import { useWordChain } from '../WordChainContext';
import { WordChainCreateRoom } from './WordChainCreateRoom';
import { WordChainJoinRoom } from './WordChainJoinRoom';
import { WordChainWaitingRooms } from './WordChainWaitingRooms';

export const WordChainLobby: React.FC = () => {
  const { t } = useLanguage();
  const toast = useToast();
  const { refreshRooms, state } = useWordChain();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Show toast for errors
  useEffect(() => {
    if (state.error) {
      toast.error(t(`wordChain.errors.${state.error}` as any) || state.error, { raw: true });
    }
  }, [state.error]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
            background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 0.5,
            fontSize: { xs: '1.5rem', sm: '2rem' },
          }}
        >
          {t('wordChain.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('wordChain.subtitle')}
        </Typography>
      </Box>

      {/* Action Bar — compact, left-aligned buttons */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          alignItems: { xs: 'stretch', sm: 'center' },
          mb: 3,
        }}
      >
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #27ae60 0%, #219a52 100%)',
            },
            height: 42,
            px: 3,
            fontWeight: 700,
            flexShrink: 0,
            borderRadius: 2,
          }}
        >
          {t('wordChain.createRoom')}
        </Button>

        <WordChainJoinRoom />

        <IconButton
          onClick={refreshRooms}
          disabled={state.isLoadingRooms}
          sx={{
            border: '1px solid',
            borderColor: 'rgba(46, 204, 113, 0.4)',
            color: '#27ae60',
            '&:hover': { bgcolor: 'rgba(46, 204, 113, 0.08)', borderColor: '#27ae60' },
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
      <WordChainWaitingRooms />

      {/* Create Room Dialog */}
      <WordChainCreateRoom
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </Box>
  );
};
