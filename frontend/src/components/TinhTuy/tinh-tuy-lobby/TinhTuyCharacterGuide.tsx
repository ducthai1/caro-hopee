/**
 * TinhTuyCharacterGuide — Modal showing all 13 characters with abilities + balance table.
 */
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Tabs, Tab, Box, Typography, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useLanguage } from '../../../i18n';
import { VALID_CHARACTERS, CHARACTER_IMAGES, TinhTuyCharacter } from '../tinh-tuy-types';
import { CHARACTER_ABILITIES } from '../tinh-tuy-abilities';

interface Props {
  open: boolean;
  onClose: () => void;
  abilitiesEnabled?: boolean;
}

// Keyed by role identifier (last segment of i18n key) for decoupling
const ROLE_COLORS: Record<string, string> = {
  income: '#f39c12',
  attack: '#e74c3c',
  defense: '#3498db',
  build: '#2ecc71',
  movement: '#9b59b6',
  tactical: '#e67e22',
};

interface BalanceEntry {
  char: TinhTuyCharacter;
  passiveTT: number;
  activeTT: number;
  totalTT: number;
}

const BALANCE_DATA: BalanceEntry[] = [
  { char: 'chicken', passiveTT: 12000, activeTT: 3000, totalTT: 15000 },
  { char: 'canoc', passiveTT: 9000, activeTT: 5000, totalTT: 14000 },
  { char: 'kungfu', passiveTT: 8000, activeTT: 5000, totalTT: 13000 },
  { char: 'fox', passiveTT: 8000, activeTT: 4000, totalTT: 12000 },
  { char: 'shiba', passiveTT: 5000, activeTT: 6000, totalTT: 11000 },
  { char: 'elephant', passiveTT: 6000, activeTT: 5000, totalTT: 11000 },
  { char: 'seahorse', passiveTT: 5000, activeTT: 5000, totalTT: 10000 },
  { char: 'trau', passiveTT: 6000, activeTT: 4000, totalTT: 10000 },
  { char: 'horse', passiveTT: 4000, activeTT: 5500, totalTT: 9500 },
  { char: 'owl', passiveTT: 4000, activeTT: 5000, totalTT: 9000 },
  { char: 'sloth', passiveTT: 5000, activeTT: 4000, totalTT: 9000 },
  { char: 'pigfish', passiveTT: 5000, activeTT: 3500, totalTT: 8500 },
  { char: 'rabbit', passiveTT: 3000, activeTT: 5000, totalTT: 8000 },
];

export const TinhTuyCharacterGuide: React.FC<Props> = ({ open, onClose, abilitiesEnabled = true }) => {
  const { t } = useLanguage();
  const [tab, setTab] = useState(0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
          {t('tinhTuy.guide.title')}
        </Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      {abilitiesEnabled && (
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={t('tinhTuy.guide.tabCharacters')} />
          <Tab label={t('tinhTuy.guide.tabBalance')} />
        </Tabs>
      )}

      <DialogContent sx={{ pt: 2 }}>
        {(tab === 0 || !abilitiesEnabled) && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            {VALID_CHARACTERS.map((char) => {
              const ability = CHARACTER_ABILITIES[char];
              const roleId = ability.role.split('.').pop() ?? '';
              const roleColor = ROLE_COLORS[roleId] || '#666';
              return (
                <Box
                  key={char}
                  sx={{
                    border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5,
                    display: 'flex', flexDirection: 'column', gap: 0.75,
                  }}
                >
                  {/* Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      component="img"
                      src={CHARACTER_IMAGES[char]}
                      alt={char}
                      draggable={false}
                      sx={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {t(`tinhTuy.characters.${char}`)}
                      </Typography>
                      <Chip
                        label={t(ability.role)}
                        size="small"
                        sx={{
                          mt: 0.25, height: 20, fontSize: '0.65rem', fontWeight: 600,
                          bgcolor: `${roleColor}18`, color: roleColor, borderColor: `${roleColor}40`,
                          border: '1px solid',
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Passive */}
                  <Box sx={{ opacity: abilitiesEnabled ? 1 : 0.45 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#3498db' }}>
                      {ability.passive.icon} {t(ability.passive.nameKey)}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.4 }}>
                      {t(ability.passive.descriptionKey)}
                    </Typography>
                  </Box>

                  {/* Active */}
                  <Box sx={{ opacity: abilitiesEnabled ? 1 : 0.45 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#e74c3c' }}>
                      {ability.active.icon} {t(ability.active.nameKey)}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.4 }}>
                      {t(ability.active.descriptionKey)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                      {t('tinhTuy.abilities.cooldown', { turns: ability.active.cooldown })}
                    </Typography>
                  </Box>

                  {!abilitiesEnabled && (
                    <Chip
                      label={t('tinhTuy.abilities.disabled')}
                      size="small"
                      sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(0,0,0,0.06)', color: 'text.disabled', fontSize: '0.65rem', height: 20 }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {tab === 1 && abilitiesEnabled && (
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              {t('tinhTuy.guide.balanceNote')}
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(155, 89, 182, 0.06)' }}>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t('tinhTuy.guide.character')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t('tinhTuy.guide.passiveTT')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t('tinhTuy.guide.activeTT')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t('tinhTuy.guide.totalTT')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t('tinhTuy.guide.sweetSpot')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {BALANCE_DATA.map((row) => (
                    <TableRow key={row.char} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box
                            component="img"
                            src={CHARACTER_IMAGES[row.char]}
                            alt={row.char}
                            draggable={false}
                            sx={{ width: 28, height: 28, objectFit: 'contain' }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {t(`tinhTuy.characters.${row.char}`)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{row.passiveTT.toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{row.activeTT.toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.totalTT.toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {t(`tinhTuy.guide.sweetSpots.${row.char}`)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
