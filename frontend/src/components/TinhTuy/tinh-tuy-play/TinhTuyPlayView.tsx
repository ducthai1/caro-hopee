/**
 * TinhTuyPlayView — Main game view: board + dice + player panel + modals + chat.
 */
import React, { useState } from 'react';
import { Box, Button, useMediaQuery, useTheme } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import { TinhTuyBoard } from './TinhTuyBoard';
import { TinhTuyDice3D } from './TinhTuyDice3D';
import { TinhTuyPlayerPanel } from './TinhTuyPlayerPanel';
import { TinhTuyActionModal } from './TinhTuyActionModal';
import { TinhTuyCardModal } from './TinhTuyCardModal';
import { TinhTuyBuildModal } from './TinhTuyBuildModal';
import { TinhTuyIslandModal } from './TinhTuyIslandModal';
import { TinhTuyGoPopup } from './TinhTuyGoPopup';
import { TinhTuyVolumeControl } from './TinhTuyVolumeControl';
import { TinhTuyTurnTimer } from './TinhTuyTurnTimer';
import { TinhTuyChat } from './TinhTuyChat';

export const TinhTuyPlayView: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useLanguage();
  const { state } = useTinhTuy();
  const [buildOpen, setBuildOpen] = useState(false);

  const isMyTurn = state.currentPlayerSlot === state.mySlot;
  const myPlayer = state.players.find(p => p.slot === state.mySlot);
  const hasProperties = myPlayer && myPlayer.properties.length > 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 2,
        p: { xs: 1, sm: 2, md: 3 },
        pt: { xs: '88px', md: 3 },
        minHeight: '100vh',
        alignItems: 'flex-start',
      }}
    >
      {/* Left: Board */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
        <TinhTuyBoard />
        <TinhTuyDice3D />
        {/* Build button (only when it's my turn and I own properties) */}
        {isMyTurn && hasProperties && state.turnPhase === 'END_TURN' && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ConstructionIcon />}
            onClick={() => setBuildOpen(true)}
            sx={{
              borderColor: '#27ae60', color: '#27ae60', fontWeight: 600,
              '&:hover': { borderColor: '#2ecc71', bgcolor: 'rgba(39,174,96,0.08)' },
            }}
          >
            {t('tinhTuy.game.build' as any)}
          </Button>
        )}
      </Box>

      {/* Right: Player Panel + Timer + Volume + Chat */}
      <Box sx={{ width: isMobile ? '100%' : 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TinhTuyPlayerPanel />
        <TinhTuyTurnTimer />
        <TinhTuyVolumeControl />
        <TinhTuyChat />
      </Box>

      {/* Modals (overlays) */}
      <TinhTuyActionModal />
      <TinhTuyCardModal />
      <TinhTuyIslandModal />
      <TinhTuyBuildModal open={buildOpen} onClose={() => setBuildOpen(false)} />
      <TinhTuyGoPopup />
    </Box>
  );
};
