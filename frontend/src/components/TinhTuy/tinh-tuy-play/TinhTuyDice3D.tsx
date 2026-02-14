/**
 * TinhTuyDice3D — 3D dice cubes with roll animation.
 * Each cube has 6 faces with dot patterns, rotates to show correct value.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import './tinh-tuy-board.css';

// ─── Dot patterns for each face (3×3 grid positions) ────
const DOT_PATTERNS: Record<number, number[][]> = {
  1: [[1,1]],
  2: [[0,2],[2,0]],
  3: [[0,2],[1,1],[2,0]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

const DiceDots: React.FC<{ count: number }> = ({ count }) => {
  const dots = DOT_PATTERNS[count] || [];
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        width: '100%',
        height: '100%',
        placeItems: 'center',
      }}
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const hasDot = dots.some(([dr, dc]) => dr === r && dc === c);
        return hasDot ? (
          <Box key={i} className="tt-dice-dot" />
        ) : (
          <Box key={i} />
        );
      })}
    </Box>
  );
};

// ─── Face transforms: position each face of the cube ────
const FACE_SIZE = 22; // half of 44px

const FACE_TRANSFORMS: Record<number, string> = {
  1: `rotateY(0deg)   translateZ(${FACE_SIZE}px)`,
  6: `rotateY(180deg) translateZ(${FACE_SIZE}px)`,
  2: `rotateY(90deg)  translateZ(${FACE_SIZE}px)`,
  5: `rotateY(-90deg) translateZ(${FACE_SIZE}px)`,
  3: `rotateX(-90deg) translateZ(${FACE_SIZE}px)`,
  4: `rotateX(90deg)  translateZ(${FACE_SIZE}px)`,
};

// To show face N facing viewer, rotate cube this way
const VALUE_ROTATIONS: Record<number, string> = {
  1: 'rotateX(0deg)   rotateY(0deg)',
  2: 'rotateX(0deg)   rotateY(-90deg)',
  3: 'rotateX(90deg)  rotateY(0deg)',
  4: 'rotateX(-90deg) rotateY(0deg)',
  5: 'rotateX(0deg)   rotateY(90deg)',
  6: 'rotateX(0deg)   rotateY(180deg)',
};

// ─── Single Dice Cube ───────────────────────────────────
const DiceCube: React.FC<{ value: number; isRolling: boolean }> = ({ value, isRolling }) => {
  return (
    <Box
      className={`tt-dice-cube ${isRolling ? 'rolling' : ''}`}
      sx={{
        transform: isRolling ? undefined : VALUE_ROTATIONS[value] || VALUE_ROTATIONS[1],
      }}
    >
      {[1, 2, 3, 4, 5, 6].map((face) => (
        <Box
          key={face}
          className="tt-dice-face"
          sx={{ transform: FACE_TRANSFORMS[face] }}
        >
          <DiceDots count={face} />
        </Box>
      ))}
    </Box>
  );
};

// ─── Dice 3D Component ──────────────────────────────────
export const TinhTuyDice3D: React.FC = () => {
  const { t } = useLanguage();
  const { state, rollDice } = useTinhTuy();
  const [isRolling, setIsRolling] = useState(false);
  const rollTimerRef = useRef<number | null>(null);

  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const canRoll = isMyTurn && (state.turnPhase === 'ROLL_DICE' || state.turnPhase === 'ISLAND_TURN');

  const handleRoll = useCallback(() => {
    if (isRolling) return;
    setIsRolling(true);
    rollDice();
    // End animation after roll completes — clear any previous timer first
    if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    rollTimerRef.current = window.setTimeout(() => {
      setIsRolling(false);
      rollTimerRef.current = null;
    }, 850);
  }, [rollDice, isRolling]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    };
  }, []);

  // Stop rolling when dice result arrives
  useEffect(() => {
    if (state.lastDiceResult && isRolling) {
      // Let animation finish naturally via timeout
    }
  }, [state.lastDiceResult, isRolling]);

  const dice1 = state.lastDiceResult?.dice1 || 1;
  const dice2 = state.lastDiceResult?.dice2 || 1;
  const isDouble = state.lastDiceResult && state.lastDiceResult.dice1 === state.lastDiceResult.dice2;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      {/* 3D Dice */}
      <Box sx={{ display: 'flex', gap: 3, perspective: 600, py: 1 }}>
        <DiceCube value={dice1} isRolling={isRolling} />
        <DiceCube value={dice2} isRolling={isRolling} />
      </Box>

      {/* Doubles indicator */}
      {isDouble && !isRolling && (
        <Typography variant="caption" sx={{ color: '#e74c3c', fontWeight: 700, fontSize: '0.75rem' }}>
          DOUBLES!
        </Typography>
      )}

      {/* Roll button */}
      {canRoll && (
        <Button
          variant="contained"
          startIcon={<CasinoIcon />}
          onClick={handleRoll}
          disabled={isRolling}
          sx={{
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%)' },
            px: 3, py: 1, fontWeight: 700, fontSize: '0.9rem',
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(155, 89, 182, 0.4)',
          }}
        >
          {isRolling
            ? t('tinhTuy.game.waitingPhase')
            : state.turnPhase === 'ISLAND_TURN'
              ? t('tinhTuy.game.islandRoll' as any)
              : t('tinhTuy.game.rollDice')
          }
        </Button>
      )}

      {/* Status text */}
      {!canRoll && !isRolling && (
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {isMyTurn
            ? state.turnPhase === 'AWAITING_ACTION'
              ? t('tinhTuy.game.chooseAction')
              : t('tinhTuy.game.waitingPhase')
            : t('tinhTuy.game.waitingTurn')
          }
        </Typography>
      )}
    </Box>
  );
};
