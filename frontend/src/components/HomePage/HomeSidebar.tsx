/**
 * HomeSidebar - Sidebar component for game selection and authentication
 */
import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Divider,
  IconButton,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import LoginIcon from '@mui/icons-material/Login';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';
import { GAMES, GameItem } from './home-page-types';
import { getGuestName } from '../../utils/guestName';
import { useGuestName } from '../../hooks/useGuestName';
import LogoutConfirmationDialog from '../LogoutConfirmationDialog/LogoutConfirmationDialog';

interface HomeSidebarProps {
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  selectedGame: string;
  setSelectedGame: (game: string) => void;
  isAuthenticated: boolean;
  user: { username?: string } | null;
  logout: () => void;
  onEditGuestName?: () => void;
}

// Drawer width constants
const DRAWER_WIDTH_EXPANDED = 340;
const DRAWER_WIDTH_COLLAPSED = 112;

const HomeSidebar: React.FC<HomeSidebarProps> = ({
  isMobile,
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
  selectedGame,
  setSelectedGame,
  isAuthenticated,
  user,
  logout,
  onEditGuestName,
}) => {
  const { t } = useLanguage();
  const toast = useToast();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const drawerWidth = isMobile ? DRAWER_WIDTH_EXPANDED : (sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    logout();
    toast.info('toast.logoutSuccess');
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  // Detect actual mobile device (not just responsive screen)
  const isMobileDevice = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const userAgent = navigator.userAgent || navigator.vendor || '';
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return mobileRegex.test(userAgent) && hasTouch;
  }, []);

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        transition: 'width 0.3s ease',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          background: '#ffffff',
          borderRight: '1px solid rgba(126, 200, 227, 0.12)',
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          boxShadow: isMobile ? '2px 0 8px rgba(0, 0, 0, 0.15)' : 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          // Mobile device: 95vh to avoid phone navigation bar, desktop always 100vh
          height: '100vh',
          paddingBottom: isMobileDevice ? '5vh' : 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          zIndex: (theme) => theme.zIndex.drawer,
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-track': { background: 'rgba(126, 200, 227, 0.05)' },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(126, 200, 227, 0.2)',
            '&:hover': { background: 'rgba(126, 200, 227, 0.3)' },
          },
        },
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
    >
      {/* Header */}
      <SidebarHeader
        sidebarCollapsed={sidebarCollapsed}
        isMobile={isMobile}
        t={t}
        onClose={() => setSidebarOpen(false)}
      />

      <Divider sx={{ borderColor: 'rgba(126, 200, 227, 0.12)', mx: 0 }} />

      {/* Game List */}
      <GameList
        games={GAMES}
        selectedGame={selectedGame}
        setSelectedGame={(game) => {
          setSelectedGame(game);
          if (isMobile) {
            setSidebarOpen(false);
          }
        }}
        sidebarCollapsed={sidebarCollapsed}
        isMobile={isMobile}
        isAuthenticated={isAuthenticated}
        t={t}
      />

      {/* User Name Display - Above divider to prevent layout jumping */}
      <UserNameDisplay
        isAuthenticated={isAuthenticated}
        user={user}
        sidebarCollapsed={sidebarCollapsed}
        isMobile={isMobile}
        t={t}
        onEditGuestName={onEditGuestName ? () => {
          onEditGuestName();
          if (isMobile) {
            setSidebarOpen(false);
          }
        } : undefined}
      />

      {/* Auth Section */}
      <Divider sx={{ borderColor: 'rgba(126, 200, 227, 0.12)', mx: 0, mt: 'auto' }} />
      <AuthSection
        isAuthenticated={isAuthenticated}
        user={user}
        logout={handleLogoutClick}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        isMobile={isMobile}
        t={t}
        onClose={() => {
          if (isMobile) {
            setSidebarOpen(false);
          }
        }}
      />
      <LogoutConfirmationDialog
        open={showLogoutConfirm}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </Drawer>
  );
};

