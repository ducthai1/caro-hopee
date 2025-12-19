import React, { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../contexts/GameContext';

interface GameControlsProps {
  onLeaveGame?: () => Promise<void>;
}

const GameControls: React.FC<GameControlsProps> = ({ onLeaveGame }) => {
  const { game, surrender, startGame, newGame, leaveRoom, requestUndo, approveUndo, rejectUndo, myPlayerNumber, pendingUndoMove, undoRequestSent, clearPendingUndo, players } = useGame();
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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

  const handleLeaveRoomClick = (): void => {
    setShowLeaveConfirm(true);
  };

  const handleLeaveConfirm = async (): Promise<void> => {
    setShowLeaveConfirm(false);
    try {
      setIsLeaving(true);
      // Use onLeaveGame if provided (from GameRoomPage to handle blocker), otherwise use default
      if (onLeaveGame) {
        await onLeaveGame();
      } else {
        await leaveRoom();
        // Navigate to home after successfully leaving
        navigate('/');
      }
    } catch (error) {
      console.error('Error leaving game:', error);
      // Still navigate even if there's an error
      if (!onLeaveGame) {
        navigate('/');
      }
    } finally {
      setIsLeaving(false);
    }
  };

  const handleLeaveCancel = (): void => {
    setShowLeaveConfirm(false);
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

  // Count total moves on the board
  const getMoveCount = (): number => {
    let moveCount = 0;
    for (let i = 0; i < game.board.length; i++) {
      for (let j = 0; j < game.board[i].length; j++) {
        if (game.board[i][j] !== 0) {
          moveCount++;
        }
      }
    }
    return moveCount;
  };

  // Count moves made by the current player
  const getMyMoveCount = (): number => {
    if (!myPlayerNumber) return 0;
    let moveCount = 0;
    for (let i = 0; i < game.board.length; i++) {
      for (let j = 0; j < game.board[i].length; j++) {
        if (game.board[i][j] === myPlayerNumber) {
          moveCount++;
        }
      }
    }
    return moveCount;
  };

  const handleRequestUndo = (): void => {
    // Calculate move number from board state
    const moveCount = getMoveCount();
    if (moveCount > 0) {
      requestUndo(moveCount);
    }
  };

  // Check if undo is available - player must have made at least 1 move
  const canRequestUndo = (): boolean => {
    if (!myPlayerNumber) return false;
    const myMoveCount = getMyMoveCount();
    return myMoveCount >= 1; // Player must have made at least 1 move to request undo
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
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {canStartGame && (
          <Button variant="contained" size="medium" onClick={startGame} fullWidth>
            Start Game
          </Button>
        )}
        {game.gameStatus === 'playing' && (
          <>
            {game.rules.allowUndo && canRequestUndo() && (
              <Button 
                variant="outlined" 
                size="medium" 
                onClick={handleRequestUndo} 
                disabled={!myPlayerNumber || undoRequestSent} 
                fullWidth
                startIcon={undoRequestSent ? <CircularProgress size={16} /> : null}
                sx={{
                  ...(undoRequestSent && {
                    bgcolor: 'rgba(126, 200, 227, 0.1)',
                    borderColor: '#7ec8e3',
                    color: '#7ec8e3',
                  }),
                }}
              >
                {undoRequestSent ? 'Waiting for response...' : 'Request Undo'}
              </Button>
            )}
            <Button variant="outlined" color="error" size="medium" onClick={handleSurrender} fullWidth>
              Surrender
            </Button>
          </>
        )}
        {game.gameStatus === 'finished' && !showWinnerModal && (
          <Button variant="contained" size="medium" onClick={handleNewGame} fullWidth>
            New Game
          </Button>
        )}
        {!showWinnerModal && (
          <Button 
            variant="outlined" 
            color="secondary" 
            size="medium" 
            onClick={handleLeaveRoomClick} 
            disabled={isLeaving}
            fullWidth
            startIcon={isLeaving ? <CircularProgress size={16} /> : null}
          >
            {isLeaving ? 'Leaving...' : 'Leave Game'}
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

      {/* Snackbar for undo request feedback */}
      <Snackbar
        open={undoRequestSent}
        autoHideDuration={3000}
        onClose={() => {}}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" sx={{ width: '100%' }}>
          Undo request sent! Waiting for opponent's response...
        </Alert>
      </Snackbar>

      <Dialog 
        open={showWinnerModal} 
        onClose={() => {}} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            background: '#ffffff',
            borderRadius: 4,
            boxShadow: '0 20px 60px rgba(126, 200, 227, 0.25)',
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle
          sx={{
            textAlign: 'center',
            pt: 5,
            pb: 2,
            background: 'linear-gradient(135deg, rgba(126, 200, 227, 0.05) 0%, rgba(168, 230, 207, 0.05) 100%)',
          }}
        >
          <Typography
            variant="h3"
            sx={{
              background: game.winner === 'draw' 
                ? 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)'
                : myPlayerNumber === game.winner
                ? 'linear-gradient(135deg, #a8e6cf 0%, #7ec8e3 100%)'
                : 'linear-gradient(135deg, #ffb88c 0%, #ffaaa5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 800,
              mb: 2,
              fontSize: { xs: '2rem', md: '2.5rem' },
            }}
          >
            {getWinnerMessage()}
          </Typography>
          {game.winner !== 'draw' && (
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#5a6a7a', 
                mt: 1,
                fontWeight: 500,
                fontSize: '1.1rem',
              }}
            >
              {myPlayerNumber === game.winner ? '🎉 Congratulations!' : '😔 Better luck next time!'}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 3, px: 4 }}>
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700, 
                mb: 3, 
                color: '#2c3e50',
                fontSize: '1.1rem',
              }}
            >
              🏆 Final Score
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 4,
            }}>
              <Box sx={{ 
                p: 2.5,
                borderRadius: 3,
                bgcolor: 'rgba(126, 200, 227, 0.1)',
                border: '1px solid rgba(126, 200, 227, 0.3)',
                minWidth: 120,
              }}>
                <Typography variant="body2" sx={{ color: '#5a6a7a', mb: 1, fontWeight: 600 }}>
                  Player 1
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#7ec8e3' }}>
                  {game.score.player1}
                </Typography>
              </Box>
              <Box sx={{ 
                p: 2.5,
                borderRadius: 3,
                bgcolor: 'rgba(168, 230, 207, 0.1)',
                border: '1px solid rgba(168, 230, 207, 0.3)',
                minWidth: 120,
              }}>
                <Typography variant="body2" sx={{ color: '#5a6a7a', mb: 1, fontWeight: 600 }}>
                  Player 2
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#a8e6cf' }}>
                  {game.score.player2}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 5, px: 4, gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleLeaveRoomClick}
            disabled={isLeaving}
            sx={{
              minWidth: 160,
              py: 1.5,
              borderRadius: 2,
              borderColor: '#7ec8e3',
              borderWidth: 2,
              color: '#2c3e50',
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: '#5ba8c7',
                borderWidth: 2,
                backgroundColor: 'rgba(126, 200, 227, 0.08)',
              },
            }}
          >
            Leave Room
          </Button>
          <Button
            variant="contained"
            onClick={handlePlayAgain}
            sx={{
              minWidth: 160,
              py: 1.5,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '1rem',
              boxShadow: '0 4px 14px rgba(126, 200, 227, 0.4)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
                boxShadow: '0 6px 20px rgba(126, 200, 227, 0.5)',
              },
            }}
          >
            Play Again
          </Button>
        </DialogActions>
      </Dialog>

      {/* Leave Game Confirmation Dialog */}
      <Dialog 
        open={showLeaveConfirm} 
        onClose={handleLeaveCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 700,
            fontSize: '1.5rem',
            textAlign: 'center',
            pb: 1,
          }}
        >
          ⚠️ Leave Game?
        </DialogTitle>
        <DialogContent>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#2c3e50', 
              textAlign: 'center',
              py: 2,
              fontSize: '1.1rem',
            }}
          >
            Are you sure you want to leave this game? 
            {game.gameStatus === 'playing' && (
              <Box component="span" sx={{ display: 'block', mt: 1, fontWeight: 600, color: '#ffaaa5' }}>
                The game is still in progress!
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3, gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleLeaveCancel}
            sx={{
              minWidth: 120,
              py: 1.25,
              borderRadius: 2,
              borderColor: '#7ec8e3',
              borderWidth: 2,
              color: '#2c3e50',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': {
                borderColor: '#5ba8c7',
                borderWidth: 2,
                backgroundColor: 'rgba(126, 200, 227, 0.08)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleLeaveConfirm}
            disabled={isLeaving}
            startIcon={isLeaving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              minWidth: 120,
              py: 1.25,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #ffaaa5 0%, #ff8a80 100%)',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '1rem',
              boxShadow: '0 4px 14px rgba(255, 170, 165, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #ff8a80 0%, #ff6b6b 100%)',
                boxShadow: '0 6px 20px rgba(255, 170, 165, 0.5)',
              },
            }}
          >
            {isLeaving ? 'Leaving...' : 'Leave'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GameControls;

