/**
 * TinhTuyAbilityInfoModal — In-game modal showing abilities of all current players.
 * Accessible via 📖 button in the left panel header.
 */
import React from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Typography, Chip, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { PLAYER_COLORS, CHARACTER_IMAGES } from '../tinh-tuy-types';
import { CHARACTER_ABILITIES } from '../tinh-tuy-abilities';

const ROLE_COLORS: Record<string, string> = {
  income: '#f39c12', attack: '#e74c3c', defense: '#3498db',
  build: '#2ecc71', movement: '#9b59b6', tactical: '#e67e22',
};

export const TinhTuyAbilityInfoModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { t } = useLanguage();
  const { state } = useTinhTuy();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '85vh' } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        📖 {(t as any)('tinhTuy.abilityInfo.title')}
        <IconButton onClick={onClose} size="small" sx={{ ml: 'auto' }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {state.players.filter(p => !p.isBankrupt).map(player => {
            const ability = CHARACTER_ABILITIES[player.character];
            if (!ability) return null;
            const roleKey = ability.role.split('.').pop() || '';
            const roleColor = ROLE_COLORS[roleKey] || '#999';
            return (
              <Box key={player.slot} sx={{
                border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5,
                borderLeft: `4px solid ${PLAYER_COLORS[player.slot]}`,
              }}>
                {/* Header: avatar + name + role */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box component="img" src={CHARACTER_IMAGES[player.character]} alt={player.character}
                    sx={{ width: 36, height: 36, objectFit: 'contain', borderRadius: '50%', border: `2px solid ${PLAYER_COLORS[player.slot]}` }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
                    {player.displayName}
                  </Typography>
                  <Chip label={(t as any)(ability.role)} size="small"
                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: `${roleColor}18`, color: roleColor, borderColor: roleColor, border: '1px solid' }}
                  />
                </Box>
                {/* Passive */}
                <Box sx={{ mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#3498db' }}>
                    {ability.passive.icon} {(t as any)(ability.passive.nameKey)} <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>({(t as any)('tinhTuy.abilities.passive')})</Typography>
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', pl: 2.5 }}>
                    {(t as any)(ability.passive.descriptionKey)}
                  </Typography>
                </Box>
                {/* Active */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#e74c3c' }}>
                    {ability.active.icon} {(t as any)(ability.active.nameKey)} <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>({(t as any)('tinhTuy.abilities.active')})</Typography>
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', pl: 2.5 }}>
                    {(t as any)(ability.active.descriptionKey)} — ⏳ {ability.active.cooldown} {(t as any)('tinhTuy.abilities.cooldownShort')}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
