/**
 * GoTimerDisplay — Shows main time and byoyomi countdown for a player.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';

interface GoTimerDisplayProps {
  mainTimeLeft: number;
  byoyomiPeriodsLeft: number;
  byoyomiTime: number;
  isActive: boolean;
  timerEnabled: boolean;
}

const pulseAnim = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

function formatMM_SS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

const GoTimerDisplay: React.FC<GoTimerDisplayProps> = ({
  mainTimeLeft,
  byoyomiPeriodsLeft,
  byoyomiTime,
  isActive,
  timerEnabled,
}) => {
  if (!timerEnabled) return null;

  const inByoyomi = mainTimeLeft <= 0 && byoyomiPeriodsLeft > 0;
  const isCritical = isActive && (mainTimeLeft < 10 || (inByoyomi && byoyomiTime < 10));
  const isWarning = isActive && !isCritical && (mainTimeLeft < 60 || inByoyomi);

  const color = isCritical ? 'error.main' : isWarning ? 'warning.main' : 'text.primary';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
      {inByoyomi ? (
        <>
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{
              color,
              animation: isCritical && isActive ? `${pulseAnim} 0.8s ease-in-out infinite` : 'none',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {byoyomiTime}s
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ×{byoyomiPeriodsLeft}
          </Typography>
        </>
      ) : (
        <Typography
          variant="h6"
          fontWeight="bold"
          sx={{
            color,
            animation: isCritical && isActive ? `${pulseAnim} 0.8s ease-in-out infinite` : 'none',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatMM_SS(mainTimeLeft)}
        </Typography>
      )}
    </Box>
  );
};

export default GoTimerDisplay;
