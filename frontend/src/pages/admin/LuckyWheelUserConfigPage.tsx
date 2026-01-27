import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Slider,
  Button,
  IconButton,
  TextField,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import { adminApi, WheelItem } from '../../services/api';
import { useLanguage } from '../../i18n';
import AdminRoute from '../../components/AdminRoute';
import { MainLayout } from '../../components/MainLayout';

const LuckyWheelUserConfigPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const guestId = searchParams.get('guestId');
  const navigate = useNavigate();
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [userInfo, setUserInfo] = useState<{
    id: string;
    userId: string | null;
    guestId: string | null;
    username: string | null;
    guestName: string | null;
    displayName: string;
    userType: 'authenticated' | 'guest';
  } | null>(null);
  const [items, setItems] = useState<WheelItem[]>([]);
  const [originalItems, setOriginalItems] = useState<WheelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadUserConfig();
  }, [userId, guestId]);

  const loadUserConfig = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getUserConfig(userId, guestId || undefined);
      setUserInfo({
        id: response.id,
        userId: response.userId,
        guestId: response.guestId,
        username: response.username,
        guestName: response.guestName,
        displayName: response.displayName,
        userType: response.userType,
      });
      setItems(response.items);
      setOriginalItems(JSON.parse(JSON.stringify(response.items))); // Deep copy
    } catch (err: any) {
      setError(err.response?.data?.message || t('admin.luckyWheel.loadError') || 'Failed to load user config');
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (index: number, value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], weight: value };
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await adminApi.updateUserConfig(userId, items, guestId || undefined);

      setSuccess(true);
      setOriginalItems(JSON.parse(JSON.stringify(items))); // Update original
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || t('admin.luckyWheel.saveError') || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setItems(JSON.parse(JSON.stringify(originalItems))); // Reset to original
  };

  const hasChanges = JSON.stringify(items) !== JSON.stringify(originalItems);

  if (loading) {
    return (
      <AdminRoute>
        <MainLayout>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '100vh',
            }}
          >
            <CircularProgress sx={{ color: '#7ec8e3' }} />
          </Box>
        </MainLayout>
      </AdminRoute>
    );
  }

  if (!userInfo) {
    return (
      <AdminRoute>
        <MainLayout>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error">
              {t('admin.luckyWheel.userNotFound') || 'User not found'}
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
          <Container maxWidth="lg">
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <IconButton
                onClick={() => navigate('/admin/lucky-wheel')}
                sx={{
                  bgcolor: 'rgba(126, 200, 227, 0.1)',
                  border: '1px solid rgba(126, 200, 227, 0.2)',
                  color: '#7ec8e3',
                  '&:hover': {
                    bgcolor: 'rgba(126, 200, 227, 0.2)',
                  },
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
                  {t('admin.luckyWheel.manageConfig') || 'Manage User Config'}
                </Typography>
                <Typography variant="body1" sx={{ color: '#5a6a7a', mt: 0.5 }}>
                  {userInfo.displayName} ({userInfo.userType === 'authenticated' ? t('admin.luckyWheel.authenticated') || 'Authenticated' : t('admin.luckyWheel.guest') || 'Guest'})
                </Typography>
              </Box>
            </Box>

            {/* Alerts */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {t('admin.luckyWheel.saveSuccess') || 'Config saved successfully!'}
              </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 4 }}>
              {/* Config Panel */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4 },
                  background: '#ffffff',
                  border: '2px solid transparent',
                  borderRadius: 4,
                  backgroundImage:
                    'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  boxShadow: '0 12px 40px rgba(126, 200, 227, 0.15)',
                }}
              >
                <Typography variant="h6" sx={{ mb: 3, color: '#2c3e50', fontWeight: 600 }}>
                  {t('admin.luckyWheel.adjustWeights') || 'Adjust Option Weights'}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {items.map((item, index) => (
                    <Box key={index}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography sx={{ fontWeight: 600, color: '#2c3e50' }}>
                          {item.label}
                        </Typography>
                        <Typography sx={{ color: '#7ec8e3', fontWeight: 700, minWidth: 50, textAlign: 'right' }}>
                          {item.weight}%
                        </Typography>
                      </Box>
                      <Slider
                        value={item.weight}
                        onChange={(_, value) => handleWeightChange(index, value as number)}
                        min={0}
                        max={100}
                        step={1}
                        sx={{
                          color: '#7ec8e3',
                          '& .MuiSlider-thumb': {
                            '&:hover': {
                              boxShadow: '0 0 0 8px rgba(126, 200, 227, 0.16)',
                            },
                          },
                          '& .MuiSlider-track': {
                            background: 'linear-gradient(90deg, #7ec8e3 0%, #a8e6cf 100%)',
                          },
                        }}
                      />
                    </Box>
                  ))}
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
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 35px rgba(126, 200, 227, 0.5)',
                      },
                      '&:disabled': {
                        opacity: 0.5,
                      },
                    }}
                  >
                    {saving
                      ? t('admin.luckyWheel.saving') || 'Saving...'
                      : t('admin.luckyWheel.save') || 'Save Changes'}
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
                      '&:hover': {
                        borderColor: '#5ba8c7',
                        bgcolor: 'rgba(126, 200, 227, 0.1)',
                      },
                      '&:disabled': {
                        opacity: 0.5,
                      },
                    }}
                  >
                    {t('admin.luckyWheel.reset') || 'Reset'}
                  </Button>
                </Box>
              </Paper>

              {/* Preview Panel */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4 },
                  background: '#ffffff',
                  border: '2px solid transparent',
                  borderRadius: 4,
                  backgroundImage:
                    'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  boxShadow: '0 12px 40px rgba(126, 200, 227, 0.15)',
                }}
              >
                <Typography variant="h6" sx={{ mb: 3, color: '#2c3e50', fontWeight: 600 }}>
                  {t('admin.luckyWheel.preview') || 'Preview'}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                  <Typography variant="body2" sx={{ color: '#5a6a7a', fontStyle: 'italic' }}>
                    {t('admin.luckyWheel.previewNote') || 'Preview will show the wheel with updated weights'}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Container>
        </Box>
      </MainLayout>
    </AdminRoute>
  );
};

export default LuckyWheelUserConfigPage;
