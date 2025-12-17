import React, { useState } from 'react';
import { Box, Container, Paper, TextField, Button, Typography, Tabs, Tab } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(username, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ 
        marginTop: { xs: 4, md: 8 },
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: { xs: 'auto', md: '80vh' },
      }}>
        <Paper 
          elevation={0}
          sx={{ 
            padding: { xs: 3, md: 5 },
            background: '#ffffff',
            border: '2px solid transparent',
            borderRadius: 4,
            backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: '0 12px 40px rgba(126, 200, 227, 0.15)',
            width: '100%',
            maxWidth: '480px',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography 
              component="h1" 
              variant="h4" 
              gutterBottom
              sx={{
                background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 700,
                fontSize: { xs: '1.75rem', md: '2.25rem' },
                mb: 1,
              }}
            >
              {tab === 0 ? '🔐 Login' : '✨ Register'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#5a6a7a', fontSize: '0.95rem' }}>
              {tab === 0 ? 'Welcome back!' : 'Create your account'}
            </Typography>
          </Box>

          <Tabs 
            value={tab} 
            onChange={(_, newValue) => setTab(newValue)} 
            sx={{ 
              mb: 3,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                minHeight: 48,
              },
            }}
          >
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>

          {tab === 0 ? (
            <Box component="form" onSubmit={handleLogin}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              {error && (
                <Box sx={{ 
                  mb: 2, 
                  p: 1.5, 
                  borderRadius: 2, 
                  bgcolor: 'rgba(255, 170, 165, 0.1)',
                  border: '1px solid rgba(255, 170, 165, 0.3)',
                }}>
                  <Typography color="error" variant="body2" sx={{ textAlign: 'center', fontWeight: 500 }}>
                    {error}
                  </Typography>
                </Box>
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  mt: 2, 
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 700,
                }}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleRegister}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              {error && (
                <Box sx={{ 
                  mb: 2, 
                  p: 1.5, 
                  borderRadius: 2, 
                  bgcolor: 'rgba(255, 170, 165, 0.1)',
                  border: '1px solid rgba(255, 170, 165, 0.3)',
                }}>
                  <Typography color="error" variant="body2" sx={{ textAlign: 'center', fontWeight: 500 }}>
                    {error}
                  </Typography>
                </Box>
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  mt: 2, 
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 700,
                }}
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </Box>
          )}

          <Button 
            fullWidth 
            onClick={() => navigate('/')} 
            variant="outlined"
            sx={{ 
              mt: 1,
              py: 1.25,
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            Continue as Guest
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;

