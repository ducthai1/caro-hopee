/**
 * TinhTuyTurnTimer — Visual countdown bar for current turn.
 * Server timer is authoritative; this is cosmetic only.
 */
import React, { useState, useEffect } from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';

export const TinhTuyTurnTimer: React.FC = () => {
  const { state } = useTinhTuy();
  const turnDuration = state.settings?.turnDuration || 60;
  const [remaining, setRemaining] = useState(turnDuration);

  useEffect(() => {
    if (state.turnPhase === 'END_TURN' || !state.turnStartedAt) {
      setRemaining(turnDuration);
      return;
    }

    const tick = () => {
      const elapsed = (Date.now() - state.turnStartedAt) / 1000;
      setRemaining(Math.max(0, Math.ceil(turnDuration - elapsed)));
    };
    tick(); // immediate
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [state.turnStartedAt, turnDuration, state.turnPhase]);

  const progress = (remaining / turnDuration) * 100;
  const isLow = remaining <= 10;

  return (
    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          bgcolor: 'rgba(0,0,0,0.08)',
          '& .MuiLinearProgress-bar': {
            bgcolor: isLow ? '#e74c3c' : '#9b59b6',
            transition: 'width 0.25s linear',
          },
        }}
      />
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          minWidth: 28,
          textAlign: 'right',
          color: isLow ? '#e74c3c' : 'text.secondary',
          animation: isLow ? 'tt-timer-flash 0.5s ease infinite alternate' : 'none',
        }}
      >
        {remaining}s
      </Typography>
    </Box>
  );
};
