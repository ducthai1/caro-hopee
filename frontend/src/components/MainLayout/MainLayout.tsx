import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, IconButton, useTheme, useMediaQuery, Fade } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useLocation, useNavigate } from 'react-router-dom';
import { HomeSidebar, DRAWER_WIDTH_EXPANDED, DRAWER_WIDTH_COLLAPSED } from '../HomePage';
import { useAuth } from '../../contexts/AuthContext';
import HomePageContent from './HomePageContent';
import LuckyWheelContent from './LuckyWheelContent';
import { LuckyWheelProvider } from '../LuckyWheel';
import { MainLayoutProvider, useMainLayout } from './MainLayoutContext';

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayoutInner: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { openHistoryModal, openGuestNameDialog } = useMainLayout();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>(() => {
    // Sync với route hiện tại
    if (location.pathname === '/lucky-wheel') return 'lucky-wheel';
    if (location.pathname === '/') return 'caro';
    return 'caro';
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const [contentKey, setContentKey] = useState(selectedGame); // Key để trigger fade animation
  const [fadeIn, setFadeIn] = useState(true);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync selectedGame với route changes (cho các route khác như /game/:roomId)
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

  // Handle game selection - chỉ thay đổi state, không navigate
  const handleGameSelection = useCallback((gameId: string) => {
    if (gameId === selectedGame) return; // Đã chọn rồi thì không làm gì
    
    // Clear timeout cũ nếu có
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    
    // Fade out trước
    setFadeIn(false);
    
    // Sau khi fade out, thay đổi content và fade in
    fadeTimeoutRef.current = setTimeout(() => {
      setContentKey(gameId);
      setSelectedGame(gameId);
      
      // Chỉ update URL để sync với browser history, không reload page
      if (gameId === 'lucky-wheel') {
        navigate('/lucky-wheel', { replace: true });
      } else if (gameId === 'caro') {
        navigate('/', { replace: true });
      }
      
      // Fade in sau khi content đã thay đổi
      requestAnimationFrame(() => {
        setFadeIn(true);
      });
    }, 200); // Thời gian fade out (phù hợp với timeout 300ms của Fade)
  }, [selectedGame, navigate]);

  // Cleanup timeout khi unmount
  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  const drawerWidth = isMobile ? DRAWER_WIDTH_EXPANDED : (sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED);

  // Render content based on selected game
  const renderContent = () => {
    if (children) {
      // Nếu có children (cho các route đặc biệt như /game/:roomId), render children
      return children;
    }

    // Render game content dựa trên selectedGame
    switch (selectedGame) {
      case 'lucky-wheel':
        return (
          <LuckyWheelProvider>
            <LuckyWheelContent />
          </LuckyWheelProvider>
        );
      case 'caro':
      default:
        return <HomePageContent />;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar - Cố định, không thay đổi khi chuyển tab */}
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
        onHistoryClick={openHistoryModal}
        onEditGuestName={!isAuthenticated ? openGuestNameDialog : undefined}
      />

      {/* Main Content - Thay đổi động với fade animation */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          ml: { md: 0 },
          position: 'relative',
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

        {/* Content với fade in/out animation */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            flex: 1,
            position: 'relative',
          }}
        >
          <Fade in={fadeIn} timeout={300} key={contentKey}>
            <Box
              sx={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              {renderContent()}
            </Box>
          </Fade>
        </Box>
      </Box>
    </Box>
  );
};

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <MainLayoutProvider>
      <MainLayoutInner>{children}</MainLayoutInner>
    </MainLayoutProvider>
  );
};

export default MainLayout;
