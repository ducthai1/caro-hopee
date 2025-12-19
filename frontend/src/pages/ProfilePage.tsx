import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Paper, Tabs, Tab, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import { User } from '../types/user.types';

interface GameStats {
  _id: string;
  gameId: string;
  gameName: string;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  customStats: any;
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
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [gameStats, setGameStats] = useState<UserGamesData | null>(null);
  const [selectedGame, setSelectedGame] = useState<string>('caro');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadGameStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfile = async (): Promise<void> => {
    if (!user) return;
    try {
      const userData = await userApi.getMyProfile();
      setProfile(userData);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGameStats = async (): Promise<void> => {
    if (!user) return;
    try {
      setStatsLoading(true);
      const data = await userApi.getUserGames(user._id);
      setGameStats(data);
    } catch (error) {
      console.error('Failed to load game stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleGameTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    if (gameStats && gameStats.games[newValue]) {
      setSelectedGame(gameStats.games[newValue].gameId);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#5a6a7a' }}>Please login to view your profile</Typography>
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress sx={{ color: '#7ec8e3' }} />
        </Box>
      </Container>
    );
  }

  const currentGameStats = gameStats?.games.find(g => g.gameId === selectedGame) || null;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
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
          👤 Profile
        </Typography>
      </Box>

      {/* User Info */}
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 3, md: 5 },
          mb: 3,
          background: '#ffffff',
          border: '2px solid transparent',
          borderRadius: 4,
          backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: '0 12px 40px rgba(126, 200, 227, 0.15)',
        }}
      >
        <Box sx={{ mb: 4, pb: 3, borderBottom: '2px solid rgba(126, 200, 227, 0.2)' }}>
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{ 
              color: '#2c3e50', 
              fontWeight: 700,
              fontSize: { xs: '1.75rem', md: '2.25rem' },
              mb: 1,
            }}
          >
            {profile?.username}
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#5a6a7a',
              fontSize: '1.05rem',
            }}
          >
            📧 {profile?.email}
          </Typography>
        </Box>
      </Paper>

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
            backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
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
            📊 Game Statistics
          </Typography>

          {/* Game Tabs */}
          {gameStats.games.length > 1 && (
            <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={gameStats.games.findIndex(g => g.gameId === selectedGame)}
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
                {currentGameStats.gameName || currentGameStats.gameId.toUpperCase()}
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
                gap: 2.5,
              }}>
                <Box sx={{ 
                  p: 2.5, 
                  borderRadius: 3, 
                  bgcolor: 'rgba(168, 230, 207, 0.1)',
                  border: '1px solid rgba(168, 230, 207, 0.3)',
                }}>
                  <Typography variant="body2" sx={{ color: '#5a6a7a', mb: 0.5, fontWeight: 600 }}>
                    Wins
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#a8e6cf', fontWeight: 700 }}>
                    {currentGameStats.wins}
                  </Typography>
                </Box>
                <Box sx={{ 
                  p: 2.5, 
                  borderRadius: 3, 
                  bgcolor: 'rgba(255, 170, 165, 0.1)',
                  border: '1px solid rgba(255, 170, 165, 0.3)',
                }}>
                  <Typography variant="body2" sx={{ color: '#5a6a7a', mb: 0.5, fontWeight: 600 }}>
                    Losses
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#ffaaa5', fontWeight: 700 }}>
                    {currentGameStats.losses}
                  </Typography>
                </Box>
                <Box sx={{ 
                  p: 2.5, 
                  borderRadius: 3, 
                  bgcolor: 'rgba(255, 184, 140, 0.1)',
                  border: '1px solid rgba(255, 184, 140, 0.3)',
                }}>
                  <Typography variant="body2" sx={{ color: '#5a6a7a', mb: 0.5, fontWeight: 600 }}>
                    Draws
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#ffb88c', fontWeight: 700 }}>
                    {currentGameStats.draws}
                  </Typography>
                </Box>
                <Box sx={{ 
                  p: 2.5, 
                  borderRadius: 3, 
                  bgcolor: 'rgba(126, 200, 227, 0.1)',
                  border: '1px solid rgba(126, 200, 227, 0.3)',
                }}>
                  <Typography variant="body2" sx={{ color: '#5a6a7a', mb: 0.5, fontWeight: 600 }}>
                    Total Score
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#7ec8e3', fontWeight: 700 }}>
                    {currentGameStats.totalScore}
                  </Typography>
                </Box>
              </Box>
              {currentGameStats.lastPlayed && (
                <Typography variant="caption" sx={{ color: '#8a9ba8', mt: 2, display: 'block' }}>
                  Last played: {new Date(currentGameStats.lastPlayed).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" sx={{ color: '#5a6a7a' }}>
                No statistics available for this game yet.
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
            backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 12px 40px rgba(126, 200, 227, 0.15)',
            textAlign: 'center',
          }}
        >
          <Typography variant="body1" sx={{ color: '#5a6a7a', py: 4 }}>
            No game statistics yet. Start playing to see your stats!
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default ProfilePage;
