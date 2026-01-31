/**
 * GameControls - Game action buttons and control dialogs
 * Refactored to use modular dialog components
 */
import React, { useState } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import HistoryIcon from '@mui/icons-material/History';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../contexts/GameContext';
import { useLanguage } from '../../i18n';
import { logger } from '../../utils/logger';
import { gameApi } from '../../services/api';
import { UndoRequestDialog, WinnerModal, LeaveGameDialog } from './dialogs';
import SetPasswordDialog from '../SetPasswordDialog/SetPasswordDialog';
import HistoryModal from '../HistoryModal/HistoryModal';

interface GameControlsProps {
  onLeaveGame?: () => Promise<void>;
}

const GameControls: React.FC<GameControlsProps> = ({ onLeaveGame }) => {
  const {
    game,
    surrender,
    startGame,
    newGame,
    leaveRoom,
    requestUndo,
    approveUndo,
    rejectUndo,
    myPlayerNumber,
    pendingUndoMove,
    undoRequestSent,
    clearPendingUndo,
    players,
  } = useGame();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const canStartGame = game?.gameStatus === 'waiting' && players.length === 2 && myPlayerNumber === 1;
  const showWinnerModal = game?.gameStatus === 'finished' && game.winner !== null;

  // Get hasPassword from game object (API returns this boolean without exposing actual password)
  const hasPassword = game?.hasPassword || false;

  if (!game) {
    return null;
  }

  // Event handlers
  const handleSurrender = (): void => {
    if (window.confirm(t('game.surrenderConfirm'))) {
      surrender();
    }
  };

  const handleNewGame = (): void => {
    if (game.gameStatus === 'finished') {
      newGame();
    }
  };

  const handlePlayAgain = (): void => {
    handleNewGame();
  };

  const handleLeaveRoomClick = (): void => {
    setShowLeaveConfirm(true);
  };

  const handleLeaveConfirm = async (): Promise<void> => {
    setShowLeaveConfirm(false);
    try {
      setIsLeaving(true);
      if (onLeaveGame) {
        await onLeaveGame();
      } else {
        await leaveRoom();
        navigate('/');
      }
    } catch (error) {
      logger.error('Error leaving game:', error);
      if (!onLeaveGame) {
        navigate('/');
      }
    } finally {
      setIsLeaving(false);
    }
  };

  const handleLeaveCancel = (): void => {
    setShowLeaveConfirm(false);
  };

  // Helper functions
  const getWinnerMessage = (): string => {
    if (game.winner === 'draw') {
      return t('game.draw');
    }
    const winnerPlayer = players.find(p => p.playerNumber === game.winner);
    if (winnerPlayer) {
      const isYou = myPlayerNumber === game.winner;
      return `${winnerPlayer.username} ${isYou ? `(${t('game.you')})` : ''} ${t('gameControls.wins')}`;
    }
    return `${t('gameControls.player')} ${game.winner} ${t('gameControls.wins')}`;
  };

  const getMoveCount = (): number => {
    let moveCount = 0;
    for (let i = 0; i < game.board.length; i++) {
      for (let j = 0; j < game.board[i].length; j++) {
        if (game.board[i][j] !== 0) {
          moveCount++;
        }
      }
    }
    return moveCount;
  };

  const getMyMoveCount = (): number => {
    if (!myPlayerNumber) return 0;
    let moveCount = 0;
    for (let i = 0; i < game.board.length; i++) {
      for (let j = 0; j < game.board[i].length; j++) {
        if (game.board[i][j] === myPlayerNumber) {
          moveCount++;
        }
      }
    }
    return moveCount;
  };

  const handleRequestUndo = (): void => {
    const moveCount = getMoveCount();
    if (moveCount > 0) {
      requestUndo(moveCount);
    }
  };

  const canRequestUndo = (): boolean => {
    if (!myPlayerNumber) return false;
    const myMoveCount = getMyMoveCount();
    return myMoveCount >= 1;
  };

  const handleApproveUndo = (): void => {
    if (pendingUndoMove !== null) {
      approveUndo(pendingUndoMove);
      clearPendingUndo();
    }
  };

  const handleRejectUndo = (): void => {
    rejectUndo();
    clearPendingUndo();
  };

  // Check if user is host (player1)
  const isHost = myPlayerNumber === 1;

  const handleSetPassword = async (password: string | null): Promise<void> => {
    if (!game) return;
    try {
      await gameApi.setPassword(game.roomId, password);
      setShowSetPasswordDialog(false);
      logger.log('Password set successfully');
      // Game context will update hasPassword automatically via socket events or game reload
    } catch (error: any) {
      logger.error('Failed to set password:', error);
      alert(error.response?.data?.message || 'Failed to set password');
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {canStartGame && (
          <Button variant="contained" size="medium" onClick={startGame} fullWidth>
            {t('game.startGame')}
          </Button>
        )}
        {/* Host can set password when game is waiting */}
        {isHost && game.gameStatus === 'waiting' && (
          <Button
            variant="outlined"
            size="medium"
            onClick={() => setShowSetPasswordDialog(true)}
            fullWidth
            startIcon={hasPassword ? <LockIcon /> : <LockOpenIcon />}
            sx={{
              borderColor: hasPassword ? '#ff9800' : '#7ec8e3',
              color: hasPassword ? '#ff9800' : '#7ec8e3',
            }}
          >
            {hasPassword ? t('game.changePassword') : t('game.setPassword')}
          </Button>
        )}
        {game.gameStatus === 'playing' && (
          <>
            {game.rules.allowUndo && canRequestUndo() && (
              <Button
                variant="outlined"
                size="medium"
                onClick={handleRequestUndo}
                disabled={!myPlayerNumber || undoRequestSent}
                fullWidth
                startIcon={undoRequestSent ? <CircularProgress size={16} /> : null}
                sx={{
                  ...(undoRequestSent && {
                    bgcolor: 'rgba(126, 200, 227, 0.1)',
                    borderColor: '#7ec8e3',
                    color: '#7ec8e3',
                  }),
                }}
              >
                {undoRequestSent ? t('gameControls.waitingForResponse') : t('game.requestUndo')}
              </Button>
            )}
            <Button variant="outlined" color="error" size="medium" onClick={handleSurrender} fullWidth>
              {t('game.surrender')}
            </Button>
          </>
        )}
        {game.gameStatus === 'finished' && !showWinnerModal && (
          <Button variant="contained" size="medium" onClick={handleNewGame} fullWidth>
            {t('game.newGame')}
          </Button>
        )}
        {!showWinnerModal && (
          <Button
            variant="outlined"
            color="secondary"
            size="medium"
            onClick={handleLeaveRoomClick}
            disabled={isLeaving}
            fullWidth
            startIcon={isLeaving ? <CircularProgress size={16} /> : null}
          >
            {isLeaving ? t('gameControls.leaving') : t('game.leaveGame')}
          </Button>
        )}
        {/* History Button - Caro game specific */}
        <Button
          variant="outlined"
          size="medium"
          onClick={() => setShowHistoryModal(true)}
          fullWidth
          startIcon={<HistoryIcon />}
          sx={{
            borderColor: 'rgba(126, 200, 227, 0.5)',
            color: '#7ec8e3',
            '&:hover': {
              borderColor: '#7ec8e3',
              background: 'rgba(126, 200, 227, 0.1)',
            },
          }}
        >
          {t('home.history')}
        </Button>
      </Box>

      {/* Undo Request Dialog */}
      <UndoRequestDialog
        pendingUndoMove={pendingUndoMove}
        undoRequestSent={undoRequestSent}
        onApprove={handleApproveUndo}
        onReject={handleRejectUndo}
        t={t}
      />

      {/* Winner Modal */}
      <WinnerModal
        open={showWinnerModal}
        winner={game.winner}
        myPlayerNumber={myPlayerNumber}
        score={game.score}
        winnerMessage={getWinnerMessage()}
        isLeaving={isLeaving}
        onPlayAgain={handlePlayAgain}
        onLeaveRoom={handleLeaveRoomClick}
        t={t}
      />

      {/* Leave Game Confirmation Dialog */}
      <LeaveGameDialog
        open={showLeaveConfirm}
        isLeaving={isLeaving}
        isGamePlaying={game.gameStatus === 'playing'}
        onConfirm={handleLeaveConfirm}
        onCancel={handleLeaveCancel}
        t={t}
      />

      {/* Set Password Dialog */}
      {isHost && (
        <SetPasswordDialog
          open={showSetPasswordDialog}
          onConfirm={handleSetPassword}
          onCancel={() => setShowSetPasswordDialog(false)}
          hasPassword={hasPassword}
        />
      )}

      {/* History Modal - Caro game specific */}
      <HistoryModal
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />
    </Box>
  );
};

export default GameControls;