// FIX C3: Memoize all sub-components to prevent cascade re-renders
// Header sub-component - memoized
interface SidebarHeaderProps {
  sidebarCollapsed: boolean;
  isMobile: boolean;
  t: (key: string) => string;
  onClose?: () => void;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = React.memo(({ sidebarCollapsed, isMobile, t, onClose }) => (
  <Box sx={{ p: 2, pb: 2, position: 'relative' }}>
    {/* Close button for mobile */}
    {isMobile && onClose && (
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 40,
          height: 40,
          background: 'rgba(126, 200, 227, 0.1)',
          color: '#7ec8e3',
          border: '1px solid rgba(126, 200, 227, 0.2)',
          '&:hover': {
            background: 'rgba(126, 200, 227, 0.2)',
          },
        }}
      >
        <ChevronLeftIcon />
      </IconButton>
    )}
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 2.5,
    }}>
      <Box
        component="img"
        src="/logo/glacier_logo.svg"
        alt="Glacier"
        sx={{
          // Desktop: 100px when expanded, 80px when collapsed
          // Mobile sidebar: 100px (always expanded)
          height: sidebarCollapsed && !isMobile ? 80 : 100,
          objectFit: 'contain',
          transition: 'height 0.3s ease',
        }}
      />
    </Box>
  </Box>
));
SidebarHeader.displayName = 'SidebarHeader';

// Game List sub-component - memoized
interface GameListProps {
  games: GameItem[];
  selectedGame: string;
  setSelectedGame: (game: string) => void;
  sidebarCollapsed: boolean;
  isMobile: boolean;
  isAuthenticated: boolean;
  t: (key: string) => string;
}

