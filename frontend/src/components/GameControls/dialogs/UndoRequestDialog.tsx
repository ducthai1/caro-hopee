/**
 * UndoRequestDialog - Dialog for handling undo requests
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { useToast } from '../../../contexts/ToastContext';

interface UndoRequestDialogProps {
  pendingUndoMove: number | null;
  undoRequestSent: boolean;
  onApprove: () => void;
  onReject: () => void;
  t: (key: string) => string;
}

const UndoRequestDialog: React.FC<UndoRequestDialogProps> = ({
  pendingUndoMove,
  undoRequestSent,
  onApprove,
  onReject,
  t,
}) => {
  const toast = useToast();

  // Show toast when undo request is sent
  React.useEffect(() => {
    if (undoRequestSent) {
      toast.info('toast.undoRequestSent');
    }
  }, [undoRequestSent]);

  return (
      <Dialog open={pendingUndoMove !== null} onClose={onReject}>
        <DialogTitle>{t('gameControls.undoRequest')}</DialogTitle>
        <DialogContent>
          <Typography>{t('gameControls.undoRequestMessage')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onReject}>{t('game.rejectUndo')}</Button>
          <Button onClick={onApprove} variant="contained">
            {t('game.approveUndo')}
          </Button>
        </DialogActions>
      </Dialog>
  );
};

export default UndoRequestDialog;
