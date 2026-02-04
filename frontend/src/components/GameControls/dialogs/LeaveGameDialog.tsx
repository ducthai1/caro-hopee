/**
 * LeaveGameDialog - Dialog to confirm leaving the game
 * Uses ConfirmDialog component with 'warning' variant
 */
import React from 'react';
import ConfirmDialog from '../../ConfirmDialog';

interface LeaveGameDialogProps {
  open: boolean;
  isLeaving: boolean;
  isGamePlaying: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}

const LeaveGameDialog: React.FC<LeaveGameDialogProps> = ({
  open,
  isLeaving,
  isGamePlaying,
  onConfirm,
  onCancel,
  t,
}) => {
  const message = isGamePlaying
    ? `${t('game.leaveConfirm')}\n\n${t('gameControls.gameInProgress')}`
    : t('game.leaveConfirm');

  return (
    <ConfirmDialog
      open={open}
      title={`⚠️ ${t('gameControls.leaveGameQuestion')}`}
      message={message}
      confirmText={isLeaving ? t('gameControls.leaving') : t('gameControls.leave')}
      variant="warning"
      loading={isLeaving}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};

export default LeaveGameDialog;