const GameList: React.FC<GameListProps> = React.memo(({ games, selectedGame, setSelectedGame, sidebarCollapsed, isMobile, isAuthenticated, t }) => (
  <List sx={{
    px: 2,
    py: 2,
    maxHeight: '57vh',
    overflowY: 'auto',
    '&::-webkit-scrollbar': { width: '4px' },
    '&::-webkit-scrollbar-track': { background: 'rgba(126, 200, 227, 0.05)', borderRadius: '2px' },
    '&::-webkit-scrollbar-thumb': {
      background: 'rgba(126, 200, 227, 0.2)',
      borderRadius: '2px',
      '&:hover': { background: 'rgba(126, 200, 227, 0.3)' },
    },
    // When authenticated: limit height to show ~3 games, enable scroll for rest
    ...(isAuthenticated && {
      // Collapsed sidebar on desktop: 442px, otherwise 310px
      maxHeight: (sidebarCollapsed && !isMobile) ? 442 : 310,
      overflowY: 'auto',
      overflowX: 'hidden',
      // Inner shadow to indicate scrollable content
      boxShadow: 'inset 0 8px 8px -8px rgba(126, 200, 227, 0.15), inset 0 -8px 8px -8px rgba(126, 200, 227, 0.15)',
      transition: 'max-height 0.3s ease',
      '&::-webkit-scrollbar': { width: '4px' },
      '&::-webkit-scrollbar-track': { background: 'rgba(126, 200, 227, 0.05)', borderRadius: '2px' },
      '&::-webkit-scrollbar-thumb': {
        background: 'rgba(126, 200, 227, 0.2)',
        borderRadius: '2px',
        '&:hover': { background: 'rgba(126, 200, 227, 0.3)' },
      },
    }),
  }}>
    {games.map((game) => (
      <ListItem key={game.id} disablePadding sx={{ mb: 1 }}>
        <ListItemButton
          selected={selectedGame === game.id}
          onClick={() => setSelectedGame(game.id)}
          disabled={!game.available}
          sx={{
            borderRadius: 2.5,
            py: 1.5,
            px: 2,
            justifyContent: 'flex-start',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.25s ease',
            // Background cho tất cả tabs (selected và unselected)
            background: selectedGame === game.id
              ? game.id === 'lucky-wheel'
                ? 'linear-gradient(135deg, rgba(243, 156, 18, 0.08) 0%, rgba(243, 156, 18, 0.06) 100%)' // Màu cam vàng nhẹ nhàng khi selected
                : game.id === 'xi-dach-score'
                  ? 'linear-gradient(135deg, rgba(255, 138, 101, 0.08) 0%, rgba(255, 138, 101, 0.06) 100%)' // Warm orange cho xi-dach-score
                  : 'linear-gradient(135deg, rgba(126, 200, 227, 0.12) 0%, rgba(168, 230, 207, 0.12) 100%)' // Màu xanh cho các game khác
              : game.available
                ? // Unselected available tabs - sử dụng màu của game nhưng mờ đi
                game.id === 'lucky-wheel'
                  ? 'linear-gradient(135deg, rgba(243, 156, 18, 0.06) 0%, rgba(243, 156, 18, 0.04) 100%)' // Giữ màu #f39c12 cho lucky wheel
                  : game.id === 'xi-dach-score'
                    ? 'linear-gradient(135deg, rgba(255, 138, 101, 0.06) 0%, rgba(255, 138, 101, 0.04) 100%)' // Warm orange cho xi-dach-score
                    : 'linear-gradient(135deg, rgba(126, 200, 227, 0.06) 0%, rgba(168, 230, 207, 0.04) 100%)' // Màu mặc định cho các game khác
                : // Unavailable tabs
                `linear-gradient(135deg, ${game.color}08 0%, ${game.color}04 100%)`,
            border: selectedGame === game.id
              ? game.id === 'lucky-wheel'
                ? '1px solid rgba(243, 156, 18, 0.2)' // Border cam vàng nhẹ nhàng khi selected
                : game.id === 'xi-dach-score'
                  ? '1px solid rgba(255, 138, 101, 0.2)' // Border warm orange khi selected
                  : '1px solid rgba(126, 200, 227, 0.2)' // Border xanh cho các game khác
              : game.available
                ? game.id === 'lucky-wheel'
                  ? '1px solid rgba(243, 156, 18, 0.15)' // Border mờ cho lucky wheel
                  : game.id === 'xi-dach-score'
                    ? '1px solid rgba(255, 138, 101, 0.15)' // Border mờ cho xi-dach-score
                    : '1px solid rgba(126, 200, 227, 0.1)' // Border mờ cho các game khác
                : `1px solid ${game.color}20`,
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              background: selectedGame === game.id
                ? game.id === 'lucky-wheel'
                  ? 'linear-gradient(180deg, #f39c12 0%, #f39c1280 100%)' // Border cam vàng khi selected
                  : game.id === 'xi-dach-score'
                    ? 'linear-gradient(180deg, #FF8A65 0%, #FF8A6580 100%)' // Border warm orange cho xi-dach-score
                    : 'linear-gradient(180deg, #7ec8e3 0%, #a8e6cf 100%)' // Border xanh cho các game khác
                : game.available
                  ? game.id === 'lucky-wheel'
                    ? 'linear-gradient(180deg, #f39c12 0%, #f39c1280 100%)' // Border màu lucky wheel
                    : game.id === 'xi-dach-score'
                      ? 'linear-gradient(180deg, #FF8A65 0%, #FF8A6580 100%)' // Border warm orange cho xi-dach-score
                      : 'linear-gradient(180deg, #7ec8e3 0%, #a8e6cf 100%)' // Border mặc định
                  : `linear-gradient(180deg, ${game.color} 0%, ${game.color}80 100%)`,
              opacity: selectedGame === game.id ? 1 : (game.available ? 0.4 : 0.6), // Mờ đi khi unselected nhưng vẫn hiển thị
              transition: 'opacity 0.25s ease',
            },
            '&.Mui-selected': {
              boxShadow: game.id === 'lucky-wheel'
                ? '0 4px 12px rgba(243, 156, 18, 0.15)' // Shadow cam vàng nhẹ nhàng cho lucky wheel
                : game.id === 'xi-dach-score'
                  ? '0 4px 12px rgba(255, 138, 101, 0.15)' // Shadow warm orange cho xi-dach-score
                  : '0 4px 12px rgba(126, 200, 227, 0.15)', // Shadow xanh cho các game khác
              '&:hover': {
                background: game.id === 'lucky-wheel'
                  ? 'linear-gradient(135deg, rgba(243, 156, 18, 0.1) 0%, rgba(243, 156, 18, 0.08) 100%)' // Hover cam vàng nhẹ nhàng
                  : game.id === 'xi-dach-score'
                    ? 'linear-gradient(135deg, rgba(255, 138, 101, 0.1) 0%, rgba(255, 138, 101, 0.08) 100%)' // Hover warm orange
                    : 'linear-gradient(135deg, rgba(126, 200, 227, 0.18) 0%, rgba(168, 230, 207, 0.18) 100%)', // Hover xanh
              },
            },
            '&:hover': {
              backgroundColor: selectedGame === game.id
                ? game.id === 'lucky-wheel'
                  ? 'linear-gradient(135deg, rgba(243, 156, 18, 0.1) 0%, rgba(243, 156, 18, 0.08) 100%)' // Hover cam vàng nhẹ nhàng khi selected
                  : game.id === 'xi-dach-score'
                    ? 'linear-gradient(135deg, rgba(255, 138, 101, 0.1) 0%, rgba(255, 138, 101, 0.08) 100%)' // Hover warm orange
                    : 'linear-gradient(135deg, rgba(126, 200, 227, 0.18) 0%, rgba(168, 230, 207, 0.18) 100%)' // Hover xanh
                : game.available
                  ? game.id === 'lucky-wheel'
                    ? 'linear-gradient(135deg, rgba(243, 156, 18, 0.08) 0%, rgba(243, 156, 18, 0.05) 100%)'
                    : game.id === 'xi-dach-score'
                      ? 'linear-gradient(135deg, rgba(255, 138, 101, 0.08) 0%, rgba(255, 138, 101, 0.05) 100%)'
                      : 'rgba(126, 200, 227, 0.08)'
                  : `${game.color}10`,
            },
            '&.Mui-disabled': { opacity: 0.7 },
          }}
        >
          <ListItemIcon sx={{ minWidth: 56, justifyContent: 'flex-start' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                minWidth: 48,
                flexShrink: 0,
                borderRadius: 2,
                background: selectedGame === game.id
                  ? game.id === 'lucky-wheel'
                    ? 'rgba(243, 156, 18, 0.2)' // Icon background cam vàng nhẹ nhàng khi selected
                    : game.id === 'xi-dach-score'
                      ? 'rgba(255, 138, 101, 0.2)' // Icon background warm orange khi selected
                      : 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)' // Icon background xanh cho các game khác
                  : game.available
                    ? game.id === 'lucky-wheel'
                      ? 'rgba(243, 156, 18, 0.15)' // Icon background mờ cho lucky wheel
                      : game.id === 'xi-dach-score'
                        ? 'rgba(255, 138, 101, 0.15)' // Icon background mờ cho xi-dach-score
                        : 'rgba(126, 200, 227, 0.1)' // Icon background mờ cho các game khác
                    : `${game.color}15`,
                border: !game.available
                  ? `1px solid ${game.color}30`
                  : game.id === 'lucky-wheel'
                    ? selectedGame === game.id
                      ? '1px solid rgba(243, 156, 18, 0.25)' // Border nhẹ nhàng khi selected
                      : '1px solid rgba(243, 156, 18, 0.2)' // Border mờ cho lucky wheel icon
                    : game.id === 'xi-dach-score'
                      ? selectedGame === game.id
                        ? '1px solid rgba(255, 138, 101, 0.25)' // Border nhẹ nhàng khi selected
                        : '1px solid rgba(255, 138, 101, 0.2)' // Border mờ cho xi-dach-score icon
                      : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.25s ease',
              }}
            >
              {game.logo ? (
                <Box
                  component="img"
                  src={game.logo}
                  alt={game.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2 }}
                />
              ) : (
                <Typography sx={{ fontSize: '1.5rem' }}>{game.icon}</Typography>
              )}
            </Box>
          </ListItemIcon>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              opacity: sidebarCollapsed && !isMobile ? 0 : 1,
              width: sidebarCollapsed && !isMobile ? 0 : 'auto',
              overflow: 'hidden',
              transition: 'opacity 0.2s ease, width 0.25s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontWeight: selectedGame === game.id ? 700 : 600,
                  fontSize: '0.9rem',
                  color: selectedGame === game.id ? '#2c3e50' : '#5a6a7a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {game.name.startsWith('games.') ? t(game.name) : game.name}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  color: '#8a9ba8',
                  mt: 0.25,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {t(game.description)}
              </Typography>
            </Box>
            {!game.available && (
              <Chip
                label={t('home.comingSoon')}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  bgcolor: 'rgba(255, 170, 165, 0.15)',
                  color: '#ffaaa5',
                  fontWeight: 600,
                  border: '1px solid rgba(255, 170, 165, 0.3)',
                  flexShrink: 0,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            )}
          </Box>
        </ListItemButton>
      </ListItem>
    ))}
  </List>
));
GameList.displayName = 'GameList';

