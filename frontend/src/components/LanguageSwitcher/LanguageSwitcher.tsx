import React, { memo } from 'react';
import { Box, ToggleButtonGroup, ToggleButton, Tooltip } from '@mui/material';
import { useLanguage, Language } from '../../i18n';

/**
 * Language Switcher Component
 * Displays EN/VI toggle buttons for quick language switching
 * Placed at top-right corner of the screen
 */
const LanguageSwitcher: React.FC = memo(() => {
  const { language, setLanguage } = useLanguage();

  const handleChange = (_: React.MouseEvent<HTMLElement>, newLang: Language | null) => {
    if (newLang) {
      setLanguage(newLang);
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        // Mobile: below top bar, Desktop: top right
        top: { xs: 'auto', lg: 16 },
        bottom: { xs: 16, lg: 'auto' },
        right: 16,
        zIndex: 999, // Below mobile top bar (1000)
      }}
    >
      <ToggleButtonGroup
        value={language}
        exclusive
        onChange={handleChange}
        size="small"
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          '& .MuiToggleButton-root': {
            border: 'none',
            px: 1.5,
            py: 0.5,
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#5a6a7a',
            '&.Mui-selected': {
              bgcolor: 'rgba(126, 200, 227, 0.2)',
              color: '#7ec8e3',
              '&:hover': {
                bgcolor: 'rgba(126, 200, 227, 0.3)',
              },
            },
            '&:hover': {
              bgcolor: 'rgba(126, 200, 227, 0.1)',
            },
          },
        }}
      >
        <Tooltip title="English" arrow>
          <ToggleButton value="en" aria-label="English">
            EN
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Tiếng Việt" arrow>
          <ToggleButton value="vi" aria-label="Tiếng Việt">
            VI
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>
    </Box>
  );
});

LanguageSwitcher.displayName = 'LanguageSwitcher';

export default LanguageSwitcher;
