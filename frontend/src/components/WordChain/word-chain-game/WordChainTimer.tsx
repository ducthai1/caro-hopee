/**
 * WordChainTimer - Circular SVG countdown timer.
 * Uses requestAnimationFrame for smooth progress animation.
 * Colors: green > 50%, orange 25-50%, red < 25% with pulse animation.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

interface Props {
  turnStartedAt: number;  // timestamp ms
  turnDuration: number;   // seconds
  isActive: boolean;
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const getColor = (pct: number): string => {
  if (pct > 0.5) return '#4CAF50';
  if (pct > 0.25) return '#FF9800';
  return '#F44336';
};

export const WordChainTimer: React.FC<Props> = ({ turnStartedAt, turnDuration, isActive }) => {
  const [displaySeconds, setDisplaySeconds] = useState(turnDuration);
  const [progress, setProgress] = useState(1); // 1 = full, 0 = empty
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    const elapsed = (Date.now() - turnStartedAt) / 1000;
    const left = Math.max(0, turnDuration - elapsed);
    const pct = turnDuration > 0 ? left / turnDuration : 0;

    setDisplaySeconds(Math.ceil(left));
    setProgress(pct);

    if (left > 0) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [turnStartedAt, turnDuration]);

  useEffect(() => {
    if (!isActive || !turnStartedAt || isNaN(turnStartedAt)) {
      setDisplaySeconds(turnDuration);
      setProgress(1);
      return;
    }

    // Start animation loop
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [turnStartedAt, turnDuration, isActive, tick]);

  const safeOffset = isNaN(CIRCUMFERENCE * (1 - progress)) ? 0 : CIRCUMFERENCE * (1 - progress);
  const color = getColor(progress);
  const shouldPulse = displaySeconds <= 10 && displaySeconds > 0 && isActive;
  const display = isNaN(displaySeconds) ? turnDuration : displaySeconds;

  return (
    <Box
      sx={{
        position: 'relative',
        width: { xs: 68, sm: 96 },
        height: { xs: 68, sm: 96 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: shouldPulse ? `${pulse} 1s ease-in-out infinite` : 'none',
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 96 96" width="100%" height="100%">
        {/* Background circle */}
        <circle
          cx="48" cy="48" r={RADIUS}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="6"
        />
        {/* Progress circle */}
        <circle
          cx="48" cy="48" r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={safeOffset}
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke 0.3s ease' }}
        />
      </svg>
      <Typography
        sx={{
          position: 'absolute',
          fontSize: { xs: '1.1rem', sm: '1.5rem' },
          fontWeight: 800,
          color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {display}
      </Typography>
    </Box>
  );
};