// User Name Display - Separate component above divider to prevent layout jumping - memoized
interface UserNameDisplayProps {
  isAuthenticated: boolean;
  user: { username?: string } | null;
  sidebarCollapsed: boolean;
  isMobile: boolean;
  t: (key: string) => string;
  onEditGuestName?: () => void;
}

const UserNameDisplay: React.FC<UserNameDisplayProps> = React.memo(({
  isAuthenticated,
  user,
  sidebarCollapsed,
  isMobile,
  t,
  onEditGuestName,
}) => {
  const guestName = useGuestName();
  const shouldShow = isAuthenticated ? true : !!guestName;
  const displayName = isAuthenticated ? (user?.username || 'User') : guestName;
  const label = isAuthenticated ? t('home.loggedInAs') : (t('home.guestName') || 'Tên hiển thị');

  // Hide completely when collapsed on desktop to avoid layout jump
  if (sidebarCollapsed && !isMobile) return null;
  if (!shouldShow) return null;

  return (
    <Box sx={{ px: 2, mb: 2, mt: 'auto' }}>
      <Box
        sx={{
          p: 2,
          borderRadius: 2.5,
          background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.12) 0%, rgba(168, 230, 207, 0.12) 100%)',
          border: '1px solid rgba(126, 200, 227, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography
            variant="body2"
            sx={{
              color: '#5a6a7a',
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
            }}
          >
            👤 {label}
          </Typography>
          {!isAuthenticated && onEditGuestName && (
            <IconButton
              size="small"
              onClick={onEditGuestName}
              sx={{
                width: 24,
                height: 24,
                color: '#7ec8e3',
                '&:hover': {
                  background: 'rgba(126, 200, 227, 0.15)',
                },
              }}
            >
              <EditIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          )}
        </Box>
        <Typography
          variant="body1"
          sx={{
            color: '#2c3e50',
            fontWeight: 700,
            fontSize: '0.95rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </Typography>
      </Box>
    </Box>
  );
});
UserNameDisplay.displayName = 'UserNameDisplay';

// Auth Section sub-component - Contains only toggle button and action buttons - memoized
interface AuthSectionProps {
  isAuthenticated: boolean;
  user: { username?: string } | null;
  logout: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isMobile: boolean;
  t: (key: string) => string;
  onClose?: () => void;
}

const AuthSection: React.FC<AuthSectionProps> = React.memo(({
  isAuthenticated,
  user,
  logout,
  sidebarCollapsed,
  setSidebarCollapsed,
  isMobile,
  t,
  onClose,
}) => (
  <Box sx={{ p: 2 }}>
    {/* Toggle Button - Desktop only */}
    {!isMobile && (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, position: 'relative', height: 36 }}>
        <IconButton
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          size="small"
          sx={{
            width: 36,
            height: 36,
            position: 'absolute',
            right: sidebarCollapsed ? `calc(50% - 18px)` : 0,
            background: 'rgba(126, 200, 227, 0.1)',
            border: '1px solid rgba(126, 200, 227, 0.2)',
            color: '#7ec8e3',
            transition: 'background 0.2s ease, right 0.25s ease',
            '&:hover': { background: 'rgba(126, 200, 227, 0.2)' },
          }}
        >
          {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
    )}

    {isAuthenticated ? (
      <AuthenticatedSection
        logout={logout}
        sidebarCollapsed={sidebarCollapsed}
        isMobile={isMobile}
        t={t}
        onClose={onClose}
      />
    ) : (
      <UnauthenticatedSection
        sidebarCollapsed={sidebarCollapsed}
        isMobile={isMobile}
        t={t}
        onClose={onClose}
      />
    )}
  </Box>
));
AuthSection.displayName = 'AuthSection';

// Authenticated user section - Only action buttons (user info moved to UserNameDisplay) - memoized
interface AuthenticatedSectionProps {
  logout: () => void;
  sidebarCollapsed: boolean;
  isMobile: boolean;
  t: (key: string) => string;
  onClose?: () => void;
}

const AuthenticatedSection: React.FC<AuthenticatedSectionProps> = React.memo(({
  logout,
  sidebarCollapsed,
  isMobile,
  t,
  onClose,
}) => {
  const buttonSx = {
    py: 1.5,
    px: 2,
    borderRadius: 2.5,
    textTransform: 'none' as const,
    fontWeight: 600,
    fontSize: '0.9rem',
    background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.1) 0%, rgba(168, 230, 207, 0.1) 100%)',
    border: '1px solid rgba(126, 200, 227, 0.3)',
    color: '#2c3e50',
    justifyContent: 'center',
    width: '100%',
    minHeight: 56,
    '&:hover': {
      background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.2) 0%, rgba(168, 230, 207, 0.2) 100%)',
      borderColor: 'rgba(126, 200, 227, 0.5)',
    },
  };

  const iconMargin = { mr: sidebarCollapsed && !isMobile ? 0 : 1, transition: 'margin 0.25s ease' };
  const textSx = {
    opacity: sidebarCollapsed && !isMobile ? 0 : 1,
    width: sidebarCollapsed && !isMobile ? 0 : 'auto',
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
    transition: 'opacity 0.25s ease, width 0.25s ease',
  };

  return (
    <>
      {/* Auth buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Button
          component={Link}
          to="/profile"
          sx={buttonSx}
          onClick={onClose}
        >
          <PersonIcon sx={iconMargin} />
          <Box component="span" sx={textSx}>{t('home.profile')}</Box>
        </Button>
        <Button
          component={Link}
          to="/leaderboard"
          sx={buttonSx}
          onClick={onClose}
        >
          <LeaderboardIcon sx={iconMargin} />
          <Box component="span" sx={textSx}>{t('home.leaderboard')}</Box>
        </Button>
        <Button
          onClick={logout}
          sx={{
            ...buttonSx,
            background: 'transparent',
            color: '#ffaaa5',
            border: '1px solid rgba(255, 170, 165, 0.3)',
            '&:hover': {
              background: 'rgba(255, 170, 165, 0.1)',
              borderColor: 'rgba(255, 170, 165, 0.5)',
            },
          }}
        >
          <LoginIcon sx={iconMargin} />
          <Box component="span" sx={textSx}>{t('auth.logout')}</Box>
        </Button>
      </Box>
    </>
  );
});
AuthenticatedSection.displayName = 'AuthenticatedSection';

// Unauthenticated user section - Only action buttons (guest name moved to UserNameDisplay) - memoized
interface UnauthenticatedSectionProps {
  sidebarCollapsed: boolean;
  isMobile: boolean;
  t: (key: string) => string;
  onClose?: () => void;
}

const UnauthenticatedSection: React.FC<UnauthenticatedSectionProps> = React.memo(({
  sidebarCollapsed,
  isMobile,
  t,
  onClose,
}) => {
  const iconMargin = { mr: sidebarCollapsed && !isMobile ? 0 : 1, transition: 'margin 0.25s ease' };
  const textSx = {
    opacity: sidebarCollapsed && !isMobile ? 0 : 1,
    width: sidebarCollapsed && !isMobile ? 0 : 'auto',
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
    transition: 'opacity 0.25s ease, width 0.25s ease',
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Button
        component={Link}
        to="/login"
        sx={{
          py: 1.75,
          px: 2,
          borderRadius: 2.5,
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.95rem',
          background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(126, 200, 227, 0.3)',
          justifyContent: 'center',
          width: '100%',
          minHeight: 56,
          '&:hover': {
            background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
            boxShadow: '0 6px 16px rgba(126, 200, 227, 0.4)',
          },
        }}
        onClick={onClose}
      >
        <LoginIcon sx={iconMargin} />
        <Box component="span" sx={textSx}>{t('auth.login')} / {t('auth.register')}</Box>
      </Button>
    </Box>
  );
});
UnauthenticatedSection.displayName = 'UnauthenticatedSection';

export default HomeSidebar;
export { DRAWER_WIDTH_EXPANDED, DRAWER_WIDTH_COLLAPSED };
