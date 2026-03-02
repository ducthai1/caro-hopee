/**
 * Go (Cờ Vây) Socket Handlers
 * All go:* events handled here. Includes in-memory timer management.
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import GoGame from '../models/GoGame';
import User from '../models/User';
import { IGoGame, IGoPlayer, GoColor } from '../types/go.types';
import {
  applyMove,
  applyPass,
  initBoardWithHandicap,
  calculateTerritory,
  calculateScore,
  suggestDeadStones,
  toggleDeadStoneGroup,
  generateGoRoomCode,
  hashBoard,
} from './go-engine';

// ─── Timer Management ────────────────────────────────────────────

const activeTimers = new Map<string, NodeJS.Timeout>();         // roomId → interval
const disconnectTimers = new Map<string, NodeJS.Timeout>();     // `${roomId}:${slot}` → timeout
const activePlayerSockets = new Map<string, string>();          // `${roomId}:${playerId}` → socketId

const RECONNECT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const TIMER_EMIT_INTERVAL = 5;             // emit go:timer-update every N ticks

/**
 * Start a 1-second interval for the current player's time.
 * Decrements mainTimeLeft → then byoyomiPeriodsLeft.
 * On last period expiry → timeout loss.
 */
function startMoveTimer(io: SocketIOServer, roomId: string, game: IGoGame): void {
  clearMoveTimer(roomId);

  let tickCount = 0;

  const interval = setInterval(async () => {
    try {
      const freshGame = await GoGame.findOne({ roomId });
      if (!freshGame || freshGame.gameStatus !== 'playing') {
        clearMoveTimer(roomId);
        return;
      }

      const currentPlayer = freshGame.players.find(
        p => p.color === freshGame.currentColor
      );
      if (!currentPlayer) {
        clearMoveTimer(roomId);
        return;
      }

      let timedOut = false;

      if (currentPlayer.mainTimeLeft > 0) {
        currentPlayer.mainTimeLeft -= 1;
      } else if (currentPlayer.byoyomiPeriodsLeft > 0) {
        // In byoyomi — each period resets on move; here we count down period time
        // We track byoyomi countdown via a separate field if needed.
        // For simplicity: decrement byoyomiPeriodsLeft once per byoyomiTime seconds.
        // We use mainTimeLeft as the byoyomi period timer (reset to byoyomiTime when period starts).
        // If mainTimeLeft is already 0 and we're in byoyomi, check if period time elapsed.
        // Re-using mainTimeLeft = 0 sentinel: treat byoyomiTime as separate countdown.
        // Simple approach: decrement a period, reset to byoyomiTime.
        currentPlayer.byoyomiPeriodsLeft -= 1;
        if (currentPlayer.byoyomiPeriodsLeft <= 0) {
          timedOut = true;
        }
      } else {
        timedOut = true;
      }

      if (timedOut) {
        clearMoveTimer(roomId);
        // Determine winner as the opponent
        const opponent = freshGame.players.find(
          p => p.color !== freshGame.currentColor
        );
        freshGame.gameStatus = 'finished';
        freshGame.winReason = 'timeout';
        freshGame.finishedAt = new Date();
        if (opponent) {
          freshGame.winner = {
            slot: opponent.slot,
            color: opponent.color,
            userId: opponent.userId,
            guestId: opponent.guestId,
            guestName: opponent.guestName,
          };
        }
        await freshGame.save();
        io.to(`go:${roomId}`).emit('go:game-finished', {
          winner: freshGame.winner,
          winReason: 'timeout',
          finalScore: freshGame.finalScore,
        });
        cleanupRoomTimers(roomId);
        return;
      }

      await freshGame.save();

      tickCount += 1;
      if (tickCount % TIMER_EMIT_INTERVAL === 0) {
        io.to(`go:${roomId}`).emit('go:timer-update', {
          players: freshGame.players.map(p => ({
            slot: p.slot,
            color: p.color,
            mainTimeLeft: p.mainTimeLeft,
            byoyomiPeriodsLeft: p.byoyomiPeriodsLeft,
          })),
          currentColor: freshGame.currentColor,
        });
      }
    } catch (err) {
      console.error('[go:timer] Error:', err);
    }
  }, 1000);

  activeTimers.set(roomId, interval);
}

function clearMoveTimer(roomId: string): void {
  const timer = activeTimers.get(roomId);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(roomId);
  }
}

