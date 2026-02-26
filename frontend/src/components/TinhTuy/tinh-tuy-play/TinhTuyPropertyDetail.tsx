/**
 * TinhTuyPropertyDetail — Click a cell to view property details, owner, rent, image.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Table, TableBody, TableRow, TableCell,
} from '@mui/material';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { BOARD_CELLS, GROUP_COLORS, PLAYER_COLORS, PROPERTY_GROUPS, PropertyGroup, BoardCellClient } from '../tinh-tuy-types';

/** Compute station rent: (stationsOwned × 250) × (1 + 0.20 × completedRounds) */
function calcStationRent(stationsOwned: number, completedRounds: number): number {
  return Math.floor(stationsOwned * 250 * (1 + 0.20 * completedRounds));
}

/** Compute utility rent: price × (1 + 0.05 × completedRounds) */
function calcUtilityRent(price: number, completedRounds: number): number {
  return Math.floor(price * (1 + 0.05 * completedRounds));
}

interface Props {
  cellIndex: number | null;
  onClose: () => void;
}

export const TinhTuyPropertyDetail: React.FC<Props> = ({ cellIndex, onClose }) => {
  const { t } = useLanguage();
  const { state } = useTinhTuy();

  if (cellIndex === null) return null;

  const cell = BOARD_CELLS[cellIndex];
  if (!cell) return null;

  // Use last-match to stay consistent with ownershipMap (last player wins if duplicated)
  let owner: typeof state.players[number] | undefined;
  for (const p of state.players) {
    if (p.properties.includes(cellIndex)) owner = p;
  }
  const groupColor = cell.group ? GROUP_COLORS[cell.group as PropertyGroup] : '#9b59b6';
  const isProperty = cell.type === 'PROPERTY';
  const isStation = cell.type === 'STATION';
  const isUtility = cell.type === 'UTILITY';
  const hasRent = isProperty || isStation || isUtility;

  // Rent values from board data
  const rentBase = cell.rentBase || 0;
  const rentGroup = cell.rentGroup || rentBase * 2;
  const rentHouses = cell.rentHouse || [];
  const rentHotel = cell.rentHotel || 0;
  const houseCost = cell.houseCost || 0;

  // Houses/hotels/festival on this cell
  const houses = owner?.houses ? (owner.houses[String(cellIndex)] || 0) : 0;
  const hasHotel = owner?.hotels ? !!owner.hotels[String(cellIndex)] : false;
  const hasFestival = state.festival?.cellIndex === cellIndex;

  // Determine current active rent level for highlighting
  const ownsFullGroup = isProperty && owner && cell.group
    ? PROPERTY_GROUPS[cell.group as PropertyGroup]?.every(i => owner!.properties.includes(i))
    : false;
  // activeLevel: 'base' | 'group' | 'house-N' | 'hotel' | null
  const activeLevel = !owner ? null
    : hasHotel ? 'hotel'
    : houses > 0 ? `house-${houses}`
    : ownsFullGroup ? 'group'
    : 'base';
  const highlightSx = { bgcolor: 'rgba(155,89,182,0.08)', fontWeight: 700 };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      {/* Location image — properties use cover banner, special cells use contained icon */}
      {cell.icon && (
        <Box
          component="img"
          src={`/location/${cell.icon}`}
          alt=""
          sx={hasRent
            ? { width: '100%', height: { xs: 260, md: 400 }, objectFit: 'contain', bgcolor: '#f8f8f8' }
            : { width: {xs: 300, md: 400}, height: {xs: 150, md: 260}, objectFit: 'contain', display: 'block', mx: 'auto', mt: 2 }
          }
        />
      )}

      <DialogTitle
        sx={{
          fontWeight: 700,
          borderLeft: `4px solid ${groupColor}`,
          ml: 2, mr: 2, mt: cell.icon ? 0 : 1,
          pl: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {t(cell.name as any)}
        {cell.price && (
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
            {cell.price.toLocaleString()} TT
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ px: 3 }}>
        {/* Owner */}
        {hasRent && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('tinhTuy.property.owner' as any)}:
            </Typography>
            {owner ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PLAYER_COLORS[owner.slot] }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {owner.displayName}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#27ae60', fontWeight: 600 }}>
                {t('tinhTuy.property.unowned' as any)}
              </Typography>
            )}
          </Box>
        )}

        {/* Buildings */}
        {isProperty && owner && (houses > 0 || hasHotel) && (
          <Box sx={{ mb: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('tinhTuy.property.buildings' as any)}:
            </Typography>
            {hasHotel ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 14, height: 6, borderRadius: 1, bgcolor: '#e74c3c' }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#e74c3c' }}>
                  {t('tinhTuy.game.hotel' as any)}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {Array.from({ length: houses }).map((_, i) => (
                  <Box key={i} sx={{ width: 6, height: 6, borderRadius: 0.5, bgcolor: '#2ecc71' }} />
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Rent table */}
        {isProperty && (
          <Table size="small" sx={{ '& td': { py: 0.3, px: 1, fontSize: '0.75rem' } }}>
            <TableBody>
              <TableRow sx={activeLevel === 'base' ? highlightSx : undefined}>
                <TableCell>{t('tinhTuy.property.rentBase' as any)}</TableCell>
                <TableCell align="right">{rentBase} TT</TableCell>
              </TableRow>
              <TableRow sx={activeLevel === 'group' ? highlightSx : undefined}>
                <TableCell>{t('tinhTuy.property.rentGroup' as any)}</TableCell>
                <TableCell align="right">{rentGroup} TT</TableCell>
              </TableRow>
              {rentHouses.map((rent, i) => (
                <TableRow key={i} sx={activeLevel === `house-${i + 1}` ? highlightSx : undefined}>
                  <TableCell>{i + 1} {t('tinhTuy.property.house' as any)}</TableCell>
                  <TableCell align="right">{rent.toLocaleString()} TT</TableCell>
                </TableRow>
              ))}
              <TableRow sx={activeLevel === 'hotel' ? highlightSx : undefined}>
                <TableCell sx={{ fontWeight: 600 }}>{t('tinhTuy.game.hotel' as any)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{rentHotel.toLocaleString()} TT</TableCell>
              </TableRow>
              {hasFestival && (
                <TableRow>
                  <TableCell sx={{ color: '#e67e22', fontWeight: 600 }}>🎉 {t('tinhTuy.property.festival' as any)}</TableCell>
                  <TableCell align="right" sx={{ color: '#e67e22', fontWeight: 600 }}>×{state.festival?.multiplier || 1.5}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell sx={{ color: 'text.secondary' }}>{t('tinhTuy.property.buildCost' as any)}</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary' }}>{houseCost.toLocaleString()} TT</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}

        {/* Special cell descriptions */}
        {!hasRent && (
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            {t(`tinhTuy.cellDesc.${cell.type}` as any)}
          </Typography>
        )}

        {/* Station rent table + formula */}
        {isStation && (() => {
          const completedRounds = Math.max((state.round || 1) - 1, 0);
          const stationsOwned = owner
            ? owner.properties.filter(i => BOARD_CELLS[i]?.type === 'STATION').length
            : 0;
          const currentRent = calcStationRent(stationsOwned || 1, completedRounds);
          return (
            <>
              <Table size="small" sx={{ '& td': { py: 0.3, px: 1, fontSize: '0.75rem' }, mb: 1 }}>
                <TableBody>
                  <TableRow>
                    <TableCell>{t('tinhTuy.property.stationBase' as any)}</TableCell>
                    <TableCell align="right">250 TT × {t('tinhTuy.property.stationsOwned' as any)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('tinhTuy.property.roundBonus' as any)}</TableCell>
                    <TableCell align="right">+20% / {t('tinhTuy.game.round' as any)}</TableCell>
                  </TableRow>
                  {owner && (
                    <TableRow sx={{ bgcolor: 'rgba(155,89,182,0.08)', fontWeight: 700 }}>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {t('tinhTuy.property.currentRent' as any)} ({stationsOwned} {t('tinhTuy.property.stationUnit' as any)}, {t('tinhTuy.game.round' as any)} {state.round || 1})
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#7b2d8e' }}>
                        {currentRent.toLocaleString()} TT
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {t('tinhTuy.cellDesc.STATION' as any)}
              </Typography>
            </>
          );
        })()}

        {/* Utility rent table + formula */}
        {isUtility && (() => {
          const completedRounds = Math.max((state.round || 1) - 1, 0);
          const price = cell.price || 1500;
          const currentRent = calcUtilityRent(price, completedRounds);
          return (
            <>
              <Table size="small" sx={{ '& td': { py: 0.3, px: 1, fontSize: '0.75rem' }, mb: 1 }}>
                <TableBody>
                  <TableRow>
                    <TableCell>{t('tinhTuy.property.utilityBase' as any)}</TableCell>
                    <TableCell align="right">{price.toLocaleString()} TT</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('tinhTuy.property.roundBonus' as any)}</TableCell>
                    <TableCell align="right">+5% / {t('tinhTuy.game.round' as any)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'rgba(155,89,182,0.08)', fontWeight: 700 }}>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {t('tinhTuy.property.currentRent' as any)} ({t('tinhTuy.game.round' as any)} {state.round || 1})
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#7b2d8e' }}>
                      {currentRent.toLocaleString()} TT
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {t('tinhTuy.cellDesc.UTILITY' as any)}
              </Typography>
            </>
          );
        })()}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button onClick={onClose} sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {t('tinhTuy.game.close' as any)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
