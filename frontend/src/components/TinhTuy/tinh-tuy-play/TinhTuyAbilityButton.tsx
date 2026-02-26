/**
 * TinhTuyAbilityButton — Inline ability button in the left panel action area.
 * Shows cooldown badge, disabled states, and emits activateAbility() on click.
 * Shows snackbar feedback when ability has no valid targets.
 */
import React, { useState } from 'react';
import { Button, Badge, Tooltip, Snackbar } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { useLanguage } from '../../../i18n';
import { CHARACTER_ABILITIES } from '../tinh-tuy-abilities';

const PURPLE = '#9b59b6';

export const TinhTuyAbilityButton: React.FC = () => {
  const { t } = useLanguage();
  const { state, activateAbility } = useTinhTuy();
  const [noTargetMsg, setNoTargetMsg] = useState(false);

  // Guard: only show during an active game with abilities enabled
  if (state.gameStatus !== 'playing') return null;
  if (!state.settings?.abilitiesEnabled) return null;
  if (state.mySlot === null) return null;

  const myPlayer = state.players.find(p => p.slot === state.mySlot);
  if (!myPlayer || myPlayer.isBankrupt) return null;

  const abilityDef = CHARACTER_ABILITIES[myPlayer.character];
  if (!abilityDef) return null;

  // Shiba reroll is auto-triggered PRE-MOVE, no manual button needed
  if (myPlayer.character === 'shiba') return null;

  const isMyTurn = state.currentPlayerSlot === state.mySlot;

  // Phase gate
  let phaseDisabled = false;
  if (abilityDef.active.phase === 'ROLL_DICE' && state.turnPhase !== 'ROLL_DICE') {
    phaseDisabled = true;
  }
  if (abilityDef.active.phase === 'POST_ROLL' && state.turnPhase === 'ROLL_DICE') {
    phaseDisabled = true;
  }

  const onCooldown = myPlayer.abilityCooldown > 0;
  const usedThisTurn = myPlayer.abilityUsedThisTurn;
  const disabled = !isMyTurn || onCooldown || usedThisTurn || phaseDisabled;

  const abilityName = (t as any)(`tinhTuy.abilities.${myPlayer.character}.active.name`) as string;

  // Check if ability has valid targets before activating
  const hasValidTargets = (): boolean => {
    const targetType = abilityDef.active.targetType;
    if (targetType === 'NONE' || targetType === 'STEPS' || targetType === 'DECK') return true;

    if (targetType === 'OPPONENT') {
      return state.players.some(p => p.slot !== state.mySlot && !p.isBankrupt && !(p.islandTurns > 0));
    }
    if (targetType === 'CELL') {
      if (myPlayer.character === 'elephant') {
        return myPlayer.properties.some(idx => {
          const key = String(idx);
          return !myPlayer.hotels[key] && (myPlayer.houses[key] || 0) < 4;
        });
      }
      return true; // Rabbit: all cells except island
    }
    if (targetType === 'OPPONENT_HOUSE') {
      // Kungfu: opponents with houses > 0 (no hotel)
      for (const p of state.players) {
        if (p.slot === state.mySlot || p.isBankrupt) continue;
        for (const idx of p.properties) {
          const key = String(idx);
          if ((p.houses[key] || 0) > 0 && !p.hotels[key]) return true;
        }
      }
      return false;
    }
    return true;
  };

  const handleClick = () => {
    if (disabled) return;
    if (!hasValidTargets()) {
      setNoTargetMsg(true);
      return;
    }
    activateAbility();
  };

  // Cooldown text for tooltip
  let tooltipText = abilityName;
  if (onCooldown) tooltipText += ` (${myPlayer.abilityCooldown} ${(t as any)('tinhTuy.abilities.cooldown') || 'lượt'})`;

  return (
    <>
      <Tooltip title={tooltipText} placement="right" arrow>
        <span>
          <Badge
            badgeContent={onCooldown ? myPlayer.abilityCooldown : 0}
            color="warning"
            invisible={!onCooldown}
            sx={{ width: '100%', '& .MuiBadge-badge': { fontWeight: 700, fontSize: '0.7rem', minWidth: 18, height: 18 } }}
          >
            <Button
              size="small"
              variant="outlined"
              fullWidth
              disabled={disabled}
              onClick={handleClick}
              sx={{
                borderColor: disabled ? 'rgba(155,89,182,0.3)' : PURPLE,
                color: disabled ? 'text.disabled' : PURPLE,
                fontWeight: 600,
                '&:hover': { borderColor: '#8e44ad', bgcolor: 'rgba(155,89,182,0.08)' },
                '&.Mui-disabled': { borderColor: 'rgba(155,89,182,0.2)', color: 'text.disabled' },
              }}
              startIcon={<span style={{ fontSize: 18, lineHeight: 1 }}>{abilityDef.active.icon}</span>}
            >
              {abilityName}
            </Button>
          </Badge>
        </span>
      </Tooltip>
      <Snackbar
        open={noTargetMsg}
        autoHideDuration={3000}
        onClose={() => setNoTargetMsg(false)}
        message={(t as any)('tinhTuy.abilities.noValidTargets') || 'Không có mục tiêu hợp lệ'}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
    </>
  );
};
