/**
 * GoPlayView — Main game layout: board + panels + controls.
 */
import React, { useState } from 'react';
import { Box, Stack, Typography, Button, IconButton, Tooltip, useTheme, useMediaQuery } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import ConfirmDialog from '../../ConfirmDialog/ConfirmDialog';
import { useLanguage } from '../../../i18n';
import { useGo } from '../GoContext';
import GoBoard from '../GoBoard';
import GoPlayerPanel from './GoPlayerPanel';
import GoControls from './GoControls';
import GoScoringPanel from './GoScoringPanel';
import GoWinnerModal from './GoWinnerModal';
import GoHelpDialog from './GoHelpDialog';

const GoPlayView: React.FC = () => {
  const {
    state,
    placeStone,
    pass,
    resign,
    toggleDeadStone,
    agreeScoring,
    rejectScoring,
    requestUndo,
    approveUndo,
    rejectUndo,
    dismissResult,
    leaveRoom,
    newGame,
  } = useGo();

  const { t } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [showHelp, setShowHelp] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const {
    board,
    rules,
    players,
    mySlot,
    currentColor,
    phase,
    lastMove,
    deadStones,
    territory,
    score,
    pendingUndo,
    moveCount,
    isHost,
    showResult,
    winner,
    winReason,
    finalScore,
    timerEnabled,
  } = state;

  const boardSize = rules?.boardSize ?? 9;
  const byoyomiTime = rules?.byoyomiTime ?? 30;

  const myPlayer = players.find(p => p.slot === mySlot) ?? null;
  const myColor = myPlayer?.color ?? null;
  const isMyTurn = phase === 'play' && currentColor === myColor;

  // Sort players: my player first
  const sortedPlayers = [...players].sort((a, b) => {
    if (mySlot) {
      if (a.slot === mySlot) return -1;
      if (b.slot === mySlot) return 1;
    }
    return a.slot - b.slot;
  });

  const player1 = sortedPlayers[0] ?? null;
  const player2 = sortedPlayers[1] ?? null;

  const BoardComponent = (
    <GoBoard
      board={board}
      boardSize={boardSize}
      lastMove={lastMove}
      phase={phase}
      currentColor={currentColor}
      myColor={myColor}
      isMyTurn={isMyTurn}
      deadStones={deadStones}
      territory={territory}
      onPlaceStone={placeStone}
      onToggleDead={toggleDeadStone}
    />
  );

  const TurnIndicator = (
    <Typography
      variant="caption"
      color={isMyTurn ? 'success.main' : 'text.secondary'}
      textAlign="center"
      display="block"
    >
      {phase === 'scoring'
        ? t('go.scoringPhase')
        : isMyTurn
          ? (t('go.yourTurnColor' as any) || '').replace('{{color}}', myColor === 'black' ? t('go.black') : t('go.white'))
          : (t('go.colorTurn' as any) || '').replace('{{color}}', currentColor === 'black' ? t('go.black') : t('go.white'))
      }
    </Typography>
  );

  const mobileLayout = (
    <Box sx={{ maxWidth: 520, mx: 'auto', p: { xs: 1.5, sm: 2 } }}>
      <Stack spacing={2}>
        {/* Opponent panel */}
        {player2 && (
          <GoPlayerPanel
            player={player2}
            isCurrentTurn={player2.color === currentColor && phase === 'play'}
            timerEnabled={timerEnabled}
            byoyomiTime={byoyomiTime}
          />
        )}

        {/* Board */}
        {TurnIndicator}
        {BoardComponent}

        {/* Scoring panel */}
        {phase === 'scoring' && (
          <GoScoringPanel
            score={score}
            players={players}
            mySlot={mySlot}
            onAgree={agreeScoring}
            onReject={rejectScoring}
          />
        )}

        {/* Controls */}
        {phase === 'play' && (
          <GoControls
            isMyTurn={isMyTurn}
            phase={phase}
            moveCount={moveCount}
            pendingUndo={pendingUndo}
            mySlot={mySlot}
            onPass={pass}
            onResign={resign}
            onRequestUndo={requestUndo}
            onApproveUndo={approveUndo}
            onRejectUndo={rejectUndo}
          />
        )}

        {/* Help + Leave row */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
          <Tooltip title={t('go.help.title' as any)}>
            <IconButton onClick={() => setShowHelp(true)} size="small" sx={{ color: '#2c3e50' }}>
              <MenuBookIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('go.leaveRoom' as any)}>
            <IconButton onClick={() => setShowLeaveConfirm(true)} size="small" sx={{ color: '#e74c3c' }}>
              <ExitToAppIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* My panel */}
        {player1 && (
          <GoPlayerPanel
            player={player1}
            isCurrentTurn={player1.color === currentColor && phase === 'play'}
            timerEnabled={timerEnabled}
            byoyomiTime={byoyomiTime}
          />
        )}
      </Stack>
    </Box>
  );

  const desktopLayout = (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          justifyContent: 'center',
          alignItems: 'flex-start',
          flexWrap: 'nowrap',
        }}
      >
        {/* Left panel: player 1 + controls + help/leave */}
        <Box sx={{ width: 240, flexShrink: 0 }}>
          <Stack spacing={2}>
            {player1 && (
              <GoPlayerPanel
                player={player1}
                isCurrentTurn={player1.color === currentColor && phase === 'play'}
                timerEnabled={timerEnabled}
                byoyomiTime={byoyomiTime}
              />
            )}
            {phase === 'play' && (
              <GoControls
                isMyTurn={isMyTurn}
                phase={phase}
                moveCount={moveCount}
                pendingUndo={pendingUndo}
                mySlot={mySlot}
                onPass={pass}
                onResign={resign}
                onRequestUndo={requestUndo}
                onApproveUndo={approveUndo}
                onRejectUndo={rejectUndo}
              />
            )}
            {phase === 'scoring' && (
              <GoScoringPanel
                score={score}
                players={players}
                mySlot={mySlot}
                onAgree={agreeScoring}
                onReject={rejectScoring}
              />
            )}
            <Button
              size="small"
              variant="outlined"
              startIcon={<MenuBookIcon />}
              onClick={() => setShowHelp(true)}
              sx={{
                borderColor: 'rgba(44,62,80,0.3)', color: '#2c3e50', fontWeight: 600,
                '&:hover': { borderColor: '#2c3e50', bgcolor: 'rgba(44,62,80,0.06)' },
              }}
            >
              {t('go.help.title' as any)}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ExitToAppIcon />}
              onClick={() => setShowLeaveConfirm(true)}
              sx={{
                borderColor: 'rgba(231,76,60,0.4)', color: '#e74c3c', fontWeight: 600,
                '&:hover': { borderColor: '#c0392b', bgcolor: 'rgba(231,76,60,0.08)' },
              }}
            >
              {t('go.leaveRoom' as any)}
            </Button>
          </Stack>
        </Box>

        {/* Center: board */}
        <Box sx={{ flex: '0 1 auto', maxWidth: 560 }}>
          {TurnIndicator}
          {BoardComponent}
        </Box>

        {/* Right panel: player 2 */}
        <Box sx={{ width: 240, flexShrink: 0 }}>
          {player2 && (
            <GoPlayerPanel
              player={player2}
              isCurrentTurn={player2.color === currentColor && phase === 'play'}
              timerEnabled={timerEnabled}
              byoyomiTime={byoyomiTime}
            />
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {isMobile ? mobileLayout : desktopLayout}

      <GoWinnerModal
        open={showResult}
        winner={winner}
        winReason={winReason}
        finalScore={finalScore}
        players={players}
        mySlot={mySlot}
        isHost={isHost}
        onNewGame={newGame}
        onLeave={leaveRoom}
        onDismiss={dismissResult}
      />
      <GoHelpDialog open={showHelp} onClose={() => setShowHelp(false)} />
      <ConfirmDialog
        open={showLeaveConfirm}
        title={t('go.leaveRoom' as any)}
        message={t('go.confirmLeaveMsg' as any)}
        confirmText={t('go.leaveRoom' as any)}
        variant="warning"
        onConfirm={() => { setShowLeaveConfirm(false); leaveRoom(); }}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </>
  );
};

export default GoPlayView;
