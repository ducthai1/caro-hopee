/**
 * WordChainSettingsForm - Reusable settings form body for create/edit room.
 * Supports both create mode (simple password field) and edit mode (change/remove password).
 */
import React, { useState } from 'react';
import {
  Box, Typography, TextField, Chip, InputAdornment, Button,
  ToggleButton, ToggleButtonGroup, Switch, FormControlLabel,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useLanguage } from '../../../i18n';
import { WordType, WordChainGameMode } from '../word-chain-types';

const TURN_DURATION_OPTIONS = [15, 30, 60, 90, 120];
const LIVES_OPTIONS = [1, 2, 3, 4, 5];

interface Props {
  maxPlayers: number;
  setMaxPlayers: (v: number) => void;
  wordType: WordType;
  setWordType: (v: WordType) => void;
  gameMode: WordChainGameMode;
  setGameMode: (v: WordChainGameMode) => void;
  turnDuration: number;
  setTurnDuration: (v: number) => void;
  lives: number;
  setLives: (v: number) => void;
  allowRepeat: boolean;
  setAllowRepeat: (v: boolean) => void;
  showHint: boolean;
  setShowHint: (v: boolean) => void;
  password: string;
  setPassword: (v: string) => void;
  minMaxPlayers?: number;
  /** Edit mode: whether the room currently has a password */
  hasPassword?: boolean;
  /** Edit mode: callback to remove current password */
  onRemovePassword?: () => void;
}

const PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8];

export const WordChainSettingsForm: React.FC<Props> = ({
  maxPlayers, setMaxPlayers,
  wordType, setWordType,
  gameMode, setGameMode,
  turnDuration, setTurnDuration,
  lives, setLives,
  allowRepeat, setAllowRepeat,
  showHint, setShowHint,
  password, setPassword,
  minMaxPlayers = 2,
  hasPassword,
  onRemovePassword,
}) => {
  const { t } = useLanguage();
  const isEditMode = hasPassword !== undefined;
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  const playerOptions = PLAYER_OPTIONS.filter(n => n >= minMaxPlayers);

  return (
    <>
      {/* Max Players */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {t('wordChain.maxPlayers')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {playerOptions.map(n => (
            <Chip
              key={n}
              label={`${n}`}
              onClick={() => setMaxPlayers(n)}
              color={maxPlayers === n ? 'success' : 'default'}
              variant={maxPlayers === n ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600, minWidth: 40 }}
            />
          ))}
        </Box>
      </Box>

      {/* Word Type */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {t('wordChain.wordType')}
        </Typography>
        <ToggleButtonGroup
          value={wordType}
          exclusive
          onChange={(_, v) => v && setWordType(v)}
          size="small"
          sx={{ '& .MuiToggleButton-root': { px: 2 }, borderRadius: 2 }}
        >
          <ToggleButton value="2+">{t('wordChain.wordType2Plus')}</ToggleButton>
          <ToggleButton value="3+">{t('wordChain.wordType3Plus')}</ToggleButton>
          <ToggleButton value="all">{t('wordChain.wordTypeAll')}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Game Mode */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {t('wordChain.gameMode')}
        </Typography>
        <ToggleButtonGroup
          value={gameMode}
          exclusive
          onChange={(_, v) => v && setGameMode(v)}
          size="small"
          sx={{ '& .MuiToggleButton-root': { px: 2 }, borderRadius: 2 }}
        >
          <ToggleButton value="classic">{t('wordChain.modeClassic')}</ToggleButton>
          <ToggleButton value="speed">{t('wordChain.modeSpeed')}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Turn Duration */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {t('wordChain.turnDuration')} ({turnDuration}s)
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {TURN_DURATION_OPTIONS.map(d => (
            <Chip
              key={d}
              label={`${d}s`}
              onClick={() => setTurnDuration(d)}
              color={turnDuration === d ? 'success' : 'default'}
              variant={turnDuration === d ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Box>
      </Box>

      {/* Lives */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {t('wordChain.lives')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {LIVES_OPTIONS.map(l => (
            <Chip
              key={l}
              label={`${'❤️'.repeat(l)}`}
              onClick={() => setLives(l)}
              color={lives === l ? 'error' : 'default'}
              variant={lives === l ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Box>
      </Box>

      {/* Toggles */}
      <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <FormControlLabel
          control={<Switch checked={allowRepeat} onChange={(_, v) => setAllowRepeat(v)} color="success" />}
          label={t('wordChain.allowRepeat')}
        />
        <FormControlLabel
          control={<Switch checked={showHint} onChange={(_, v) => setShowHint(v)} color="success" />}
          label={t('wordChain.showHint')}
        />
      </Box>

      {/* Password */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {t('wordChain.password')} ({t('wordChain.optional')})
        </Typography>

        {isEditMode ? (
          <>
            {/* Status indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              {hasPassword ? (
                <LockOutlinedIcon sx={{ fontSize: 18, color: '#e67e22' }} />
              ) : (
                <LockOpenIcon sx={{ fontSize: 18, color: '#95a5a6' }} />
              )}
              <Typography variant="body2" sx={{ color: hasPassword ? '#e67e22' : '#95a5a6' }}>
                {hasPassword ? t('wordChain.hasPassword') : t('wordChain.noPassword')}
              </Typography>
            </Box>

            {showPasswordInput ? (
              /* Password input with save/cancel */
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'stretch' }}>
                <TextField
                  fullWidth
                  size="small"
                  type="password"
                  placeholder={t('wordChain.passwordPlaceholder')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  inputProps={{ maxLength: 50 }}
                  autoFocus
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => { setShowPasswordInput(false); setPassword(''); }}
                  sx={{ borderColor: '#95a5a6', color: '#95a5a6', whiteSpace: 'nowrap' }}
                >
                  {t('common.cancel')}
                </Button>
              </Box>
            ) : (
              /* Action buttons */
              <Box sx={{ display: 'flex', gap: 1 }}>
                {hasPassword ? (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setShowPasswordInput(true)}
                      sx={{
                        borderColor: '#e67e22', color: '#e67e22',
                        '&:hover': { borderColor: '#d35400', bgcolor: 'rgba(230, 126, 34, 0.04)' },
                      }}
                    >
                      {t('wordChain.changePassword')}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={onRemovePassword}
                      sx={{
                        borderColor: '#e74c3c', color: '#e74c3c',
                        '&:hover': { borderColor: '#c0392b', bgcolor: 'rgba(231, 76, 60, 0.04)' },
                      }}
                    >
                      {t('wordChain.removePassword')}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LockOutlinedIcon />}
                    onClick={() => setShowPasswordInput(true)}
                    sx={{
                      borderColor: '#e67e22', color: '#e67e22',
                      '&:hover': { borderColor: '#d35400', bgcolor: 'rgba(230, 126, 34, 0.04)' },
                    }}
                  >
                    {t('wordChain.setPassword')}
                  </Button>
                )}
              </Box>
            )}
          </>
        ) : (
          /* Create mode: simple text field */
          <TextField
            fullWidth
            size="small"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('wordChain.passwordPlaceholder')}
            inputProps={{ maxLength: 50 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
        )}
      </Box>
    </>
  );
};
