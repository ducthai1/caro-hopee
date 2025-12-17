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
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#5a6a7a' }}>Please login to view your profile</Typography>
        </Box>
      </Container>
    );
  }

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
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 3, md: 5 },
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
            {profile.username}
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#5a6a7a',
              fontSize: '1.05rem',
            }}
          >
            📧 {profile.email}
          </Typography>
        </Box>
        
        <Box>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 3,
              color: '#2c3e50',
              fontWeight: 700,
              fontSize: '1.25rem',
            }}
          >
            📊 Statistics
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
                {profile.wins}
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
                {profile.losses}
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
                {profile.draws}
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
                {profile.totalScore}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfilePage;

