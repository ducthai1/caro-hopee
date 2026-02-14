/**
 * TinhTuyChat — Simple chat panel for in-game messaging.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Typography, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { PLAYER_COLORS } from '../tinh-tuy-types';

const MAX_MSG_LEN = 200;

export const TinhTuyChat: React.FC = () => {
  const { t } = useLanguage();
  const { state, sendChat } = useTinhTuy();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
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
    <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 240 }}>
      {/* Header */}
      <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'rgba(155,89,182,0.08)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#9b59b6' }}>
          {t('tinhTuy.game.chat' as any)}
        </Typography>
      </Box>

      {/* Messages */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1, overflowY: 'auto', p: 1, display: 'flex', flexDirection: 'column', gap: 0.5,
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

      {/* Input */}
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
