/**
 * ReactionPopup - Floating popup showing reaction
 * Displays emoji with bounce animation, auto-dismisses after duration
 * No background - just emoji and text with shadow for visibility
 */
import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Grow, keyframes } from '@mui/material';
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

// Bounce animation keyframes
const bounceIn = keyframes`
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`;

const ReactionPopup: React.FC<ReactionPopupProps> = ({
  emoji,
  fromName,
  onDismiss,
  position = 'center',
  isSelf = false
}) => {
  const [visible, setVisible] = useState(true);

  // Use ref to avoid re-triggering timers when onDismiss reference changes
  // (inline arrow from parent creates new ref every render → timer restart loop)
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
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
  const getPositionStyles = () => {
    switch (position) {
      case 'left':
        return { left: '35%', transform: 'translate(-50%, -50%)' };
      case 'right':
        return { left: '65%', transform: 'translate(-50%, -50%)' };
      default:
        return { left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  const posStyles = getPositionStyles();

  return (
    <Grow in={visible} timeout={300}>
      <Box
        sx={{
          position: 'fixed',
          top: '45%',
          left: posStyles.left,
          transform: posStyles.transform,
          zIndex: 1300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          p: 1,
          // No background - just content with text shadow for visibility
        }}
      >
        {/* Emoji with bounce animation */}
        <Box
          sx={{
            fontSize: { xs: '3.5rem', sm: '4.5rem' },
            lineHeight: 1,
            animation: `${bounceIn} 0.5s ease-out, ${pulse} 2s ease-in-out 0.5s infinite`,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
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
    </Grow>
  );
};

export default ReactionPopup;
