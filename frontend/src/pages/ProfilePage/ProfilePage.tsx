/**
 * ProfilePage - User profile with avatar, stats, and edit functionality
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n';
import { userApi } from '../../services/api';
import { User } from '../../types/user.types';
import { logger } from '../../utils/logger';
import {
  ProfileHeader,
  ProfileEditModal,
  PasswordChangeForm,
  ProfileRankBadge,
  ProfileDetailedStats,
  ProfileAchievements,
} from './components';

interface Streaks {
  currentWin: number;
  currentLoss: number;
  bestWin: number;
  bestLoss: number;
}

interface BoardSizeStats {
  wins: number;
  losses: number;
  draws: number;
}

interface GameStats {
  _id: string;
  gameId: string;
  gameName: string;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  customStats: any;
  streaks: Streaks;
  byBoardSize: Record<string, BoardSizeStats>;
  totalPlayTime: number;
  avgGameDuration: number;
  lastTenGames: ('W' | 'L' | 'D')[];
  lastPlayed: string;
  createdAt: string;
  updatedAt: string;
}

interface UserGamesData {
  userId: string;
  games: GameStats[];
  totalGames: number;
}

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { t, language } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Data state
  const [profile, setProfile] = useState<User | null>(null);
  const [gameStats, setGameStats] = useState<UserGamesData | null>(null);
  const [selectedGame, setSelectedGame] = useState<string>('caro');

  // Loading state
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const loadProfile = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      const userData = await userApi.getMyProfile();
      setProfile(userData);
    } catch (error) {
      logger.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadGameStats = useCallback(async (): Promise<void> => {
    if (!user) return;
    try {
      setStatsLoading(true);
      const data = await userApi.getUserGames(user._id);
      setGameStats(data);
    } catch (error) {
      logger.error('Failed to load game stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadGameStats();
    }
  }, [user, loadProfile, loadGameStats]);

  const handleGameTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    if (gameStats && gameStats.games[newValue]) {
      setSelectedGame(gameStats.games[newValue].gameId);
    }
  };

  const handleProfileUpdated = (updatedProfile: User) => {
    setProfile(updatedProfile);
    // Update auth context if needed
    if (refreshUser) {
      refreshUser();
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#5a6a7a' }}>
            {t('profile.loginRequired')}
          </Typography>
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <CircularProgress sx={{ color: '#7ec8e3' }} />
        </Box>
      </Container>
    );
  }

  const currentGameStats =
    gameStats?.games.find((g) => g.gameId === selectedGame) || null;

  // Calculate total score across all games for rank
  const totalScoreAllGames = gameStats?.games.reduce((sum, game) => sum + game.totalScore, 0) || 0;

  return (
    <>
      <Container 
        maxWidth="md" 
        sx={{ 
          py: { xs: 4, md: 6 },
          // Thêm padding-top trên mobile để tránh bị header đè lên
          pt: { xs: isMobile ? '80px' : 4, md: 6 },
        }}
      >
      {/* Page Title */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography
          variant="h3"
          gutterBottom
          sx={{
            background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 700,
            fontSize: { xs: '2rem', md: '3rem' },
            mb: 2,
          }}
        >
          {t('profile.title')}
        </Typography>
      </Box>

      {/* User Info Card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 5 },
          mb: 3,
          background: '#ffffff',
          border: '2px solid transparent',
          borderRadius: 4,
          backgroundImage:
            'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: '0 12px 40px rgba(126, 200, 227, 0.15)',
        }}
      >
        {profile && (
          <>
            <ProfileHeader
              profile={profile}
              onEditClick={() => setEditModalOpen(true)}
              totalScore={totalScoreAllGames}
            />

            {/* Change Password Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<LockIcon />}
                onClick={() => setPasswordModalOpen(true)}
                sx={{
                  borderColor: 'rgba(126, 200, 227, 0.5)',
                  color: '#5a6a7a',
                  '&:hover': {
                    borderColor: '#7ec8e3',
                    background: 'rgba(126, 200, 227, 0.1)',
                  },
                }}
              >
                {t('profile.changePassword')}
              </Button>
            </Box>
          </>
        )}
      </Paper>

      {/* Rank Badge */}
      {!statsLoading && totalScoreAllGames > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            mb: 3,
            background: '#ffffff',
            border: '2px solid transparent',
            borderRadius: 4,
            backgroundImage:
              'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 12px 40px rgba(126, 200, 227, 0.15)',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              mb: 3,
              color: '#2c3e50',
              fontWeight: 700,
              fontSize: '1.5rem',
            }}
          >
            {t('profile.yourRank')}
          </Typography>
          <ProfileRankBadge totalScore={totalScoreAllGames} />
        </Paper>
      )}

      {/* Game Stats */}
      {statsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#7ec8e3' }} />
        </Box>
      ) : gameStats && gameStats.games.length > 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            background: '#ffffff',
            border: '2px solid transparent',
            borderRadius: 4,
            backgroundImage:
              'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 12px 40px rgba(126, 200, 227, 0.15)',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              mb: 3,
              color: '#2c3e50',
              fontWeight: 700,
              fontSize: '1.5rem',
            }}
          >
            {t('profile.gameStats')}
          </Typography>

          {/* Game Tabs */}
          {gameStats.games.length > 1 && (
            <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={gameStats.games.findIndex((g) => g.gameId === selectedGame)}
                onChange={handleGameTabChange}
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                  },
                  '& .Mui-selected': {
                    color: '#7ec8e3',
                  },
                }}
              >
                {gameStats.games.map((game) => (
                  <Tab key={game.gameId} label={game.gameName || game.gameId} />
                ))}
              </Tabs>
            </Box>
          )}

          {/* Current Game Stats */}
          {currentGameStats ? (
            <Box>
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  color: '#2c3e50',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                }}
              >
                {currentGameStats.gameName ||
                  currentGameStats.gameId.toUpperCase()}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2.5,
                }}
              >
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: 'rgba(168, 230, 207, 0.1)',
                    border: '1px solid rgba(168, 230, 207, 0.3)',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: '#5a6a7a', mb: 0.5, fontWeight: 600 }}
                  >
                    {t('profile.wins')}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ color: '#a8e6cf', fontWeight: 700 }}
                  >
                    {currentGameStats.wins}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: 'rgba(255, 170, 165, 0.1)',
                    border: '1px solid rgba(255, 170, 165, 0.3)',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: '#5a6a7a', mb: 0.5, fontWeight: 600 }}
                  >
                    {t('profile.losses')}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ color: '#ffaaa5', fontWeight: 700 }}
                  >
                    {currentGameStats.losses}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: 'rgba(255, 184, 140, 0.1)',
                    border: '1px solid rgba(255, 184, 140, 0.3)',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: '#5a6a7a', mb: 0.5, fontWeight: 600 }}
                  >
                    {t('profile.draws')}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ color: '#ffb88c', fontWeight: 700 }}
                  >
                    {currentGameStats.draws}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: 'rgba(126, 200, 227, 0.1)',
                    border: '1px solid rgba(126, 200, 227, 0.3)',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: '#5a6a7a', mb: 0.5, fontWeight: 600 }}
                  >
                    {t('profile.totalScore')}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ color: '#7ec8e3', fontWeight: 700 }}
                  >
                    {currentGameStats.totalScore}
                  </Typography>
                </Box>
              </Box>
              {currentGameStats.lastPlayed && (
                <Typography
                  variant="caption"
                  sx={{ color: '#8a9ba8', mt: 2, display: 'block' }}
                >
                  {t('profile.lastPlayed')}:{' '}
                  {new Date(currentGameStats.lastPlayed).toLocaleDateString(
                    language === 'vi' ? 'vi-VN' : 'en-US'
                  )}
                </Typography>
              )}

              {/* Detailed Stats */}
              <ProfileDetailedStats
                streaks={currentGameStats.streaks || { currentWin: 0, currentLoss: 0, bestWin: 0, bestLoss: 0 }}
                byBoardSize={currentGameStats.byBoardSize || {}}
                totalPlayTime={currentGameStats.totalPlayTime || 0}
                avgGameDuration={currentGameStats.avgGameDuration || 0}
                lastTenGames={currentGameStats.lastTenGames || []}
              />
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" sx={{ color: '#5a6a7a' }}>
                {t('profile.noStatsForGame')}
              </Typography>
            </Box>
          )}
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            background: '#ffffff',
            border: '2px solid transparent',
            borderRadius: 4,
            backgroundImage:
              'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 12px 40px rgba(126, 200, 227, 0.15)',
            textAlign: 'center',
          }}
        >
          <Typography variant="body1" sx={{ color: '#5a6a7a', py: 4 }}>
            {t('profile.noStats')}
          </Typography>
        </Paper>
      )}

      {/* Achievements Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          mt: 3,
          background: '#ffffff',
          border: '2px solid transparent',
          borderRadius: 4,
          backgroundImage:
            'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: '0 12px 40px rgba(126, 200, 227, 0.15)',
        }}
      >
        <ProfileAchievements />
      </Paper>

      {/* Modals */}
      {profile && (
        <>
          <ProfileEditModal
            open={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            profile={profile}
            onProfileUpdated={handleProfileUpdated}
          />
          <PasswordChangeForm
            open={passwordModalOpen}
            onClose={() => setPasswordModalOpen(false)}
          />
        </>
      )}
    </Container>
    </>
  );
};

export default ProfilePage;