function startDisconnectTimer(
  io: SocketIOServer,
  roomId: string,
  playerId: string,
  slot: number
): void {
  const key = `${roomId}:${slot}`;
  clearDisconnectTimer(roomId, slot);

  const timer = setTimeout(async () => {
    disconnectTimers.delete(key);
    try {
      const game = await GoGame.findOne({ roomId });
      if (!game || game.gameStatus === 'finished' || game.gameStatus === 'abandoned') return;

      const disconnectedPlayer = game.players.find(p => p.slot === slot);
      const opponent = game.players.find(p => p.slot !== slot);

      if (!disconnectedPlayer) return;

      game.gameStatus = 'finished';
      game.winReason = 'timeout';
      game.finishedAt = new Date();

      if (opponent) {
        game.winner = {
          slot: opponent.slot,
          color: opponent.color,
          userId: opponent.userId,
          guestId: opponent.guestId,
          guestName: opponent.guestName,
        };
      }

      await game.save();
      clearMoveTimer(roomId);
      cleanupRoomTimers(roomId);

      io.to(`go:${roomId}`).emit('go:game-finished', {
        winner: game.winner,
        winReason: 'timeout',
        finalScore: null,
        disconnectedPlayerId: playerId,
      });
    } catch (err) {
      console.error('[go:disconnectTimer] Error:', err);
    }
  }, RECONNECT_WINDOW_MS);

  disconnectTimers.set(key, timer);
}

function clearDisconnectTimer(roomId: string, slot: number): void {
  const key = `${roomId}:${slot}`;
  const timer = disconnectTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(key);
  }
}

function cleanupRoomTimers(roomId: string): void {
  clearMoveTimer(roomId);
  for (const [key, timer] of disconnectTimers.entries()) {
    if (key.startsWith(`${roomId}:`)) {
      clearTimeout(timer);
      disconnectTimers.delete(key);
    }
  }
  for (const key of activePlayerSockets.keys()) {
    if (key.startsWith(`${roomId}:`)) {
      activePlayerSockets.delete(key);
    }
  }
}

// ─── Player Helpers ──────────────────────────────────────────────

function getPlayerId(socket: Socket): string | null {
  return socket.data.userId || socket.data.guestId || null;
}

async function resolvePlayerName(player: IGoPlayer): Promise<string> {
  if (player.userId) {
    const user = await User.findById(player.userId).select('username').lean();
    return user?.username || `Player ${player.slot}`;
  }
  return player.guestName || `Player ${player.slot}`;
}

function findPlayerInGame(game: IGoGame, playerId: string): IGoPlayer | undefined {
  return game.players.find(
    p =>
      (p.userId && p.userId.toString() === playerId) ||
      (p.guestId && p.guestId === playerId)
  );
}

async function buildPlayersInfo(game: IGoGame): Promise<any[]> {
  return Promise.all(
    game.players.map(async p => ({
      slot: p.slot,
      color: p.color,
      name: await resolvePlayerName(p),
      captures: p.captures,
      mainTimeLeft: p.mainTimeLeft,
      byoyomiPeriodsLeft: p.byoyomiPeriodsLeft,
      passed: p.passed,
      scoringAgreed: p.scoringAgreed,
      isConnected: p.isConnected,
    }))
  );
}

// ─── Main Setup ──────────────────────────────────────────────────

