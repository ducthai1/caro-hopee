/**
 * WordChainCreateRoom - Dialog to create a new word chain room with settings.
 */
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useLanguage } from '../../../i18n';
import { useWordChain } from '../WordChainContext';
import { WordType, WordChainGameMode } from '../word-chain-types';
import { WordChainSettingsForm } from './WordChainSettingsForm';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const WordChainCreateRoom: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const { createRoom } = useWordChain();

  const [maxPlayers, setMaxPlayers] = useState(2);
  const [wordType, setWordType] = useState<WordType>('2+');
  const [gameMode, setGameMode] = useState<WordChainGameMode>('classic');
  const [turnDuration, setTurnDuration] = useState(60);
  const [lives, setLives] = useState(3);
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [password, setPassword] = useState('');

  const handleCreate = () => {
    createRoom({
      maxPlayers,
      rules: {
        wordType,
        gameMode,
        turnDuration,
        lives,
        allowRepeat,
        showHint,
        allowProperNouns: false,
        allowSlang: false,
      },
      password: password.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: '90vh' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
          {t('wordChain.createRoom')}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <WordChainSettingsForm
          maxPlayers={maxPlayers} setMaxPlayers={setMaxPlayers}
          wordType={wordType} setWordType={setWordType}
          gameMode={gameMode} setGameMode={setGameMode}
          turnDuration={turnDuration} setTurnDuration={setTurnDuration}
          lives={lives} setLives={setLives}
          allowRepeat={allowRepeat} setAllowRepeat={setAllowRepeat}
          showHint={showHint} setShowHint={setShowHint}
          password={password} setPassword={setPassword}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #27ae60 0%, #219a52 100%)' },
          }}
        >
          {t('wordChain.createRoom')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
