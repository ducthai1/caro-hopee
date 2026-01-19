/**
 * CreateGameCard - Card component for creating new games
 */
import React from 'react';
import { Box, Typography, Button, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useLanguage } from '../../i18n';
import { BOARD_SIZES } from '../../utils/constants';

interface CreateGameCardProps {
  boardSize: number;
  setBoardSize: (size: number) => void;
  blockTwoEnds: boolean;
  setBlockTwoEnds: (block: boolean) => void;
  onCreateGame: () => void;
}

const CreateGameCard: React.FC<CreateGameCardProps> = ({
  boardSize,
  setBoardSize,
  blockTwoEnds,
  setBlockTwoEnds,
  onCreateGame,
}) => {
  const { t } = useLanguage();

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3.5, md: 4.5 },
        background: '#ffffff',
        border: '1px solid rgba(126, 200, 227, 0.2)',
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(126, 200, 227, 0.12)',
        transition: 'box-shadow 0.3s ease',
        '&:hover': {
          boxShadow: '0 16px 48px rgba(126, 200, 227, 0.2)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '5px',
          background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          borderRadius: '16px 16px 0 0',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(126, 200, 227, 0.3)',
            }}
          >
            <Typography sx={{ fontSize: '1.5rem' }}>✨</Typography>
          </Box>
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: '#2c3e50',
                fontWeight: 700,
                fontSize: { xs: '1.4rem', md: '1.6rem' },
                mb: 0.25,
              }}
            >
              {t('home.createNewGame')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#5a6a7a', fontSize: '0.9rem' }}>
              {t('home.createGameDescription')}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Board Size Select */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel sx={{ fontWeight: 500, color: '#5a6a7a' }}>{t('home.boardSize')}</InputLabel>
        <Select
          value={boardSize}
          onChange={(e) => setBoardSize(Number(e.target.value))}
          label={t('home.boardSize')}
          sx={{
            borderRadius: 2.5,
            bgcolor: 'rgba(126, 200, 227, 0.05)',
          }}
        >
          {BOARD_SIZES.map((size) => (
            <MenuItem key={size} value={size}>
              {size}x{size}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Block Two Ends Toggle - Modern Switch Style */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderRadius: 2.5,
            bgcolor: 'rgba(126, 200, 227, 0.05)',
            border: '1px solid rgba(126, 200, 227, 0.15)',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(126, 200, 227, 0.08)',
              borderColor: 'rgba(126, 200, 227, 0.25)',
            },
          }}
        >
          {/* Label */}
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: '0.95rem',
                color: '#2c3e50',
                mb: 0.5,
              }}
            >
              {t('home.blockTwoEnds')}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.8rem',
                color: '#5a6a7a',
              }}
            >
              {blockTwoEnds
                ? t('gameInfo.blockTwoEndsEnabled')
                : t('gameInfo.blockTwoEndsDisabled')}
            </Typography>
          </Box>

          {/* Toggle Switch */}
          <Box
            onClick={() => setBlockTwoEnds(!blockTwoEnds)}
            sx={{
              position: 'relative',
              width: 56,
              height: 32,
              borderRadius: 16,
              cursor: 'pointer',
              bgcolor: blockTwoEnds ? '#7ec8e3' : '#e0e0e0',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              flexShrink: 0,
              '&:hover': {
                bgcolor: blockTwoEnds ? '#6bb5d1' : '#d0d0d0',
              },
            }}
          >
            {/* Toggle Circle */}
            <Box
              sx={{
                position: 'absolute',
                top: 4,
                left: blockTwoEnds ? 28 : 4,
                width: 24,
                height: 24,
                borderRadius: '50%',
                bgcolor: '#ffffff',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {blockTwoEnds ? (
                <CheckCircleIcon
                  sx={{
                    fontSize: 16,
                    color: '#7ec8e3',
                  }}
                />
              ) : (
                <CancelIcon
                  sx={{
                    fontSize: 16,
                    color: '#9e9e9e',
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Create Game Button */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={onCreateGame}
        sx={{
          py: 2,
          borderRadius: 2.5,
          textTransform: 'none',
          fontSize: '1.05rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          boxShadow: '0 6px 20px rgba(126, 200, 227, 0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
            boxShadow: '0 8px 28px rgba(126, 200, 227, 0.5)',
          },
        }}
      >
        {t('home.createGame')}
      </Button>
    </Paper>
  );
};

export default CreateGameCard;
