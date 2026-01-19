/**
 * CreateGameCard - Card component for creating new games
 */
import React from 'react';
import { Box, Typography, Button, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
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

      {/* Block Two Ends Toggle */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={() => setBlockTwoEnds(!blockTwoEnds)}
          fullWidth
          sx={{
            py: 1.5,
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            minHeight: 48,
            background: blockTwoEnds
              ? 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)'
              : 'transparent',
            color: blockTwoEnds ? '#ffffff' : '#7ec8e3',
            border: '2px solid #7ec8e3',
            boxShadow: blockTwoEnds ? '0 4px 12px rgba(126, 200, 227, 0.3)' : 'none',
            transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              background: blockTwoEnds
                ? 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)'
                : 'rgba(126, 200, 227, 0.1)',
              borderColor: '#5ba8c7',
            },
          }}
        >
          {t('home.blockTwoEnds')}: {blockTwoEnds ? t('gameInfo.on') : t('gameInfo.off')}
        </Button>
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
