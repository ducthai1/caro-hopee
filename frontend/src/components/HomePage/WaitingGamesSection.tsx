/**
 * WaitingGamesSection - Section displaying available games to join
 */
import React from 'react';
import { Box, Typography, Paper, Skeleton } from '@mui/material';
import { useLanguage } from '../../i18n';
import GameCard from '../GameCard/GameCard';
import { WaitingGame } from './home-page-types';

interface WaitingGamesSectionProps {
  waitingGames: WaitingGame[];
  loadingGames: boolean;
  joiningGameId: string | null;
  mountedGamesRef: React.MutableRefObject<Set<string>>;
  onJoin: (game: WaitingGame) => void;
}

const WaitingGamesSection: React.FC<WaitingGamesSectionProps> = ({
  waitingGames,
  loadingGames,
  joiningGameId,
  mountedGamesRef,
  onJoin,
}) => {
  const { t } = useLanguage();

  return (
    <Box
      sx={{
        maxWidth: '1200px',
        mx: 'auto',
        contain: 'layout style paint',
        transform: 'translateZ(0)',
      }}
    >
      {/* Section Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 1 }}>
          <Typography
            component="span"
            sx={{
              fontSize: { xs: '1.5rem', md: '1.75rem' },
              lineHeight: 1,
            }}
          >
            🎮
          </Typography>
          <Typography
            variant="h4"
            sx={{
              background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 800,
              fontSize: { xs: '1.5rem', md: '2rem' },
              m: 0,
            }}
          >
            {t('home.availableGames')}
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ color: '#5a6a7a', fontSize: '0.95rem', fontWeight: 500 }}>
          {t('home.joinGameSubtitle')}
        </Typography>
      </Box>

      {/* Games Container */}
      <Box
        sx={{
          minHeight: 200,
          contain: 'layout paint',
        }}
      >
        {loadingGames ? (
          <LoadingSkeleton />
        ) : waitingGames.length === 0 ? (
          <EmptyState t={t} />
        ) : (
          <GamesGrid
            games={waitingGames}
            joiningGameId={joiningGameId}
            mountedGamesRef={mountedGamesRef}
            onJoin={onJoin}
          />
        )}
      </Box>
    </Box>
  );
};

// Loading skeleton component
const LoadingSkeleton: React.FC = () => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
      gap: 2.5,
    }}
  >
    {[1, 2, 3, 4].map((i) => (
      <Paper
        key={i}
        elevation={0}
        sx={{
          p: 3,
          bgcolor: '#ffffff',
          border: '1px solid rgba(126, 200, 227, 0.2)',
          borderRadius: 3,
          boxShadow: '0 4px 16px rgba(126, 200, 227, 0.1)',
        }}
      >
        <Skeleton variant="text" width="60%" height={40} sx={{ mb: 1.5 }} />
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <Skeleton variant="rounded" width={60} height={24} />
          <Skeleton variant="rounded" width={80} height={24} />
        </Box>
        <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2.5 }} />
        <Skeleton variant="rounded" width="100%" height={42} />
      </Paper>
    ))}
  </Box>
);

// Empty state component
interface EmptyStateProps {
  t: (key: string) => string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ t }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
      gap: 2.5,
    }}
  >
    <Paper
      elevation={0}
      sx={{
        p: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#ffffff',
        border: '1px solid rgba(126, 200, 227, 0.2)',
        borderRadius: 3,
        boxShadow: '0 4px 16px rgba(126, 200, 227, 0.1)',
        gridColumn: { xs: '1', sm: '1 / -1' },
        minHeight: 158,
      }}
    >
      <Typography variant="body1" sx={{ color: '#5a6a7a', fontSize: '1rem', textAlign: 'center' }}>
        {t('home.noGamesAvailable')}
      </Typography>
    </Paper>
  </Box>
);

// Games grid component
interface GamesGridProps {
  games: WaitingGame[];
  joiningGameId: string | null;
  mountedGamesRef: React.MutableRefObject<Set<string>>;
  onJoin: (game: WaitingGame) => void;
}

const GamesGrid: React.FC<GamesGridProps> = ({ games, joiningGameId, mountedGamesRef, onJoin }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
      gap: 2.5,
    }}
  >
    {games.map((game) => {
      const isNewGame = !mountedGamesRef.current.has(game.roomId);
      return (
        <GameCard
          key={game.roomId}
          game={game}
          isNewGame={isNewGame}
          joiningGameId={joiningGameId}
          onJoin={onJoin}
        />
      );
    })}
  </Box>
);

export default WaitingGamesSection;
