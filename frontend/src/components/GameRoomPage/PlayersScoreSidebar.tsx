/**
 * PlayersScoreSidebar - Right sidebar showing players, scores, and reactions
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLanguage } from '../../i18n';
import { GameReactions } from '../GameReactions';
import { ChatButton } from '../CaroChat';

interface Player {
  playerNumber: number;
  username: string;
  isGuest?: boolean;
}

interface Game {
  gameStatus: string;
  currentPlayer: number;
  score: {
    player1: number;
    player2: number;
  };
}

interface PlayersScoreSidebarProps {
  game: Game;
  players: Player[];
  myPlayerNumber: number | null;
  onSendReaction?: (emoji: string) => void;
  onSendChat?: (message: string) => void;
}

const PlayersScoreSidebar: React.FC<PlayersScoreSidebarProps> = ({ game, players, myPlayerNumber, onSendReaction, onSendChat }) => {
  const { t } = useLanguage();
  const showReactions = game.gameStatus === 'playing' && players.length === 2 && onSendReaction;

  return (
    <Box
      sx={{
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        gap: 2,
        position: 'fixed',
        right: { lg: 24 },
        top: { lg: 60 },
        width: { lg: '280px' },
        height: { lg: 'calc(100vh - 84px)' },
        maxHeight: { lg: 'calc(100vh - 84px)' },
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 10,
        '&::-webkit-scrollbar': { width: '6px' },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(126, 200, 227, 0.05)',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(126, 200, 227, 0.2)',
          borderRadius: '3px',
          '&:hover': { background: 'rgba(126, 200, 227, 0.3)' },
        },
      }}
    >
      {/* Players & Score Card */}
      <Box
        sx={{
          p: 2.5,
          borderRadius: 3,
          bgcolor: '#ffffff',
          border: '2px solid transparent',
          backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: '0 4px 16px rgba(126, 200, 227, 0.12)',
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            mb: 2.5,
            color: '#2c3e50',
            fontSize: '0.95rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            textAlign: 'center',
          }}
        >
          👥 {t('gameRoom.playersAndScore')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {players.map((player) => (
            <PlayerCard
              key={player.playerNumber}
              player={player}
              game={game}
              myPlayerNumber={myPlayerNumber}
              t={t}
            />
          ))}
        </Box>
      </Box>

      {/* Chat + Reactions - only show when game is playing with 2 players */}
      {showReactions && (
        <>
          {onSendChat && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5 }}>
              <ChatButton
                onSend={onSendChat}
                disabled={game.gameStatus !== 'playing'}
              />
              <Typography variant="caption" sx={{ color: '#5a6a7a', fontSize: '0.75rem' }}>
                {t('game.chat.tooltip')}
              </Typography>
            </Box>
          )}
          <GameReactions
            onSendReaction={onSendReaction}
            disabled={game.gameStatus !== 'playing'}
          />
        </>
      )}
    </Box>
  );
};

// Player card sub-component
interface PlayerCardProps {
  player: Player;
  game: Game;
  myPlayerNumber: number | null;
  t: (key: string, options?: any) => string;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, game, myPlayerNumber, t }) => {
  const isCurrentTurn = game.gameStatus === 'playing' && game.currentPlayer === player.playerNumber;
  const isPlayer1 = player.playerNumber === 1;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: isPlayer1 ? 'rgba(126, 200, 227, 0.08)' : 'rgba(168, 230, 207, 0.08)',
        border: isCurrentTurn
          ? `2px solid ${isPlayer1 ? '#7ec8e3' : '#a8e6cf'}`
          : isPlayer1
            ? '1px solid rgba(126, 200, 227, 0.2)'
            : '1px solid rgba(168, 230, 207, 0.2)',
        textAlign: 'center',
        position: 'relative',
        boxShadow: isCurrentTurn
          ? `0 4px 16px ${isPlayer1 ? 'rgba(126, 200, 227, 0.3)' : 'rgba(168, 230, 207, 0.3)'}`
          : 'none',
        transform: isCurrentTurn ? 'scale(1.02)' : 'scale(1)',
        transition: 'all 0.3s ease',
        animation: isCurrentTurn ? 'pulse 2s ease-in-out infinite' : 'none',
        '@keyframes pulse': {
          '0%, 100%': {
            boxShadow: isCurrentTurn
              ? `0 4px 16px ${isPlayer1 ? 'rgba(126, 200, 227, 0.3)' : 'rgba(168, 230, 207, 0.3)'}`
              : 'none',
          },
          '50%': {
            boxShadow: isCurrentTurn
              ? `0 6px 24px ${isPlayer1 ? 'rgba(126, 200, 227, 0.5)' : 'rgba(168, 230, 207, 0.5)'}`
              : 'none',
          },
        },
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: '#5a6a7a',
          fontWeight: 600,
          display: 'block',
          mb: 1,
          fontSize: '0.8rem',
        }}
      >
        {t('gameRoom.player', { number: player.playerNumber })}
        {myPlayerNumber === player.playerNumber && ` 👤 (${t('game.you')})`}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: isCurrentTurn ? (isPlayer1 ? '#7ec8e3' : '#a8e6cf') : '#2c3e50',
          fontWeight: isCurrentTurn ? 700 : 600,
          display: 'block',
          mb: 1.5,
          fontSize: isCurrentTurn ? '1rem' : '0.9rem',
          wordBreak: 'break-word',
          transition: 'all 0.3s ease',
        }}
      >
        {isCurrentTurn && '🎯 '}
        {player.username}
        {player.isGuest && ` (${t('game.guest')})`}
        {isCurrentTurn && myPlayerNumber === player.playerNumber && ` - ${t('gameRoom.yourTurn')}`}
        {isCurrentTurn && myPlayerNumber !== player.playerNumber && ` - ${t('gameRoom.theirTurn')}`}
      </Typography>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: isPlayer1 ? '#7ec8e3' : '#a8e6cf',
          fontSize: '2rem',
        }}
      >
        {isPlayer1 ? game.score.player1 : game.score.player2}
      </Typography>
    </Box>
  );
};

export default PlayersScoreSidebar;
