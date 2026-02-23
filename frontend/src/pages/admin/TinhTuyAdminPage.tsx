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
  IconButton,
  Chip,
  CircularProgress,
  Pagination,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { adminApi } from '../../services/api';
import { useLanguage } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';
import AdminRoute from '../../components/AdminRoute';
import { MainLayout } from '../../components/MainLayout';

interface TinhTuyRoom {
  roomId: string;
  roomCode: string;
  round: number;
  currentPlayerSlot: number;
  playerCount: number;
  players: Array<{
    slot: number;
    character: string;
    displayName: string;
    position: number;
    points: number;
    isBankrupt: boolean;
  }>;
  diceOverrides: Record<string, { dice1: number; dice2: number }>;
  gameStartedAt: string;
}

const TinhTuyAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const toast = useToast();

  const [rooms, setRooms] = useState<TinhTuyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.listTinhTuyRooms(page, 20);
      setRooms(response.rooms);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch {
      toast.error('toast.loadFailed');
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Auto-refresh every 10s, visibility-aware
  useEffect(() => {
    let paused = document.visibilityState !== 'visible';

    const interval = setInterval(() => {
      if (!paused) loadRooms();
    }, 10000);

    const onVisChange = () => {
      const wasPaused = paused;
      paused = document.visibilityState !== 'visible';
      if (wasPaused && !paused) loadRooms();
    };
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [loadRooms]);

  const hasOverrides = (room: TinhTuyRoom) =>
    Object.keys(room.diceOverrides || {}).length > 0;

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
                {t('admin.tinhTuy.title') || 'TinhTuy Dice Control'}
              </Typography>
            </Box>

            {/* Rooms Table */}
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
              ) : rooms.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography sx={{ color: '#5a6a7a' }}>
                    {t('admin.tinhTuy.noRooms') || 'No active rooms'}
                  </Typography>
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'rgba(126, 200, 227, 0.08)' }}>
                          <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>
                            {t('admin.tinhTuy.roomCode') || 'Room Code'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>
                            {t('admin.tinhTuy.round') || 'Round'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>
                            {t('admin.tinhTuy.players') || 'Players'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>
                            {t('admin.tinhTuy.diceOverride') || 'Dice Override'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#2c3e50', textAlign: 'center' }}>
                            {t('admin.tinhTuy.actions') || 'Actions'}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rooms.map((room) => (
                          <TableRow
                            key={room.roomId}
                            sx={{ '&:hover': { bgcolor: 'rgba(126, 200, 227, 0.05)' } }}
                          >
                            <TableCell>
                              <Typography sx={{ fontWeight: 600, color: '#2c3e50', fontFamily: 'monospace' }}>
                                {room.roomCode}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography sx={{ color: '#2c3e50' }}>{room.round}</Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {room.players
                                  .filter((p) => !p.isBankrupt)
                                  .map((p) => (
                                    <Chip
                                      key={p.slot}
                                      label={`${p.displayName} (${p.points})`}
                                      size="small"
                                      sx={{
                                        bgcolor: p.slot === room.currentPlayerSlot
                                          ? 'rgba(126, 200, 227, 0.2)'
                                          : 'rgba(0,0,0,0.05)',
                                        fontWeight: p.slot === room.currentPlayerSlot ? 700 : 400,
                                      }}
                                    />
                                  ))}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {hasOverrides(room) ? (
                                <Chip
                                  icon={<CasinoIcon />}
                                  label={t('admin.tinhTuy.active') || 'Active'}
                                  size="small"
                                  sx={{
                                    bgcolor: 'rgba(255, 152, 0, 0.15)',
                                    color: '#ff9800',
                                    fontWeight: 600,
                                  }}
                                />
                              ) : (
                                <Chip
                                  label={t('admin.tinhTuy.random') || 'Random'}
                                  size="small"
                                  sx={{
                                    bgcolor: 'rgba(76, 175, 80, 0.1)',
                                    color: '#4caf50',
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                onClick={() => navigate(`/admin/tinh-tuy/${room.roomId}`)}
                                sx={{
                                  color: '#7ec8e3',
                                  '&:hover': { bgcolor: 'rgba(126, 200, 227, 0.1)' },
                                }}
                              >
                                <SettingsIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

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
                            '&.Mui-selected': { bgcolor: '#7ec8e3', color: '#ffffff' },
                          },
                        }}
                      />
                    </Box>
                  )}

                  <Box sx={{ px: 3, pb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#5a6a7a' }}>
                      {t('admin.tinhTuy.total') || 'Total'}: {total} {t('admin.tinhTuy.rooms') || 'rooms'}
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

export default TinhTuyAdminPage;
