/**
 * WordChainPlayerBar - Horizontal scrollable bar showing all players.
 * Active player highlighted, eliminated players grayed out.
 */
import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import { WordChainPlayer } from '../word-chain-types';

interface Props {
  players: WordChainPlayer[];
  currentPlayerSlot: number;
  mySlot: number | null;
}

// 8 distinct colors for player slots
const PLAYER_COLORS = [
  '#2ecc71', '#3498db', '#e74c3c', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50',
];

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(46, 204, 113, 0.4); }
  50% { box-shadow: 0 0 16px rgba(46, 204, 113, 0.7); }
`;

export const WordChainPlayerBar: React.FC<Props> = ({ players, currentPlayerSlot, mySlot }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: { xs: 1, sm: 1, md: 1.5 },
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        overflowX: { xs: 'hidden', md: 'auto' },
        py: { xs: 1, sm: 1, md: 1.5 },
        px: { xs: 2, sm: 2, md: 3 },
        justifyContent: 'space-around',
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 2 },
      }}
    >
      {players.map((player) => {
        const isActive = player.slot === currentPlayerSlot && !player.isEliminated;
        const isMe = player.slot === mySlot;
        const color = PLAYER_COLORS[(player.slot - 1) % PLAYER_COLORS.length];

        return (
          <Box
            key={player.slot}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.5, sm: 0.75, md: 1 },
              px: { xs: 1, sm: 1.5, md: 2 },
              py: { xs: 0.5, sm: 0.75, md: 1 },
              borderRadius: 2,
              bgcolor: isActive ? 'rgba(46, 204, 113, 0.1)' : 'rgba(0,0,0,0.02)',
              border: '2px solid',
              borderColor: isActive ? '#2ecc71' : 'transparent',
              animation: isActive ? `${glow} 2s ease-in-out infinite` : 'none',
              opacity: player.isEliminated ? 0.4 : 1,
              filter: player.isEliminated ? 'grayscale(1)' : 'none',
              flexShrink: 0,
              minWidth: 'fit-content',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Slot avatar */}
            <Box
              sx={{
                width: { xs: 30, sm: 28, md: 34 },
                height: { xs: 30, sm: 28, md: 34 },
                borderRadius: '50%',
                bgcolor: color,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: { xs: '0.85rem', md: '0.85rem' },
                flexShrink: 0,
              }}
            >
              {player.slot}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              {/* Name */}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isMe ? 700 : 500,
                  display: 'block',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  maxWidth: { xs: 100, md: 120 },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textDecoration: player.isEliminated ? 'line-through' : 'none',
                  fontSize: { xs: '0.85rem', md: '0.85rem' },
                }}
              >
                {player.name || 'Player'}{isMe ? ' *' : ''}
              </Typography>

              {/* Lives + Score */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: { xs: '0.85rem', md: '0.75rem' }, lineHeight: 1 }}>
                  {'❤️'.repeat(player.lives)}{'🖤'.repeat(Math.max(0, 3 - player.lives))}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: { xs: '0.85rem', md: '0.8rem' }, color: '#2ecc71' }}>
                  {player.score}
                </Typography>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export { PLAYER_COLORS };
