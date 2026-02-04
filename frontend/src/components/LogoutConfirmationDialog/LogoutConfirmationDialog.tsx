/**
 * LogoutConfirmationDialog - Dialog for confirming logout action
 * Uses ConfirmDialog component with 'warning' variant
 */
import React from 'react';
import { useLanguage } from '../../i18n';
import ConfirmDialog from '../ConfirmDialog';

interface LogoutConfirmationDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LogoutConfirmationDialog: React.FC<LogoutConfirmationDialogProps> = ({
  open,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage();

  return (
    <ConfirmDialog
      open={open}
      title={t('auth.logoutConfirmTitle') || 'Đăng xuất?'}
      message={t('auth.logoutConfirmMessage') || 'Bạn có chắc chắn muốn đăng xuất?'}
      confirmText={t('auth.logout')}
      variant="warning"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};

export default LogoutConfirmationDialog;

