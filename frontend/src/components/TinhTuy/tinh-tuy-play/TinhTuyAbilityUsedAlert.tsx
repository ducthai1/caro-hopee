/**
 * TinhTuyAbilityUsedAlert — Snackbar notification when any ability is used.
 * Shows character avatar, player name, and ability description.
 * Auto-dismiss handled by parent context (5s timer).
 */
import React from 'react';
import { Box, Paper, Typography, Slide } from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { useLanguage } from '../../../i18n';
import { CHARACTER_IMAGES, PLAYER_COLORS, BOARD_CELLS } from '../tinh-tuy-types';
import { CHARACTER_ABILITIES } from '../tinh-tuy-abilities';

/** Map abilityId → i18n notification key + interpolation params builder */
function getNotifKey(
  abilityId: string,
  payload: { slot: number; targetSlot?: number; cellIndex?: number; amount?: number },
  players: Array<{ slot: number; displayName?: string; guestName?: string; character: string }>,
  t: (key: string, params?: Record<string, string | number>) => string,
): { key: string; params: Record<string, string | number> } | null {
  const caster = players.find(p => p.slot === payload.slot);
  const name = caster?.displayName || caster?.guestName || `Player ${payload.slot}`;
  const target = payload.targetSlot != null ? players.find(p => p.slot === payload.targetSlot) : null;
  const targetName = target?.displayName || target?.guestName || '';
  const cell = payload.cellIndex != null ? BOARD_CELLS.find(c => c.index === payload.cellIndex) : null;
  const cellName = cell ? t(cell.name as any) : payload.cellIndex != null ? `Ô ${payload.cellIndex}` : '';

  switch (abilityId) {
    case 'shiba-active':
      return { key: 'tinhTuy.abilities.notifications.shibaReroll', params: { name } };
    case 'kungfu-active':
      return { key: 'tinhTuy.abilities.notifications.kungfuDestroy', params: { name, cell: cellName } };
    case 'fox-active':
      return { key: 'tinhTuy.abilities.notifications.foxSwap', params: { name, target: targetName } };
    case 'canoc-active':
      return { key: 'tinhTuy.abilities.notifications.canocSteal', params: { name, target: targetName, amount: payload.amount || 0 } };
    case 'chicken-active':
      return { key: 'tinhTuy.abilities.notifications.chickenSkip', params: { name, target: targetName } };
    case 'rabbit-active':
      return { key: 'tinhTuy.abilities.notifications.rabbitTeleport', params: { name, cell: cellName } };
    case 'horse-active':
      return { key: 'tinhTuy.abilities.notifications.horseGallop', params: { name, steps: payload.amount || 0 } };
    case 'seahorse-active':
      return { key: 'tinhTuy.abilities.notifications.seahorseDraw', params: { name } };
    case 'pigfish-active':
      return { key: 'tinhTuy.abilities.notifications.pigfishDive', params: { name } };
    case 'sloth-active':
      return { key: 'tinhTuy.abilities.notifications.slothHibernate', params: { name } };
    case 'trau-active':
      return { key: 'tinhTuy.abilities.notifications.trauPlow', params: { name } };
    case 'elephant-active':
      return { key: 'tinhTuy.abilities.notifications.elephantBuild', params: { name } };
    case 'owl-active':
      return { key: 'tinhTuy.abilities.notifications.owlForce', params: { name, target: targetName } };
    default:
      return { key: 'tinhTuy.abilities.notifications.abilityUsed', params: { name, ability: abilityId } };
  }
}

export const TinhTuyAbilityUsedAlert: React.FC = () => {
  const { t } = useLanguage();
  const { state } = useTinhTuy();

  const alert = state.abilityUsedAlert;
  if (!alert) return null;

  const caster = state.players.find(p => p.slot === alert.slot);
  if (!caster) return null;

  const character = caster.character;
  const avatarSrc = CHARACTER_IMAGES[character as keyof typeof CHARACTER_IMAGES];
  const color = PLAYER_COLORS[alert.slot] ?? '#9b59b6';

  // Get ability display name
  const abilityDef = CHARACTER_ABILITIES[character as keyof typeof CHARACTER_ABILITIES];
  const abilityName = abilityDef ? (t as any)(abilityDef.active.nameKey) : alert.abilityId;

  // Get notification message
  const notif = getNotifKey(alert.abilityId, alert, state.players as any, t as any);
  const message = notif ? (t as any)(notif.key, notif.params) : '';

  return (
    <Slide direction="down" in={true} mountOnEnter unmountOnExit timeout={300}>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1200,
          borderRadius: 3,
          border: `2px solid ${color}`,
          bgcolor: 'background.paper',
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          maxWidth: { xs: '92vw', sm: 420 },
          boxShadow: `0 4px 20px ${color}40`,
        }}
      >
        {/* Character avatar */}
        {avatarSrc && (
          <Box
            component="img"
            src={avatarSrc}
            alt={character}
            sx={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}`, flexShrink: 0 }}
          />
        )}

        {/* Text content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color, lineHeight: 1.3 }} noWrap>
            ⚡ {abilityName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3, display: 'block' }}>
            {message}
          </Typography>
        </Box>
      </Paper>
    </Slide>
  );
};
