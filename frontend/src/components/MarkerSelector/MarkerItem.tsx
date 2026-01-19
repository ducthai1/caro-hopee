/**
 * MarkerItem - Individual marker cell component
 * Memoized to prevent unnecessary re-renders
 * CRITICAL FIX: Removed Tooltip to prevent browser crashes on hover
 */
import React, { useCallback } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export interface MarkerItemProps {
  marker: string;
  isSelected: boolean;
  isDisabled: boolean;
  showTooltip: boolean;
  tooltipText: string;
  onSelect: (marker: string) => void;
}

// Custom comparison function for MarkerItem to prevent unnecessary re-renders
// CRITICAL FIX: Don't compare onSelect function reference as it may change
// The function itself is stable (useCallback), but reference comparison can cause issues
export const areMarkerItemEqual = (prevProps: MarkerItemProps, nextProps: MarkerItemProps): boolean => {
  return (
    prevProps.marker === nextProps.marker &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDisabled === nextProps.isDisabled &&
    prevProps.showTooltip === nextProps.showTooltip &&
    prevProps.tooltipText === nextProps.tooltipText
    // CRITICAL: Removed onSelect comparison to prevent infinite re-renders
    // The function is memoized with useCallback, so it's safe to skip this check
  );
};

const MarkerItem: React.FC<MarkerItemProps> = React.memo(({
  marker,
  isSelected,
  isDisabled,
  showTooltip,
  tooltipText,
  onSelect,
}) => {
  // CRITICAL FIX: Use ref to store latest onSelect to prevent re-renders
  // Initialize ref with current onSelect value
  const onSelectRef = React.useRef(onSelect);
  
  // CRITICAL FIX: Update ref immediately on render, not in useEffect
  // This ensures ref is always up-to-date even if component doesn't re-render
  // (because it's memoized and onSelect is not in comparison function)
  onSelectRef.current = onSelect;

  const handleClick = useCallback(() => {
    if (!isDisabled) {
      onSelectRef.current(marker);
    }
  }, [isDisabled, marker]);

  // CRITICAL FIX: Memoize paperElement to prevent re-creation on every render
  // CRITICAL FIX FOR CHROME: Removed transform scale and optimized transitions
  // Chrome has issues with transform scale in hover causing crashes
  const paperElement = React.useMemo(() => (
    <Paper
      onClick={handleClick}
      sx={{
        p: 2,
        textAlign: 'center',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        border: isSelected
          ? '2px solid #7ec8e3'
          : '1px solid rgba(126, 200, 227, 0.2)',
        borderRadius: 2,
        background: isSelected
          ? 'linear-gradient(135deg, rgba(126, 200, 227, 0.15) 0%, rgba(168, 230, 207, 0.15) 100%)'
          : isDisabled
          ? 'rgba(0, 0, 0, 0.03)'
          : '#ffffff',
        // CRITICAL FIX FOR CHROME: Use specific transitions instead of 'all' to prevent crashes
        // Only transition properties that are safe and necessary
        transition: 'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
        opacity: isDisabled ? 0.5 : 1,
        // CRITICAL FIX FOR CHROME: Add CSS containment to isolate rendering
        contain: 'layout style paint',
        // CRITICAL FIX FOR CHROME: Force GPU acceleration without transform
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        // CRITICAL FIX FOR CHROME: Removed transform scale - Chrome crashes with scale in hover
        // Use box-shadow instead for visual feedback (safer for Chrome)
        // CRITICAL: Keep transform unchanged in hover to prevent Chrome compositor crashes
        '&:hover': !isDisabled ? {
          borderColor: '#7ec8e3',
          background: 'rgba(126, 200, 227, 0.08)',
          boxShadow: '0 4px 12px rgba(126, 200, 227, 0.2)',
          // CRITICAL: Do NOT change transform in hover - causes Chrome crashes
          // Keep same transform value to prevent compositor re-calculation
          transform: 'translateZ(0)', // Must match base transform
        } : {},
      }}
    >
      {isSelected && (
        <CheckCircleIcon
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            fontSize: '1rem',
            color: '#7ec8e3',
          }}
        />
      )}
      <Typography
        sx={{
          fontSize: { xs: '1.5rem', sm: '2rem' },
          lineHeight: 1,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {marker}
      </Typography>
    </Paper>
  ), [handleClick, isDisabled, isSelected, marker]);

  // CRITICAL FIX: Removed Tooltip completely to prevent browser crashes
  // Disabled markers are already visually distinct (opacity, cursor, background)
  // This eliminates all Tooltip-related re-render issues and infinite loops
  return (
    <Box component="div" sx={{ width: '100%' }}>
      {paperElement}
    </Box>
  );
}, areMarkerItemEqual);

MarkerItem.displayName = 'MarkerItem';

export default MarkerItem;

