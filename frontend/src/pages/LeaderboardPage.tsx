import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { leaderboardApi } from '../services/api';
import { User } from '../types/user.types';

const LeaderboardPage: React.FC = () => {
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async (): Promise<void> => {
      try {
        const topPlayers = await leaderboardApi.getTopPlayers(20);
        setPlayers(topPlayers);
      } catch (error) {
        console.error('Failed to load leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Typography variant="h6" sx={{ color: '#5a6a7a' }}>Loading...</Typography>
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
        <Typography variant="body1" sx={{ color: '#5a6a7a', fontSize: '1.1rem' }}>
          Top players ranked by total score
        </Typography>
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
              <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50', fontSize: '0.95rem' }}>Losses</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50', fontSize: '0.95rem' }}>Draws</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50', fontSize: '0.95rem' }}>Total Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {players.map((player, index) => (
              <TableRow 
                key={player._id}
                sx={{ 
                  '&:hover': { 
                    bgcolor: 'rgba(126, 200, 227, 0.05)',
                  },
                  transition: 'background-color 0.2s ease',
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
                    {index + 1}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#2c3e50' }}>{player.username}</TableCell>
                <TableCell align="right" sx={{ color: '#a8e6cf', fontWeight: 600 }}>{player.wins}</TableCell>
                <TableCell align="right" sx={{ color: '#ffaaa5', fontWeight: 600 }}>{player.losses}</TableCell>
                <TableCell align="right" sx={{ color: '#5a6a7a', fontWeight: 600 }}>{player.draws}</TableCell>
                <TableCell align="right" sx={{ color: '#7ec8e3', fontWeight: 700, fontSize: '1.05rem' }}>{player.totalScore}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default LeaderboardPage;

