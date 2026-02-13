/**
 * ReactionPopup - Floating popup showing reaction
 * Displays emoji with opacity fade-in, auto-dismisses after duration.
 * No background - just emoji and text with shadow for visibility.
 *
 * PERF FIX: Removed all transform-based animations (bounceIn, pulse) and
 * filter: drop-shadow(). Chrome promotes any element with transform/filter
 * animation to a GPU compositing layer. Multiple reactions with infinite
 * pulse + drop-shadow = GPU layer explosion → Chrome crash.
 * Now uses opacity-only animation (no GPU layer promotion).
 */
import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { REACTION_POPUP_DURATION_MS } from '../../constants/reactions';

interface ReactionPopupProps {
  emoji: string;
  fromName: string;
  onDismiss: () => void;
  /** Position: 'left' or 'right' to avoid overlap when both players react */
  position?: 'left' | 'right' | 'center';
  /** Whether this is the sender's own reaction */
  isSelf?: boolean;
}

const ReactionPopup: React.FC<ReactionPopupProps> = ({
  emoji,
  fromName,
  onDismiss,
  position = 'center',
  isSelf = false
}) => {
  const [visible, setVisible] = useState(false);

  // Use ref to avoid re-triggering timers when onDismiss reference changes
  // (inline arrow from parent creates new ref every render → timer restart loop)
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    // Trigger fade-in on next frame
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
    }, REACTION_POPUP_DURATION_MS - 300);

    const dismissTimer = setTimeout(() => {
      onDismissRef.current();
    }, REACTION_POPUP_DURATION_MS);

    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, []); // Empty deps - runs once, uses ref for latest onDismiss

  // Calculate horizontal position based on position prop
  // PERF FIX: Use margin-left offset instead of transform: translate() to avoid GPU layer
  const getLeftOffset = () => {
    switch (position) {
      case 'left': return '35%';
      case 'right': return '65%';
      default: return '50%';
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: '45%',
        left: getLeftOffset(),
        // PERF FIX: Use negative margin for centering instead of transform: translate()
        // transform creates GPU compositing layer in Chrome
        marginLeft: '-40px',
        marginTop: '-40px',
        width: 80,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        p: 1,
        // PERF FIX: opacity transition only — no transform, no filter
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Emoji — no animation, no filter (both create GPU compositing layers) */}
      <Box
        sx={{
          fontSize: { xs: '3.5rem', sm: '4.5rem' },
          lineHeight: 1,
          // PERF FIX: text-shadow instead of filter: drop-shadow()
          // drop-shadow forces GPU compositing layer per element
          textShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
      >
        {emoji}
      </Box>

      {/* From player name */}
      <Typography
        sx={{
          fontSize: '0.9rem',
          fontWeight: 700,
          color: isSelf ? '#7ec8e3' : '#2c3e50',
          textAlign: 'center',
          maxWidth: 150,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textShadow: '0 1px 4px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,1)',
        }}
      >
        {fromName}
      </Typography>
    </Box>
  );
};

export default ReactionPopup;
