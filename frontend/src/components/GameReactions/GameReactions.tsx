/**
 * GameReactions - Emoji reaction buttons with cooldown timer.
 * Desktop (compact=false): full grid of all reactions.
 * Mobile (compact=true): inline row of first N emojis + "more" button → Dialog with all.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  IconButton,
  LinearProgress,
  Typography,
  Tooltip,
  Dialog,
  DialogContent,
  Slide,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { useLanguage } from '../../i18n';
import { REACTIONS, REACTION_COOLDOWN_MS, COMPACT_REACTION_COUNT } from '../../constants/reactions';

interface GameReactionsProps {
  onSendReaction: (emoji: string) => void;
  disabled?: boolean;
  /** Compact mode: inline row + "more" dialog (for mobile) */
  compact?: boolean;
}

// Slide-up transition for mobile dialog
const SlideUp = React.forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// ─── Shared emoji button style ──────────────────────────────────

const emojiButtonSx = (isOnCooldown: boolean, size: number = 40, fontSize: string = '1.3rem') => ({
  width: size,
  height: size,
  fontSize,
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
});

const GameReactions: React.FC<GameReactionsProps> = ({ onSendReaction, disabled = false, compact = false }) => {
  const { language } = useLanguage();
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  const isOnCooldown = cooldownEnd !== null && remainingMs > 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progressValue = isOnCooldown ? (remainingMs / REACTION_COOLDOWN_MS) * 100 : 0;

  useEffect(() => {
    if (!cooldownEnd) return;
    const interval = setInterval(() => {
      const left = Math.max(0, cooldownEnd - Date.now());
      setRemainingMs(left);
      if (left <= 0) setCooldownEnd(null);
    }, 100);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const handleReaction = useCallback((emoji: string) => {
    if (disabled || isOnCooldown) return;
    onSendReaction(emoji);
    setCooldownEnd(Date.now() + REACTION_COOLDOWN_MS);
    setRemainingMs(REACTION_COOLDOWN_MS);
    setMoreOpen(false);
  }, [disabled, isOnCooldown, onSendReaction]);

  // ─── Compact mode (mobile) ────────────────────────────────
  if (compact) {
    const visibleReactions = REACTIONS.slice(0, COMPACT_REACTION_COUNT);

    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {visibleReactions.map((reaction) => (
            <IconButton
              key={reaction.id}
              onClick={() => handleReaction(reaction.emoji)}
              disabled={disabled || isOnCooldown}
              sx={emojiButtonSx(isOnCooldown, 34, '1.1rem')}
            >
              {reaction.emoji}
            </IconButton>
          ))}
          {/* "More" button */}
          <IconButton
            onClick={() => setMoreOpen(true)}
            disabled={disabled || isOnCooldown}
            sx={{
              ...emojiButtonSx(isOnCooldown, 34, '1.1rem'),
              color: '#7ec8e3',
            }}
          >
            <MoreHorizIcon sx={{ fontSize: '1.2rem' }} />
          </IconButton>

          {/* Cooldown indicator — small circular */}
          {isOnCooldown && (
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#7ec8e3',
                ml: 0.25,
              }}
            >
              {remainingSeconds}s
            </Typography>
          )}
        </Box>

        {/* Full reactions dialog (bottom sheet) */}
        <Dialog
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          TransitionComponent={SlideUp}
          PaperProps={{
            sx: {
              position: 'fixed',
              bottom: 0,
              m: 0,
              borderRadius: '16px 16px 0 0',
              width: '100%',
              maxWidth: '100%',
              maxHeight: '50vh',
              background: 'rgba(255, 255, 255, 0.97)',
              backdropFilter: 'blur(10px)',
            },
          }}
        >
          <DialogContent sx={{ p: 2 }}>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              justifyItems: 'center',
            }}>
              {REACTIONS.map((reaction) => (
                <Tooltip key={reaction.id} title={reaction.label[language]} placement="top" arrow>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                    <IconButton
                      onClick={() => handleReaction(reaction.emoji)}
                      disabled={disabled || isOnCooldown}
                      sx={emojiButtonSx(isOnCooldown, 48, '1.5rem')}
                    >
                      {reaction.emoji}
                    </IconButton>
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', textAlign: 'center' }}>
                      {reaction.label[language]}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </Box>

            {isOnCooldown && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, px: 0.5 }}>
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
                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, color: '#7ec8e3' }}>
                  {remainingSeconds}s
                </Typography>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ─── Full mode (desktop) ──────────────────────────────────
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
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
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
                sx={emojiButtonSx(isOnCooldown)}
              >
                {reaction.emoji}
              </IconButton>
            </span>
          </Tooltip>
        ))}
      </Box>

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
