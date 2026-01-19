import React, { memo, useCallback } from 'react';
import { Paper, Box, Typography, Chip, Button, CircularProgress, Tooltip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { formatRelativeTime } from '../../utils/timeFormat';
import { useLanguage } from '../../i18n';

/**
 * GameCard - Optimized for INP performance
 *
 * Performance fixes applied:
 * 1. Removed backdropFilter (expensive GPU operation)
 * 2. Changed transition from 'all' to specific properties
 * 3. Removed Fade animation (causes layout recalculation)
 * 4. Removed willChange on static elements
 * 5. Simplified conditional styles
 */

interface WaitingGame {
  _id: string;
  roomId: string;
  roomCode: string;
  boardSize: number;
  gameStatus: string;
  displayStatus?: 'waiting' | 'ready' | 'playing';
  statusLabel?: string;
  canJoin?: boolean;
  hasPlayer1: boolean;
  hasPlayer2: boolean;
  playerCount?: number;
  player1Username: string | null;
  hasPassword?: boolean; // Indicates if game has password
  createdAt: string;
}

interface GameCardProps {
  game: WaitingGame;
  isNewGame: boolean;
  joiningGameId: string | null;
  onJoin: (game: WaitingGame) => void;
}

// Pre-computed styles for status chips (avoid recalculation)
const STATUS_STYLES = {
  playing: {
    bgcolor: 'rgba(255, 152, 0, 0.2)',
    color: '#ff9800',
    border: '1px solid rgba(255, 152, 0, 0.3)',
  },
  ready: {
    bgcolor: 'rgba(76, 175, 80, 0.2)',
    color: '#4caf50',
    border: '1px solid rgba(76, 175, 80, 0.3)',
  },
  waiting: {
    bgcolor: 'rgba(33, 150, 243, 0.2)',
    color: '#2196f3',
    border: '1px solid rgba(33, 150, 243, 0.3)',
  },
} as const;

const GameCard: React.FC<GameCardProps> = memo(({ game, joiningGameId, onJoin }) => {
  const { t, language } = useLanguage();
  const canJoin = game.canJoin !== false;
  const isJoining = joiningGameId === game.roomId;
  const statusStyle = STATUS_STYLES[game.displayStatus || 'waiting'];

  const handleClick = useCallback((): void => {
    if (canJoin && !isJoining) {
      onJoin(game);
    }
  }, [canJoin, isJoining, onJoin, game]);

  const handleButtonClick = useCallback((e: React.MouseEvent): void => {
    e.stopPropagation();
    if (canJoin && !isJoining) {
      onJoin(game);
    }
  }, [canJoin, isJoining, onJoin, game]);

  return (
    <Paper
      elevation={0}
      onClick={handleClick}
      sx={{
        p: 3,
        bgcolor: '#ffffff',
        border: '1px solid rgba(126, 200, 227, 0.2)',
        borderRadius: 3,
        boxShadow: '0 4px 16px rgba(126, 200, 227, 0.1)',
        // Specific transitions instead of 'all' - much faster
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: canJoin ? 'pointer' : 'not-allowed',
        opacity: canJoin ? 1 : 0.7,
        // CSS containment for paint isolation + compositor layer
        contain: 'layout style',
        // Hint browser this element will animate (only on hover-capable devices)
        '@media (hover: hover)': {
          willChange: 'transform',
        },
        '&:hover': canJoin ? {
          boxShadow: '0 8px 24px rgba(126, 200, 227, 0.2)',
          transform: 'translateY(-4px)',
          borderColor: 'rgba(126, 200, 227, 0.4)',
        } : {},
      }}
    >
      <Box sx={{ mb: 2.5 }}>
        <Typography
          variant="h5"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 800,
            letterSpacing: 2,
            background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '1.75rem',
            mb: 1.5,
          }}
        >
          {game.roomCode}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5, alignItems: 'center' }}>
          <Chip
            label={`${game.boardSize}x${game.boardSize}`}
            size="small"
            sx={{
              bgcolor: 'rgba(126, 200, 227, 0.15)',
              color: '#7ec8e3',
              fontWeight: 600,
              fontSize: '0.75rem',
              height: 24,
            }}
          />
          <Chip
            label={game.statusLabel || (game.hasPlayer1 && !game.hasPlayer2 ? '1/2 Players' : 'Waiting')}
            size="small"
            sx={{
              ...statusStyle,
              fontWeight: 700,
              fontSize: '0.75rem',
              height: 24,
            }}
          />
          {game.hasPassword && (
            <Tooltip title={t('game.gamePasswordProtected') || 'Password Protected'} arrow>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255, 152, 0, 0.15)',
                  color: '#ff9800',
                }}
              >
                <LockIcon sx={{ fontSize: '0.875rem' }} />
              </Box>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {game.player1Username && (
            <Typography variant="caption" sx={{ color: '#5a6a7a', fontSize: '0.8rem' }}>
              {t('game.host')}: {game.player1Username}
            </Typography>
          )}
          <Typography
            variant="caption"
            sx={{
              color: '#8a9ba8',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <AccessTimeIcon sx={{ fontSize: '0.875rem' }} />
            {formatRelativeTime(game.createdAt, t, language)}
          </Typography>
        </Box>
      </Box>
      <Button
        variant="contained"
        fullWidth
        disabled={isJoining || !canJoin}
        onClick={handleButtonClick}
        sx={{
          py: 1.25,
          borderRadius: 2.5,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.9rem',
          // Fixed height to prevent layout shift
          minHeight: 42,
          background: canJoin
            ? 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)'
            : 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)',
          boxShadow: canJoin ? '0 4px 12px rgba(126, 200, 227, 0.3)' : 'none',
          // Specific transition
          transition: 'background 0.2s ease, box-shadow 0.2s ease',
          '&:hover': canJoin ? {
            background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
            boxShadow: '0 6px 16px rgba(126, 200, 227, 0.4)',
          } : {},
        }}
      >
        {isJoining ? (
          <>
            <CircularProgress size={16} sx={{ mr: 1, color: '#ffffff' }} />
            {t('home.joining')}
          </>
        ) : !canJoin ? (
          game.displayStatus === 'playing' ? t('gameCard.playing') : t('gameCard.full') + ' (2/2)'
        ) : (
          t('gameCard.joinGame')
        )}
      </Button>
    </Paper>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - skip isNewGame since we removed Fade animation
  return (
    prevProps.game.roomId === nextProps.game.roomId &&
    prevProps.game.displayStatus === nextProps.game.displayStatus &&
    prevProps.game.canJoin === nextProps.game.canJoin &&
    prevProps.game.statusLabel === nextProps.game.statusLabel &&
    prevProps.game.hasPassword === nextProps.game.hasPassword &&
    prevProps.joiningGameId === nextProps.joiningGameId
  );
});

GameCard.displayName = 'GameCard';

export default GameCard;
export type { WaitingGame };
