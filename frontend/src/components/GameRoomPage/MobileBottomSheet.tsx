/**
 * MobileBottomSheet - Top bar for game controls on mobile devices
 * (Renamed from bottom sheet but keeping export name for compatibility)
 */
import React from 'react';
import { Box, Typography, IconButton, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useLanguage } from '../../i18n';
import RoomCodeDisplay from '../RoomCodeDisplay';
import GameInfo from '../GameInfo/GameInfo';
import GameControls from '../GameControls/GameControls';

interface Player {
  playerNumber: number;
  username: string;
  isGuest?: boolean;
}

interface Game {
  roomCode: string;
  gameStatus: string;
  currentPlayer: number;
  score: {
    player1: number;
    player2: number;
  };
}

interface MobileBottomSheetProps {
  game: Game;
  players: Player[];
  myPlayerNumber: number | null;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  onLeaveGame: () => Promise<void>;
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  game,
  players,
  myPlayerNumber,
  expanded,
  setExpanded,
  onLeaveGame,
}) => {
  const { t } = useLanguage();

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        bgcolor: '#ffffff',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.3s ease',
      }}
    >
      {/* Collapsed View */}
      <CollapsedView
        game={game}
        players={players}
        expanded={expanded}
        setExpanded={setExpanded}
        t={t}
      />

      {/* Expanded Content */}
      <Collapse in={expanded}>
        <ExpandedContent
          game={game}
          players={players}
          myPlayerNumber={myPlayerNumber}
          onLeaveGame={onLeaveGame}
          t={t}
        />
      </Collapse>

      {/* Handle Bar - at bottom for top bar */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 1,
          cursor: 'pointer',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 4,
            borderRadius: 2,
            bgcolor: 'rgba(126, 200, 227, 0.3)',
          }}
        />
      </Box>
    </Box>
  );
};

// Collapsed view sub-component
interface CollapsedViewProps {
  game: Game;
  players: Player[];
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  t: (key: string) => string;
}

const CollapsedView: React.FC<CollapsedViewProps> = ({ game, players, expanded, setExpanded, t }) => (
  <Box sx={{ px: 2, pt: 2, pb: expanded ? 1 : 0 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      {/* Room Code Mini */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" sx={{ color: '#5a6a7a', fontWeight: 600, fontSize: '0.7rem' }}>
          {t('home.roomCode')}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontWeight: 800,
            letterSpacing: 2,
            background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '1.2rem',
          }}
        >
          {game.roomCode}
        </Typography>
      </Box>

      {/* Players Mini */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {players.map((player) => {
          const isCurrentTurn = game.gameStatus === 'playing' && game.currentPlayer === player.playerNumber;
          const isPlayer1 = player.playerNumber === 1;
          return (
            <Box
              key={player.playerNumber}
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1.5,
                bgcolor: isCurrentTurn
                  ? (isPlayer1 ? 'rgba(126, 200, 227, 0.2)' : 'rgba(168, 230, 207, 0.2)')
                  : 'rgba(0, 0, 0, 0.03)',
                border: isCurrentTurn
                  ? `2px solid ${isPlayer1 ? '#7ec8e3' : '#a8e6cf'}`
                  : '1px solid rgba(0, 0, 0, 0.05)',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: isPlayer1 ? '#7ec8e3' : '#a8e6cf',
                  fontSize: '0.85rem',
                }}
              >
                {isPlayer1 ? '✕' : '○'} {isPlayer1 ? game.score.player1 : game.score.player2}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Expand Button */}
      <IconButton
        onClick={() => setExpanded(!expanded)}
        size="small"
        sx={{
          bgcolor: 'rgba(126, 200, 227, 0.1)',
          '&:hover': { bgcolor: 'rgba(126, 200, 227, 0.2)' },
        }}
      >
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </IconButton>
    </Box>
  </Box>
);

// Expanded content sub-component
interface ExpandedContentProps {
  game: Game;
  players: Player[];
  myPlayerNumber: number | null;
  onLeaveGame: () => Promise<void>;
  t: (key: string) => string;
}

const ExpandedContent: React.FC<ExpandedContentProps> = ({ game, players, myPlayerNumber, onLeaveGame, t }) => (
  <Box sx={{ px: 2, pb: 2, maxHeight: '50vh', overflowY: 'auto' }}>
    {/* Room Code Full */}
    <Box sx={{ mb: 2 }}>
      <RoomCodeDisplay roomCode={game.roomCode} />
    </Box>

    {/* Game Info */}
    <Box sx={{ mb: 2 }}>
      <GameInfo />
    </Box>

    {/* Game Controls */}
    <GameControls onLeaveGame={onLeaveGame} />

    {/* Players & Score */}
    <Box
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: 'rgba(126, 200, 227, 0.05)',
        border: '1px solid rgba(126, 200, 227, 0.1)',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          mb: 1.5,
          color: '#2c3e50',
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        👥 {t('gameRoom.playersAndScore')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {players.map((player) => {
          const isCurrentTurn = game.gameStatus === 'playing' && game.currentPlayer === player.playerNumber;
          const isPlayer1 = player.playerNumber === 1;
          return (
            <Box
              key={player.playerNumber}
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 2,
                bgcolor: isPlayer1
                  ? 'rgba(126, 200, 227, 0.08)'
                  : 'rgba(168, 230, 207, 0.08)',
                border: isCurrentTurn
                  ? `2px solid ${isPlayer1 ? '#7ec8e3' : '#a8e6cf'}`
                  : '1px solid transparent',
                textAlign: 'center',
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: '#5a6a7a', fontWeight: 600, display: 'block', mb: 0.5 }}
              >
                {isPlayer1 ? '✕' : '○'} {player.username}
                {myPlayerNumber === player.playerNumber && ' 👤'}
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: isPlayer1 ? '#7ec8e3' : '#a8e6cf',
                }}
              >
                {isPlayer1 ? game.score.player1 : game.score.player2}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  </Box>
);

export default MobileBottomSheet;
