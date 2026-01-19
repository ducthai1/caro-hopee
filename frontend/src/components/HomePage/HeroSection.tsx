/**
 * HeroSection - Hero section with game icon and title
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLanguage } from '../../i18n';
import { GameItem } from './home-page-types';

interface HeroSectionProps {
  currentGame: GameItem | undefined;
}

const HeroSection: React.FC<HeroSectionProps> = ({ currentGame }) => {
  const { t } = useLanguage();

  return (
    <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 6 } }}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          boxShadow: '0 8px 24px rgba(126, 200, 227, 0.3)',
          mb: 2,
        }}
      >
        <Typography sx={{ fontSize: '3rem' }}>{currentGame?.icon}</Typography>
      </Box>
      <Typography
        variant="h2"
        sx={{
          background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: 900,
          mb: 1.5,
          fontSize: { xs: '2.25rem', sm: '3rem', md: '3.5rem' },
          letterSpacing: '-1px',
          lineHeight: 1.1,
        }}
      >
        {currentGame?.name} {t('home.game')}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          color: '#5a6a7a',
          fontWeight: 400,
          fontSize: { xs: '1rem', md: '1.15rem' },
          maxWidth: '650px',
          mx: 'auto',
          lineHeight: 1.7,
        }}
      >
        {t('home.heroDescription')}
      </Typography>
    </Box>
  );
};

export default HeroSection;
