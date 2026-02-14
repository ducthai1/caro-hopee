/**
 * TinhTuyPlayView — Full-screen game view.
 * Layout: Left panel | Board (with dice overlay) | Right panel + Chat.
 * Info is split across left & right edges for balanced layout.
 */
import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Chip } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import FlagIcon from '@mui/icons-material/Flag';
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

/* ─── Reusable Player Card ─────────────────────────────── */
const PlayerCard: React.FC<{
  player: any;
  isCurrentTurn: boolean;
  isMe: boolean;
  t: (key: string) => string;
}> = ({ player, isCurrentTurn, isMe, t }) => (
  <Paper
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
          fontSize: '0.8rem',
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

/* ─── Main Play View ───────────────────────────────────── */
export const TinhTuyPlayView: React.FC = () => {
  const { t } = useLanguage();
  const { setFullscreen } = useMainLayout();
  const { state, leaveRoom, surrender } = useTinhTuy();

  useEffect(() => {
    setFullscreen(true);
    return () => setFullscreen(false);
  }, [setFullscreen]);

  const [buildOpen, setBuildOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const myPlayer = state.players.find(p => p.slot === state.mySlot);
  const hasProperties = myPlayer && myPlayer.properties.length > 0;
  const isBankrupt = myPlayer?.isBankrupt;

  // Split players into left/right halves
  const halfIdx = Math.ceil(state.players.length / 2);
  const leftPlayers = state.players.slice(0, halfIdx);
  const rightPlayers = state.players.slice(halfIdx);

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
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ─── LEFT PANEL ─────────────────────────────── */}
      <Box
        sx={{
          width: { xs: '100%', md: 220 },
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          p: { xs: 1, md: 2 },
          maxHeight: { md: '100vh' },
          overflowY: 'auto',
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
              fontWeight: 600, fontSize: '0.7rem', px: 1, py: 0.25,
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

        {/* Left player cards */}
        {leftPlayers.map((player) => (
          <PlayerCard
            key={player.slot}
            player={player}
            isCurrentTurn={state.currentPlayerSlot === player.slot}
            isMe={state.mySlot === player.slot}
            t={t as any}
          />
        ))}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 'auto' }}>
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

        {/* Volume */}
        <TinhTuyVolumeControl />
      </Box>

      {/* ─── CENTER: Board with dice overlay ─────────── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          py: { xs: 1, md: 0 },
          minWidth: 0,
        }}
      >
        <TinhTuyBoard />

        {/* Dice overlay — positioned on top of board center, NOT inside 3D grid */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            pointerEvents: 'auto',
          }}
        >
          <TinhTuyDice3D />
        </Box>
      </Box>

      {/* ─── RIGHT PANEL: Players + Chat ─────────────── */}
      <Box
        sx={{
          width: { xs: '100%', md: 260 },
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          p: { xs: 1, md: 2 },
          maxHeight: { md: '100vh' },
          overflowY: 'auto',
        }}
      >
        {/* Right player cards */}
        {rightPlayers.map((player) => (
          <PlayerCard
            key={player.slot}
            player={player}
            isCurrentTurn={state.currentPlayerSlot === player.slot}
            isMe={state.mySlot === player.slot}
            t={t as any}
          />
        ))}

        {/* Chat — always open */}
        <Box sx={{ flex: 1, minHeight: 200 }}>
          <TinhTuyChat />
        </Box>
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
