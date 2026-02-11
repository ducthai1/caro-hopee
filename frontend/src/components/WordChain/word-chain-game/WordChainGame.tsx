/**
 * WordChainGame - Main game view.
 * Desktop: centered card with max-width, proper spacing.
 * Mobile: full-width edge-to-edge.
 */
import React, { useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useWordChain } from '../WordChainContext';
import { WordChainTimer } from './WordChainTimer';
import { WordChainPlayerBar } from './WordChainPlayerBar';
import { WordChainWordHistory } from './WordChainWordHistory';
import { WordChainInput } from './WordChainInput';
import { WordChainResultModal } from './WordChainResult';
import { GameReactions, ReactionPopup } from '../../GameReactions';
import { useLanguage } from '../../../i18n';
import GuestNameDialog from '../../GuestNameDialog/GuestNameDialog';
import { useAuth } from '../../../contexts/AuthContext';

export const WordChainGame: React.FC = () => {
  const { t } = useLanguage();
  const { state, updateGuestName, sendReaction, clearReaction } = useWordChain();
  const { isAuthenticated } = useAuth();
  const [showGuestNameDialog, setShowGuestNameDialog] = useState(false);

  const handleGuestNameUpdated = (newName: string) => {
    const currentName = state.players.find(p => p.slot === state.mySlot)?.guestName;
    if (newName && newName !== currentName) {
      updateGuestName(newName);
    }
    setShowGuestNameDialog(false);
  };

  // Get last syllable for hint display
  const lastSyllable = state.currentWord
    ? state.currentWord.split(' ').pop() || ''
    : '';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
        bgcolor: '#fafbfc',
        width: '100%',
      }}
    >
      {/* Player Bar - top */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 0,
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          bgcolor: '#fff',
          flexShrink: 0,
          pt: { xs: '96px', md: 0 },
        }}
      >
        <WordChainPlayerBar
          players={state.players}
          currentPlayerSlot={state.currentPlayerSlot}
          mySlot={state.mySlot}
          onEditName={!isAuthenticated ? () => setShowGuestNameDialog(true) : undefined}
        />
      </Paper>

      {/* Timer + Current Word + Hint */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: { xs: 1, sm: 2, md: 2.5 },
          px: { xs: 2, sm: 4, md: 6 },
          bgcolor: '#fff',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <Box sx={{ position: 'absolute', left: { xs: 12, sm: 24, md: 32 }, top: '50%', transform: 'translateY(-50%)' }}>
          <WordChainTimer
            turnStartedAt={state.turnStartedAt}
            turnDuration={state.turnDuration}
            isActive={state.gameStatus === 'playing'}
          />
        </Box>

        <Box sx={{ textAlign: 'center', minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {t('wordChain.game.currentWord')}
          </Typography>
          <Typography
            sx={{
              fontWeight: 800,
              color: '#2ecc71',
              lineHeight: 1.2,
              mb: 0.25,
              fontSize: { xs: '1.1rem', sm: '1.5rem', md: '1.75rem' },
            }}
          >
            {state.currentWord || '...'}
          </Typography>
          {lastSyllable && (
            <Typography
              variant="body2"
              sx={{
                color: '#f39c12',
                fontWeight: 600,
                bgcolor: 'rgba(243, 156, 18, 0.08)',
                px: 1.5,
                py: 0.25,
                borderRadius: 2,
                display: 'inline-block',
                fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.95rem' },
              }}
            >
              {t('wordChain.game.chainWith')}: "{lastSyllable}..."
            </Typography>
          )}
        </Box>

        {/* Reactions - desktop: absolute right mirroring timer */}
        <Box sx={{
          position: 'absolute',
          right: { xs: 8, sm: 24, md: 32 },
          top: '50%',
          transform: 'translateY(-50%)',
          display: { xs: 'none', sm: 'block' },
        }}>
          <GameReactions
            onSendReaction={sendReaction}
            disabled={state.gameStatus !== 'playing'}
          />
        </Box>
      </Box>

      {/* Reactions - mobile: compact strip below header */}
      <Box sx={{
        display: { xs: 'flex', sm: 'none' },
        justifyContent: 'center',
        py: 0.5,
        px: 1,
        bgcolor: '#fff',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        flexShrink: 0,
      }}>
        <GameReactions
          onSendReaction={sendReaction}
          disabled={state.gameStatus !== 'playing'}
        />
      </Box>

      {/* Word History - flex grow, scrollable */}
      <WordChainWordHistory
        wordChain={state.wordChain}
        mySlot={state.mySlot}
        currentWord={state.currentWord}
      />

      {/* Input - bottom, fixed */}
      <Box sx={{ flexShrink: 0 }}>
        <WordChainInput />
      </Box>

      {/* Reaction Popups */}
      {state.reactions.map((reaction) => {
        let position: 'left' | 'right' | 'center' = 'center';
        if (state.reactions.length > 1) {
          position = reaction.isSelf ? 'left' : 'right';
        }
        return (
          <ReactionPopup
            key={reaction.id}
            emoji={reaction.emoji}
            fromName={reaction.fromName}
            onDismiss={() => clearReaction(reaction.id)}
            position={position}
            isSelf={reaction.isSelf}
          />
        );
      })}

      {/* Result modal overlay */}
      {state.showResult && <WordChainResultModal />}

      {/* Guest Name Dialog */}
      <GuestNameDialog
        open={showGuestNameDialog}
        onClose={handleGuestNameUpdated}
        initialName={state.players.find(p => p.slot === state.mySlot)?.guestName || ''}
      />
    </Box>
  );
};
