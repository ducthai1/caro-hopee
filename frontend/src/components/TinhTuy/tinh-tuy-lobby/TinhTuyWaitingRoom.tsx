/**
 * TinhTuyWaitingRoom — After creating/joining a room. Shows room code, players, start/leave.
 * Includes floating chat (danmaku-style) like Word Chain.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, IconButton, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import EditIcon from '@mui/icons-material/Edit';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import TabletMacIcon from '@mui/icons-material/TabletMac';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import { useLanguage } from '../../../i18n';
import { useAuth } from '../../../contexts/AuthContext';
import { useTinhTuy } from '../TinhTuyContext';
import GuestNameDialog from '../../GuestNameDialog/GuestNameDialog';
import { useToast } from '../../../contexts/ToastContext';
import { TinhTuySettingsForm } from './TinhTuySettingsForm';
import { TinhTuyGameMode, TinhTuyCharacter, PLAYER_COLORS, VALID_CHARACTERS, CHARACTER_IMAGES } from '../tinh-tuy-types';
import ConfirmDialog from '../../ConfirmDialog/ConfirmDialog';
import {
  TinhTuyChatButton,
  TinhTuyFloatingMessage,
  TinhTuyChatOverlay,
} from '../tinh-tuy-play/TinhTuyChat';

export const TinhTuyWaitingRoom: React.FC = () => {
  const { t } = useLanguage();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const { state, startGame, leaveRoom, updateRoom, sendChat, updateGuestName, selectCharacter } = useTinhTuy();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);

  // Edit settings
  const [editMaxPlayers, setEditMaxPlayers] = useState(state.settings?.maxPlayers || 4);
  const [editStartingPoints, setEditStartingPoints] = useState(state.settings?.startingPoints || 20000);
  const [editGameMode, setEditGameMode] = useState<TinhTuyGameMode>(state.settings?.gameMode || 'classic');
  const [editTurnDuration, setEditTurnDuration] = useState(state.settings?.turnDuration || 60);
  const [editPassword, setEditPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Floating chat messages — track locally with unique keys
  const [floatingMsgs, setFloatingMsgs] = useState<Array<{ key: string; msg: any }>>([]);
  const prevLenRef = useRef(state.chatMessages.length);

  useEffect(() => {
    if (state.chatMessages.length > prevLenRef.current) {
      const newMsgs = state.chatMessages.slice(prevLenRef.current);
      const enriched = newMsgs.map((m, i) => {
        const player = state.players.find(p => p.slot === m.slot);
        return {
          key: `${m.timestamp}-${m.slot}-${i}`,
          msg: {
            ...m,
            displayName: player?.displayName || `P${m.slot}`,
            isSelf: m.slot === state.mySlot,
          },
        };
      });
      setFloatingMsgs(prev => [...prev, ...enriched].slice(-20));
    }
    prevLenRef.current = state.chatMessages.length;
  }, [state.chatMessages.length, state.chatMessages, state.players, state.mySlot]);

  const dismissMsg = useCallback((key: string) => {
    setFloatingMsgs(prev => prev.filter(m => m.key !== key));
  }, []);

  const openSettings = () => {
    setEditMaxPlayers(state.settings?.maxPlayers || 4);
    setEditStartingPoints(state.settings?.startingPoints || 20000);
    setEditGameMode(state.settings?.gameMode || 'classic');
    setEditTurnDuration(state.settings?.turnDuration || 60);
    setEditPassword('');
    setShowSettings(true);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    const success = await updateRoom({
      settings: {
        maxPlayers: editMaxPlayers,
        startingPoints: editStartingPoints,
        gameMode: editGameMode,
        turnDuration: editTurnDuration,
      },
    });
    setIsSaving(false);
    if (success) setShowSettings(false);
  };

  const isGuest = !isAuthenticated;
  const myPlayer = state.players.find(p => p.slot === state.mySlot);

  const handleGuestNameUpdated = (newName: string) => {
    const currentName = myPlayer?.guestName;
    if (newName && newName !== currentName) {
      updateGuestName(newName);
    }
    setShowNameDialog(false);
  };

  const canStart = state.isHost && state.players.length >= 2 && !isStarting;

  const handleStartGame = async () => {
    if (isStarting) return;
    setIsStarting(true);
    const success = await startGame();
    if (!success) setIsStarting(false);
  };

  const handleCopyCode = async () => {
    if (state.roomCode) {
      await navigator.clipboard.writeText(state.roomCode);
      toast.success('toast.codeCopied');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, pt: { xs: '96px', md: 4 }, width: '100%', maxWidth: 900, mx: 'auto', minHeight: '100vh' }}>
      {/* Room Code Card */}
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2.5, sm: 3 }, mb: 3, borderRadius: 4,
          background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.04) 0%, rgba(142, 68, 173, 0.07) 100%)',
          position: 'relative',
        }}
      >
        {/* Top right: Chat + Settings */}
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TinhTuyChatButton onSend={sendChat} />
          {state.isHost && (
            <Tooltip title={t('tinhTuy.settings.edit')}>
              <IconButton onClick={openSettings} size="small" sx={{ color: '#9b59b6' }}>
                <SettingsIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {t('tinhTuy.lobby.roomCode')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.2em', color: '#9b59b6', fontSize: { xs: '1.8rem', sm: '2.2rem' } }}>
              {state.roomCode}
            </Typography>
            <Tooltip title={t('tinhTuy.lobby.copyCode')}>
              <IconButton onClick={handleCopyCode} size="small"><ContentCopyIcon sx={{ fontSize: 18 }} /></IconButton>
            </Tooltip>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('tinhTuy.lobby.shareCode')}
          </Typography>
        </Box>

        {/* Settings chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center' }}>
          <Chip
            label={`${state.players.length}/${state.settings?.maxPlayers || 4}`}
            size="small"
            sx={{ fontWeight: 600, bgcolor: 'rgba(52, 152, 219, 0.12)', color: '#2980b9' }}
          />
          <Chip
            label={`${((state.settings?.startingPoints || 20000) / 1000).toFixed(0)}K TT`}
            size="small"
            sx={{ fontWeight: 600, bgcolor: 'rgba(155, 89, 182, 0.12)', color: '#8e44ad' }}
          />
          <Chip
            label={`${state.settings?.turnDuration || 60}s`}
            size="small"
            sx={{ fontWeight: 600, bgcolor: 'rgba(230, 126, 34, 0.12)', color: '#d35400' }}
          />
          <Chip
            label={t(`tinhTuy.settings.${state.settings?.gameMode || 'classic'}`)}
            size="small"
            sx={{ fontWeight: 600, bgcolor: 'rgba(46, 204, 113, 0.12)', color: '#27ae60' }}
          />
        </Box>
      </Paper>

      {/* Character Selector */}
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t('tinhTuy.characters.selectCharacter')}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: { xs: 1, sm: 1.5 }, maxHeight: 280, overflowY: 'auto' }}>
          {VALID_CHARACTERS.map((char) => {
            const isMyChoice = myPlayer?.character === char;
            const takenByPlayer = state.players.find(p => p.character === char && p.slot !== state.mySlot);
            const isTaken = !!takenByPlayer;

            return (
              <Box
                key={char}
                onClick={() => !isTaken && !isMyChoice && selectCharacter(char)}
                sx={{
                  p: { xs: 1, sm: 1.5 },
                  borderRadius: 2.5,
                  border: '2px solid',
                  borderColor: isMyChoice ? '#9b59b6' : isTaken ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.12)',
                  bgcolor: isMyChoice ? 'rgba(155, 89, 182, 0.08)' : isTaken ? 'rgba(0,0,0,0.03)' : 'transparent',
                  cursor: isTaken || isMyChoice ? 'default' : 'pointer',
                  opacity: isTaken ? 0.5 : 1,
                  transition: 'all 0.2s',
                  textAlign: 'center',
                  '&:hover': !isTaken && !isMyChoice ? { borderColor: '#9b59b6', bgcolor: 'rgba(155, 89, 182, 0.04)' } : {},
                }}
              >
                <Box
                  component="img"
                  src={CHARACTER_IMAGES[char]}
                  alt={char}
                  draggable={false}
                  sx={{ width: '100%', maxWidth: 80, height: 'auto', aspectRatio: '1', objectFit: 'contain', mx: 'auto', display: 'block', filter: isTaken ? 'grayscale(0.8)' : 'none' }}
                />
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 0.5, color: isMyChoice ? '#9b59b6' : 'text.primary' }}>
                  {t(`tinhTuy.characters.${char}`)}
                </Typography>
                {isTaken && (
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled', display: 'block' }}>
                    {t('tinhTuy.characters.characterTaken')} {takenByPlayer.displayName}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Players List */}
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t('tinhTuy.lobby.players')} ({state.players.length}/{state.settings?.maxPlayers || 4})
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {state.players.map((player) => (
            <Box
              key={player.slot}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2,
                bgcolor: player.slot === state.mySlot ? 'rgba(155, 89, 182, 0.08)' : 'rgba(0,0,0,0.02)',
                border: '1px solid',
                borderColor: player.slot === state.mySlot ? 'rgba(155, 89, 182, 0.3)' : 'transparent',
              }}
            >
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: PLAYER_COLORS[player.slot] || '#9b59b6',
                  flexShrink: 0, overflow: 'hidden', position: 'relative',
                }}
              >
                <Box
                  component="img"
                  src={CHARACTER_IMAGES[player.character]}
                  alt={player.character}
                  draggable={false}
                  sx={{ width: '115%', height: '115%', objectFit: 'cover', objectPosition: 'top' }}
                />
              </Box>
              <Box sx={{ flex: 1, fontWeight: player.slot === state.mySlot ? 700 : 500, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>{player.displayName}</span>
                {player.slot === state.mySlot && (
                  <>
                    <Typography component="span" variant="caption" sx={{ color: '#9b59b6' }}>
                      ({t('tinhTuy.lobby.you')})
                    </Typography>
                    {isGuest && (
                      <Tooltip title={t('game.changeGuestName') || 'Đổi tên'}>
                        <IconButton size="small" onClick={() => setShowNameDialog(true)} sx={{ p: 0, ml: 0.5 }}>
                          <EditIcon sx={{ fontSize: 16, color: '#9b59b6' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {player.isConnected ? (
                  <WifiIcon sx={{ fontSize: 18, color: '#2ecc71' }} />
                ) : (
                  <WifiOffIcon sx={{ fontSize: 18, color: '#e74c3c' }} />
                )}
                <Tooltip title={player.deviceType === 'mobile' ? 'Mobile' : player.deviceType === 'tablet' ? 'Tablet' : 'Desktop'}>
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                    {player.deviceType === 'mobile' ? (
                      <PhoneIphoneIcon sx={{ fontSize: 16, color: '#3498db' }} />
                    ) : player.deviceType === 'tablet' ? (
                      <TabletMacIcon sx={{ fontSize: 16, color: '#9b59b6' }} />
                    ) : (
                      <LaptopMacIcon sx={{ fontSize: 16, color: '#7f8c8d' }} />
                    )}
                  </Box>
                </Tooltip>
              </Box>
            </Box>
          ))}

          {/* Empty slots */}
          {Array.from({ length: (state.settings?.maxPlayers || 4) - state.players.length }).map((_, i) => (
            <Box
              key={`empty-${i}`}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.1)' }}
            >
              <PersonIcon sx={{ fontSize: 20, color: '#ccc' }} />
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                {t('tinhTuy.lobby.waitingForPlayer')}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {state.isHost && (
          <Button
            variant="contained"
            startIcon={isStarting ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
            onClick={handleStartGame}
            disabled={!canStart}
            sx={{
              background: canStart ? 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)' : undefined,
              '&:hover': canStart ? { background: 'linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%)' } : undefined,
              py: 1.25, px: 4, fontWeight: 700, flex: 1,
            }}
          >
            {isStarting ? t('tinhTuy.lobby.starting') : canStart ? t('tinhTuy.lobby.startGame') : t('tinhTuy.lobby.waitingForPlayers')}
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<ExitToAppIcon />}
          onClick={() => setShowLeaveConfirm(true)}
          sx={{
            borderColor: '#e74c3c', color: '#e74c3c',
            '&:hover': { borderColor: '#c0392b', background: 'rgba(231, 76, 60, 0.08)' },
            py: 1.25, px: 3, minWidth: 120, flex: state.isHost ? undefined : 1,
          }}
        >
          {t('tinhTuy.lobby.leaveRoom')}
        </Button>
      </Box>

      {/* Leave confirm */}
      <ConfirmDialog
        open={showLeaveConfirm}
        title={t('tinhTuy.lobby.leaveConfirmTitle')}
        message={t('tinhTuy.lobby.leaveConfirmMsg')}
        confirmText={t('tinhTuy.lobby.leaveRoom')}
        variant="warning"
        onConfirm={() => { setShowLeaveConfirm(false); leaveRoom(); }}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>{t('tinhTuy.settings.edit')}</Typography>
          <IconButton onClick={() => setShowSettings(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TinhTuySettingsForm
            maxPlayers={editMaxPlayers} setMaxPlayers={setEditMaxPlayers}
            startingPoints={editStartingPoints} setStartingPoints={setEditStartingPoints}
            gameMode={editGameMode} setGameMode={setEditGameMode}
            turnDuration={editTurnDuration} setTurnDuration={setEditTurnDuration}
            password={editPassword} setPassword={setEditPassword}
            minMaxPlayers={state.players.length}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowSettings(false)} variant="outlined">{t('common.cancel')}</Button>
          <Button
            onClick={handleSaveSettings}
            variant="contained"
            disabled={isSaving}
            sx={{ background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', '&:hover': { background: 'linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%)' } }}
          >
            {t('tinhTuy.settings.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Guest Name Edit Dialog */}
      <GuestNameDialog
        open={showNameDialog}
        onClose={handleGuestNameUpdated}
        initialName={myPlayer?.displayName || ''}
      />

      {/* Floating Chat Messages */}
      <TinhTuyChatOverlay>
        {floatingMsgs.map(({ key, msg }) => (
          <TinhTuyFloatingMessage
            key={key}
            msgKey={key}
            msg={msg}
            onDismiss={dismissMsg}
          />
        ))}
      </TinhTuyChatOverlay>
    </Box>
  );
};
