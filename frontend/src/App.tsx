import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, GlobalStyles } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { GameProvider } from './contexts/GameContext';
import { LanguageProvider } from './i18n';
import ErrorBoundary from './components/ErrorBoundary';
import LanguageSwitcher from './components/LanguageSwitcher';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import GameRoomPage from './pages/GameRoomPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#7ec8e3',
      light: '#a8d5e2',
      dark: '#5ba8c7',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#a8e6cf',
      light: '#c8f0df',
      dark: '#88d6b7',
      contrastText: '#2c3e50',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#2c3e50',
      secondary: '#5a6a7a',
    },
    success: {
      main: '#a8e6cf',
    },
    warning: {
      main: '#ffb88c',
    },
    error: {
      main: '#ffaaa5',
    },
    info: {
      main: '#7ec8e3',
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
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 2px 8px rgba(126, 200, 227, 0.15)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(126, 200, 227, 0.25)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          color: '#ffffff',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(126, 200, 227, 0.3)',
          border: 'none',
          '&:hover': {
            background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
            boxShadow: '0 6px 16px rgba(126, 200, 227, 0.4)',
            transform: 'translateY(-2px)',
            border: 'none',
          },
        },
        outlined: {
          borderColor: '#7ec8e3',
          borderWidth: 2,
          color: '#2c3e50',
          fontWeight: 600,
          '&:hover': {
            borderColor: '#5ba8c7',
            borderWidth: 2,
            background: 'rgba(126, 200, 227, 0.08)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          background: '#ffffff',
          border: '1px solid rgba(126, 200, 227, 0.15)',
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(44, 62, 80, 0.08), 0 1px 3px rgba(0,0,0,0.04)',
        },
        elevation2: {
          boxShadow: '0 4px 12px rgba(44, 62, 80, 0.1), 0 2px 4px rgba(0,0,0,0.06)',
        },
        elevation3: {
          boxShadow: '0 6px 16px rgba(44, 62, 80, 0.12), 0 3px 6px rgba(0,0,0,0.08)',
        },
        elevation4: {
          boxShadow: '0 8px 24px rgba(44, 62, 80, 0.15), 0 4px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

// Create router with data router API
const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/game/:roomId',
    element: <GameRoomPage />,
  },
  {
    path: '/leaderboard',
    element: <LeaderboardPage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
  },
]);

function App() {
  // Prevent zoom gestures (trackpad, mouse wheel with ctrl/cmd, touch pinch)
  useEffect(() => {
    const preventZoom = (e: WheelEvent | TouchEvent): void => {
      // Prevent zoom with Ctrl/Cmd + Wheel (trackpad zoom)
      if (e instanceof WheelEvent) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      
      // Prevent pinch zoom on touch devices
      if (e instanceof TouchEvent && e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const preventGestureZoom = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add event listeners
    document.addEventListener('wheel', preventZoom, { passive: false, capture: true });
    document.addEventListener('touchstart', preventZoom, { passive: false, capture: true });
    document.addEventListener('touchmove', preventZoom, { passive: false, capture: true });
    document.addEventListener('touchend', preventZoom, { passive: false, capture: true });
    document.addEventListener('gesturestart', preventGestureZoom, { passive: false, capture: true });
    document.addEventListener('gesturechange', preventGestureZoom, { passive: false, capture: true });
    document.addEventListener('gestureend', preventGestureZoom, { passive: false, capture: true });

    // Also prevent zoom via keyboard shortcuts
    const preventKeyboardZoom = (e: KeyboardEvent): void => {
      // Prevent Ctrl/Cmd + Plus/Minus/0 (zoom shortcuts)
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', preventKeyboardZoom, { passive: false, capture: true });

    // Cleanup
    return () => {
      document.removeEventListener('wheel', preventZoom as EventListener, true);
      document.removeEventListener('touchstart', preventZoom as EventListener, true);
      document.removeEventListener('touchmove', preventZoom as EventListener, true);
      document.removeEventListener('touchend', preventZoom as EventListener, true);
      document.removeEventListener('gesturestart', preventGestureZoom, true);
      document.removeEventListener('gesturechange', preventGestureZoom, true);
      document.removeEventListener('gestureend', preventGestureZoom, true);
      document.removeEventListener('keydown', preventKeyboardZoom, true);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          '*': {
            touchAction: 'pan-x pan-y', // Allow panning but prevent pinch zoom
          },
          'html, body': {
            touchAction: 'pan-x pan-y',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitTapHighlightColor: 'transparent',
          },
          // Prevent double-tap zoom on iOS
          '*:not(input):not(textarea):not(select)': {
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
          },
        }}
      />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 50%, #f0f9ff 100%)',
          backgroundAttachment: 'fixed',
          touchAction: 'pan-x pan-y',
        }}
      >
        <ErrorBoundary>
          <LanguageProvider>
            <LanguageSwitcher />
            <AuthProvider>
              <SocketProvider>
                <GameProvider>
                  <RouterProvider router={router} />
                </GameProvider>
              </SocketProvider>
            </AuthProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </Box>
    </ThemeProvider>
  );
}

export default App;
