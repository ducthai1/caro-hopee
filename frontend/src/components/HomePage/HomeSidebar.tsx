/**
 * HomeSidebar - Sidebar component for game selection and authentication
 */
import React, { useMemo } from 'react';
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
import HistoryIcon from '@mui/icons-material/History';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n';
import { GAMES, GameItem } from './home-page-types';
import { getGuestName } from '../../utils/guestName';

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
  onHistoryClick: () => void;
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
  onHistoryClick,
  onEditGuestName,
}) => {
  const { t } = useLanguage();
  const drawerWidth = isMobile ? DRAWER_WIDTH_EXPANDED : (sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED);

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
        logout={logout}
        onHistoryClick={() => {
          onHistoryClick();
          if (isMobile) {
            setSidebarOpen(false);
          }
        }}
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
    </Drawer>
  );
};

// Header sub-component
interface SidebarHeaderProps {
  sidebarCollapsed: boolean;
  isMobile: boolean;
  t: (key: string) => string;
  onClose?: () => void;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ sidebarCollapsed, isMobile, t, onClose }) => (
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
      p: 1.5,
      borderRadius: 2.5,
      background: 'transparent',
      border: '1px solid transparent',
      justifyContent: sidebarCollapsed && !isMobile ? 'center' : 'flex-start',
    }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          minWidth: 48,
          flexShrink: 0,
          background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(126, 200, 227, 0.25)',
          borderRadius: 2,
        }}
      >
        <Typography sx={{ fontSize: '1.5rem' }}>🎮</Typography>
      </Box>
      <Box
        sx={{
          flex: sidebarCollapsed && !isMobile ? 0 : 1,
          minWidth: 0,
          opacity: sidebarCollapsed && !isMobile ? 0 : 1,
          width: sidebarCollapsed && !isMobile ? 0 : 'auto',
          marginLeft: sidebarCollapsed && !isMobile ? 0 : 1.5,
          overflow: 'hidden',
          transition: 'opacity 0.25s ease, width 0.25s ease, flex 0.25s ease, margin-left 0.25s ease',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 800,
            fontSize: '1.15rem',
            lineHeight: 1.2,
            mb: 0.25,
            whiteSpace: 'nowrap',
          }}
        >
          {t('home.title')}
        </Typography>
        <Typography variant="caption" sx={{ color: '#8a9ba8', fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {t('home.subtitle')}
        </Typography>
      </Box>
    </Box>
  </Box>
);

// Game List sub-component
interface GameListProps {
  games: GameItem[];
  selectedGame: string;
  setSelectedGame: (game: string) => void;
  sidebarCollapsed: boolean;
  isMobile: boolean;
  t: (key: string) => string;
}

const GameList: React.FC<GameListProps> = ({ games, selectedGame, setSelectedGame, sidebarCollapsed, isMobile, t }) => (
  <List sx={{ px: 2, py: 2 }}>
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
            ...((!game.available) && {
              background: `linear-gradient(135deg, ${game.color}08 0%, ${game.color}04 100%)`,
              border: `1px solid ${game.color}20`,
            }),
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              background: game.available
                ? 'linear-gradient(180deg, #7ec8e3 0%, #a8e6cf 100%)'
                : `linear-gradient(180deg, ${game.color} 0%, ${game.color}80 100%)`,
              opacity: selectedGame === game.id ? 1 : (!game.available ? 0.6 : 0),
              transition: 'opacity 0.25s ease',
            },
            '&.Mui-selected': {
              background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.12) 0%, rgba(168, 230, 207, 0.12) 100%)',
              border: '1px solid rgba(126, 200, 227, 0.2)',
              boxShadow: '0 4px 12px rgba(126, 200, 227, 0.15)',
              '&:hover': {
                background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.18) 0%, rgba(168, 230, 207, 0.18) 100%)',
              },
            },
            '&:hover': {
              backgroundColor: game.available ? 'rgba(126, 200, 227, 0.06)' : `${game.color}10`,
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
                  ? 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)'
                  : game.available
                    ? 'rgba(126, 200, 227, 0.1)'
                    : `${game.color}15`,
                border: !game.available ? `1px solid ${game.color}30` : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.25s ease',
              }}
            >
              <Typography sx={{ fontSize: '1.5rem' }}>{game.icon}</Typography>
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
);

// User Name Display - Separate component above divider to prevent layout jumping
interface UserNameDisplayProps {
  isAuthenticated: boolean;
  user: { username?: string } | null;
  sidebarCollapsed: boolean;
  isMobile: boolean;
  t: (key: string) => string;
  onEditGuestName?: () => void;
}

const UserNameDisplay: React.FC<UserNameDisplayProps> = ({
  isAuthenticated,
  user,
  sidebarCollapsed,
  isMobile,
  t,
  onEditGuestName,
}) => {
  const guestName = getGuestName();
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
};

// Auth Section sub-component - Contains only toggle button and action buttons
interface AuthSectionProps {
  isAuthenticated: boolean;
  user: { username?: string } | null;
  logout: () => void;
  onHistoryClick: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isMobile: boolean;
  t: (key: string) => string;
  onClose?: () => void;
}

const AuthSection: React.FC<AuthSectionProps> = ({
  isAuthenticated,
  user,
  logout,
  onHistoryClick,
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
        onHistoryClick={onHistoryClick}
        sidebarCollapsed={sidebarCollapsed}
        isMobile={isMobile}
        t={t}
        onClose={onClose}
      />
    ) : (
      <UnauthenticatedSection
        onHistoryClick={onHistoryClick}
        sidebarCollapsed={sidebarCollapsed}
        isMobile={isMobile}
        t={t}
        onClose={onClose}
      />
    )}
  </Box>
);

// Authenticated user section - Only action buttons (user info moved to UserNameDisplay)
interface AuthenticatedSectionProps {
  logout: () => void;
  onHistoryClick: () => void;
  sidebarCollapsed: boolean;
  isMobile: boolean;
  t: (key: string) => string;
  onClose?: () => void;
}

const AuthenticatedSection: React.FC<AuthenticatedSectionProps> = ({
  logout,
  onHistoryClick,
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
        <Button onClick={onHistoryClick} sx={buttonSx}>
          <HistoryIcon sx={iconMargin} />
          <Box component="span" sx={textSx}>{t('home.history')}</Box>
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
};

// Unauthenticated user section - Only action buttons (guest name moved to UserNameDisplay)
interface UnauthenticatedSectionProps {
  onHistoryClick: () => void;
  sidebarCollapsed: boolean;
  isMobile: boolean;
  t: (key: string) => string;
  onClose?: () => void;
}

const UnauthenticatedSection: React.FC<UnauthenticatedSectionProps> = ({
  onHistoryClick,
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
        onClick={onHistoryClick}
        sx={{
          py: 1.5,
          px: 2,
          borderRadius: 2.5,
          textTransform: 'none',
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
        }}
      >
        <HistoryIcon sx={iconMargin} />
        <Box component="span" sx={textSx}>{t('home.history')}</Box>
      </Button>
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
};

export default HomeSidebar;
export { DRAWER_WIDTH_EXPANDED, DRAWER_WIDTH_COLLAPSED };
