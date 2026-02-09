/**
 * WordChainInput - Word submission input with validation feedback.
 * Desktop: 2-row layout (input row + action buttons row).
 * Mobile: compact single row with icon-only buttons.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Button, IconButton, Typography, keyframes } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import FlagIcon from '@mui/icons-material/Flag';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useLanguage } from '../../../i18n';
import { useWordChain } from '../WordChainContext';
import ConfirmDialog from '../../ConfirmDialog/ConfirmDialog';

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 50%, 90% { transform: translateX(-4px); }
  30%, 70% { transform: translateX(4px); }
`;

export const WordChainInput: React.FC = () => {
  const { t } = useLanguage();
  const { state, submitWord, surrender, leaveRoom } = useWordChain();
  const [value, setValue] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [confirmType, setConfirmType] = useState<'surrender' | 'leave' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevChainLen = useRef(state.wordChain.length);

  const isMyTurn = state.currentPlayerSlot === state.mySlot && state.gameStatus === 'playing';
  const isPlaying = state.gameStatus === 'playing';

  useEffect(() => {
    if (isMyTurn) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isMyTurn]);

  useEffect(() => {
    const chain = state.wordChain;
    if (chain.length > prevChainLen.current) {
      const last = chain[chain.length - 1];
      if (!last.accepted && last.playerSlot === state.mySlot) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
    }
    prevChainLen.current = chain.length;
  }, [state.wordChain.length, state.mySlot]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || !isMyTurn) return;
    submitWord(trimmed);
    setValue('');
  };

  const handleConfirm = () => {
    if (confirmType === 'surrender') surrender();
    else if (confirmType === 'leave') leaveRoom();
    setConfirmType(null);
  };

  const lastSyllable = state.currentWord
    ? state.currentWord.split(' ').pop() || ''
    : '';

  return (
    <Box sx={{ pl: { xs: 2, sm: 3, md: 6 }, pr: { xs: 2, sm: 3, md: 6 }, py: { xs: 1.5, md: 2 }, borderTop: '1px solid rgba(0,0,0,0.08)', bgcolor: '#fff', mb: { xs: 5, sm: 0 } }}>
      {/* Hint */}
      {isPlaying && lastSyllable && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            mb: 0.75,
            color: isMyTurn ? '#2ecc71' : 'text.secondary',
            fontWeight: isMyTurn ? 700 : 400,
          }}
        >
          {isMyTurn
            ? `${t('wordChain.game.yourTurn')} - "${lastSyllable}..."`
            : t('wordChain.game.waitingTurn')}
        </Typography>
      )}

      {/* Row 1: Input + Send (+ mobile icon buttons) */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          animation: isShaking ? `${shake} 0.5s ease-in-out` : 'none',
        }}
      >
        <TextField
          inputRef={inputRef}
          fullWidth
          size="small"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          disabled={!isMyTurn}
          placeholder={
            isMyTurn
              ? `${t('wordChain.game.typeWord')} "${lastSyllable}..."`
              : t('wordChain.game.waitingTurn')
          }
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: isMyTurn ? '#fff' : 'rgba(0,0,0,0.02)',
            },
          }}
          autoComplete="off"
        />

        <IconButton
          onClick={handleSubmit}
          disabled={!isMyTurn || !value.trim()}
          sx={{
            bgcolor: '#2ecc71',
            color: '#fff',
            '&:hover': { bgcolor: '#27ae60' },
            '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.3)' },
            width: 40,
            height: 40,
            flexShrink: 0,
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </IconButton>

        {/* Mobile only: icon buttons */}
        {isPlaying && (
          <IconButton
            onClick={() => setConfirmType('surrender')}
            size="small"
            sx={{ color: '#e74c3c', opacity: 0.6, '&:hover': { opacity: 1 }, display: { xs: 'flex', sm: 'none' } }}
          >
            <FlagIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
        <IconButton
          onClick={() => setConfirmType('leave')}
          size="small"
          sx={{ color: '#95a5a6', opacity: 0.6, '&:hover': { opacity: 1, color: '#e74c3c' }, display: { xs: 'flex', sm: 'none' } }}
        >
          <ExitToAppIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Row 2: Action buttons — desktop only, separate row with breathing room */}
      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          justifyContent: 'flex-end',
          gap: 1.5,
          mt: 1,
        }}
      >
        {isPlaying && (
          <Button
            onClick={() => setConfirmType('surrender')}
            size="small"
            variant="outlined"
            startIcon={<FlagIcon sx={{ fontSize: 16 }} />}
            sx={{
              color: '#e74c3c',
              borderColor: 'rgba(231, 76, 60, 0.3)',
              '&:hover': { borderColor: '#e74c3c', bgcolor: 'rgba(231, 76, 60, 0.06)' },
              textTransform: 'none',
              fontSize: { sm: '0.85rem', md: '0.9rem' },
              px: { sm: 2, md: 3 },
              py: 0.75,
              whiteSpace: 'nowrap',
            }}
          >
            {t('wordChain.game.surrender')}
          </Button>
        )}
        <Button
          onClick={() => setConfirmType('leave')}
          size="small"
          variant="outlined"
          startIcon={<ExitToAppIcon sx={{ fontSize: 16 }} />}
          sx={{
            color: '#95a5a6',
            borderColor: 'rgba(149, 165, 166, 0.3)',
            '&:hover': { borderColor: '#e74c3c', color: '#e74c3c', bgcolor: 'rgba(231, 76, 60, 0.06)' },
            textTransform: 'none',
            fontSize: { sm: '0.85rem', md: '0.9rem' },
            px: { sm: 2, md: 3 },
            py: 0.75,
            whiteSpace: 'nowrap',
          }}
        >
          {t('wordChain.leave')}
        </Button>
      </Box>

      {/* Confirmation dialogs for dangerous actions */}
      <ConfirmDialog
        open={confirmType === 'surrender'}
        title={t('wordChain.game.surrenderConfirmTitle')}
        message={t('wordChain.game.surrenderConfirm')}
        confirmText={t('wordChain.game.surrender')}
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmType(null)}
      />
      <ConfirmDialog
        open={confirmType === 'leave'}
        title={isPlaying ? t('wordChain.leaveGameConfirmTitle') : t('wordChain.leaveConfirmTitle')}
        message={isPlaying ? t('wordChain.leaveGameConfirmMsg') : t('wordChain.leaveConfirmMsg')}
        confirmText={t('wordChain.leave')}
        variant="warning"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmType(null)}
      />
    </Box>
  );
};
