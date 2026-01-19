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
  Snackbar,
  Alert,
} from '@mui/material';

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
  return (
    <>
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

      {/* Snackbar for undo request feedback */}
      <Snackbar
        open={undoRequestSent}
        autoHideDuration={3000}
        onClose={() => {}}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" sx={{ width: '100%' }}>
          {t('gameControls.undoRequestSent')}
        </Alert>
      </Snackbar>
    </>
  );
};

export default UndoRequestDialog;
