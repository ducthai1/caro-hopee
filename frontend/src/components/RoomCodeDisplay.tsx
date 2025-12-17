import React, { useState } from 'react';
import { Box, Typography, Paper, IconButton, Snackbar } from '@mui/material';
import { ContentCopy, Check } from '@mui/icons-material';

interface RoomCodeDisplayProps {
  roomCode: string;
  label?: string;
}

const RoomCodeDisplay: React.FC<RoomCodeDisplayProps> = ({ roomCode, label = 'Room Code' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: '#ffffff',
          border: '2px solid transparent',
          borderRadius: 3,
          backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #a8e6cf 0%, #7ec8e3 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: '0 8px 24px rgba(168, 230, 207, 0.12)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 32px rgba(168, 230, 207, 0.18)',
          },
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: '#2c3e50', fontWeight: 600 }}>
            {label}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 800,
              letterSpacing: 3,
              background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: { xs: '1.75rem', md: '2.25rem' },
            }}
          >
            {roomCode}
          </Typography>
        </Box>
        <IconButton
          onClick={handleCopy}
          sx={{
            ml: 'auto',
            color: '#7ec8e3',
            '&:hover': {
              backgroundColor: 'rgba(126, 200, 227, 0.15)',
            },
          }}
        >
          {copied ? <Check sx={{ color: '#a8e6cf' }} /> : <ContentCopy />}
        </IconButton>
      </Paper>
      <Snackbar
        open={copied}
        autoHideDuration={2000}
        message="Room code copied to clipboard!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

export default RoomCodeDisplay;

