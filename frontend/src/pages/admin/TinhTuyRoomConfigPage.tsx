import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import CasinoIcon from '@mui/icons-material/Casino';
import { adminApi } from '../../services/api';
import { useLanguage } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';
import AdminRoute from '../../components/AdminRoute';
import { MainLayout } from '../../components/MainLayout';

interface PlayerInfo {
  slot: number;
  character: string;
  displayName: string;
  position: number;
  points: number;
  properties: number[];
  isBankrupt: boolean;
  isConnected: boolean;
}

interface DiceOverride {
  dice1: number | null; // null = random
  dice2: number | null;
}

const DICE_OPTIONS = [
  { value: 0, label: 'Random' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
];

// Total options 2-12, plus 0 = random
const TOTAL_OPTIONS = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Given a target total (2-12), return a random valid (dice1, dice2) pair */
const randomPairForTotal = (total: number): { dice1: number; dice2: number } => {
  const min = Math.max(1, total - 6);
  const max = Math.min(6, total - 1);
  const d1 = min + Math.floor(Math.random() * (max - min + 1));
  return { dice1: d1, dice2: total - d1 };
};

const TinhTuyRoomConfigPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const toast = useToast();

  const [roomInfo, setRoomInfo] = useState<{
    roomCode: string;
    gameStatus: string;
    round: number;
    currentPlayerSlot: number;
    players: PlayerInfo[];
  } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, DiceOverride>>({});
  const [originalOverrides, setOriginalOverrides] = useState<Record<string, DiceOverride>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      setLoading(true);
      const response = await adminApi.getTinhTuyRoomConfig(roomId);
      setRoomInfo({
        roomCode: response.roomCode,
        gameStatus: response.gameStatus,
        round: response.round,
        currentPlayerSlot: response.currentPlayerSlot,
        players: response.players,
      });

      // Convert server overrides to local format
      const serverOverrides = response.diceOverrides || {};
      const local: Record<string, DiceOverride> = {};
      for (const p of response.players) {
        const s = String(p.slot);
        if (serverOverrides[s]) {
          local[s] = { dice1: serverOverrides[s].dice1, dice2: serverOverrides[s].dice2 };
        } else {
          local[s] = { dice1: null, dice2: null };
        }
      }
      setOverrides(local);
      setOriginalOverrides(JSON.parse(JSON.stringify(local)));
    } catch {
      toast.error('toast.loadFailed');
    } finally {
      setLoading(false);
    }
  }, [roomId, toast]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  const handleDiceChange = (slot: string, die: 'dice1' | 'dice2', value: number) => {
    setOverrides((prev) => ({
      ...prev,
      [slot]: { ...prev[slot], [die]: value === 0 ? null : value },
    }));
  };

  /** Pick a total (2-12) → auto-generate random dice1+dice2 pair summing to it */
  const handleTotalChange = (slot: string, total: number) => {
    if (total === 0) {
      // Reset to random
      setOverrides((prev) => ({ ...prev, [slot]: { dice1: null, dice2: null } }));
    } else {
      const pair = randomPairForTotal(total);
      setOverrides((prev) => ({ ...prev, [slot]: { dice1: pair.dice1, dice2: pair.dice2 } }));
    }
  };

  const handleSave = async () => {
    if (!roomId) return;
    try {
      setSaving(true);
      // Build server payload: only send slots that have at least one die set, or null to clear
      const payload: Record<string, { dice1: number; dice2: number } | null> = {};
      for (const [slot, ov] of Object.entries(overrides)) {
        if (ov.dice1 !== null && ov.dice2 !== null) {
          payload[slot] = { dice1: ov.dice1, dice2: ov.dice2 };
        } else if (ov.dice1 === null && ov.dice2 === null) {
          // If was previously set, send null to clear
          const orig = originalOverrides[slot];
          if (orig && (orig.dice1 !== null || orig.dice2 !== null)) {
            payload[slot] = null;
          }
        } else {
          // Partial: one die is set, the other random → default the null one to random (1-6 range not useful; skip)
          // Only send if both are set
          toast.error(t('admin.tinhTuy.bothDiceRequired') || 'Both dice must be set or both random');
          setSaving(false);
          return;
        }
      }
      await adminApi.updateTinhTuyDice(roomId, payload);
      setOriginalOverrides(JSON.parse(JSON.stringify(overrides)));
      toast.success('toast.saveSuccess');
    } catch {
      toast.error('toast.saveFailed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setOverrides(JSON.parse(JSON.stringify(originalOverrides)));
  };

  const hasChanges = JSON.stringify(overrides) !== JSON.stringify(originalOverrides);

  if (loading) {
    return (
      <AdminRoute>
        <MainLayout>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <CircularProgress sx={{ color: '#7ec8e3' }} />
          </Box>
        </MainLayout>
      </AdminRoute>
    );
  }

  if (!roomInfo) {
    return (
      <AdminRoute>
        <MainLayout>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error">
              {t('admin.tinhTuy.roomNotFound') || 'Room not found'}
            </Alert>
          </Box>
        </MainLayout>
      </AdminRoute>
    );
  }

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
          <Container maxWidth="md">
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <IconButton
                onClick={() => navigate('/admin/tinh-tuy')}
                sx={{
                  bgcolor: 'rgba(126, 200, 227, 0.1)',
                  border: '1px solid rgba(126, 200, 227, 0.2)',
                  color: '#7ec8e3',
                  '&:hover': { bgcolor: 'rgba(126, 200, 227, 0.2)' },
                }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box>
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
                  {t('admin.tinhTuy.diceControl') || 'Dice Control'}
                </Typography>
                <Typography variant="body1" sx={{ color: '#5a6a7a', mt: 0.5 }}>
                  {t('admin.tinhTuy.room') || 'Room'}: {roomInfo.roomCode} &middot; {t('admin.tinhTuy.round') || 'Round'}: {roomInfo.round}
                </Typography>
              </Box>
            </Box>

            {/* Player dice controls */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {roomInfo.players.map((player) => {
                const slot = String(player.slot);
                const ov = overrides[slot] || { dice1: null, dice2: null };
                const isActive = ov.dice1 !== null && ov.dice2 !== null;

                return (
                  <Paper
                    key={player.slot}
                    elevation={0}
                    sx={{
                      p: 3,
                      background: '#ffffff',
                      border: '2px solid transparent',
                      borderRadius: 3,
                      backgroundImage: isActive
                        ? 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)'
                        : 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                      opacity: player.isBankrupt ? 0.5 : 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                      {/* Player info */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 200 }}>
                        <CasinoIcon sx={{ color: isActive ? '#ff9800' : '#7ec8e3' }} />
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: '#2c3e50' }}>
                            {player.displayName}
                            {player.slot === roomInfo.currentPlayerSlot && (
                              <Chip label={t('admin.tinhTuy.currentTurn') || 'Current'} size="small" sx={{ ml: 1, bgcolor: 'rgba(126, 200, 227, 0.2)', fontWeight: 600, fontSize: '0.7rem' }} />
                            )}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#5a6a7a' }}>
                            Slot {player.slot} &middot; Pos {player.position} &middot; {player.points} pts
                            {player.isBankrupt && ' (Bankrupt)'}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Dice selectors */}
                      {!player.isBankrupt && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                          {/* Total shortcut — pick total, auto-split into random dice pair */}
                          <Box>
                            <Typography variant="caption" sx={{ color: '#5a6a7a', display: 'block', mb: 0.5 }}>
                              {t('admin.tinhTuy.total') || 'Total'}
                            </Typography>
                            <Select
                              size="small"
                              value={(ov.dice1 !== null && ov.dice2 !== null) ? ov.dice1 + ov.dice2 : 0}
                              onChange={(e) => handleTotalChange(slot, e.target.value as number)}
                              sx={{ minWidth: 90 }}
                            >
                              {TOTAL_OPTIONS.map((v) => (
                                <MenuItem key={v} value={v}>
                                  {v === 0 ? (t('admin.tinhTuy.random') || 'Random') : v}
                                </MenuItem>
                              ))}
                            </Select>
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ color: '#5a6a7a', display: 'block', mb: 0.5 }}>
                              {t('admin.tinhTuy.dice1') || 'Dice 1'}
                            </Typography>
                            <Select
                              size="small"
                              value={ov.dice1 ?? 0}
                              onChange={(e) => handleDiceChange(slot, 'dice1', e.target.value as number)}
                              sx={{ minWidth: 90 }}
                            >
                              {DICE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                  {opt.value === 0 ? (t('admin.tinhTuy.random') || 'Random') : opt.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ color: '#5a6a7a', display: 'block', mb: 0.5 }}>
                              {t('admin.tinhTuy.dice2') || 'Dice 2'}
                            </Typography>
                            <Select
                              size="small"
                              value={ov.dice2 ?? 0}
                              onChange={(e) => handleDiceChange(slot, 'dice2', e.target.value as number)}
                              sx={{ minWidth: 90 }}
                            >
                              {DICE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                  {opt.value === 0 ? (t('admin.tinhTuy.random') || 'Random') : opt.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, mt: 4, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving || !hasChanges}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: '50px',
                  background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                  boxShadow: '0 10px 30px rgba(126, 200, 227, 0.4)',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 35px rgba(126, 200, 227, 0.5)' },
                  '&:disabled': { opacity: 0.5 },
                }}
              >
                {saving
                  ? (t('admin.tinhTuy.saving') || 'Saving...')
                  : (t('admin.tinhTuy.save') || 'Save Changes')}
              </Button>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                disabled={!hasChanges}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: '50px',
                  borderColor: '#7ec8e3',
                  color: '#7ec8e3',
                  '&:hover': { borderColor: '#5ba8c7', bgcolor: 'rgba(126, 200, 227, 0.1)' },
                  '&:disabled': { opacity: 0.5 },
                }}
              >
                {t('admin.tinhTuy.reset') || 'Reset'}
              </Button>
            </Box>
          </Container>
        </Box>
      </MainLayout>
    </AdminRoute>
  );
};

export default TinhTuyRoomConfigPage;
