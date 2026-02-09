/**
 * WordChainWordHistory - Scrollable chat-bubble word history.
 * Own words right-aligned, others left-aligned.
 */
import React, { useRef, useEffect } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { WordEntry } from '../word-chain-types';
import { PLAYER_COLORS } from './WordChainPlayerBar';
import { useLanguage } from '../../../i18n';

interface Props {
  wordChain: WordEntry[];
  mySlot: number | null;
  currentWord: string;
}

const REJECTION_LABELS: Record<string, string> = {
  not_in_dictionary: 'wordChain.game.notInDict',
  wrong_type: 'wordChain.game.wrongType',
  wrong_chain: 'wordChain.game.wrongChain',
  already_used: 'wordChain.game.alreadyUsed',
};

export const WordChainWordHistory: React.FC<Props> = ({ wordChain, mySlot, currentWord }) => {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [wordChain.length]);

  return (
    <Box
      ref={scrollRef}
      sx={{
        flex: 1,
        overflowY: 'auto',
        px: { xs: 2, sm: 3, md: 6 },
        py: { xs: 1, md: 2 },
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 0.75, md: 1 },
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 2 },
      }}
    >
      {wordChain.map((entry, idx) => {
        const isSystem = entry.playerSlot === 0;
        const isMine = entry.playerSlot === mySlot;
        const color = isSystem ? '#95a5a6' : PLAYER_COLORS[(entry.playerSlot - 1) % PLAYER_COLORS.length];
        const isRejected = !entry.accepted;

        if (isSystem) {
          // System message (first word)
          return (
            <Box key={idx} sx={{ textAlign: 'center', my: 0.5 }}>
              <Chip
                label={`${t('wordChain.game.firstWord')}: ${entry.word}`}
                size="small"
                sx={{
                  bgcolor: 'rgba(46, 204, 113, 0.1)',
                  color: '#27ae60',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              />
            </Box>
          );
        }

        return (
          <Box
            key={idx}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isMine ? 'flex-end' : 'flex-start',
            }}
          >
            {/* Player name */}
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.65rem',
                px: 1,
                mb: 0.25,
              }}
            >
              {entry.playerName}
            </Typography>

            {/* Word bubble */}
            <Box
              sx={{
                maxWidth: '80%',
                px: 1.5,
                py: 0.75,
                borderRadius: isMine ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                bgcolor: isRejected
                  ? 'rgba(231, 76, 60, 0.1)'
                  : isMine
                    ? `${color}18`
                    : 'rgba(0,0,0,0.04)',
                border: '1px solid',
                borderColor: isRejected
                  ? 'rgba(231, 76, 60, 0.3)'
                  : `${color}30`,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: isRejected ? '#e74c3c' : 'text.primary',
                  textDecoration: isRejected ? 'line-through' : 'none',
                }}
              >
                {entry.word}
              </Typography>
              {isRejected && entry.reason && (
                <Typography variant="caption" sx={{ color: '#e74c3c', fontSize: '0.7rem' }}>
                  {t(REJECTION_LABELS[entry.reason] || 'wordChain.game.invalid')}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}

      {/* Current word hint at bottom */}
      {currentWord && (
        <Box sx={{ textAlign: 'center', mt: 1, mb: 0.5 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {t('wordChain.game.currentWord')}:{' '}
            <Typography component="span" sx={{ fontWeight: 700, color: '#2ecc71' }}>
              {currentWord}
            </Typography>
          </Typography>
        </Box>
      )}
    </Box>
  );
};
