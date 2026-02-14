/**
 * TinhTuyVolumeControl — Volume slider + mute toggle.
 */
import React, { useState, useCallback } from 'react';
import { Box, IconButton, Slider } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { tinhTuySounds } from '../tinh-tuy-sounds';

export const TinhTuyVolumeControl: React.FC = () => {
  const [volume, setVolume] = useState(tinhTuySounds.volume * 100);
  const [muted, setMuted] = useState(tinhTuySounds.isMuted);

  const handleVolumeChange = useCallback((_: Event, value: number | number[]) => {
    const v = value as number;
    setVolume(v);
    tinhTuySounds.setVolume(v / 100);
  }, []);

  const handleToggleMute = useCallback(() => {
    const nowMuted = tinhTuySounds.toggleMute();
    setMuted(nowMuted);
  }, []);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 100 }}>
      <IconButton size="small" onClick={handleToggleMute} sx={{ color: 'text.secondary' }}>
        {muted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
      </IconButton>
      <Slider
        size="small"
        value={volume}
        onChange={handleVolumeChange}
        min={0}
        max={100}
        sx={{ width: 70, color: '#9b59b6' }}
      />
    </Box>
  );
};
