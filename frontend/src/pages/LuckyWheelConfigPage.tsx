import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useLuckyWheel, LuckyWheelProvider } from '../components/LuckyWheel';
import { useLanguage } from '../i18n';
import { useToast } from '../contexts/ToastContext';
import { MainLayout } from '../components/MainLayout';

const LuckyWheelConfigPageContent: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const toast = useToast();
  const { items, setItems, addItem, removeItem, saveConfigToServer, loadConfigFromServer, isLoading } = useLuckyWheel();
  const [localItems, setLocalItems] = useState(items);
  const [saving, setSaving] = useState(false);

  // Sync localItems với items từ context
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleItemChange = (index: number, label: string) => {
    const newItems = [...localItems];
    newItems[index] = { ...newItems[index], label };
    setLocalItems(newItems);
  };

  const handleAddItem = () => {
    if (localItems.length < 12) {
      addItem(`Option ${localItems.length + 1}`);
      setLocalItems([...localItems, { label: `Option ${localItems.length + 1}`, weight: 1 }]);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (localItems.length > 2) {
      removeItem(index);
      setLocalItems(localItems.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    // Validate
    const invalidItems = localItems.filter(item => !item.label || item.label.trim().length === 0);
    if (invalidItems.length > 0) {
      toast.warning('luckyWheel.config.emptyLabels');
      return;
    }

    if (localItems.length < 2) {
      toast.warning('luckyWheel.config.minItems');
      return;
    }

    try {
      setSaving(true);
      await saveConfigToServer(localItems);
      setItems(localItems);
      toast.success('toast.saveSuccess');
      setTimeout(() => navigate('/lucky-wheel'), 1500);
    } catch (err: any) {
      toast.error('toast.saveFailed', { params: { message: err.response?.data?.message || '' } });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await loadConfigFromServer();
      setLocalItems(items);
    } catch (err) {
      toast.error('toast.resetFailed');
    }
  };

  return (
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
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => navigate('/lucky-wheel')}
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
              {t('luckyWheel.config.title') || 'Configure Lucky Wheel Options'}
            </Typography>
          </Box>

          {/* Config Form */}
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
              {t('luckyWheel.config.subtitle') || 'Customize your lucky wheel options (2-12 items)'}
            </Typography>

            {/* Items List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              {localItems.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                  }}
                >
                  <TextField
                    fullWidth
                    label={t('luckyWheel.config.itemLabel') || `Item ${index + 1}`}
                    value={item.label}
                    onChange={(e) => handleItemChange(index, e.target.value)}
                    variant="outlined"
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
                  {localItems.length > 2 && (
                    <IconButton
                      onClick={() => handleRemoveItem(index)}
                      sx={{
                        color: '#ffaaa5',
                        '&:hover': {
                          bgcolor: 'rgba(255, 170, 165, 0.1)',
                        },
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>

            {/* Add Item Button */}
            {localItems.length < 12 && (
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddItem}
                variant="outlined"
                sx={{
                  mb: 3,
                  borderColor: '#7ec8e3',
                  color: '#7ec8e3',
                  '&:hover': {
                    borderColor: '#5ba8c7',
                    bgcolor: 'rgba(126, 200, 227, 0.1)',
                  },
                }}
              >
                {t('luckyWheel.config.addItem') || 'Add Item'}
              </Button>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving || isLoading}
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
                }}
              >
                {saving
                  ? t('luckyWheel.config.saving') || 'Saving...'
                  : t('luckyWheel.config.save') || 'Save Config'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                disabled={isLoading}
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
                }}
              >
                {t('luckyWheel.config.reset') || 'Reset'}
              </Button>
            </Box>

            {/* Info */}
            <Typography
              variant="body2"
              sx={{ mt: 3, color: '#5a6a7a', fontStyle: 'italic' }}
            >
              {t('luckyWheel.config.info') ||
                'Changes are automatically saved to the server. You can have between 2 and 12 items.'}
            </Typography>
          </Paper>
        </Container>
      </Box>
    </MainLayout>
  );
};

const LuckyWheelConfigPage: React.FC = () => {
  return (
    <LuckyWheelProvider>
      <LuckyWheelConfigPageContent />
    </LuckyWheelProvider>
  );
};

export default LuckyWheelConfigPage;
