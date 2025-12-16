import React, { useEffect } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material';
import { useGame } from '../../contexts/GameContext';

const GameControls: React.FC = () => {
  const { game, surrender, startGame, newGame, leaveRoom, requestUndo, approveUndo, rejectUndo, myPlayerNumber, pendingUndoMove, clearPendingUndo, players } = useGame();

  const canStartGame = game?.gameStatus === 'waiting' && players.length === 2 && myPlayerNumber === 1;
  const showWinnerModal = game?.gameStatus === 'finished' && game.winner !== null;
  
  // Debug logging
  useEffect(() => {
    if (game) {
      console.log('GameControls - canStartGame:', canStartGame, 'gameStatus:', game.gameStatus, 'players.length:', players.length, 'myPlayerNumber:', myPlayerNumber, 'players:', players);
    }
  }, [canStartGame, game, players.length, myPlayerNumber, players]);

  if (!game) {
    return null;
  }

  const handleSurrender = (): void => {
    if (window.confirm('Are you sure you want to surrender?')) {
      surrender();
    }
  };

  const handleNewGame = (): void => {
    if (game.gameStatus === 'finished') {
      newGame();
    }
  };

  const handlePlayAgain = (): void => {
    handleNewGame();
  };

  const handleLeaveRoom = (): void => {
    leaveRoom();
  };

  const getWinnerMessage = (): string => {
    if (game.winner === 'draw') {
      return "It's a Draw!";
    }
    const winnerPlayer = players.find(p => p.playerNumber === game.winner);
    if (winnerPlayer) {
      const isYou = myPlayerNumber === game.winner;
      return `${winnerPlayer.username} ${isYou ? '(You)' : ''} Wins!`;
    }
    return `Player ${game.winner} Wins!`;
  };

  const handleRequestUndo = (): void => {
    // Calculate move number from board state
    // Count non-empty cells to determine last move number
    let moveCount = 0;
    for (let i = 0; i < game.board.length; i++) {
      for (let j = 0; j < game.board[i].length; j++) {
        if (game.board[i][j] !== 0) {
          moveCount++;
        }
      }
    }
    if (moveCount > 0) {
      requestUndo(moveCount);
    }
  };

  const handleApproveUndo = (): void => {
    if (pendingUndoMove !== null) {
      approveUndo(pendingUndoMove);
      clearPendingUndo();
    }
  };

  const handleRejectUndo = (): void => {
    rejectUndo();
    clearPendingUndo();
  };

  return (
    <Box sx={{ mt: 3, width: '100%', maxWidth: 600 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        {canStartGame && (
          <Button variant="contained" size="large" onClick={startGame} sx={{ minWidth: 200 }}>
            Start Game
          </Button>
        )}
        {game.gameStatus === 'playing' && (
          <>
            {game.rules.allowUndo && (
              <Button variant="outlined" onClick={handleRequestUndo} disabled={!myPlayerNumber}>
                Request Undo
              </Button>
            )}
            <Button variant="outlined" color="error" onClick={handleSurrender}>
              Surrender
            </Button>
          </>
        )}
        {game.gameStatus === 'finished' && !showWinnerModal && (
          <Button variant="contained" onClick={handleNewGame}>
            New Game
          </Button>
        )}
        {!showWinnerModal && (
          <Button variant="outlined" color="secondary" onClick={leaveRoom}>
            Leave Game
          </Button>
        )}
      </Box>

      <Dialog open={pendingUndoMove !== null} onClose={handleRejectUndo}>
        <DialogTitle>Undo Request</DialogTitle>
        <DialogContent>
          <Typography>Your opponent wants to undo the last move. Do you approve?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectUndo}>Reject</Button>
          <Button onClick={handleApproveUndo} variant="contained">
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={showWinnerModal} 
        onClose={() => {}} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(232, 244, 248, 0.95) 100%)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          }
        }}
      >
        <DialogTitle
          sx={{
            textAlign: 'center',
            pt: 4,
            pb: 2,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              background: game.winner === 'draw' 
                ? 'linear-gradient(135deg, #8fc4d6 0%, #b3d9e6 100%)'
                : myPlayerNumber === game.winner
                ? 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)'
                : 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 'bold',
              mb: 2,
            }}
          >
            {getWinnerMessage()}
          </Typography>
          {game.winner !== 'draw' && (
            <Typography variant="body1" sx={{ color: '#666', mt: 1 }}>
              {myPlayerNumber === game.winner ? 'Congratulations! 🎉' : 'Better luck next time!'}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#1a4a5c' }}>
              Final Score
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#666' }}>Player 1</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a4a5c' }}>
                  {game.score.player1}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: '#666' }}>Player 2</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a4a5c' }}>
                  {game.score.player2}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 4, px: 3, gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleLeaveRoom}
            sx={{
              minWidth: 140,
              borderColor: '#8fc4d6',
              color: '#1a4a5c',
              '&:hover': {
                borderColor: '#6ba8c1',
                backgroundColor: 'rgba(143, 196, 214, 0.1)',
              },
            }}
          >
            Leave Room
          </Button>
          <Button
            variant="contained"
            onClick={handlePlayAgain}
            sx={{
              minWidth: 140,
              background: 'linear-gradient(135deg, #8fc4d6 0%, #b3d9e6 100%)',
              color: '#1a4a5c',
              fontWeight: 'bold',
              '&:hover': {
                background: 'linear-gradient(135deg, #6ba8c1 0%, #8fc4d6 100%)',
              },
            }}
          >
            Play Again
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GameControls;

