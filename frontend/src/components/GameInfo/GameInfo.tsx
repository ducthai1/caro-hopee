import React, { useState } from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n';
import { getGuestId } from '../../utils/guestId';
import { getGuestName } from '../../utils/guestName';
import GuestNameDialog from '../GuestNameDialog/GuestNameDialog';

const GameInfo: React.FC = () => {
  const { game, players, currentPlayer, myPlayerNumber, refreshPlayers } = useGame();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [showGuestNameDialog, setShowGuestNameDialog] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  if (!game) {
    return null;
  }

  const getStatusText = (): string => {
    switch (game.gameStatus) {
      case 'waiting':
        return t('gameInfo.waitingForPlayers');
      case 'playing':
        return t('gameInfo.playerTurn', { player: currentPlayer });
      case 'finished':
        if (game.winner === 'draw') {
          return t('game.draw');
        }
        return t('gameInfo.playerWins', { player: String(game.winner) });
      case 'abandoned':
        return t('gameInfo.gameAbandoned');
      default:
        return '';
    }
  };

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: { xs: 2, md: 2.5 }, 
        background: '#ffffff',
        border: '2px solid transparent',
        borderRadius: 3,
        backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: '0 4px 16px rgba(126, 200, 227, 0.12)',
      }}
    >
      <Box sx={{ mb: 2.5 }}>
        <Typography
          variant="subtitle1"
          sx={{
            color: '#2c3e50',
            fontWeight: 700,
            fontSize: '0.95rem',
            mb: 1.5,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          📊 {t('gameInfo.gameStatus')}
        </Typography>
        <Box sx={{ 
          p: 1.5, 
          borderRadius: 2, 
          bgcolor: 'rgba(126, 200, 227, 0.08)',
          border: '1px solid rgba(126, 200, 227, 0.2)',
        }}>
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 600, 
              color: '#2c3e50',
              fontSize: '0.95rem',
            }}
          >
            {getStatusText()}
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ mb: 2.5 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            mb: 1.5,
            color: '#2c3e50',
            fontSize: '0.95rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          👥 {t('gameInfo.players')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {players.map((player, index) => {
            const guestId = getGuestId();
            const isMyGuestPlayer = !isAuthenticated && player.isGuest && player.id === guestId;
            
            return (
              <Box 
                key={index} 
                sx={{ 
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: myPlayerNumber === player.playerNumber 
                    ? 'rgba(126, 200, 227, 0.1)' 
                    : 'rgba(0,0,0,0.02)',
                  border: myPlayerNumber === player.playerNumber 
                    ? '1px solid rgba(126, 200, 227, 0.3)' 
                    : '1px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: '#2c3e50',
                    fontSize: '0.9rem',
                    flex: 1,
                  }}
                >
                  {player.playerNumber === 1 ? '✕' : '○'} {player.username}
                  {player.isGuest && ` (${t('game.guest')})`}
                  {myPlayerNumber === player.playerNumber && ' 👤'}
                </Typography>
                {isMyGuestPlayer && (
                  <IconButton
                    size="small"
                    onClick={() => {
                      setEditingPlayerId(player.id);
                      setShowGuestNameDialog(true);
                    }}
                    sx={{
                      width: 28,
                      height: 28,
                      color: '#7ec8e3',
                      '&:hover': {
                        background: 'rgba(126, 200, 227, 0.15)',
                      },
                    }}
                  >
                    <EditIcon sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            mb: 1.5,
            color: '#2c3e50',
            fontSize: '0.95rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          ⚙️ {t('gameInfo.gameRules')}
        </Typography>
        <Box sx={{ 
          p: 1.5, 
          borderRadius: 2, 
          bgcolor: 'rgba(168, 230, 207, 0.08)',
          border: '1px solid rgba(168, 230, 207, 0.2)',
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: '#2c3e50',
                  fontSize: '0.9rem',
                }}
              >
                {t('home.blockTwoEnds')}:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: game.rules.blockTwoEnds ? '#a8e6cf' : '#ffaaa5',
                  fontSize: '0.9rem',
                }}
              >
                {game.rules.blockTwoEnds ? `✓ ${t('gameInfo.on')}` : `✗ ${t('gameInfo.off')}`}
              </Typography>
            </Box>
            {game.rules.allowUndo && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: '#2c3e50',
                    fontSize: '0.9rem',
                  }}
                >
                  {t('home.allowUndo')}:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: '#a8e6cf',
                    fontSize: '0.9rem',
                  }}
                >
                  ✓ {t('gameInfo.on')}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Guest Name Dialog */}
      {!isAuthenticated && (
        <GuestNameDialog
          open={showGuestNameDialog}
          onClose={(name) => {
            setShowGuestNameDialog(false);
            setEditingPlayerId(null);
            // Refresh players to update name immediately
            if (refreshPlayers) {
              refreshPlayers();
            }
          }}
          initialName={getGuestName()}
        />
      )}
    </Paper>
  );
};

export default GameInfo;

