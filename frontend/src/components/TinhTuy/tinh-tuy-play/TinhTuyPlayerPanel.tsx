/**
 * TinhTuyPlayerPanel — Stats for all players: name, points, properties, turn indicator.
 */
import React from 'react';
import { Box, Typography, Paper, Chip, Button } from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { PLAYER_COLORS } from '../tinh-tuy-types';

export const TinhTuyPlayerPanel: React.FC = () => {
  const { t } = useLanguage();
  const { state, surrender } = useTinhTuy();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Round indicator */}
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textAlign: 'center' }}>
        {t('tinhTuy.game.round')} {state.round}
      </Typography>

      {/* Player cards */}
      {state.players.map((player) => {
        const isCurrentTurn = state.currentPlayerSlot === player.slot;
        const isMe = state.mySlot === player.slot;

        return (
          <Paper
            key={player.slot}
            elevation={isCurrentTurn ? 3 : 1}
            sx={{
              p: 1.5,
              borderRadius: 2,
              borderLeft: `4px solid ${PLAYER_COLORS[player.slot] || '#999'}`,
              opacity: player.isBankrupt ? 0.5 : 1,
              bgcolor: isCurrentTurn ? 'rgba(155, 89, 182, 0.06)' : 'background.paper',
              transition: 'all 0.2s ease',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700, flex: 1,
                  color: player.isBankrupt ? 'text.disabled' : 'text.primary',
                  textDecoration: player.isBankrupt ? 'line-through' : 'none',
                }}
              >
                {player.displayName}
                {isMe && <Typography component="span" variant="caption" sx={{ color: '#9b59b6', ml: 0.5 }}>({t('tinhTuy.lobby.you')})</Typography>}
              </Typography>
              {isCurrentTurn && !player.isBankrupt && (
                <Chip label="🎯" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
              {!player.isConnected && !player.isBankrupt && (
                <Chip label="📡" size="small" sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'rgba(231, 76, 60, 0.15)' }} />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#9b59b6' }}>
                🔮 {player.points.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#27ae60' }}>
                🏠 {player.properties.length}
              </Typography>
              {player.islandTurns > 0 && (
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#e67e22' }}>
                  🏝️ {player.islandTurns}
                </Typography>
              )}
              {player.isBankrupt && (
                <Chip label={t('tinhTuy.game.bankrupt')} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(231, 76, 60, 0.15)', color: '#e74c3c' }} />
              )}
            </Box>
            {/* Active buffs / held cards */}
            {!player.isBankrupt && (player.cards.length > 0 || player.immunityNextRent || player.doubleRentTurns > 0 || player.skipNextTurn) && (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                {player.cards.includes('escape-island') && (
                  <Chip label={`🃏 ${t('tinhTuy.game.buffEscapeIsland' as any)}`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(39, 174, 96, 0.12)', color: '#27ae60' }} />
                )}
                {player.immunityNextRent && (
                  <Chip label={`🛡️ ${t('tinhTuy.game.buffImmunity' as any)}`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(52, 152, 219, 0.12)', color: '#2980b9' }} />
                )}
                {player.doubleRentTurns > 0 && (
                  <Chip label={`⚡ ${t('tinhTuy.game.buffDoubleRent' as any, { turns: player.doubleRentTurns } as any)}`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(155, 89, 182, 0.12)', color: '#8e44ad' }} />
                )}
                {player.skipNextTurn && (
                  <Chip label={`⏭️ ${t('tinhTuy.game.buffSkipTurn' as any)}`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(231, 76, 60, 0.12)', color: '#e74c3c' }} />
                )}
              </Box>
            )}
          </Paper>
        );
      })}

      {/* Surrender button */}
      {state.mySlot && !state.players.find(p => p.slot === state.mySlot)?.isBankrupt && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<FlagIcon />}
          onClick={surrender}
          sx={{
            borderColor: 'rgba(231, 76, 60, 0.5)', color: '#e74c3c',
            '&:hover': { borderColor: '#c0392b', bgcolor: 'rgba(231, 76, 60, 0.08)' },
            mt: 1, fontWeight: 600,
          }}
        >
          {t('tinhTuy.game.surrender')}
        </Button>
      )}
    </Box>
  );
};
