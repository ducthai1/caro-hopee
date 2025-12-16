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
        elevation={2}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: 'linear-gradient(135deg, rgba(179, 217, 230, 0.3) 0%, rgba(212, 232, 240, 0.3) 100%)',
          border: '1px solid rgba(179, 217, 230, 0.4)',
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: '#1a4a5c', fontWeight: 600 }}>
            {label}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 'bold',
              letterSpacing: 2,
              background: 'linear-gradient(135deg, #8fc4d6 0%, #b3d9e6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {roomCode}
          </Typography>
        </Box>
        <IconButton
          onClick={handleCopy}
          sx={{
            ml: 'auto',
            color: '#8fc4d6',
            '&:hover': {
              backgroundColor: 'rgba(179, 217, 230, 0.2)',
            },
          }}
        >
          {copied ? <Check sx={{ color: '#5cb3cc' }} /> : <ContentCopy />}
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