export function setupGoSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {

    // ── go:create-room ──────────────────────────────────────────
    socket.on('go:create-room', async (data: any, callback: Function) => {
      try {
        const { rules = {}, password, guestId, guestName } = data || {};
        const userId = socket.data.userId || null;
        const effectiveGuestId = userId ? undefined : (guestId || socket.data.guestId);
        const hostPlayerId = userId || effectiveGuestId;

        if (!hostPlayerId) {
          return callback({ success: false, error: 'GO_NO_PLAYER_ID' });
        }

        const roomId = uuidv4();
        const roomCode = await generateGoRoomCode();

        let hashedPassword: string | null = null;
        if (password && password.trim()) {
          hashedPassword = await bcrypt.hash(password.trim(), 10);
        }

        const settings = {
          boardSize: rules.boardSize || 19,
          komi: rules.komi ?? 6.5,
          handicap: rules.handicap || 0,
          mainTime: rules.mainTime || 0,
          byoyomiPeriods: rules.byoyomiPeriods ?? 3,
          byoyomiTime: rules.byoyomiTime || 30,
        };

        const game = new GoGame({
          roomId,
          roomCode,
          gameType: 'go',
          hostPlayerId,
          settings,
          password: hashedPassword,
          players: [{
            slot: 1,
            userId: userId || undefined,
            guestId: userId ? undefined : effectiveGuestId,
            guestName: userId ? undefined : guestName,
            color: 'black',
            captures: 0,
            mainTimeLeft: settings.mainTime,
            byoyomiPeriodsLeft: settings.byoyomiPeriods,
            passed: false,
            scoringAgreed: false,
            isConnected: true,
          }],
          gameStatus: 'waiting',
        });

        await game.save();

        socket.data.goRoomId = roomId;
        socket.data.goPlayerSlot = 1;
        socket.join(`go:${roomId}`);

        // Track socket
        if (hostPlayerId) {
          activePlayerSockets.set(`${roomId}:${hostPlayerId}`, socket.id);
        }

        callback({
          success: true,
          roomId,
          roomCode,
          rules: game.settings,
          players: await buildPlayersInfo(game),
          hasPassword: !!hashedPassword,
        });
      } catch (err: any) {
        console.error('[go:create-room] Error:', err.message);
        callback({ success: false, error: 'GO_CREATE_FAILED' });
      }
    });

    // ── go:join-room ────────────────────────────────────────────
    socket.on('go:join-room', async (data: any, callback: Function) => {
      try {
        const { roomCode, password, guestId, guestName } = data || {};
        if (!roomCode) return callback({ success: false, error: 'GO_NO_ROOM_CODE' });

        const userId = socket.data.userId || null;
        const effectiveGuestId = userId ? undefined : (guestId || socket.data.guestId);
        const playerId = userId || effectiveGuestId;

        if (!playerId) return callback({ success: false, error: 'GO_NO_PLAYER_ID' });

        const game = await GoGame.findOne({ roomCode: roomCode.toUpperCase() }).select('+password');
        if (!game) return callback({ success: false, error: 'GO_ROOM_NOT_FOUND' });
        if (game.gameStatus !== 'waiting') return callback({ success: false, error: 'GO_ROOM_NOT_WAITING' });
        if (game.players.length >= 2) return callback({ success: false, error: 'GO_ROOM_FULL' });

        // Check if already in room (reconnect)
        const existing = findPlayerInGame(game, playerId as string);
        if (existing) {
          socket.data.goRoomId = game.roomId;
          socket.data.goPlayerSlot = existing.slot;
          socket.join(`go:${game.roomId}`);
          if (playerId) activePlayerSockets.set(`${game.roomId}:${playerId}`, socket.id);
          const players = await buildPlayersInfo(game);
          return callback({
            success: true,
            roomId: game.roomId,
            roomCode: game.roomCode,
            rules: game.settings,
            players,
            gameStatus: game.gameStatus,
            isHost: game.hostPlayerId === playerId,
            mySlot: existing.slot,
          });
        }

        // Password check
        if ((game as any).password) {
          if (!password) return callback({ success: false, error: 'GO_PASSWORD_REQUIRED' });
          const valid = await bcrypt.compare(password, (game as any).password);
          if (!valid) return callback({ success: false, error: 'GO_WRONG_PASSWORD' });
        }

        // Add as slot 2 (white)
        game.players.push({
          slot: 2,
          userId: userId || undefined,
          guestId: userId ? undefined : effectiveGuestId,
          guestName: userId ? undefined : guestName,
          color: 'white',
          captures: 0,
          mainTimeLeft: game.settings.mainTime,
          byoyomiPeriodsLeft: game.settings.byoyomiPeriods,
          passed: false,
          scoringAgreed: false,
          isConnected: true,
        } as any);

        await game.save();

        socket.data.goRoomId = game.roomId;
        socket.data.goPlayerSlot = 2;
        socket.join(`go:${game.roomId}`);
        if (playerId) activePlayerSockets.set(`${game.roomId}:${playerId}`, socket.id);

        const players = await buildPlayersInfo(game);

        io.to(`go:${game.roomId}`).emit('go:player-joined', {
          players,
          playerCount: game.players.length,
        });

        callback({
          success: true,
          roomId: game.roomId,
          roomCode: game.roomCode,
          rules: game.settings,
          players,
          gameStatus: game.gameStatus,
          isHost: false,
          mySlot: 2,
        });
      } catch (err: any) {
        console.error('[go:join-room] Error:', err.message);
        callback({ success: false, error: 'GO_JOIN_FAILED' });
      }
    });

    // ── go:leave-room ───────────────────────────────────────────
    socket.on('go:leave-room', async (data: any, callback: Function) => {
      try {
        const { roomId } = data || {};
        if (!roomId) return callback?.({ success: false, error: 'GO_NO_ROOM_ID' });

        const playerId = getPlayerId(socket);
        const game = await GoGame.findOne({ roomId });
        if (!game) return callback?.({ success: true });

        const leavingPlayer = playerId ? findPlayerInGame(game, playerId) : null;
        const slot = leavingPlayer?.slot;

        if (game.gameStatus === 'playing' || game.gameStatus === 'scoring') {
          // Opponent wins by abandon
          const opponent = game.players.find(p => p.slot !== slot);
          game.gameStatus = 'finished';
          game.winReason = 'resign';
          game.finishedAt = new Date();
          if (opponent) {
            game.winner = {
              slot: opponent.slot,
              color: opponent.color,
              userId: opponent.userId,
              guestId: opponent.guestId,
              guestName: opponent.guestName,
            };
          }
          clearMoveTimer(roomId);
        }

        // Remove leaving player
        game.players = game.players.filter(p => p.slot !== slot) as any;

        if (game.players.length === 0) {
          await GoGame.deleteOne({ roomId });
          cleanupRoomTimers(roomId);
        } else {
          // Transfer host if needed
          if (game.hostPlayerId === playerId && game.players.length > 0) {
            const remaining = game.players[0];
            game.hostPlayerId = remaining.userId?.toString() || remaining.guestId || '';
          }
          await game.save();
        }

        socket.leave(`go:${roomId}`);
        socket.data.goRoomId = undefined;

        if (playerId) activePlayerSockets.delete(`${roomId}:${playerId}`);
        if (slot) clearDisconnectTimer(roomId, slot);

        io.to(`go:${roomId}`).emit('go:player-left', {
          slot,
          playerId,
          winner: game.winner || null,
          winReason: game.winReason || null,
        });

        callback?.({ success: true });
      } catch (err: any) {
        console.error('[go:leave-room] Error:', err.message);
        callback?.({ success: false, error: 'GO_LEAVE_FAILED' });
      }
    });

    // ── go:start-game ───────────────────────────────────────────
    socket.on('go:start-game', async (data: any, callback: Function) => {
      try {
        const { roomId } = data || {};
        if (!roomId) return callback({ success: false, error: 'GO_NO_ROOM_ID' });

        const playerId = getPlayerId(socket);
        const game = await GoGame.findOne({ roomId });
        if (!game) return callback({ success: false, error: 'GO_ROOM_NOT_FOUND' });
        if (game.hostPlayerId !== playerId) return callback({ success: false, error: 'GO_NOT_HOST' });
        if (game.players.length < 2) return callback({ success: false, error: 'GO_NEED_TWO_PLAYERS' });
        if (game.gameStatus !== 'waiting') return callback({ success: false, error: 'GO_ALREADY_STARTED' });

        const { board, currentColor } = initBoardWithHandicap(
          game.settings.boardSize,
          game.settings.handicap
        );

        game.board = board;
        game.currentColor = currentColor;
        game.gameStatus = 'playing';
        game.phase = 'play';
        game.moveCount = 0;
        game.consecutivePasses = 0;
        game.koPoint = null;
        game.boardHistory = [hashBoard(board)];
        game.startedAt = new Date();

        // Init player timers
        game.players.forEach(p => {
          p.mainTimeLeft = game.settings.mainTime;
          p.byoyomiPeriodsLeft = game.settings.byoyomiPeriods;
        });

        await game.save();

        const players = await buildPlayersInfo(game);

        io.to(`go:${roomId}`).emit('go:game-started', {
          board: game.board,
          currentColor: game.currentColor,
          players,
          settings: game.settings,
        });

        if (game.settings.mainTime > 0) {
          startMoveTimer(io, roomId, game);
        }

        callback({ success: true });
      } catch (err: any) {
        console.error('[go:start-game] Error:', err.message);
        callback({ success: false, error: 'GO_START_FAILED' });
      }
    });

    // ── go:place-stone ──────────────────────────────────────────
    socket.on('go:place-stone', async (data: any, callback: Function) => {
      try {
        const { roomId, row, col } = data || {};
        if (!roomId || row == null || col == null) {
          return callback({ success: false, error: 'GO_INVALID_DATA' });
        }

        const playerId = getPlayerId(socket);
        const game = await GoGame.findOne({ roomId });
        if (!game) return callback({ success: false, error: 'GO_ROOM_NOT_FOUND' });
        if (game.gameStatus !== 'playing') return callback({ success: false, error: 'GO_NOT_IN_PLAY' });

        const player = playerId ? findPlayerInGame(game, playerId) : null;
        if (!player) return callback({ success: false, error: 'GO_NOT_IN_GAME' });
        if (player.color !== game.currentColor) return callback({ success: false, error: 'GO_NOT_YOUR_TURN' });

        const result = applyMove(game, row, col, player.color as GoColor);
        if (!result.valid) return callback({ success: false, error: result.error });

        // Reset byoyomi period time on move (if in byoyomi)
        if (player.mainTimeLeft === 0) {
          // Player used a byoyomi period — reset their period time via mainTimeLeft sentinel
          // We leave byoyomiPeriodsLeft as-is (already decremented during timeout counting)
        }

        await game.save();

        const players = await buildPlayersInfo(game);
        const lastMove = game.moveHistory[game.moveHistory.length - 1];

        io.to(`go:${roomId}`).emit('go:move-made', {
          board: game.board,
          move: lastMove,
          currentColor: game.currentColor,
          players,
          koPoint: game.koPoint,
          moveCount: game.moveCount,
        });

        // Restart timer for next player
        if (game.settings.mainTime > 0) {
          startMoveTimer(io, roomId, game);
        }

        callback({ success: true });
      } catch (err: any) {
        console.error('[go:place-stone] Error:', err.message);
        callback({ success: false, error: 'GO_PLACE_FAILED' });
      }
    });

    // ── go:pass ─────────────────────────────────────────────────
    socket.on('go:pass', async (data: any, callback: Function) => {
      try {
        const { roomId } = data || {};
        if (!roomId) return callback({ success: false, error: 'GO_NO_ROOM_ID' });

        const playerId = getPlayerId(socket);
        const game = await GoGame.findOne({ roomId });
        if (!game) return callback({ success: false, error: 'GO_ROOM_NOT_FOUND' });
        if (game.gameStatus !== 'playing') return callback({ success: false, error: 'GO_NOT_IN_PLAY' });

        const player = playerId ? findPlayerInGame(game, playerId) : null;
        if (!player) return callback({ success: false, error: 'GO_NOT_IN_GAME' });
        if (player.color !== game.currentColor) return callback({ success: false, error: 'GO_NOT_YOUR_TURN' });

        applyPass(game, player.color as GoColor);

        const players = await buildPlayersInfo(game);

        if (game.consecutivePasses >= 2) {
          // Transition to scoring
          const deadStones = suggestDeadStones(game.board);
          const territory = calculateTerritory(game.board, deadStones);
          const finalScore = calculateScore(game.board, deadStones, game.settings.komi);

          game.deadStones = deadStones;
          game.territory = territory;
          game.finalScore = finalScore;

          await game.save();

          const passMadePlayers = await buildPlayersInfo(game);

          io.to(`go:${roomId}`).emit('go:pass-made', {
            color: player.color,
            currentColor: game.currentColor,
            consecutivePasses: game.consecutivePasses,
            players: passMadePlayers,
          });

          io.to(`go:${roomId}`).emit('go:scoring-started', {
            deadStones: game.deadStones,
            territory: game.territory,
            score: game.finalScore,
          });

          clearMoveTimer(roomId);
        } else {
          await game.save();

          io.to(`go:${roomId}`).emit('go:pass-made', {
            color: player.color,
            currentColor: game.currentColor,
            consecutivePasses: game.consecutivePasses,
            players,
          });

          if (game.settings.mainTime > 0) {
            startMoveTimer(io, roomId, game);
          }
        }

        callback({ success: true });
      } catch (err: any) {
        console.error('[go:pass] Error:', err.message);
        callback({ success: false, error: 'GO_PASS_FAILED' });
      }
    });

    // ── go:toggle-dead ──────────────────────────────────────────
    socket.on('go:toggle-dead', async (data: any, callback: Function) => {
      try {
        const { roomId, row, col } = data || {};
        if (!roomId || row == null || col == null) {
          return callback({ success: false, error: 'GO_INVALID_DATA' });
        }

        const game = await GoGame.findOne({ roomId });
        if (!game) return callback({ success: false, error: 'GO_ROOM_NOT_FOUND' });
        if (game.phase !== 'scoring') return callback({ success: false, error: 'GO_NOT_SCORING' });

        const newDeadStones = toggleDeadStoneGroup(game.board, game.deadStones, row, col);
        const territory = calculateTerritory(game.board, newDeadStones);
        const finalScore = calculateScore(game.board, newDeadStones, game.settings.komi);

        game.deadStones = newDeadStones;
        game.territory = territory;
        game.finalScore = finalScore;
        // Reset agreement
        game.players.forEach(p => { p.scoringAgreed = false; });

        await game.save();

        io.to(`go:${roomId}`).emit('go:dead-toggled', {
          deadStones: game.deadStones,
          territory: game.territory,
          score: game.finalScore,
        });

        callback({ success: true });
      } catch (err: any) {
        console.error('[go:toggle-dead] Error:', err.message);
        callback({ success: false, error: 'GO_TOGGLE_FAILED' });
      }
    });

    // ── go:agree-scoring ────────────────────────────────────────
    socket.on('go:agree-scoring', async (data: any, callback: Function) => {
      try {
        const { roomId } = data || {};
        if (!roomId) return callback({ success: false, error: 'GO_NO_ROOM_ID' });

        const playerId = getPlayerId(socket);
        const game = await GoGame.findOne({ roomId });
        if (!game) return callback({ success: false, error: 'GO_ROOM_NOT_FOUND' });
        if (game.phase !== 'scoring') return callback({ success: false, error: 'GO_NOT_SCORING' });

        const player = playerId ? findPlayerInGame(game, playerId) : null;
        if (!player) return callback({ success: false, error: 'GO_NOT_IN_GAME' });

        player.scoringAgreed = true;

        const allAgreed = game.players.every(p => p.scoringAgreed);

        if (allAgreed) {
          // Finalize game
          const finalScore = calculateScore(game.board, game.deadStones, game.settings.komi);
          game.finalScore = finalScore;

          const blackTotal = finalScore.black.total;
          const whiteTotal = finalScore.white.total;
          const winnerColor: GoColor = blackTotal > whiteTotal ? 'black' : 'white';
          const winnerPlayer = game.players.find(p => p.color === winnerColor);

          game.gameStatus = 'finished';
          game.winReason = 'score';
          game.finishedAt = new Date();

          if (winnerPlayer) {
            game.winner = {
              slot: winnerPlayer.slot,
              color: winnerPlayer.color,
              userId: winnerPlayer.userId,
              guestId: winnerPlayer.guestId,
              guestName: winnerPlayer.guestName,
            };
          }

          await game.save();
          cleanupRoomTimers(roomId);

          io.to(`go:${roomId}`).emit('go:game-finished', {
            winner: game.winner,
            winReason: 'score',
            finalScore: game.finalScore,
          });
        } else {
          await game.save();
          const players = await buildPlayersInfo(game);
          io.to(`go:${roomId}`).emit('go:scoring-agreed', {
            slot: player.slot,
            players,
          });
        }

        callback({ success: true });
      } catch (err: any) {
        console.error('[go:agree-scoring] Error:', err.message);
        callback({ success: false, error: 'GO_AGREE_FAILED' });
      }
    });

    // ── go:reject-scoring ───────────────────────────────────────
    socket.on('go:reject-scoring', async (data: any, callback: Function) => {
      try {
        const { roomId } = data || {};
        if (!roomId) return callback({ success: false, error: 'GO_NO_ROOM_ID' });

        const game = await GoGame.findOne({ roomId });
        if (!game) return callback({ success: false, error: 'GO_ROOM_NOT_FOUND' });

        game.phase = 'play';
        game.gameStatus = 'playing';
        game.consecutivePasses = 0;
        game.deadStones = [];
        game.territory = { black: [], white: [], neutral: [] };
        game.players.forEach(p => { p.scoringAgreed = false; });

        await game.save();

        const players = await buildPlayersInfo(game);

        io.to(`go:${roomId}`).emit('go:resume-play', { players });

        if (game.settings.mainTime > 0) {
          startMoveTimer(io, roomId, game);
        }

        callback({ success: true });
      } catch (err: any) {
        console.error('[go:reject-scoring] Error:', err.message);
        callback({ success: false, error: 'GO_REJECT_FAILED' });
      }
    });

    // ── go:resign ───────────────────────────────────────────────
    socket.on('go:resign', async (data: any, callback: Function) => {
      try {
        const { roomId } = data || {};
        if (!roomId) return callback({ success: false, error: 'GO_NO_ROOM_ID' });

        const playerId = getPlayerId(socket);
        const game = await GoGame.findOne({ roomId });
        if (!game) return callback({ success: false, error: 'GO_ROOM_NOT_FOUND' });

        const resigningPlayer = playerId ? findPlayerInGame(game, playerId) : null;
        if (!resigningPlayer) return callback({ success: false, error: 'GO_NOT_IN_GAME' });

        const opponent = game.players.find(p => p.slot !== resigningPlayer.slot);

        game.gameStatus = 'finished';
        game.winReason = 'resign';
        game.finishedAt = new Date();

        if (opponent) {
          game.winner = {
            slot: opponent.slot,
            color: opponent.color,
            userId: opponent.userId,
            guestId: opponent.guestId,
            guestName: opponent.guestName,
          };
        }

        await game.save();
        cleanupRoomTimers(roomId);

        io.to(`go:${roomId}`).emit('go:game-finished', {
          winner: game.winner,
          winReason: 'resign',
          finalScore: null,
          resignedSlot: resigningPlayer.slot,
        });

        callback({ success: true });
      } catch (err: any) {
        console.error('[go:resign] Error:', err.message);
        callback({ success: false, error: 'GO_RESIGN_FAILED' });
      }
    });

    // ── go:request-undo ─────────────────────────────────────────
    socket.on('go:request-undo', async (data: any, callback: Function) => {
      try {
        const { roomId } = data || {};
        if (!roomId) return callback({ success: false, error: 'GO_NO_ROOM_ID' });

        const playerId = getPlayerId(socket);
        const game = await GoGame.findOne({ roomId });
        if (!game) return callback({ success: false, error: 'GO_ROOM_NOT_FOUND' });
        if (game.moveHistory.length === 0) return callback({ success: false, error: 'GO_NO_MOVES' });

        const requestingPlayer = playerId ? findPlayerInGame(game, playerId) : null;
        if (!requestingPlayer) return callback({ success: false, error: 'GO_NOT_IN_GAME' });

        const opponent = game.players.find(p => p.slot !== requestingPlayer.slot);
        if (!opponent) return callback({ success: false, error: 'GO_NO_OPPONENT' });

        // Emit undo request to opponent only
        const opponentPlayerId = opponent.userId?.toString() || opponent.guestId;
        if (opponentPlayerId) {
          const oppSocketId = activePlayerSockets.get(`${roomId}:${opponentPlayerId}`);
          if (oppSocketId) {
            io.to(oppSocketId).emit('go:undo-requested', {
              requestingSlot: requestingPlayer.slot,
            });
          }
        }

        callback({ success: true });
      } catch (err: any) {
        console.error('[go:request-undo] Error:', err.message);
        callback({ success: false, error: 'GO_UNDO_REQUEST_FAILED' });
      }
    });

    // ── go:approve-undo ─────────────────────────────────────────
    socket.on('go:approve-undo', async (data: any, callback: Function) => {
      try {
        const { roomId } = data || {};
        if (!roomId) return callback({ success: false, error: 'GO_NO_ROOM_ID' });

        const game = await GoGame.findOne({ roomId });
        if (!game) return callback({ success: false, error: 'GO_ROOM_NOT_FOUND' });
        if (game.moveHistory.length === 0) return callback({ success: false, error: 'GO_NO_MOVES' });

        // Pop last move
        game.moveHistory.pop();
        if (game.boardHistory.length > 1) {
          game.boardHistory.pop();
        }

        // Revert board to previous state from boardHistory
        const prevHash = game.boardHistory[game.boardHistory.length - 1];
        if (prevHash) {
          // Reconstruct board from hash: each row is joined by ''
          const rows = prevHash.split('|');
          game.board = rows.map(row => row.split('').map(Number));
        }

        game.moveCount = Math.max(0, game.moveCount - 1);
        // Toggle back current color
        game.currentColor = game.currentColor === 'black' ? 'white' : 'black';
        game.koPoint = null;
        game.consecutivePasses = 0;

        await game.save();

        const players = await buildPlayersInfo(game);

        io.to(`go:${roomId}`).emit('go:undo-resolved', {
          approved: true,
          board: game.board,
          currentColor: game.currentColor,
          players,
          moveHistory: game.moveHistory,
          moveCount: game.moveCount,
        });

        callback({ success: true });
      } catch (err: any) {
        console.error('[go:approve-undo] Error:', err.message);
        callback({ success: false, error: 'GO_UNDO_APPROVE_FAILED' });
      }
    });

    // ── go:reject-undo ──────────────────────────────────────────
    socket.on('go:reject-undo', async (data: any, callback: Function) => {
      try {
        const { roomId } = data || {};
        if (!roomId) return callback({ success: false, error: 'GO_NO_ROOM_ID' });

        io.to(`go:${roomId}`).emit('go:undo-resolved', { approved: false });
        callback({ success: true });
      } catch (err: any) {
        console.error('[go:reject-undo] Error:', err.message);
        callback({ success: false, error: 'GO_UNDO_REJECT_FAILED' });
      }
    });

    // ── go:new-game ─────────────────────────────────────────────
    socket.on('go:new-game', async (data: any, callback: Function) => {
      try {
        const { roomId } = data || {};
        if (!roomId) return callback({ success: false, error: 'GO_NO_ROOM_ID' });

        const game = await GoGame.findOne({ roomId });
        if (!game) return callback({ success: false, error: 'GO_ROOM_NOT_FOUND' });
        if (game.players.length < 2) return callback({ success: false, error: 'GO_NEED_TWO_PLAYERS' });

        // Swap colors
        game.players.forEach(p => {
          p.color = p.color === 'black' ? 'white' : 'black';
        });

        const { board, currentColor } = initBoardWithHandicap(
          game.settings.boardSize,
          game.settings.handicap
        );

        game.board = board;
        game.currentColor = currentColor;
        game.gameStatus = 'playing';
        game.phase = 'play';
        game.moveCount = 0;
        game.consecutivePasses = 0;
        game.koPoint = null;
        game.boardHistory = [hashBoard(board)];
        game.moveHistory = [];
        game.deadStones = [];
        game.territory = { black: [], white: [], neutral: [] };
        game.finalScore = null;
        game.winner = null;
        game.winReason = null;
        game.startedAt = new Date();
        game.finishedAt = null;

        game.players.forEach(p => {
          p.captures = 0;
          p.mainTimeLeft = game.settings.mainTime;
          p.byoyomiPeriodsLeft = game.settings.byoyomiPeriods;
          p.passed = false;
          p.scoringAgreed = false;
        });

        await game.save();

        const players = await buildPlayersInfo(game);

        io.to(`go:${roomId}`).emit('go:game-reset', {
          board: game.board,
          currentColor: game.currentColor,
          players,
          settings: game.settings,
        });

        if (game.settings.mainTime > 0) {
          startMoveTimer(io, roomId, game);
        }

        callback({ success: true });
      } catch (err: any) {
        console.error('[go:new-game] Error:', err.message);
        callback({ success: false, error: 'GO_NEW_GAME_FAILED' });
      }
    });

    // ── go:update-room ──────────────────────────────────────────
    socket.on('go:update-room', async (data: any, callback: Function) => {
      try {
        const { roomId, rules } = data || {};
        if (!roomId) return callback({ success: false, error: 'GO_NO_ROOM_ID' });

        const playerId = getPlayerId(socket);
        const game = await GoGame.findOne({ roomId });
        if (!game) return callback({ success: false, error: 'GO_ROOM_NOT_FOUND' });
        if (game.hostPlayerId !== playerId) return callback({ success: false, error: 'GO_NOT_HOST' });
        if (game.gameStatus !== 'waiting') return callback({ success: false, error: 'GO_ALREADY_STARTED' });

        if (rules) {
          if (rules.boardSize != null) game.settings.boardSize = rules.boardSize;
          if (rules.komi != null) game.settings.komi = rules.komi;
          if (rules.handicap != null) game.settings.handicap = rules.handicap;
          if (rules.mainTime != null) game.settings.mainTime = rules.mainTime;
          if (rules.byoyomiPeriods != null) game.settings.byoyomiPeriods = rules.byoyomiPeriods;
          if (rules.byoyomiTime != null) game.settings.byoyomiTime = rules.byoyomiTime;
        }

        // Update player timers to match new settings
        game.players.forEach(p => {
          p.mainTimeLeft = game.settings.mainTime;
          p.byoyomiPeriodsLeft = game.settings.byoyomiPeriods;
        });

        game.markModified('settings');
        await game.save();

        io.to(`go:${roomId}`).emit('go:settings-updated', {
          settings: game.settings,
        });

        callback({ success: true, settings: game.settings });
      } catch (err: any) {
        console.error('[go:update-room] Error:', err.message);
        callback({ success: false, error: 'GO_UPDATE_FAILED' });
      }
    });

    // ── disconnect ───────────────────────────────────────────────
    socket.on('disconnect', async () => {
      try {
        const roomId = socket.data.goRoomId;
        const slot = socket.data.goPlayerSlot;
        if (!roomId) return;

        const playerId = getPlayerId(socket);

        // Verify this socket is the active socket for the player (prevent stale disconnect)
        if (playerId) {
          const activeSocketId = activePlayerSockets.get(`${roomId}:${playerId}`);
          if (activeSocketId && activeSocketId !== socket.id) return;
        }

        const game = await GoGame.findOne({ roomId });
        if (!game) return;
        if (game.gameStatus === 'finished' || game.gameStatus === 'abandoned') return;

        const player = game.players.find(p => p.slot === slot);
        if (!player) return;

        player.isConnected = false;
        player.disconnectedAt = new Date();
        await game.save();

        // Pause move timer
        clearMoveTimer(roomId);

        io.to(`go:${roomId}`).emit('go:player-disconnected', {
          slot,
          playerId,
        });

        // Start 5-min disconnect timer (only if game is active)
        if (game.gameStatus === 'playing' || game.gameStatus === 'scoring') {
          startDisconnectTimer(io, roomId, playerId || '', slot);
        }
      } catch (err) {
        console.error('[go:disconnect] Error:', err);
      }
    });

  }); // end io.on('connection')
}
