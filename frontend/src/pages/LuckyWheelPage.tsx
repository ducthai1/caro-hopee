import React, { useState, useCallback, useEffect } from 'react';
import { Box, IconButton, useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate, useLocation } from 'react-router-dom';
import { LuckyWheelProvider, LuckyWheelDisplay } from '../components/LuckyWheel';
import { HomeSidebar, DRAWER_WIDTH_EXPANDED, DRAWER_WIDTH_COLLAPSED } from '../components/HomePage';
import { useAuth } from '../contexts/AuthContext';

const LuckyWheelPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('lucky-wheel');
  const [isScrolled, setIsScrolled] = useState(false);

  // Sync selectedGame with route
  useEffect(() => {
    if (location.pathname === '/lucky-wheel') {
      setSelectedGame('lucky-wheel');
    } else if (location.pathname === '/') {
      setSelectedGame('caro');
    }
  }, [location.pathname]);

  // Scroll detection for mobile header
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Handle game selection with navigation
  const handleGameSelection = useCallback((gameId: string) => {
    setSelectedGame(gameId);
    if (gameId === 'lucky-wheel') {
      navigate('/lucky-wheel');
    } else if (gameId === 'caro') {
      navigate('/');
    }
  }, [navigate]);

  const drawerWidth = isMobile ? DRAWER_WIDTH_EXPANDED : (sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED);

  return (
    <LuckyWheelProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <HomeSidebar
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          selectedGame={selectedGame}
          setSelectedGame={handleGameSelection}
          isAuthenticated={isAuthenticated}
          user={user}
          logout={logout}
        />

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { md: `calc(100% - ${drawerWidth}px)` },
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            ml: { md: 0 },
          }}
        >
          {/* Mobile Header with Hamburger + Logo - Fixed overlay */}
          {isMobile && !sidebarOpen && (
            <Box
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: (theme) => theme.zIndex.drawer + 1,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 2,
                bgcolor: isScrolled ? '#ffffff' : 'transparent',
                borderBottom: isScrolled ? '1px solid rgba(126, 200, 227, 0.15)' : 'none',
                boxShadow: isScrolled ? '0 2px 8px rgba(126, 200, 227, 0.15)' : 'none',
                transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                pointerEvents: 'auto',
              }}
            >
              {/* Hamburger - absolute left */}
              <IconButton
                onClick={() => setSidebarOpen(true)}
                sx={{
                  position: 'absolute',
                  left: 16,
                  width: 48,
                  height: 48,
                  background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(126, 200, 227, 0.25)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
              {/* Logo - centered */}
              <Box
                component="img"
                src="/logo/glacier_logo.svg"
                alt="Glacier"
                sx={{
                  height: 70,
                  objectFit: 'contain',
                  transform: isScrolled ? 'scale(0.75)' : 'scale(1)',
                  transition: 'transform 0.25s ease',
                }}
              />
            </Box>
          )}
          {/* Content - không thêm padding-top ở đây, padding xử lý bên trong LuckyWheelDisplay */}
          <LuckyWheelDisplay />
        </Box>
      </Box>
    </LuckyWheelProvider>
  );
};

export default LuckyWheelPage;
