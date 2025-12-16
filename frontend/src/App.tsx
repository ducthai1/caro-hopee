import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { GameProvider } from './contexts/GameContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import GameRoomPage from './pages/GameRoomPage';
import JoinGamePage from './pages/JoinGamePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#b3d9e6',
      light: '#d4e8f0',
      dark: '#8fc4d6',
      contrastText: '#1a4a5c',
    },
    secondary: {
      main: '#a8d5e2',
      light: '#c8e5ef',
      dark: '#7fb8cc',
      contrastText: '#1a4a5c',
    },
    background: {
      default: '#e8f4f8',
      paper: '#ffffff',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #b3d9e6 0%, #d4e8f0 100%)',
          color: '#1a4a5c',
          '&:hover': {
            background: 'linear-gradient(135deg, #8fc4d6 0%, #b3d9e6 100%)',
          },
        },
        outlined: {
          borderColor: '#b3d9e6',
          color: '#1a4a5c',
          '&:hover': {
            borderColor: '#8fc4d6',
            background: 'rgba(179, 217, 230, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
          backdropFilter: 'blur(10px)',
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
        elevation2: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
        elevation3: {
          boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
        },
        elevation4: {
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #e8f4f8 0%, #d4e8f0 100%)',
          backgroundAttachment: 'fixed',
        }}
      >
        <AuthProvider>
          <SocketProvider>
            <GameProvider>
              <Router>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/join" element={<JoinGamePage />} />
                  <Route path="/game/:roomId" element={<GameRoomPage />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Routes>
              </Router>
            </GameProvider>
          </SocketProvider>
        </AuthProvider>
      </Box>
    </ThemeProvider>
  );
}

export default App;
