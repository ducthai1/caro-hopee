/**
 * LeaveConfirmDialog - Dialog to confirm leaving the game
 * Uses ConfirmDialog component with 'warning' variant
 */
import React from 'react';
import { useLanguage } from '../../i18n';
import ConfirmDialog from '../ConfirmDialog';

interface LeaveConfirmDialogProps {
  open: boolean;
  isLeaving: boolean;
  isGamePlaying: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LeaveConfirmDialog: React.FC<LeaveConfirmDialogProps> = ({
  open,
  isLeaving,
  isGamePlaying,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage();

  const message = isGamePlaying
    ? `${t('gameRoom.leaveConfirm')}\n\n${t('gameRoom.gameInProgress')}`
    : t('gameRoom.leaveConfirm');

  return (
    <ConfirmDialog
      open={open}
      title={`⚠️ ${t('gameRoom.leaveTitle')}`}
      message={message}
      confirmText={isLeaving ? t('gameRoom.leaving') : t('game.leaveGame')}
      variant="warning"
      loading={isLeaving}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};

export default LeaveConfirmDialog;
