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
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            padding: 4,
            background: 'linear-gradient(135deg, rgba(179, 217, 230, 0.25) 0%, rgba(212, 232, 240, 0.25) 100%)',
            border: '1px solid rgba(179, 217, 230, 0.4)',
          }}
        >
          <Typography 
            component="h1" 
            variant="h5" 
            align="center" 
            gutterBottom
            sx={{
              background: 'linear-gradient(135deg, #8fc4d6 0%, #b3d9e6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 'bold',
            }}
          >
            {tab === 0 ? 'Login' : 'Register'}
          </Typography>

          <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} sx={{ mb: 2 }}>
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
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {error}
                </Typography>
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
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
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {error}
                </Typography>
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </Box>
          )}

          <Button fullWidth onClick={() => navigate('/')} sx={{ mt: 1 }}>
            Continue as Guest
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;

