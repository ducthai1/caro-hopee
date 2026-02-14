/**
 * TinhTuyPlayView — Full-screen game view.
 * Layout: Board (left) + Right panel (player info, dice, timer, controls).
 */
import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Tooltip, Typography, Paper, Chip } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import FlagIcon from '@mui/icons-material/Flag';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useLanguage } from '../../../i18n';
import { useMainLayout } from '../../MainLayout/MainLayoutContext';
import { useTinhTuy } from '../TinhTuyContext';
import { PLAYER_COLORS } from '../tinh-tuy-types';
import { TinhTuyBoard } from './TinhTuyBoard';
import { TinhTuyDice3D } from './TinhTuyDice3D';
import { TinhTuyTurnTimer } from './TinhTuyTurnTimer';
import { TinhTuyActionModal } from './TinhTuyActionModal';
import { TinhTuyCardModal } from './TinhTuyCardModal';
import { TinhTuyBuildModal } from './TinhTuyBuildModal';
import { TinhTuyIslandModal } from './TinhTuyIslandModal';
import { TinhTuyGoPopup } from './TinhTuyGoPopup';
import { TinhTuyVolumeControl } from './TinhTuyVolumeControl';
import { TinhTuyChat } from './TinhTuyChat';

export const TinhTuyPlayView: React.FC = () => {
  const { t } = useLanguage();
  const { setFullscreen } = useMainLayout();
  const { state, leaveRoom, surrender } = useTinhTuy();

  useEffect(() => {
    setFullscreen(true);
    return () => setFullscreen(false);
  }, [setFullscreen]);

  const [buildOpen, setBuildOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const myPlayer = state.players.find(p => p.slot === state.mySlot);
  const hasProperties = myPlayer && myPlayer.properties.length > 0;
  const isBankrupt = myPlayer?.isBankrupt;

  const handleLeave = () => {
    if (!confirmLeave) {
      setConfirmLeave(true);
      setTimeout(() => setConfirmLeave(false), 3000);
      return;
    }
    leaveRoom();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'center', md: 'flex-start' },
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
        p: { xs: 1, md: 2 },
      }}
    >
      {/* Left: Board */}
      <Box sx={{ flex: '0 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TinhTuyBoard />
      </Box>

      {/* Right: Game info panel */}
      <Box
        sx={{
          width: { xs: '100%', md: 260 },
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          maxHeight: { md: '95vh' },
          overflowY: 'auto',
          pt: { md: 1 },
        }}
      >
        {/* Round + Leave */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#9b59b6' }}>
            {t('tinhTuy.game.round')} {state.round}
          </Typography>
          <Button
            size="small"
            variant={confirmLeave ? 'contained' : 'outlined'}
            onClick={handleLeave}
            startIcon={<ExitToAppIcon sx={{ fontSize: '1rem !important' }} />}
            sx={{
              borderColor: confirmLeave ? undefined : 'rgba(231,76,60,0.5)',
              color: confirmLeave ? '#fff' : '#e74c3c',
              bgcolor: confirmLeave ? '#e74c3c' : undefined,
              fontWeight: 600,
              fontSize: '0.7rem',
              px: 1,
              py: 0.25,
              '&:hover': {
                borderColor: '#c0392b',
                bgcolor: confirmLeave ? '#c0392b' : 'rgba(231,76,60,0.08)',
              },
            }}
          >
            {confirmLeave ? t('tinhTuy.game.confirmLeave' as any) : t('tinhTuy.game.leave' as any)}
          </Button>
        </Box>

        {/* Turn Timer */}
        <TinhTuyTurnTimer />

        {/* Player cards */}
        {state.players.map((player) => {
          const isCurrentTurn = state.currentPlayerSlot === player.slot;
          const isMe = state.mySlot === player.slot;
          return (
            <Paper
              key={player.slot}
              elevation={isCurrentTurn ? 3 : 1}
              sx={{
                p: 1.5,
                borderRadius: 2,
                borderLeft: `4px solid ${PLAYER_COLORS[player.slot] || '#999'}`,
                opacity: player.isBankrupt ? 0.5 : 1,
                bgcolor: isCurrentTurn ? 'rgba(155,89,182,0.06)' : 'background.paper',
                transition: 'all 0.2s ease',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700, flex: 1,
                    color: player.isBankrupt ? 'text.disabled' : 'text.primary',
                    textDecoration: player.isBankrupt ? 'line-through' : 'none',
                  }}
                >
                  {player.displayName}
                  {isMe && (
                    <Typography component="span" variant="caption" sx={{ color: '#9b59b6', ml: 0.5 }}>
                      ({t('tinhTuy.lobby.you')})
                    </Typography>
                  )}
                </Typography>
                {isCurrentTurn && !player.isBankrupt && (
                  <Chip label="🎯" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                )}
                {!player.isConnected && !player.isBankrupt && (
                  <Chip label="📡" size="small" sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'rgba(231,76,60,0.15)' }} />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#9b59b6' }}>
                  🔮 {player.points.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#27ae60' }}>
                  🏠 {player.properties.length}
                </Typography>
                {player.islandTurns > 0 && (
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#e67e22' }}>
                    🏝️ {player.islandTurns}
                  </Typography>
                )}
                {player.isBankrupt && (
                  <Chip label={t('tinhTuy.game.bankrupt')} size="small"
                    sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(231,76,60,0.15)', color: '#e74c3c' }}
                  />
                )}
              </Box>
            </Paper>
          );
        })}

        {/* Dice */}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <TinhTuyDice3D />
        </Box>

        {/* Action buttons row */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {/* Build */}
          {isMyTurn && hasProperties && state.turnPhase === 'END_TURN' && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<ConstructionIcon />}
              onClick={() => setBuildOpen(true)}
              sx={{
                borderColor: '#27ae60', color: '#27ae60', fontWeight: 600, flex: 1,
                '&:hover': { borderColor: '#2ecc71', bgcolor: 'rgba(39,174,96,0.08)' },
              }}
            >
              {t('tinhTuy.game.build' as any)}
            </Button>
          )}

          {/* Surrender */}
          {!isBankrupt && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<FlagIcon />}
              onClick={surrender}
              sx={{
                borderColor: 'rgba(231,76,60,0.4)', color: '#e74c3c', fontWeight: 600,
                '&:hover': { borderColor: '#c0392b', bgcolor: 'rgba(231,76,60,0.08)' },
              }}
            >
              {t('tinhTuy.game.surrender')}
            </Button>
          )}
        </Box>

        {/* Volume + Chat toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TinhTuyVolumeControl />
          <Tooltip title="Chat">
            <IconButton
              size="small"
              onClick={() => setChatOpen(prev => !prev)}
              sx={{ color: '#9b59b6', bgcolor: 'rgba(155,89,182,0.1)', '&:hover': { bgcolor: 'rgba(155,89,182,0.2)' } }}
            >
              <ChatBubbleOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Chat inline when open */}
        {chatOpen && (
          <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden', maxHeight: 250 }}>
            <TinhTuyChat />
          </Paper>
        )}
      </Box>

      {/* Modals */}
      <TinhTuyActionModal />
      <TinhTuyCardModal />
      <TinhTuyIslandModal />
      <TinhTuyBuildModal open={buildOpen} onClose={() => setBuildOpen(false)} />
      <TinhTuyGoPopup />
    </Box>
  );
};
