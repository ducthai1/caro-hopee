/**
 * GoControls — Pass, Resign, Undo buttons + undo approval UI.
 */
import React from 'react';
import { Box, Button, Stack, Paper, Typography } from '@mui/material';
import PauseIcon from '@mui/icons-material/Pause';
import FlagIcon from '@mui/icons-material/Flag';
import UndoIcon from '@mui/icons-material/Undo';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useLanguage } from '../../../i18n';
import { GoUndoRequest } from '../go-types';

interface GoControlsProps {
  isMyTurn: boolean;
  phase: 'play' | 'scoring';
  moveCount: number;
  pendingUndo: GoUndoRequest | null;
  mySlot: number | null;
  onPass: () => void;
  onResign: () => void;
  onRequestUndo: () => void;
  onApproveUndo: () => void;
  onRejectUndo: () => void;
}

const GoControls: React.FC<GoControlsProps> = ({
  isMyTurn,
  phase,
  moveCount,
  pendingUndo,
  mySlot,
  onPass,
  onResign,
  onRequestUndo,
  onApproveUndo,
  onRejectUndo,
}) => {
  const { t } = useLanguage();

  const handlePass = () => {
    if (window.confirm(t('go.confirmPass'))) {
      onPass();
    }
  };

  const handleResign = () => {
    if (window.confirm(t('go.confirmResign'))) {
      onResign();
    }
  };

  // Is the pending undo for the opponent (i.e. I need to approve/reject)?
  const undoPendingForMe = pendingUndo && mySlot !== null && pendingUndo.fromSlot !== mySlot;
  // Is the pending undo my own request?
  const undoPendingByMe = pendingUndo && mySlot !== null && pendingUndo.fromSlot === mySlot;

  if (phase !== 'play') return null;

  return (
    <Stack spacing={1} alignItems="stretch">
      {/* Undo approval banner */}
      {undoPendingForMe && (
        <Paper
          elevation={3}
          sx={{
            p: 1.5,
            border: '1px solid',
            borderColor: 'warning.main',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" mb={1} textAlign="center">
            {t('go.undoPending')}
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center">
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              onClick={onApproveUndo}
            >
              {t('go.approve')}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<CloseIcon />}
              onClick={onRejectUndo}
            >
              {t('go.reject')}
            </Button>
          </Stack>
        </Paper>
      )}

      {undoPendingByMe && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          {t('go.undoWaiting')}
        </Typography>
      )}

      {/* Action buttons */}
      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
        <Button
          variant="outlined"
          color="primary"
          startIcon={<PauseIcon />}
          disabled={!isMyTurn}
          onClick={handlePass}
          size="small"
        >
          {t('go.pass')}
        </Button>

        <Button
          variant="outlined"
          color="error"
          startIcon={<FlagIcon />}
          onClick={handleResign}
          size="small"
        >
          {t('go.resign')}
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          startIcon={<UndoIcon />}
          disabled={moveCount === 0 || !!pendingUndo}
          onClick={onRequestUndo}
          size="small"
        >
          {t('go.undo')}
        </Button>
      </Stack>
    </Stack>
  );
};

export default GoControls;
