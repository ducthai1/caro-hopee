import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, Paper } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import { User } from '../types/user.types';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);

  useEffect(() => {
    if (user) {
      const loadProfile = async (): Promise<void> => {
        try {
          const userData = await userApi.getProfile(user._id);
          setProfile(userData);
        } catch (error) {
          console.error('Failed to load profile:', error);
        }
      };
      loadProfile();
    }
  }, [user]);

  if (!user || !profile) {
    return <div>Please login to view your profile</div>;
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
          Profile
        </Typography>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3,
            background: 'linear-gradient(135deg, rgba(179, 217, 230, 0.25) 0%, rgba(212, 232, 240, 0.25) 100%)',
            border: '1px solid rgba(179, 217, 230, 0.4)',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: '#1a4a5c', fontWeight: 'bold' }}>
            {profile.username}
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Email: {profile.email}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Statistics</Typography>
            <Typography variant="body2">Wins: {profile.wins}</Typography>
            <Typography variant="body2">Losses: {profile.losses}</Typography>
            <Typography variant="body2">Draws: {profile.draws}</Typography>
            <Typography variant="body2">Total Score: {profile.totalScore}</Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ProfilePage;

