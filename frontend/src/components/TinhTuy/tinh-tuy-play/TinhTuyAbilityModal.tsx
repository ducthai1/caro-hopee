/**
 * TinhTuyAbilityModal — Target selection dialog for active abilities.
 * Shows when state.abilityModal is not null. No auto-dismiss — user picks manually.
 * Handles OPPONENT / CELL / OPPONENT_HOUSE / STEPS / DECK target types.
 */
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Divider, Slider,
} from '@mui/material';
import { useTinhTuy } from '../TinhTuyContext';
import { useLanguage } from '../../../i18n';
import { BOARD_CELLS, PLAYER_COLORS } from '../tinh-tuy-types';

const ACCENT = '#9b59b6';

export const TinhTuyAbilityModal: React.FC = () => {
  const { t } = useLanguage();
  const { state, activateAbility, clearAbilityModal } = useTinhTuy();
  const modal = state.abilityModal;

  const [steps, setSteps] = useState<number>(7);

  if (!modal) return null;

  const handleSelectOpponent = (slot: number) => {
    activateAbility({ targetSlot: slot });
  };

  const handleSelectCell = (cellIndex: number, ownerSlot?: number) => {
    if (ownerSlot != null) {
      activateAbility({ cellIndex, targetSlot: ownerSlot });
    } else {
      activateAbility({ cellIndex });
    }
  };

  const handleSelectSteps = () => {
    activateAbility({ steps });
  };

  const handleSelectDeck = (deck: 'KHI_VAN' | 'CO_HOI') => {
    activateAbility({ deck });
  };

  const handleCancel = () => {
    clearAbilityModal();
  };

  // Title based on type
  const titleKey: Record<typeof modal.type, string> = {
    OPPONENT: 'tinhTuy.abilities.selectTarget',
    CELL: 'tinhTuy.abilities.selectCell',
    OPPONENT_HOUSE: 'tinhTuy.abilities.selectTarget',
    STEPS: 'tinhTuy.abilities.selectSteps',
    DECK: 'tinhTuy.abilities.selectDeck',
  };

  const renderContent = () => {
    switch (modal.type) {
      case 'OPPONENT': {
        const targets = modal.targets || [];
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {targets.map(target => (
              <Button
                key={target.slot}
                onClick={() => handleSelectOpponent(target.slot)}
                variant="outlined"
                fullWidth
                sx={{
                  justifyContent: 'flex-start', textTransform: 'none',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: `${ACCENT}12`, borderColor: ACCENT },
                }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PLAYER_COLORS[target.slot] ?? '#999', mr: 1.5, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, textAlign: 'left' }}>
                  {target.displayName}
                </Typography>
              </Button>
            ))}
          </Box>
        );
      }

      case 'CELL': {
        const cells = modal.cells || [];
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 320, overflowY: 'auto' }}>
            {cells.map(cellIndex => {
              const cell = BOARD_CELLS.find(c => c.index === cellIndex);
              const name = cell ? (t as any)(cell.name) : `Ô ${cellIndex}`;
              return (
                <Button
                  key={cellIndex}
                  onClick={() => handleSelectCell(cellIndex)}
                  variant="outlined"
                  fullWidth
                  sx={{
                    justifyContent: 'flex-start', textTransform: 'none',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: `${ACCENT}12`, borderColor: ACCENT },
                  }}
                >
                  {cell?.icon && (
                    <Box
                      component="img"
                      src={`/location/${cell.icon}`}
                      alt=""
                      sx={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 1, mr: 1, flexShrink: 0 }}
                    />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, textAlign: 'left' }} noWrap>
                    {name}
                  </Typography>
                </Button>
              );
            })}
          </Box>
        );
      }

      case 'OPPONENT_HOUSE': {
        const houses = modal.houses || [];
        // Group by slot
        const bySlot = new Map<number, typeof houses>();
        for (const h of houses) {
          const arr = bySlot.get(h.slot) || [];
          arr.push(h);
          bySlot.set(h.slot, arr);
        }

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 360, overflowY: 'auto' }}>
            {Array.from(bySlot.entries()).map(([slot, items], gi) => {
              const player = state.players.find(p => p.slot === slot);
              const color = PLAYER_COLORS[slot] ?? '#999';
              return (
                <Box key={slot}>
                  {gi > 0 && <Divider sx={{ mb: 1 }} />}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color }}>
                      {player?.displayName ?? `Player ${slot}`}
                    </Typography>
                  </Box>
                  {items.map(item => {
                    const cell = BOARD_CELLS.find(c => c.index === item.cellIndex);
                    const name = cell ? (t as any)(cell.name) : `Ô ${item.cellIndex}`;
                    return (
                      <Button
                        key={item.cellIndex}
                        onClick={() => handleSelectCell(item.cellIndex, slot)}
                        variant="outlined"
                        fullWidth
                        sx={{
                          justifyContent: 'flex-start', textTransform: 'none', mb: 0.5,
                          borderColor: 'divider',
                          '&:hover': { bgcolor: `${ACCENT}12`, borderColor: ACCENT },
                        }}
                      >
                        {cell?.icon && (
                          <Box
                            component="img"
                            src={`/location/${cell.icon}`}
                            alt=""
                            sx={{ width: 26, height: 26, objectFit: 'contain', borderRadius: 1, mr: 1, flexShrink: 0 }}
                          />
                        )}
                        <Box sx={{ flex: 1, textAlign: 'left' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
                            {name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#27ae60' }}>
                            {'🏠'.repeat(item.houses)}
                          </Typography>
                        </Box>
                      </Button>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        );
      }

      case 'STEPS': {
        return (
          <Box sx={{ px: 1, pt: 1, pb: 0.5 }}>
            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 2 }}>
              {(t as any)('tinhTuy.abilities.selectSteps')}
            </Typography>
            <Typography variant="h4" sx={{ textAlign: 'center', fontWeight: 700, color: ACCENT, mb: 2 }}>
              {steps}
            </Typography>
            <Slider
              value={steps}
              onChange={(_, val) => setSteps(val as number)}
              min={2}
              max={12}
              step={1}
              marks
              valueLabelDisplay="auto"
              sx={{ color: ACCENT }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>2</Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>12</Typography>
            </Box>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSelectSteps}
              sx={{ mt: 2, bgcolor: ACCENT, '&:hover': { bgcolor: '#8e44ad' }, textTransform: 'none', fontWeight: 700 }}
            >
              {(t as any)('tinhTuy.abilities.activateAbility')}
            </Button>
          </Box>
        );
      }

      case 'DECK': {
        return (
          <Box sx={{ display: 'flex', gap: 1.5, pt: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => handleSelectDeck('KHI_VAN')}
              sx={{
                flexDirection: 'column', py: 2, textTransform: 'none', borderColor: '#3498db',
                '&:hover': { bgcolor: 'rgba(52,152,219,0.08)', borderColor: '#3498db' },
              }}
            >
              <Typography variant="h5">🌀</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>Khí Vận</Typography>
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => handleSelectDeck('CO_HOI')}
              sx={{
                flexDirection: 'column', py: 2, textTransform: 'none', borderColor: '#e67e22',
                '&:hover': { bgcolor: 'rgba(230,126,34,0.08)', borderColor: '#e67e22' },
              }}
            >
              <Typography variant="h5">💡</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>Cơ Hội</Typography>
            </Button>
          </Box>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 300 }}
      PaperProps={{ sx: { borderRadius: 3, borderTop: `4px solid ${ACCENT}` } }}
    >
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0.5, color: ACCENT }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {(t as any)(titleKey[modal.type])}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pb: modal.type === 'STEPS' ? 0 : 1, pt: 0.5 }}>
        {renderContent()}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, pt: modal.type === 'STEPS' ? 0 : 0.5 }}>
        <Button
          onClick={handleCancel}
          variant="text"
          fullWidth
          sx={{ textTransform: 'none', color: 'text.secondary' }}
        >
          {(t as any)('tinhTuy.game.cancel') ?? 'Huỷ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
