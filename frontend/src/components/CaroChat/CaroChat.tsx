/**
 * CaroChat - Floating chat for Caro game.
 * ChatButton: icon + mini input popup.
 * FloatingChatMessage: fly-up danmaku-style animation.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  IconButton,
  TextField,
  Popover,
  Typography,
  keyframes,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SendIcon from '@mui/icons-material/Send';
import { useLanguage } from '../../i18n';
import { CaroChatMessage } from '../../contexts/GameContext';

// ─── Constants ──────────────────────────────────────────────────

const CHAT_COOLDOWN_MS = 3000;
const FLOAT_DURATION_MS = 5000;

// Player colors matching Caro theme
const PLAYER_COLORS: Record<1 | 2, string> = {
  1: '#7ec8e3',
  2: '#a8e6cf',
};

// ─── ChatButton ─────────────────────────────────────────────────

interface ChatButtonProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ onSend, disabled = false }) => {
  const { t } = useLanguage();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [message, setMessage] = useState('');
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOnCooldown = Date.now() < cooldownEnd;
  const open = Boolean(anchorEl);

  const handleToggle = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (open) {
      setAnchorEl(null);
    } else {
      setAnchorEl(e.currentTarget);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || disabled || Date.now() < cooldownEnd) return;

    onSend(trimmed);
    setMessage('');
    setCooldownEnd(Date.now() + CHAT_COOLDOWN_MS);
  }, [message, disabled, cooldownEnd, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <>
      <Tooltip title={t('game.chat.tooltip')} placement="top" arrow>
        <IconButton
          onClick={handleToggle}
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: open
              ? 'linear-gradient(135deg, rgba(126, 200, 227, 0.25) 0%, rgba(168, 230, 207, 0.25) 100%)'
              : 'linear-gradient(135deg, rgba(126, 200, 227, 0.1) 0%, rgba(168, 230, 207, 0.1) 100%)',
            border: '1px solid',
            borderColor: open ? 'rgba(126, 200, 227, 0.5)' : 'rgba(126, 200, 227, 0.3)',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.2) 0%, rgba(168, 230, 207, 0.2) 100%)',
              borderColor: 'rgba(126, 200, 227, 0.5)',
              transform: 'scale(1.1)',
            },
          }}
        >
          <ChatBubbleOutlineIcon sx={{ fontSize: '1.2rem', color: '#7ec8e3' }} />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        disableScrollLock
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              mb: 1,
              p: 1,
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(126, 200, 227, 0.2)',
              boxShadow: '0 4px 20px rgba(126, 200, 227, 0.15)',
              width: 260,
            },
          },
        }}
      >
        <TextField
          inputRef={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 100))}
          onKeyDown={handleKeyDown}
          placeholder={t('game.chat.placeholder')}
          size="small"
          fullWidth
          disabled={disabled}
          autoComplete="off"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleSend}
                    disabled={disabled || !message.trim() || isOnCooldown}
                    size="small"
                    sx={{ color: '#7ec8e3' }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                fontSize: '0.875rem',
                '& fieldset': { borderColor: 'rgba(126, 200, 227, 0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(126, 200, 227, 0.5) !important' },
                '&.Mui-focused fieldset': { borderColor: '#7ec8e3 !important' },
              },
            },
          }}
        />
      </Popover>
    </>
  );
};

// ─── FloatingChatMessage ────────────────────────────────────────

const floatUp = keyframes`
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  8% {
    opacity: 1;
    transform: translateY(0);
  }
  75% {
    opacity: 1;
    transform: translateY(-40px);
  }
  100% {
    opacity: 0;
    transform: translateY(-55px);
  }
`;

interface FloatingChatMessageProps {
  chat: CaroChatMessage;
  index: number;
  onDismiss: () => void;
}

export const FloatingChatMessage: React.FC<FloatingChatMessageProps> = ({ chat, index, onDismiss }) => {
  const color = PLAYER_COLORS[chat.fromPlayerNumber];
  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Stable stagger from message id so position doesn't shift when others are removed
  const stagger = React.useMemo(() => {
    const hash = chat.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return hash % 5;
  }, [chat.id]);
  const baseTop = 50 + (stagger * 6);

  React.useEffect(() => {
    const timer = setTimeout(() => onDismissRef.current(), FLOAT_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  // Position: self on right, opponent on left
  const positionSx = chat.isSelf
    ? { right: { xs: 12, sm: '20%' }, left: 'auto' }
    : { left: { xs: 12, sm: '20%' }, right: 'auto' };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: `${baseTop}%`,
        ...positionSx,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: 3,
        bgcolor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        border: `1px solid ${color}33`,
        animation: `${floatUp} ${FLOAT_DURATION_MS}ms linear forwards`,
        pointerEvents: 'none',
        maxWidth: '70vw',
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: color,
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontSize: { xs: '0.75rem', sm: '0.85rem' },
          fontWeight: 700,
          color,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {chat.fromName}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: '0.8rem', sm: '0.9rem' },
          color: '#2c3e50',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {chat.message}
      </Typography>
    </Box>
  );
};
