import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Pagination,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { adminApi } from '../../services/api';
import { useLanguage } from '../../i18n';
import AdminRoute from '../../components/AdminRoute';
import { MainLayout } from '../../components/MainLayout';
import { socketService } from '../../services/socketService';

interface LuckyWheelUser {
  id: string;
  userId: string | null;
  guestId: string | null;
  username: string | null;
  guestName: string | null;
  displayName: string;
  userType: 'authenticated' | 'guest';
  itemCount: number;
  lastUpdated: Date;
  createdAt: Date;
}

const LuckyWheelAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const theme = useTheme();
  useMediaQuery(theme.breakpoints.down('md')); // For responsive re-render

  const [users, setUsers] = useState<LuckyWheelUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.listLuckyWheelUsers(page, 20, search || undefined);
      setUsers(response.users);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error: any) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Auto-refresh list every 10 seconds to show real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadUsers();
    }, 10000); // Refresh every 10 seconds (reduced from 5s, socket handles realtime)

    return () => {
      clearInterval(interval);
    };
  }, [loadUsers]);

  // Socket listener for realtime guest join/leave updates
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // When guest leaves, remove from list immediately
    const handleGuestLeft = (data: { guestId: string }) => {
      setUsers(prev => prev.filter(user => user.guestId !== data.guestId));
      setTotal(prev => Math.max(0, prev - 1));
    };

    // When new guest joins (config created), reload list
    const handleConfigUpdated = () => {
      loadUsers();
    };

    socket.on('lucky-wheel-guest-left', handleGuestLeft);
    socket.on('lucky-wheel-config-updated', handleConfigUpdated);

    return () => {
      socket.off('lucky-wheel-guest-left', handleGuestLeft);
      socket.off('lucky-wheel-config-updated', handleConfigUpdated);
    };
  }, [loadUsers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on search
  };

  const handleEdit = (user: LuckyWheelUser) => {
    const userId = user.userId || user.guestId;
    navigate(`/admin/lucky-wheel/${userId}${user.guestId ? '?guestId=' + user.guestId : ''}`);
  };

  return (
    <AdminRoute>
      <MainLayout>
        <Box
          sx={{
            minHeight: '100vh',
            width: '100%',
            background: 'linear-gradient(135deg, #f8fbff 0%, #e8f5ff 50%, #d4edff 100%)',
            py: { xs: 4, md: 6 },
            px: 2,
          }}
        >
          <Container maxWidth="lg">
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <AdminPanelSettingsIcon sx={{ fontSize: 40, color: '#7ec8e3' }} />
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {t('admin.luckyWheel.title') || 'Lucky Wheel Admin'}
              </Typography>
            </Box>

            {/* Search */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                background: '#ffffff',
                border: '1px solid rgba(126, 200, 227, 0.2)',
                borderRadius: 2,
              }}
            >
              <TextField
                fullWidth
                placeholder={t('admin.luckyWheel.searchPlaceholder') || 'Search by username or guest name...'}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: '#7ec8e3' }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#7ec8e3',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#7ec8e3',
                    },
                  },
                }}
              />
            </Paper>

            {/* Users Table */}
            <Paper
              elevation={0}
              sx={{
                background: '#ffffff',
                border: '2px solid transparent',
                borderRadius: 4,
                backgroundImage:
                  'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                boxShadow: '0 12px 40px rgba(126, 200, 227, 0.15)',
                overflow: 'hidden',
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress sx={{ color: '#7ec8e3' }} />
                </Box>
              ) : users.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography sx={{ color: '#5a6a7a' }}>
                    {t('admin.luckyWheel.noUsers') || 'No users found'}
                  </Typography>
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'rgba(126, 200, 227, 0.08)' }}>
                          <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>
                            {t('admin.luckyWheel.user') || 'User'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>
                            {t('admin.luckyWheel.type') || 'Type'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>
                            {t('admin.luckyWheel.items') || 'Items'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>
                            {t('admin.luckyWheel.lastUpdated') || 'Last Updated'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#2c3e50', textAlign: 'center' }}>
                            {t('admin.luckyWheel.actions') || 'Actions'}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow
                            key={user.id}
                            sx={{
                              '&:hover': {
                                bgcolor: 'rgba(126, 200, 227, 0.05)',
                              },
                            }}
                          >
                            <TableCell>
                              <Typography sx={{ fontWeight: 600, color: '#2c3e50' }}>
                                {user.displayName}
                              </Typography>
                              {(user.userId || user.guestId) && (
                                <Typography variant="caption" sx={{ color: '#8a9ba8' }}>
                                  {user.userId ? `ID: ${user.userId}` : `Guest: ${user.guestId?.substring(0, 8)}...`}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={user.userType === 'authenticated' ? t('admin.luckyWheel.authenticated') || 'Authenticated' : t('admin.luckyWheel.guest') || 'Guest'}
                                size="small"
                                sx={{
                                  bgcolor:
                                    user.userType === 'authenticated'
                                      ? 'rgba(126, 200, 227, 0.15)'
                                      : 'rgba(255, 184, 140, 0.15)',
                                  color:
                                    user.userType === 'authenticated' ? '#7ec8e3' : '#ffb88c',
                                  fontWeight: 600,
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography sx={{ color: '#2c3e50', fontWeight: 600 }}>
                                {user.itemCount}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: '#5a6a7a' }}>
                                {new Date(user.lastUpdated).toLocaleString('vi-VN', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                onClick={() => handleEdit(user)}
                                sx={{
                                  color: '#7ec8e3',
                                  '&:hover': {
                                    bgcolor: 'rgba(126, 200, 227, 0.1)',
                                  },
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, value) => setPage(value)}
                        color="primary"
                        sx={{
                          '& .MuiPaginationItem-root': {
                            color: '#7ec8e3',
                            '&.Mui-selected': {
                              bgcolor: '#7ec8e3',
                              color: '#ffffff',
                            },
                          },
                        }}
                      />
                    </Box>
                  )}

                  {/* Total count */}
                  <Box sx={{ px: 3, pb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#5a6a7a' }}>
                      {t('admin.luckyWheel.total') || 'Total'}: {total} {t('admin.luckyWheel.users') || 'users'}
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>
          </Container>
        </Box>
      </MainLayout>
    </AdminRoute>
  );
};

export default LuckyWheelAdminPage;
