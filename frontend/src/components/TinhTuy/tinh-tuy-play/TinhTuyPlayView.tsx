/**
 * TinhTuyPlayView — Full-screen board-centric game view.
 * No sidebar: dice in board center, player HUD overlay, leave button.
 */
import React, { useState } from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { TinhTuyBoard } from './TinhTuyBoard';
import { TinhTuyActionModal } from './TinhTuyActionModal';
import { TinhTuyCardModal } from './TinhTuyCardModal';
import { TinhTuyBuildModal } from './TinhTuyBuildModal';
import { TinhTuyIslandModal } from './TinhTuyIslandModal';
import { TinhTuyGoPopup } from './TinhTuyGoPopup';
import { TinhTuyVolumeControl } from './TinhTuyVolumeControl';
import { TinhTuyChat } from './TinhTuyChat';

export const TinhTuyPlayView: React.FC = () => {
  const { t } = useLanguage();
  const { state, leaveRoom } = useTinhTuy();
  const [buildOpen, setBuildOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const myPlayer = state.players.find(p => p.slot === state.mySlot);
  const hasProperties = myPlayer && myPlayer.properties.length > 0;

  const handleLeave = () => {
    if (!confirmLeave) {
      setConfirmLeave(true);
      // Auto-reset after 3s
      setTimeout(() => setConfirmLeave(false), 3000);
      return;
    }
    leaveRoom();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: { xs: 0.5, sm: 1, md: 2 },
        pt: { xs: '72px', md: 2 },
        position: 'relative',
      }}
    >
      {/* Top-left: Leave button */}
      <Box sx={{ position: 'fixed', top: { xs: 72, md: 12 }, left: 12, zIndex: 100, display: 'flex', gap: 1 }}>
        <Tooltip title={confirmLeave ? t('tinhTuy.game.confirmLeave' as any) : t('tinhTuy.game.leave' as any)}>
          <Button
            size="small"
            variant={confirmLeave ? 'contained' : 'outlined'}
            onClick={handleLeave}
            startIcon={<ExitToAppIcon />}
            sx={{
              borderColor: confirmLeave ? undefined : 'rgba(231,76,60,0.5)',
              color: confirmLeave ? '#fff' : '#e74c3c',
              bgcolor: confirmLeave ? '#e74c3c' : undefined,
              fontWeight: 600,
              fontSize: '0.75rem',
              minWidth: 0,
              px: 1.5,
              '&:hover': {
                borderColor: '#c0392b',
                bgcolor: confirmLeave ? '#c0392b' : 'rgba(231,76,60,0.08)',
              },
            }}
          >
            {confirmLeave ? t('tinhTuy.game.confirmLeave' as any) : t('tinhTuy.game.leave' as any)}
          </Button>
        </Tooltip>
      </Box>

      {/* Top-right: Volume + Chat toggle + Build */}
      <Box sx={{ position: 'fixed', top: { xs: 72, md: 12 }, right: 12, zIndex: 100, display: 'flex', gap: 1, alignItems: 'center' }}>
        {isMyTurn && hasProperties && state.turnPhase === 'END_TURN' && (
          <Tooltip title={t('tinhTuy.game.build' as any)}>
            <IconButton
              size="small"
              onClick={() => setBuildOpen(true)}
              sx={{ color: '#27ae60', bgcolor: 'rgba(39,174,96,0.1)', '&:hover': { bgcolor: 'rgba(39,174,96,0.2)' } }}
            >
              <ConstructionIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Chat">
          <IconButton
            size="small"
            onClick={() => setChatOpen(prev => !prev)}
            sx={{ color: '#9b59b6', bgcolor: 'rgba(155,89,182,0.1)', '&:hover': { bgcolor: 'rgba(155,89,182,0.2)' } }}
          >
            <ChatBubbleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <TinhTuyVolumeControl />
      </Box>

      {/* Board — full width, centered */}
      <TinhTuyBoard />

      {/* Chat drawer — fixed bottom-right when open */}
      {chatOpen && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 12, right: 12,
            width: 280, maxHeight: 300,
            zIndex: 200,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          }}
        >
          <TinhTuyChat />
        </Box>
      )}

      {/* Modals */}
      <TinhTuyActionModal />
      <TinhTuyCardModal />
      <TinhTuyIslandModal />
      <TinhTuyBuildModal open={buildOpen} onClose={() => setBuildOpen(false)} />
      <TinhTuyGoPopup />
    </Box>
  );
};
