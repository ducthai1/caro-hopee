/**
 * TinhTuyChat — Chat components for Tinh Tuy game.
 * - TinhTuyChat: Full panel chat (used in-game right panel)
 * - TinhTuyChatButton: Icon button + popover input (used in waiting room)
 * - TinhTuyFloatingMessage: Danmaku-style fly-up message
 * - TinhTuyChatOverlay: Container for floating messages
 */
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  Box, TextField, IconButton, Typography, Paper, Popover, InputAdornment, Tooltip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { PLAYER_COLORS, ChatMessage } from '../tinh-tuy-types';

const MAX_MSG_LEN = 200;
const CHAT_COOLDOWN_MS = 3000;
const FLOAT_DURATION_MS = 5000;

// ─── Inject CSS keyframes once ──────────────────────────
const ANIMATION_NAME = 'tt-chat-float-up';
if (typeof document !== 'undefined' && !document.getElementById('tt-chat-keyframes')) {
  const style = document.createElement('style');
  style.id = 'tt-chat-keyframes';
  style.textContent = `
    @keyframes ${ANIMATION_NAME} {
      0% { opacity: 0; transform: translateY(10px); }
      8% { opacity: 1; transform: translateY(0); }
      75% { opacity: 1; transform: translateY(-40px); }
      100% { opacity: 0; transform: translateY(-55px); }
    }
    .tt-chat-overlay {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      pointer-events: none;
      z-index: 1200;
      isolation: isolate;
    }
    @media (min-width: 900px) {
      .tt-chat-overlay {
        left: var(--sidebar-width, 0px);
      }
    }
  `;
  document.head.appendChild(style);
}

// ─── Full Panel Chat (in-game) ──────────────────────────
export const TinhTuyChat: React.FC = () => {
  const { t } = useLanguage();
  const { state, sendChat } = useTinhTuy();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.chatMessages.length]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg) return;
    sendChat(msg.slice(0, MAX_MSG_LEN));
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'rgba(155,89,182,0.08)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#9b59b6' }}>
          {t('tinhTuy.game.chat' as any)}
        </Typography>
      </Box>
      <Box
        ref={scrollRef}
        sx={{
          flex: 1, minHeight: 0, overflowY: 'auto', p: 1, display: 'flex', flexDirection: 'column', gap: 0.5,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.15)', borderRadius: 2 },
        }}
      >
        {state.chatMessages.length === 0 ? (
          <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center', mt: 2 }}>
            {t('tinhTuy.game.noMessages' as any)}
          </Typography>
        ) : (
          state.chatMessages.map((msg, i) => {
            const player = state.players.find(p => p.slot === msg.slot);
            const color = PLAYER_COLORS[msg.slot] || '#999';
            return (
              <Box key={i} sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color, flexShrink: 0 }}>
                  {player?.displayName || `P${msg.slot}`}:
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.primary', wordBreak: 'break-word' }}>
                  {msg.message}
                </Typography>
              </Box>
            );
          })
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, p: 0.75, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <TextField
          size="small"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_MSG_LEN))}
          onKeyDown={handleKeyDown}
          placeholder={t('tinhTuy.game.chatPlaceholder' as any)}
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.75rem' },
            '& .MuiOutlinedInput-input': { py: 0.75 },
          }}
        />
        <IconButton
          size="small"
          onClick={handleSend}
          disabled={!input.trim()}
          sx={{ color: '#9b59b6' }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};

// ─── Chat Button + Popover (waiting room) ───────────────
export const TinhTuyChatButton: React.FC<{ onSend: (msg: string) => void }> = ({ onSend }) => {
  const { t } = useLanguage();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [message, setMessage] = useState('');
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
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
    if (!trimmed || Date.now() < cooldownEnd) return;
    onSend(trimmed.slice(0, MAX_MSG_LEN));
    setMessage('');
    setCooldownEnd(Date.now() + CHAT_COOLDOWN_MS);
  }, [message, cooldownEnd, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <>
      <Tooltip title={t('tinhTuy.game.chat' as any)} placement="top" arrow>
        <IconButton
          onClick={handleToggle}
          sx={{
            width: 40, height: 40, borderRadius: 2,
            background: open
              ? 'linear-gradient(135deg, rgba(155,89,182,0.25) 0%, rgba(142,68,173,0.25) 100%)'
              : 'linear-gradient(135deg, rgba(155,89,182,0.1) 0%, rgba(142,68,173,0.1) 100%)',
            border: '1px solid',
            borderColor: open ? 'rgba(155,89,182,0.5)' : 'rgba(155,89,182,0.3)',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(155,89,182,0.2) 0%, rgba(142,68,173,0.2) 100%)',
              borderColor: 'rgba(155,89,182,0.5)',
              transform: 'scale(1.1)',
            },
          }}
        >
          <ChatBubbleOutlineIcon sx={{ fontSize: '1.2rem', color: '#9b59b6' }} />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        disableScrollLock
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1, p: 1, borderRadius: 3,
              background: 'rgba(255,255,255,0.97)',
              border: '1px solid rgba(155,89,182,0.2)',
              boxShadow: '0 4px 20px rgba(155,89,182,0.15)',
              width: 260,
            },
          },
        }}
      >
        <TextField
          inputRef={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_MSG_LEN))}
          onKeyDown={handleKeyDown}
          placeholder={t('tinhTuy.game.chatPlaceholder' as any)}
          size="small"
          fullWidth
          autoComplete="off"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleSend}
                    disabled={!message.trim() || Date.now() < cooldownEnd}
                    size="small"
                    sx={{ color: '#9b59b6' }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2, fontSize: '0.875rem',
                '& fieldset': { borderColor: 'rgba(155,89,182,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(155,89,182,0.5) !important' },
                '&.Mui-focused fieldset': { borderColor: '#9b59b6 !important' },
              },
            },
          }}
        />
      </Popover>
    </>
  );
};

// ─── Floating Chat Message (danmaku-style) ──────────────
interface FloatingMessageProps {
  msg: ChatMessage & { displayName?: string; isSelf?: boolean };
  msgKey: string;
  onDismiss: () => void;
}

const FloatingMessageInner: React.FC<FloatingMessageProps> = ({ msg, msgKey, onDismiss }) => {
  const color = PLAYER_COLORS[msg.slot] || '#999';
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const stagger = React.useMemo(() => {
    const hash = msgKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return hash % 5;
  }, [msgKey]);

  useEffect(() => {
    const timer = setTimeout(() => onDismissRef.current(), FLOAT_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${50 + stagger * 6}%`,
    ...(msg.isSelf
      ? { right: '25%', left: 'auto' }
      : { left: '25%', right: 'auto' }),
    zIndex: 1200,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: `1px solid ${color}33`,
    animation: `${ANIMATION_NAME} ${FLOAT_DURATION_MS}ms linear forwards`,
    pointerEvents: 'none',
    maxWidth: '70vw',
  };

  return (
    <div style={style}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color, flexShrink: 0, whiteSpace: 'nowrap' }}>
        {msg.displayName || `P${msg.slot}`}
      </span>
      <span style={{ fontSize: '0.85rem', color: '#2c3e50', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {msg.message}
      </span>
    </div>
  );
};

export const TinhTuyFloatingMessage = memo(FloatingMessageInner, (prev, next) => {
  return prev.msgKey === next.msgKey;
});
TinhTuyFloatingMessage.displayName = 'TinhTuyFloatingMessage';

// ─── Chat Overlay Container ─────────────────────────────
export const TinhTuyChatOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="tt-chat-overlay">{children}</div>
);
