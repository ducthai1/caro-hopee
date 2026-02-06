/**
 * Blackjack Score Tracker - Game Playing Screen
 * Main game interface with scoreboard and actions
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShareIcon from '@mui/icons-material/Share';
import SettingsIcon from '@mui/icons-material/Settings';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useXiDachScore } from './XiDachScoreContext';
import Scoreboard from './Scoreboard';
import AddPlayerModal from './AddPlayerModal';
import EditPlayerModal from './EditPlayerModal';
import ChangeDealerModal from './ChangeDealerModal';
import EndMatchModal from './EndMatchModal';
import EditMatchModal from './EditMatchModal';
import MatchHistory from './MatchHistory';
import DealerRotationModal from './DealerRotationModal';
import ShareSessionDialog from './ShareSessionDialog';
import SessionSettingsModal from './SessionSettingsModal';
import { XiDachPlayer } from '../../types/xi-dach-score.types';
import { useLanguage } from '../../i18n';

const GamePlaying: React.FC = () => {
  const { t } = useLanguage();
  const {
    currentSession,
    goToList,
    goToSummary,
    addPlayer,
    removePlayer,
    updatePlayer,
    setDealer,
    startGame,
    resumeGame,
    endGame,
    deleteLastMatch,
  } = useXiDachScore();

  // Modal states
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState<XiDachPlayer | null>(null);
  const [changeDealerOpen, setChangeDealerOpen] = useState(false);
  const [endMatchOpen, setEndMatchOpen] = useState(false);
  const [editMatchId, setEditMatchId] = useState<string | null>(null);
  const [endSessionConfirm, setEndSessionConfirm] = useState(false);
  const [removePlayerConfirm, setRemovePlayerConfirm] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionHasPassword, setSessionHasPassword] = useState(currentSession?.hasPassword ?? false);

  if (!currentSession) {
    return null;
  }

  const activePlayers = currentSession.players.filter((p) => p.isActive);
  const currentDealer = activePlayers.find(
    (p) => p.id === currentSession.currentDealerId
  );
  const existingNames = activePlayers.map((p) => p.name);

  // Status helpers
  const isSetup = currentSession.status === 'setup';
  const isPlaying = currentSession.status === 'playing';
  const isPaused = currentSession.status === 'paused';
  const isEnded = currentSession.status === 'ended';
  const canStartGame = activePlayers.length >= 2 && currentSession.currentDealerId;

  const handleAddPlayer = (name: string, baseScore: number, betAmount?: number) => {
    addPlayer(name, baseScore, betAmount);
  };

  const handleEditPlayer = (playerId: string, updates: { name?: string; baseScore?: number; betAmount?: number }) => {
    updatePlayer(playerId, updates);
  };

  const handleRemovePlayer = (playerId: string) => {
    setRemovePlayerConfirm(playerId);
  };

  const confirmRemovePlayer = () => {
    if (removePlayerConfirm) {
      removePlayer(removePlayerConfirm);
      setRemovePlayerConfirm(null);
    }
  };

  const handleEndSession = () => {
    endGame();
    setEndSessionConfirm(false);
    goToSummary();
  };

  const playerToRemove = removePlayerConfirm
    ? activePlayers.find((p) => p.id === removePlayerConfirm)
    : null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#FFF8F5',
        pt: { xs: 10, md: 4 },
        pb: 4,
        px: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              onClick={isEnded ? goToSummary : goToList}
              sx={{
                mr: 1,
                color: '#FF8A65',
                '&:hover': { bgcolor: 'rgba(255, 138, 101, 0.1)' },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#2c3e50' }}>
                {currentSession.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {currentSession.sessionCode && (
                  <Chip
                    size="small"
                    label={currentSession.sessionCode}
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      bgcolor: 'rgba(255, 138, 101, 0.1)',
                      color: '#FF8A65',
                    }}
                  />
                )}
                <Chip
                  size="small"
                  label={
                    isSetup
                      ? t('xiDachScore.status.setup')
                      : isPlaying
                      ? t('xiDachScore.status.playing')
                      : isPaused
                      ? t('xiDachScore.status.paused')
                      : t('xiDachScore.status.ended')
                  }
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    bgcolor: isSetup
                      ? '#FF8A65'
                      : isPlaying
                      ? '#2e7d32'
                      : isPaused
                      ? '#FFB74D'
                      : '#95a5a6',
                    color: '#fff',
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* Settings Button */}
            <IconButton
              onClick={() => setSettingsOpen(true)}
              sx={{
                color: '#FF8A65',
                '&:hover': { bgcolor: 'rgba(255, 138, 101, 0.1)' },
              }}
            >
              <SettingsIcon />
            </IconButton>
            {/* Share Button - only for online sessions */}
            {currentSession.sessionCode && (
              <IconButton
                onClick={() => setShareDialogOpen(true)}
                sx={{
                  color: '#FF8A65',
                  '&:hover': { bgcolor: 'rgba(255, 138, 101, 0.1)' },
                }}
              >
                <ShareIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Match Info Bar */}
        <Box
          sx={{
            bgcolor: '#fff',
            borderRadius: 2,
            p: 2,
            mb: 3,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
              {t('xiDachScore.matchNumber', { number: currentSession.matches.length + 1 })}
            </Typography>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
              {currentDealer ? (
                <>
                  {t('xiDachScore.dealer.label')}: <span style={{ fontWeight: 600 }}>👑 {currentDealer.name}</span>
                </>
              ) : (
                <span style={{ color: '#FF8A65' }}>{t('xiDachScore.dealer.notSelected')}</span>
              )}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: '#95a5a6', display: 'block' }}>
              {t('xiDachScore.game.pointsPerTuInfo', { points: currentSession.settings.pointsPerTu })}
            </Typography>
            <Typography variant="caption" sx={{ color: '#95a5a6', display: 'block' }}>
              {currentSession.settings.penalty28Enabled
                ? t('xiDachScore.game.penalty28FixedInfo', { amount: currentSession.settings.penalty28Amount })
                : t('xiDachScore.game.penalty28ByBetInfo')}
            </Typography>
            {currentSession.settings.autoRotateDealer && (
              <Typography variant="caption" sx={{ color: '#95a5a6' }}>
                {t('xiDachScore.game.autoRotateInfo', { count: currentSession.settings.autoRotateAfter })}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Scoreboard */}
        <Box sx={{ mb: 3 }}>
          <Scoreboard
            players={currentSession.players}
            currentDealerId={currentSession.currentDealerId}
            onEditPlayer={(player) => setEditPlayer(player)}
            onRemovePlayer={handleRemovePlayer}
            onAddPlayer={() => setAddPlayerOpen(true)}
          />
        </Box>

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 3,
            flexWrap: 'wrap',
          }}
        >
          {/* Change Dealer - Show "Chọn Chủ" if no dealer selected yet */}
          <Button
            variant="outlined"
            startIcon={<SwapHorizIcon />}
            onClick={() => setChangeDealerOpen(true)}
            disabled={isEnded}
            sx={{
              flex: 1,
              minWidth: 140,
              py: 1.5,
              borderRadius: 2,
              borderColor: '#FF8A65',
              color: '#FF8A65',
              background: '#fff',
              '&:hover': {
                borderColor: '#E64A19',
                background: '#fff',
              },
            }}
          >
            {currentSession.currentDealerId ? t('xiDachScore.game.changeDealer') : t('xiDachScore.dealer.select')}
          </Button>

          {/* End Match - Kết thúc trận: màu chủ đạo route */}
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            disabled={!isPlaying || activePlayers.length < 2}
            onClick={() => setEndMatchOpen(true)}
            sx={{
              flex: 1,
              minWidth: 140,
              py: 1.5,
              borderRadius: 2,
              background: '#FF8A65',
              color: '#fff',
              '&:hover': { background: '#E64A19' },
              '&.Mui-disabled': {
                background: 'rgba(255, 138, 101, 0.3)',
                color: 'rgba(255, 255, 255, 0.5)',
              },
            }}
          >
            {t('xiDachScore.game.endMatch')}
          </Button>
        </Box>

        {/* Game Control Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 3,
          }}
        >
          {isSetup && (
            <Button
              variant="contained"
              fullWidth
              startIcon={<PlayArrowIcon />}
              onClick={startGame}
              disabled={!canStartGame}
              sx={{
                py: 1.5,
                borderRadius: 2,
                background: '#FF8A65',
                color: '#fff',
                '&:hover': { background: '#E64A19' },
              }}
            >
              {t('xiDachScore.game.start')}
            </Button>
          )}

          {/* Paused state - kept for backwards compatibility but simplified */}
          {isPaused && (
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={resumeGame}
              fullWidth
              sx={{
                py: 1.5,
                borderRadius: 2,
                background: '#FF8A65',
                color: '#fff',
                '&:hover': { background: '#E64A19' },
              }}
            >
              {t('xiDachScore.game.resume')}
            </Button>
          )}

          {/* End Session Button - visible, soft style */}
          {(isPlaying || isPaused) && (
            <Button
              variant="outlined"
              fullWidth
              startIcon={<ExitToAppIcon />}
              onClick={() => setEndSessionConfirm(true)}
              sx={{
                py: 1,
                borderRadius: 2,
                borderColor: '#e74c3c',
                color: '#e74c3c',
                bgcolor: 'rgba(231, 76, 60, 0.05)',
                fontSize: '0.85rem',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#c0392b',
                  bgcolor: 'rgba(231, 76, 60, 0.1)',
                },
              }}
            >
              {t('xiDachScore.game.stopPlaying')}
            </Button>
          )}
        </Box>

        {/* Not enough players warning */}
        {isSetup && !canStartGame && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'rgba(243, 156, 18, 0.1)',
              borderRadius: 2,
              mb: 3,
            }}
          >
            <Typography variant="body2" sx={{ color: '#F57C00', textAlign: 'center' }}>
              {activePlayers.length < 2
                ? t('xiDachScore.game.needMinPlayers')
                : t('xiDachScore.game.needDealer')}
            </Typography>
          </Box>
        )}

        {/* History Section */}
        <MatchHistory
          session={currentSession}
          onEditMatch={(matchId) => setEditMatchId(matchId)}
          onUndoMatch={deleteLastMatch}
        />
      </Box>

      {/* Modals */}
      <AddPlayerModal
        open={addPlayerOpen}
        onClose={() => setAddPlayerOpen(false)}
        onAdd={handleAddPlayer}
        existingNames={existingNames}
        defaultBetAmount={currentSession.settings.pointsPerTu}
      />

      <EditPlayerModal
        open={!!editPlayer}
        player={editPlayer}
        onClose={() => setEditPlayer(null)}
        onSave={handleEditPlayer}
        onRemove={handleRemovePlayer}
        existingNames={existingNames}
        defaultBetAmount={currentSession.settings.pointsPerTu}
        isDealer={editPlayer?.id === currentSession.currentDealerId}
      />

      <ChangeDealerModal
        open={changeDealerOpen}
        players={currentSession.players}
        currentDealerId={currentSession.currentDealerId}
        onClose={() => setChangeDealerOpen(false)}
        onSelect={setDealer}
      />

      <EndMatchModal
        open={endMatchOpen}
        onClose={() => setEndMatchOpen(false)}
      />

      <EditMatchModal
        open={!!editMatchId}
        matchId={editMatchId}
        onClose={() => setEditMatchId(null)}
      />

      {/* Remove Player Confirmation */}
      <Dialog
        open={!!removePlayerConfirm}
        onClose={() => setRemovePlayerConfirm(null)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>{t('xiDachScore.player.removeTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('xiDachScore.player.removeConfirm', { name: playerToRemove?.name || '' })}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setRemovePlayerConfirm(null)}
            sx={{
              borderColor: '#FF8A65',
              color: '#FF8A65',
              bgcolor: '#fff',
              '&:hover': {
                borderColor: '#E64A19',
                bgcolor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            {t('xiDachScore.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={confirmRemovePlayer}
            sx={{ bgcolor: '#FF8A65', '&:hover': { bgcolor: '#E64A19' } }}
          >
            {t('xiDachScore.actions.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* End Session Confirmation */}
      <Dialog
        open={endSessionConfirm}
        onClose={() => setEndSessionConfirm(false)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>{t('xiDachScore.session.endTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('xiDachScore.session.endConfirm')}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setEndSessionConfirm(false)}
            sx={{
              borderColor: '#FF8A65',
              color: '#FF8A65',
              bgcolor: '#fff',
              '&:hover': {
                borderColor: '#E64A19',
                bgcolor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            {t('xiDachScore.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleEndSession}
            sx={{ bgcolor: '#FF8A65', '&:hover': { bgcolor: '#E64A19' } }}
          >
            {t('xiDachScore.actions.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dealer Rotation Confirmation Modal */}
      <DealerRotationModal />

      {/* Share Session Dialog - only for online sessions */}
      {currentSession.sessionCode && (
        <ShareSessionDialog
          open={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          sessionCode={currentSession.sessionCode}
          hasPassword={sessionHasPassword}
          onPasswordChange={(hasPassword) => setSessionHasPassword(hasPassword)}
        />
      )}

      {/* Session Settings Modal */}
      <SessionSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  );
};

export default GamePlaying;
