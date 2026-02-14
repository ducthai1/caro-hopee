/**
 * TinhTuySettingsForm — Reusable settings form for create/edit room.
 */
import React from 'react';
import {
  Box, Typography, TextField, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { useLanguage } from '../../../i18n';
import { TinhTuyGameMode } from '../tinh-tuy-types';

interface Props {
  maxPlayers: number;
  setMaxPlayers: (v: number) => void;
  startingPoints: number;
  setStartingPoints: (v: number) => void;
  gameMode: TinhTuyGameMode;
  setGameMode: (v: TinhTuyGameMode) => void;
  turnDuration: number;
  setTurnDuration: (v: number) => void;
  password: string;
  setPassword: (v: string) => void;
  minMaxPlayers?: number;
}

const STARTING_POINTS_OPTIONS = [10000, 15000, 20000, 30000, 50000];
const TURN_DURATION_OPTIONS = [30, 60, 90, 120];

export const TinhTuySettingsForm: React.FC<Props> = ({
  maxPlayers, setMaxPlayers,
  startingPoints, setStartingPoints,
  gameMode, setGameMode,
  turnDuration, setTurnDuration,
  password, setPassword,
  minMaxPlayers = 2,
}) => {
  const { t } = useLanguage();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
      {/* Max Players */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          {t('tinhTuy.settings.maxPlayers')}
        </Typography>
        <ToggleButtonGroup
          value={maxPlayers}
          exclusive
          onChange={(_, v) => v !== null && setMaxPlayers(v)}
          size="small"
        >
          {[2, 3, 4].map(n => (
            <ToggleButton
              key={n}
              value={n}
              disabled={n < minMaxPlayers}
              sx={{ px: 2.5, fontWeight: 700 }}
            >
              {n}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Starting Points */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          {t('tinhTuy.settings.startingPoints')}
        </Typography>
        <ToggleButtonGroup
          value={startingPoints}
          exclusive
          onChange={(_, v) => v !== null && setStartingPoints(v)}
          size="small"
        >
          {STARTING_POINTS_OPTIONS.map(n => (
            <ToggleButton key={n} value={n} sx={{ px: 1.5, fontWeight: 600, fontSize: '0.8rem' }}>
              {(n / 1000).toFixed(0)}K
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Game Mode */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          {t('tinhTuy.settings.gameMode')}
        </Typography>
        <ToggleButtonGroup
          value={gameMode}
          exclusive
          onChange={(_, v) => v !== null && setGameMode(v as TinhTuyGameMode)}
          size="small"
        >
          <ToggleButton value="classic" sx={{ px: 2, fontWeight: 600 }}>
            {t('tinhTuy.settings.classic')}
          </ToggleButton>
          <ToggleButton value="timed" sx={{ px: 2, fontWeight: 600 }}>
            {t('tinhTuy.settings.timed')}
          </ToggleButton>
          <ToggleButton value="rounds" sx={{ px: 2, fontWeight: 600 }}>
            {t('tinhTuy.settings.rounds')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Turn Duration */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          {t('tinhTuy.settings.turnDuration')}
        </Typography>
        <ToggleButtonGroup
          value={turnDuration}
          exclusive
          onChange={(_, v) => v !== null && setTurnDuration(v)}
          size="small"
        >
          {TURN_DURATION_OPTIONS.map(n => (
            <ToggleButton key={n} value={n} sx={{ px: 2, fontWeight: 600 }}>
              {n}s
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Password */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          {t('tinhTuy.settings.password')}
        </Typography>
        <TextField
          size="small"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('tinhTuy.settings.passwordPlaceholder')}
          fullWidth
          inputProps={{ maxLength: 50 }}
        />
      </Box>
    </Box>
  );
};
