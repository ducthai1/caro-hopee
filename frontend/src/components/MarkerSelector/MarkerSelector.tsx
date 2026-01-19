/**
 * MarkerSelector - Component for selecting custom game markers
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { useLanguage } from '../../i18n';
import MarkerItem from './MarkerItem';

interface MarkerSelectorProps {
  selectedMarker: string | null;
  otherPlayerMarker: string | null;
  onSelectMarker: (marker: string) => void;
  disabled?: boolean;
}

// Predefined marker collection
const PREDEFINED_MARKERS = [
  '✕', '○', '●', '■', '▲', '◆', '★', '☆',
  '⚫', '⚪', '🔴', '🔵', '🟢', '🟡', '🟣', '🟠',
  '🎯', '🎲', '🎮', '🏆', '⭐', '💎', '🔥', '⚡',
  '❤️', '💙', '💚', '💛', '💜', '🧡', '🖤', '🤍',
  '😀', '😎', '🤖', '👾', '🎨', '🎭', '🎪', '🎬',
];


const MarkerSelector: React.FC<MarkerSelectorProps> = ({
  selectedMarker,
  otherPlayerMarker,
  onSelectMarker,
  disabled = false,
}) => {
  const { t } = useLanguage();
  const [customMarkerImage, setCustomMarkerImage] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Memoize translation strings to prevent re-renders
  // CRITICAL FIX: Removed markerTakenText as Tooltip is disabled to prevent crashes
  // const markerTakenText = useMemo(() => t('game.markerTaken'), [t]);
  const selectMarkerText = useMemo(() => t('game.selectMarker'), [t]);
  const customMarkerText = useMemo(() => t('game.customMarker'), [t]);
  const uploadImageText = useMemo(() => t('game.uploadImage') || 'Tải ảnh lên', [t]);
  const confirmText = useMemo(() => t('common.confirm'), [t]);
  const cancelText = useMemo(() => t('common.cancel'), [t]);
  const selectedMarkerText = useMemo(() => t('game.selectedMarker'), [t]);

  const handlePredefinedSelect = useCallback((marker: string): void => {
    if (disabled) return;
    if (!marker || typeof marker !== 'string' || marker.trim().length === 0) {
      return; // Invalid marker
    }
    const trimmedMarker = marker.trim();
    if (otherPlayerMarker === trimmedMarker) {
      // Marker already taken - could show error here
      return;
    }
    onSelectMarker(trimmedMarker);
  }, [disabled, otherPlayerMarker, onSelectMarker]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError(t('game.invalidImageType') || 'Chỉ chấp nhận file ảnh');
      return;
    }

    // Validate file size (max 100KB to keep base64 reasonable)
    const maxSize = 100 * 1024; // 100KB
    if (file.size > maxSize) {
      setUploadError(t('game.imageTooLarge') || 'Ảnh quá lớn. Tối đa 100KB');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setCustomMarkerImage(result);
        setUploadError(null);
      }
    };
    reader.onerror = () => {
      setUploadError(t('game.imageReadError') || 'Lỗi khi đọc file ảnh');
    };
    reader.readAsDataURL(file);
  }, [t]);

  const handleCustomSubmit = useCallback((): void => {
    if (disabled || !customMarkerImage) return;
    
    // Check if image is already taken by other player
    if (otherPlayerMarker === customMarkerImage) {
      setUploadError(t('game.markerTaken') || 'Dấu này đã được chọn');
      return;
    }
    
    onSelectMarker(customMarkerImage);
    setCustomMarkerImage(null);
    setShowCustomInput(false);
    setUploadError(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [disabled, customMarkerImage, otherPlayerMarker, onSelectMarker, t]);

  const handleRemoveImage = useCallback((): void => {
    setCustomMarkerImage(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const availableMarkers = useMemo(() => {
    return PREDEFINED_MARKERS.filter(
      marker => marker !== otherPlayerMarker
    );
  }, [otherPlayerMarker]);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          fontWeight: 600,
          color: '#2c3e50',
          fontSize: { xs: '1rem', sm: '1.1rem' },
        }}
      >
        {selectMarkerText}
      </Typography>

      {/* Predefined Markers Grid */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(4, 1fr)', sm: 'repeat(5, 1fr)' },
            gap: 1.5,
            // Limit to 4 rows max, rest will scroll
            // Each Paper cell: p: 2 (16px top + 16px bottom = 32px) + fontSize
            // xs: 32px padding + 24px font (1.5rem) = 56px per cell
            // sm: 32px padding + 32px font (2rem) = 64px per cell
            // 4 rows = 4 cells + 3 gaps (gap: 1.5 = 12px)
            maxHeight: { 
              xs: '260px', // 56px * 4 + 12px * 3 = 224px + 36px
              sm: '292px'  // 64px * 4 + 12px * 3 = 256px + 36px
            },
            overflowY: 'auto',
            overflowX: 'hidden',
            // Custom scrollbar styling
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(126, 200, 227, 0.1)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(126, 200, 227, 0.3)',
              borderRadius: '4px',
              '&:hover': {
                background: 'rgba(126, 200, 227, 0.5)',
              },
            },
            // Firefox scrollbar
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(126, 200, 227, 0.3) rgba(126, 200, 227, 0.1)',
            paddingRight: '4px',
          }}
        >
          {availableMarkers.map((marker) => {
            const isSelected = selectedMarker === marker;
            const isDisabled = disabled || marker === otherPlayerMarker;
            // CRITICAL FIX: Removed tooltip to prevent browser crashes
            // Disabled markers are already visually distinct (opacity, cursor)
            const showTooltip = false; // Disabled to prevent crashes
            const tooltipText = ''; // Empty to prevent crashes
            
            return (
              <MarkerItem
                key={marker}
                marker={marker}
                isSelected={isSelected}
                isDisabled={isDisabled}
                showTooltip={showTooltip}
                tooltipText={tooltipText}
                onSelect={handlePredefinedSelect}
              />
            );
          })}
        </Box>
      </Box>

      {/* Custom Marker Upload */}
      <Box>
        {!showCustomInput ? (
          <Button
            variant="outlined"
            fullWidth
            onClick={() => setShowCustomInput(true)}
            disabled={disabled}
            startIcon={<CloudUploadIcon />}
            sx={{
              py: 1.5,
              borderRadius: 2,
              borderColor: 'rgba(126, 200, 227, 0.3)',
              color: '#7ec8e3',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                borderColor: '#7ec8e3',
                background: 'rgba(126, 200, 227, 0.08)',
              },
            }}
          >
            {customMarkerText}
          </Button>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={disabled}
            />
            
            {/* Upload button or image preview */}
            {!customMarkerImage ? (
              <Button
                variant="outlined"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                startIcon={<CloudUploadIcon />}
                sx={{
                  py: 2,
                  borderRadius: 2,
                  borderColor: 'rgba(126, 200, 227, 0.3)',
                  borderStyle: 'dashed',
                  color: '#7ec8e3',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#7ec8e3',
                    background: 'rgba(126, 200, 227, 0.08)',
                    borderStyle: 'dashed',
                  },
                }}
              >
                {uploadImageText}
              </Button>
            ) : (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 2,
                  borderRadius: 2,
                  border: '2px solid rgba(126, 200, 227, 0.3)',
                  background: 'rgba(126, 200, 227, 0.05)',
                }}
              >
                <Box
                  component="img"
                  src={customMarkerImage}
                  alt="Custom marker preview"
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '80px',
                    objectFit: 'contain',
                    borderRadius: 1,
                  }}
                />
                <IconButton
                  onClick={handleRemoveImage}
                  disabled={disabled}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: '#ff6b6b',
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 1)',
                    },
                  }}
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            
            {/* Error message */}
            {uploadError && (
              <Typography
                variant="caption"
                sx={{
                  color: '#ff6b6b',
                  textAlign: 'center',
                  fontSize: '0.875rem',
                }}
              >
                {uploadError}
              </Typography>
            )}
            
            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleCustomSubmit}
                disabled={disabled || !customMarkerImage}
                fullWidth
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
                  color: '#ffffff',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
                  },
                  '&:disabled': {
                    background: 'rgba(126, 200, 227, 0.3)',
                  },
                }}
              >
                {confirmText}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomMarkerImage(null);
                  setUploadError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={disabled}
                sx={{
                  minWidth: 80,
                  borderRadius: 2,
                  borderColor: 'rgba(126, 200, 227, 0.3)',
                  color: '#7ec8e3',
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                {cancelText}
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Selected Marker Display */}
      {selectedMarker && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.1) 0%, rgba(168, 230, 207, 0.1) 100%)',
            border: '1px solid rgba(126, 200, 227, 0.2)',
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: '#5a6a7a', display: 'block', mb: 1 }}>
            {selectedMarkerText}
          </Typography>
          {selectedMarker.startsWith('data:image') ? (
            <Box
              component="img"
              src={selectedMarker}
              alt="Selected marker"
              sx={{
                maxWidth: '100%',
                maxHeight: '80px',
                objectFit: 'contain',
                borderRadius: 1,
              }}
            />
          ) : (
            <Typography
              sx={{
                fontSize: '2.5rem',
                lineHeight: 1,
              }}
            >
              {selectedMarker}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default MarkerSelector;

