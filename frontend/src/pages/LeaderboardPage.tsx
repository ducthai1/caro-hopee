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
    return <div>Loading...</div>;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography 
          variant="h4" 
          gutterBottom
          sx={{
            background: 'linear-gradient(135deg, #8fc4d6 0%, #b3d9e6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 'bold',
          }}
        >
          Leaderboard
        </Typography>
        <TableContainer 
          component={Paper}
          sx={{
            background: 'linear-gradient(135deg, rgba(179, 217, 230, 0.2) 0%, rgba(212, 232, 240, 0.2) 100%)',
            border: '1px solid rgba(179, 217, 230, 0.4)',
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Username</TableCell>
                <TableCell align="right">Wins</TableCell>
                <TableCell align="right">Losses</TableCell>
                <TableCell align="right">Draws</TableCell>
                <TableCell align="right">Total Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map((player, index) => (
                <TableRow key={player._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{player.username}</TableCell>
                  <TableCell align="right">{player.wins}</TableCell>
                  <TableCell align="right">{player.losses}</TableCell>
                  <TableCell align="right">{player.draws}</TableCell>
                  <TableCell align="right">{player.totalScore}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default LeaderboardPage;

