/**
 * TinhTuyAbilityButton — Floating action button for the player's active ability.
 * Shows cooldown badge, disabled states, and emits activateAbility() on click.
 */
import React from 'react';
import { Fab, Badge, Tooltip } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { useLanguage } from '../../../i18n';
import { CHARACTER_ABILITIES } from '../tinh-tuy-abilities';

const PURPLE = '#9b59b6';

export const TinhTuyAbilityButton: React.FC = () => {
  const { t } = useLanguage();
  const { state, activateAbility } = useTinhTuy();

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

  const tooltipLabel = (t as any)(`tinhTuy.abilities.${myPlayer.character}.active.name`) as string;

  const handleClick = () => {
    if (disabled) return;
    activateAbility();
  };

  const fabSx = {
    position: 'fixed' as const,
    bottom: 80,
    right: 16,
    zIndex: 1000,
    bgcolor: disabled ? 'grey.500' : PURPLE,
    color: '#fff',
    opacity: disabled ? 0.55 : 1,
    fontSize: 24,
    '&:hover': {
      bgcolor: disabled ? 'grey.500' : '#8e44ad',
    },
    '&.Mui-disabled': {
      bgcolor: 'grey.500',
      color: '#fff',
      opacity: 0.55,
    },
  };

  return (
    <Tooltip title={tooltipLabel} placement="left" arrow>
      <span style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 1000 }}>
        <Badge
          badgeContent={onCooldown ? myPlayer.abilityCooldown : 0}
          color="warning"
          invisible={!onCooldown}
          overlap="circular"
          sx={{ '& .MuiBadge-badge': { fontWeight: 700, fontSize: '0.7rem', minWidth: 18, height: 18 } }}
        >
          <Fab
            size="medium"
            disabled={disabled}
            onClick={handleClick}
            sx={fabSx}
            aria-label={tooltipLabel}
          >
            <span style={{ fontSize: 24, lineHeight: 1 }}>{abilityDef.active.icon}</span>
          </Fab>
        </Badge>
      </span>
    </Tooltip>
  );
};
