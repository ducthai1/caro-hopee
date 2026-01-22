/**
 * GameReactions - Emoji reaction buttons with cooldown timer
 * Allows players to send reactions to opponents during a game
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Box, IconButton, LinearProgress, Typography, Tooltip } from '@mui/material';
import { useLanguage } from '../../i18n';
import { REACTIONS, REACTION_COOLDOWN_MS } from '../../constants/reactions';

interface GameReactionsProps {
  onSendReaction: (emoji: string) => void;
  disabled?: boolean;
}

const GameReactions: React.FC<GameReactionsProps> = ({ onSendReaction, disabled = false }) => {
  const { language } = useLanguage();
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  const isOnCooldown = cooldownEnd !== null && remainingMs > 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progressValue = isOnCooldown ? (remainingMs / REACTION_COOLDOWN_MS) * 100 : 0;

  // Update remaining time every 100ms for smooth progress
  useEffect(() => {
    if (!cooldownEnd) return;

    const interval = setInterval(() => {
      const left = Math.max(0, cooldownEnd - Date.now());
      setRemainingMs(left);
      if (left <= 0) {
        setCooldownEnd(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const handleReaction = useCallback((emoji: string) => {
    if (disabled || isOnCooldown) return;

    onSendReaction(emoji);
    setCooldownEnd(Date.now() + REACTION_COOLDOWN_MS);
    setRemainingMs(REACTION_COOLDOWN_MS);
  }, [disabled, isOnCooldown, onSendReaction]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 1.5,
        borderRadius: 3,
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(126, 200, 227, 0.2)',
        boxShadow: '0 4px 20px rgba(126, 200, 227, 0.1)',
      }}
    >
      {/* Emoji buttons - 2 rows of 3 for better fit */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 0.75,
        justifyItems: 'center',
      }}>
        {REACTIONS.map((reaction) => (
          <Tooltip
            key={reaction.id}
            title={reaction.label[language]}
            placement="top"
            arrow
          >
            <span>
              <IconButton
                onClick={() => handleReaction(reaction.emoji)}
                disabled={disabled || isOnCooldown}
                sx={{
                  width: 40,
                  height: 40,
                  fontSize: '1.3rem',
                  borderRadius: 2,
                  background: isOnCooldown
                    ? 'rgba(156, 163, 175, 0.1)'
                    : 'linear-gradient(135deg, rgba(126, 200, 227, 0.1) 0%, rgba(168, 230, 207, 0.1) 100%)',
                  border: '1px solid',
                  borderColor: isOnCooldown
                    ? 'rgba(156, 163, 175, 0.2)'
                    : 'rgba(126, 200, 227, 0.3)',
                  transition: 'all 0.2s ease',
                  filter: isOnCooldown ? 'grayscale(0.7)' : 'none',
                  opacity: isOnCooldown ? 0.5 : 1,
                  '&:hover:not(:disabled)': {
                    background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.2) 0%, rgba(168, 230, 207, 0.2) 100%)',
                    borderColor: 'rgba(126, 200, 227, 0.5)',
                    transform: 'scale(1.1)',
                  },
                  '&:active:not(:disabled)': {
                    transform: 'scale(0.95)',
                  },
                }}
              >
                {reaction.emoji}
              </IconButton>
            </span>
          </Tooltip>
        ))}
      </Box>

      {/* Cooldown progress bar + countdown */}
      {isOnCooldown && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 0.5 }}>
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(126, 200, 227, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                background: 'linear-gradient(90deg, #7ec8e3 0%, #a8e6cf 100%)',
                transition: 'transform 0.1s linear',
              },
            }}
          />
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#7ec8e3',
              minWidth: 24,
              textAlign: 'right',
            }}
          >
            {remainingSeconds}s
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default GameReactions;
