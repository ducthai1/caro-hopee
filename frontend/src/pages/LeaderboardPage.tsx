import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, CircularProgress } from '@mui/material';
import { leaderboardApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  wins: number;
  losses?: number;
  draws?: number;
}

interface LeaderboardData {
  gameId: string;
  period: string;
  rankings: LeaderboardEntry[];
  limit: number;
  offset: number;
  total: number;
}

const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [gameId] = useState<string>('caro');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'all-time'>('all-time');
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<{ rank: number | null; totalPlayers: number; userStats: any } | null>(null);

  const loadLeaderboard = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await leaderboardApi.getLeaderboard(gameId, period, 50, 0);
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRank = async (): Promise<void> => {
    if (!user) return;
    try {
      const rankData = await leaderboardApi.getUserRank(gameId, user._id, period);
      setUserRank(rankData);
    } catch (error) {
      console.error('Failed to load user rank:', error);
    }
  };

  useEffect(() => {
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, period]);

  useEffect(() => {
    if (user) {
      loadUserRank();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, gameId, period]);

  const handlePeriodChange = (_event: React.SyntheticEvent, newValue: number): void => {
    const periods: ('daily' | 'weekly' | 'all-time')[] = ['daily', 'weekly', 'all-time'];
    setPeriod(periods[newValue]);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress sx={{ color: '#7ec8e3' }} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
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
          🏆 Leaderboard
        </Typography>
        <Typography variant="body1" sx={{ color: '#5a6a7a', fontSize: '1.1rem', mb: 3 }}>
          Top players ranked by score - {gameId.toUpperCase()}
        </Typography>

        {/* Period Tabs */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Tabs
            value={period === 'daily' ? 0 : period === 'weekly' ? 1 : 2}
            onChange={handlePeriodChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                minWidth: 100,
              },
              '& .Mui-selected': {
                color: '#7ec8e3',
              },
            }}
          >
            <Tab label="Daily" />
            <Tab label="Weekly" />
            <Tab label="All Time" />
          </Tabs>
        </Box>

        {/* User Rank Display */}
        {user && userRank && userRank.rank !== null && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              bgcolor: 'rgba(126, 200, 227, 0.1)',
              border: '1px solid rgba(126, 200, 227, 0.3)',
              borderRadius: 2,
              display: 'inline-block',
            }}
          >
            <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 600 }}>
              Your Rank: <span style={{ color: '#7ec8e3', fontWeight: 700 }}>#{userRank.rank}</span> out of {userRank.totalPlayers} players
            </Typography>
          </Paper>
        )}
      </Box>

      <TableContainer 
        component={Paper}
        elevation={0}
        sx={{
          background: '#ffffff',
          border: '2px solid transparent',
          borderRadius: 4,
          backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: '0 12px 40px rgba(126, 200, 227, 0.15)',
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(126, 200, 227, 0.08)' }}>
              <TableCell sx={{ fontWeight: 700, color: '#2c3e50', fontSize: '0.95rem' }}>Rank</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#2c3e50', fontSize: '0.95rem' }}>Username</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50', fontSize: '0.95rem' }}>Wins</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50', fontSize: '0.95rem' }}>Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaderboard?.rankings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" sx={{ color: '#5a6a7a' }}>
                    No players yet. Be the first!
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              leaderboard?.rankings.map((entry, index) => (
                <TableRow 
                  key={entry.userId}
                  sx={{ 
                    '&:hover': { 
                      bgcolor: 'rgba(126, 200, 227, 0.05)',
                    },
                    transition: 'background-color 0.2s ease',
                    bgcolor: user && entry.userId === user._id ? 'rgba(126, 200, 227, 0.1)' : 'transparent',
                  }}
                >
                  <TableCell>
                    <Box sx={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: index < 3 ? 'rgba(126, 200, 227, 0.15)' : 'rgba(0,0,0,0.05)',
                      fontWeight: 700,
                      color: '#2c3e50',
                    }}>
                      {entry.rank}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#2c3e50' }}>{entry.username}</TableCell>
                  <TableCell align="right" sx={{ color: '#a8e6cf', fontWeight: 600 }}>{entry.wins}</TableCell>
                  <TableCell align="right" sx={{ color: '#7ec8e3', fontWeight: 700, fontSize: '1.05rem' }}>{entry.score}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default LeaderboardPage;
