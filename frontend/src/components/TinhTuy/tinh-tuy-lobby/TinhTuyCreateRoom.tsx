/**
 * TinhTuyCreateRoom — Dialog for creating a new room with settings.
 */
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { DEFAULT_SETTINGS, TinhTuyGameMode } from '../tinh-tuy-types';
import { TinhTuySettingsForm } from './TinhTuySettingsForm';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const TinhTuyCreateRoom: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const { createRoom } = useTinhTuy();

  const [maxPlayers, setMaxPlayers] = useState(DEFAULT_SETTINGS.maxPlayers);
  const [startingPoints, setStartingPoints] = useState(DEFAULT_SETTINGS.startingPoints);
  const [gameMode, setGameMode] = useState<TinhTuyGameMode>(DEFAULT_SETTINGS.gameMode);
  const [turnDuration, setTurnDuration] = useState(DEFAULT_SETTINGS.turnDuration);
  const [password, setPassword] = useState('');

  const handleCreate = () => {
    createRoom({
      settings: { maxPlayers, startingPoints, gameMode, turnDuration },
      password: password.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
          {t('tinhTuy.lobby.createRoom')}
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <TinhTuySettingsForm
          maxPlayers={maxPlayers} setMaxPlayers={setMaxPlayers}
          startingPoints={startingPoints} setStartingPoints={setStartingPoints}
          gameMode={gameMode} setGameMode={setGameMode}
          turnDuration={turnDuration} setTurnDuration={setTurnDuration}
          password={password} setPassword={setPassword}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">{t('common.cancel')}</Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%)' },
          }}
        >
          {t('tinhTuy.lobby.createRoom')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
