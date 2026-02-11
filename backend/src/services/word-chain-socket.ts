/**
 * Word Chain Socket Handlers
 * Separate from main socketService.ts — all word-chain:* events handled here.
 * Includes server-side timer management.
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import WordChainGame from '../models/WordChainGame';
import User from '../models/User';
import { IWordChainGame, IWordChainPlayer } from '../types/word-chain.types';
import {
  normalizeWord,
  getLastSyllable,
  getFirstSyllable,
  getDictionary,
  buildRoomDictionary,
  isValidVietnameseWord,
  matchesWordType,
  logMissingWord
} from './word-chain-dictionary';
import {
  validateWord,
  getNextPlayerSlot,
  selectFirstWord,
  checkGameEnd,
  checkNoWordsAvailable,
  calculateScore,
  getSpeedModeTurnDuration,
  generateWordChainRoomCode,
  determineWinnerByScore,
} from './word-chain-engine';

// ─── Timer Management ──────────────────────────────────────────

const activeTimers = new Map<string, NodeJS.Timeout>();
const disconnectTimers = new Map<string, NodeJS.Timeout>(); // key: `${roomId}:${slot}`
const turnGraceTimers = new Map<string, NodeJS.Timeout>(); // key: `${roomId}:${slot}` — short grace for active turn
const roomDictionaries = new Map<string, ReturnType<typeof buildRoomDictionary>>();
const roomPlayerNames = new Map<string, Map<number, string>>(); // roomId -> slot -> resolved name

const RECONNECT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const TURN_GRACE_MS = 10 * 1000; // 10 seconds grace before treating disconnect as timeout

function startTurnTimer(
  io: SocketIOServer,
  roomId: string,
  durationMs: number,
  onTimeout: () => void
): void {
  clearTurnTimer(roomId);
  const timer = setTimeout(onTimeout, durationMs);
  activeTimers.set(roomId, timer);
}

function clearTurnTimer(roomId: string): void {
  const timer = activeTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(roomId);
  }
}

function cleanupRoom(roomId: string): void {
  clearTurnTimer(roomId);
  roomDictionaries.delete(roomId);
  roomPlayerNames.delete(roomId);
  // Clear all disconnect timers and grace timers for this room
  for (const [key, timer] of disconnectTimers.entries()) {
    if (key.startsWith(`${roomId}:`)) {
      clearTimeout(timer);
      disconnectTimers.delete(key);
    }
  }
  for (const [key, timer] of turnGraceTimers.entries()) {
    if (key.startsWith(`${roomId}:`)) {
      clearTimeout(timer);
      turnGraceTimers.delete(key);
    }
  }
}

// ─── Helper: Get player display name ───────────────────────────

function getPlayerName(player: IWordChainPlayer): string {
  return player.guestName || `Player ${player.slot}`;
}

// ─── Helper: Get username for auth player (with room cache) ────

async function resolvePlayerName(player: IWordChainPlayer, roomId?: string): Promise<string> {
  // Check room cache first
  if (roomId) {
    const cache = roomPlayerNames.get(roomId);
    if (cache?.has(player.slot)) {
      return cache.get(player.slot)!;
    }
  }

  let name: string;
  if (player.userId) {
    const user = await User.findById(player.userId).select('username').lean();
    name = user?.username || `Player ${player.slot}`;
  } else {
    name = player.guestName || `Player ${player.slot}`;
  }

  // Store in cache
  if (roomId) {
    if (!roomPlayerNames.has(roomId)) {
      roomPlayerNames.set(roomId, new Map());
    }
    roomPlayerNames.get(roomId)!.set(player.slot, name);
  }

  return name;
}

/** Build/refresh name cache for all players in a room */
async function cacheAllPlayerNames(game: IWordChainGame): Promise<void> {
  const cache = new Map<number, string>();
  for (const p of game.players) {
    let name: string;
    if (p.userId) {
      const user = await User.findById(p.userId).select('username').lean();
      name = user?.username || `Player ${p.slot}`;
    } else {
      name = p.guestName || `Player ${p.slot}`;
    }
    cache.set(p.slot, name);
  }
  roomPlayerNames.set(game.roomId, cache);
}

/** Get cached player name (synchronous, must call cacheAllPlayerNames first) */
function getCachedPlayerName(roomId: string, slot: number): string {
  return roomPlayerNames.get(roomId)?.get(slot) || `Player ${slot}`;
}

/** Build players info array using cache (no DB queries) */
function buildPlayersInfo(game: IWordChainGame): any[] {
  return game.players.map(p => ({
    slot: p.slot,
    name: getCachedPlayerName(game.roomId, p.slot),
    guestName: p.guestName,
    lives: p.lives,
    score: p.score,
    wordsPlayed: p.wordsPlayed || 0,
    isEliminated: p.isEliminated,
    isConnected: p.isConnected,
    isHost: (p.userId?.toString() || p.guestId) === game.hostPlayerId,
  }));
}

// ─── Helper: Handle turn timeout / life loss ───────────────────

async function handleLifeLoss(
  io: SocketIOServer,
  game: IWordChainGame,
  playerSlot: number,
  reason: 'timeout' | 'rejected' | 'surrender'
): Promise<void> {
  const player = game.players.find(p => p.slot === playerSlot);
  if (!player || player.isEliminated) return;

  player.lives -= 1;

  if (player.lives <= 0) {
    player.isEliminated = true;
    io.to(game.roomId).emit('word-chain:player-eliminated', {
      playerId: player.userId?.toString() || player.guestId,
      slot: player.slot,
      playerName: getCachedPlayerName(game.roomId, player.slot),
      remainingPlayers: game.players.filter(p => !p.isEliminated).length,
    });
  }

  // Check game end
  const endCheck = checkGameEnd(game.players);
  if (endCheck.ended) {
    await finishGame(io, game, endCheck.winner);
    return;
  }

  // Move to next player
  const nextSlot = getNextPlayerSlot(game.players, game.currentPlayerSlot);
  if (nextSlot === -1) {
    // No active players left — determine winner by score instead of declaring draw
    const winner = determineWinnerByScore(game.players);
    await finishGame(io, game, winner);
    return;
  }

  game.currentPlayerSlot = nextSlot;
  game.turnStartedAt = new Date();

  // Speed mode: adjust timer
  let turnDuration = game.rules.turnDuration;
  if (game.rules.gameMode === 'speed') {
    turnDuration = getSpeedModeTurnDuration(game.roundNumber, game.rules.turnDuration);
  }

  await game.save();

  // Build updated players array using cache (no DB queries)
  const updatedPlayers = buildPlayersInfo(game);

  // Emit new turn with updated players (lives may have changed)
  const requiredSyllable = game.currentWord ? getLastSyllable(game.currentWord) : '';
  io.to(game.roomId).emit('word-chain:new-turn', {
    currentWord: game.currentWord,
    requiredSyllable,
    currentPlayerSlot: game.currentPlayerSlot,
    turnStartedAt: game.turnStartedAt.toISOString(),
    turnDuration,
    players: updatedPlayers,
  });

  // Start timer for next player
  startTurnTimer(io, game.roomId, turnDuration * 1000, async () => {
    const freshGame = await WordChainGame.findOne({ roomId: game.roomId });
    if (!freshGame || freshGame.gameStatus !== 'playing') return;

    io.to(freshGame.roomId).emit('word-chain:turn-timeout', {
      playerId: freshGame.players.find(p => p.slot === freshGame.currentPlayerSlot)?.userId?.toString() ||
                freshGame.players.find(p => p.slot === freshGame.currentPlayerSlot)?.guestId,
      slot: freshGame.currentPlayerSlot,
      livesRemaining: (freshGame.players.find(p => p.slot === freshGame.currentPlayerSlot)?.lives || 1) - 1,
    });

    await handleLifeLoss(io, freshGame, freshGame.currentPlayerSlot, 'timeout');
  });
}

// ─── Helper: Finish game ───────────────────────────────────────

async function finishGame(
  io: SocketIOServer,
  game: IWordChainGame,
  winner: IWordChainPlayer | 'draw' | undefined
): Promise<void> {
  cleanupRoom(game.roomId);

  game.gameStatus = 'finished';
  game.finishedAt = new Date();

  if (winner === 'draw' || !winner) {
    game.winner = 'draw';
  } else {
    game.winner = {
      slot: winner.slot,
      userId: winner.userId,
      guestId: winner.guestId,
      guestName: winner.guestName,
    };
  }

  await game.save();

  // Build players array using cache (no DB queries)
  const players = buildPlayersInfo(game);

  // Build winner info with name
  let winnerPayload: any = game.winner;
  if (winner !== 'draw' && winner) {
    winnerPayload = {
      slot: winner.slot,
      name: getCachedPlayerName(game.roomId, winner.slot),
      guestName: winner.guestName,
    };
  }

  io.to(game.roomId).emit('word-chain:game-finished', {
    winner: winnerPayload,
    players,
    wordChain: game.wordChain,
    lastWord: game.currentWord || (game.wordChain.length > 0 ? game.wordChain[game.wordChain.length - 1] : ''),
    totalWords: game.wordChain.length,
    duration: game.startedAt ? Date.now() - game.startedAt.getTime() : 0,
  });
}

// ─── Socket Handler Setup ──────────────────────────────────────

export function setupWordChainSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {

    // ─── CREATE ROOM ─────────────────────────────────────────
    socket.on('word-chain:create-room', async (data, callback) => {
      try {
        const { maxPlayers = 2, rules = {}, password, userId, guestId, guestName } = data;

        const roomId = uuidv4();
        const roomCode = await generateWordChainRoomCode();
        const hostPlayerId = userId || guestId;

        // Hash password if provided
        let hashedPassword: string | undefined;
        if (password) {
          hashedPassword = await bcrypt.hash(password, 10);
        }

        const player: IWordChainPlayer = {
          slot: 1,
          userId: userId || undefined,
          guestId: guestId || undefined,
          guestName: guestName || undefined,
          lives: rules.lives || 3,
          score: 0,
          wordsPlayed: 0,
          isEliminated: false,
          isConnected: true,
        } as IWordChainPlayer;

        const game = new WordChainGame({
          roomId,
          roomCode,
          gameType: 'word-chain',
          hostPlayerId,
          maxPlayers: Math.min(8, Math.max(2, maxPlayers)),
          rules: {
            wordType: rules.wordType || '2+',
            allowProperNouns: rules.allowProperNouns || false,
            allowSlang: rules.allowSlang || false,
            turnDuration: rules.turnDuration || 60,
            lives: rules.lives || 3,
            gameMode: rules.gameMode || 'classic',
            allowRepeat: rules.allowRepeat || false,
            showHint: rules.showHint !== false,
          },
          password: hashedPassword,
          players: [player],
          gameStatus: 'waiting',
        });

        await game.save();

        socket.join(roomId);
        socket.data.wordChainRoomId = roomId;
        socket.data.wordChainPlayerId = hostPlayerId;

        const hostName = guestName || (userId ? (await User.findById(userId).select('username').lean())?.username : null) || 'Host';
        const response = {
          roomId,
          roomCode,
          rules: game.rules,
          maxPlayers: game.maxPlayers,
          mySlot: 1,
          isHost: true,
          players: [{
            slot: 1,
            userId: userId || undefined,
            guestId: guestId || undefined,
            name: hostName,
            guestName: guestName || undefined,
            lives: game.rules.lives,
            score: 0,
            wordsPlayed: 0,
            isEliminated: false,
            isConnected: true,
            isHost: true,
          }],
        };

        // Room state sent via callback only (no event) to prevent double dispatch
        if (callback) callback({ success: true, ...response });

        // Broadcast to lobby
        io.emit('word-chain:rooms-updated', { action: 'created', roomId, roomCode });
      } catch (error) {
        console.error('[WordChain] Create room error:', error);
        if (callback) callback({ success: false, error: 'failedToCreate' });
      }
    });

    // ─── JOIN ROOM ───────────────────────────────────────────
    socket.on('word-chain:join-room', async (data, callback) => {
      try {
        const { roomCode, userId, guestId, guestName, password } = data;

        const game = await WordChainGame.findOne({ roomCode: roomCode?.toUpperCase() }).select('+password');
        if (!game) {
          if (callback) callback({ success: false, error: 'roomNotFound' });
          return;
        }

        // Check for reconnect: existing player rejoining
        const playerId = userId || guestId;
        const existingPlayer = game.players.find(
          p => (p.userId && p.userId.toString() === playerId) || (p.guestId === playerId)
        );

        if (existingPlayer) {
          // Reconnect: restore player state
          existingPlayer.isConnected = true;
          existingPlayer.disconnectedAt = undefined;
          await game.save();

          socket.join(game.roomId);
          socket.data.wordChainRoomId = game.roomId;
          socket.data.wordChainPlayerId = playerId;

          // Cancel disconnect elimination timer
          const timerKey = `${game.roomId}:${existingPlayer.slot}`;
          const disconnectTimer = disconnectTimers.get(timerKey);
          if (disconnectTimer) {
            clearTimeout(disconnectTimer);
            disconnectTimers.delete(timerKey);
          }

          // Cancel turn grace timer (player reconnected before grace expired)
          const graceTimer = turnGraceTimers.get(timerKey);
          if (graceTimer) {
            clearTimeout(graceTimer);
            turnGraceTimers.delete(timerKey);
          }

          // Build full state for reconnecting player
          const playersInfo = await Promise.all(
            game.players.map(async (p) => ({
              slot: p.slot,
              name: await resolvePlayerName(p),
              playerName: await resolvePlayerName(p),
              guestName: p.guestName,
              lives: p.lives,
              score: p.score,
              wordsPlayed: p.wordsPlayed,
              isEliminated: p.isEliminated,
              isConnected: p.isConnected,
              isHost: (p.userId?.toString() || p.guestId) === game.hostPlayerId,
            }))
          );

          const requiredSyllable = game.currentWord ? getLastSyllable(game.currentWord) : '';
          const isReconnectingHost = (existingPlayer.userId?.toString() || existingPlayer.guestId) === game.hostPlayerId;

          // Send full game state to reconnected player
          socket.emit('word-chain:joined-room' as any, {
            roomId: game.roomId,
            roomCode: game.roomCode,
            rules: game.rules,
            players: playersInfo,
            maxPlayers: game.maxPlayers,
            mySlot: existingPlayer.slot,
            isHost: isReconnectingHost,
            gameStatus: game.gameStatus,
            currentWord: game.currentWord,
            requiredSyllable,
            currentPlayerSlot: game.currentPlayerSlot,
            turnStartedAt: game.turnStartedAt?.toISOString(),
            turnDuration: game.rules.turnDuration,
            wordChain: game.wordChain,
            roundNumber: game.roundNumber,
          });

          // Notify room
          io.to(game.roomId).emit('word-chain:player-reconnected', {
            slot: existingPlayer.slot,
            playerName: await resolvePlayerName(existingPlayer),
          });

          if (callback) callback({
            success: true,
            roomId: game.roomId,
            roomCode: game.roomCode,
            slot: existingPlayer.slot,
            reconnected: true,
          });
          return;
        }

        if (game.gameStatus !== 'waiting') {
          if (callback) callback({ success: false, error: 'gameAlreadyStarted' });
          return;
        }

        if (game.players.length >= game.maxPlayers) {
          if (callback) callback({ success: false, error: 'roomFull' });
          return;
        }

        // Password check
        if (game.password) {
          if (!password) {
            if (callback) callback({ success: false, error: 'passwordRequired' });
            return;
          }
          const match = await bcrypt.compare(password, game.password);
          if (!match) {
            if (callback) callback({ success: false, error: 'wrongPassword' });
            return;
          }
        }

        // Assign next slot (use max existing slot + 1 to avoid collision after leaves)
        const nextSlot = game.players.length > 0
          ? Math.max(...game.players.map(p => p.slot)) + 1
          : 1;

        const newPlayer: IWordChainPlayer = {
          slot: nextSlot,
          userId: userId || undefined,
          guestId: guestId || undefined,
          guestName: guestName || undefined,
          lives: game.rules.lives,
          score: 0,
          wordsPlayed: 0,
          isEliminated: false,
          isConnected: true,
        } as IWordChainPlayer;

        game.players.push(newPlayer);
        await game.save();

        socket.join(game.roomId);
        socket.data.wordChainRoomId = game.roomId;
        socket.data.wordChainPlayerId = playerId;

        const playerName = guestName || (userId ? (await User.findById(userId).select('username').lean())?.username : null) || `Player ${nextSlot}`;

        io.to(game.roomId).emit('word-chain:player-joined', {
          player: {
            slot: nextSlot,
            name: playerName,
            guestName: guestName || undefined,
            lives: game.rules.lives,
            score: 0,
            wordsPlayed: 0,
            isEliminated: false,
            isConnected: true,
            isHost: false,
          },
          playerCount: game.players.length,
          maxPlayers: game.maxPlayers,
        });

        // Send full room state to the joining player
        const allPlayersInfo = await Promise.all(
          game.players.map(async (p) => ({
            slot: p.slot,
            name: await resolvePlayerName(p),
            guestName: p.guestName,
            lives: p.lives,
            score: p.score,
            wordsPlayed: p.wordsPlayed || 0,
            isEliminated: p.isEliminated,
            isConnected: p.isConnected,
            isHost: (p.userId?.toString() || p.guestId) === game.hostPlayerId,
          }))
        );

        const joinedPayload = {
          roomId: game.roomId,
          roomCode: game.roomCode,
          rules: game.rules,
          players: allPlayersInfo,
          maxPlayers: game.maxPlayers,
          mySlot: nextSlot,
          isHost: false,
          gameStatus: game.gameStatus,
        };

        // Send via both event and callback for reliability
        socket.emit('word-chain:joined-room' as any, joinedPayload);
        if (callback) callback({ success: true, ...joinedPayload });

        // Broadcast lobby update
        io.emit('word-chain:rooms-updated', { action: 'updated', roomId: game.roomId });
      } catch (error) {
        console.error('[WordChain] Join room error:', error);
        if (callback) callback({ success: false, error: 'failedToJoin' });
      }
    });

    // ─── KICK PLAYER (host only, waiting state only) ────────
    socket.on('word-chain:kick-player', async (data, callback) => {
      try {
        const { roomId, slot } = data;
        const game = await WordChainGame.findOne({ roomId });
        if (!game) {
          if (callback) callback({ success: false, error: 'roomNotFound' });
          return;
        }

        // Only host can kick, and only in waiting state
        const hostPlayerId = socket.data.wordChainPlayerId;
        if (game.hostPlayerId !== hostPlayerId) {
          if (callback) callback({ success: false, error: 'notHost' });
          return;
        }
        if (game.gameStatus !== 'waiting') {
          if (callback) callback({ success: false, error: 'gameAlreadyStarted' });
          return;
        }

        // Cannot kick self (host is always slot 1)
        if (slot === 1) {
          if (callback) callback({ success: false, error: 'cannotKickHost' });
          return;
        }

        const kickedIndex = game.players.findIndex(p => p.slot === slot);
        if (kickedIndex === -1) {
          if (callback) callback({ success: false, error: 'playerNotFound' });
          return;
        }

        const kickedPlayer = game.players[kickedIndex];
        const kickedName = await resolvePlayerName(kickedPlayer);

        // Cancel any disconnect timer for kicked player
        const timerKey = `${roomId}:${kickedPlayer.slot}`;
        const dcTimer = disconnectTimers.get(timerKey);
        if (dcTimer) {
          clearTimeout(dcTimer);
          disconnectTimers.delete(timerKey);
        }

        game.players.splice(kickedIndex, 1);
        await game.save();

        // Notify the kicked player directly
        const kickedPlayerId = kickedPlayer.userId?.toString() || kickedPlayer.guestId;

        // Find kicked player's socket and remove from room
        const sockets = await io.in(roomId).fetchSockets();
        for (const s of sockets) {
          if (s.data.wordChainPlayerId === kickedPlayerId) {
            s.emit('word-chain:kicked', { roomId, reason: 'kicked' });
            s.leave(roomId);
            s.data.wordChainRoomId = undefined;
            break;
          }
        }

        // Build remaining players info
        const remainingPlayers = await Promise.all(
          game.players.map(async (p) => ({
            slot: p.slot,
            name: await resolvePlayerName(p),
            guestName: p.guestName,
            lives: p.lives,
            score: p.score,
            wordsPlayed: p.wordsPlayed || 0,
            isEliminated: p.isEliminated,
            isConnected: p.isConnected,
            isHost: (p.userId?.toString() || p.guestId) === game.hostPlayerId,
          }))
        );

        // Notify remaining players
        io.to(roomId).emit('word-chain:player-left', {
          slot: kickedPlayer.slot,
          players: remainingPlayers,
          playerCount: game.players.length,
          kicked: true,
          kickedName,
        });

        if (callback) callback({ success: true });

        io.emit('word-chain:rooms-updated', { action: 'updated', roomId });
      } catch (error) {
        console.error('[WordChain] Kick player error:', error);
        if (callback) callback({ success: false, error: 'failedToKick' });
      }
    });

    // ─── UPDATE ROOM (host only, waiting state) ────────────
    socket.on('word-chain:update-room', async (data, callback) => {
      try {
        const { roomId, rules, maxPlayers, password } = data;
        const game = await WordChainGame.findOne({ roomId }).select('+password');
        if (!game) {
          if (callback) callback({ success: false, error: 'roomNotFound' });
          return;
        }

        const hostPlayerId = socket.data.wordChainPlayerId;
        if (game.hostPlayerId !== hostPlayerId) {
          if (callback) callback({ success: false, error: 'notHost' });
          return;
        }
        if (game.gameStatus !== 'waiting') {
          if (callback) callback({ success: false, error: 'gameAlreadyStarted' });
          return;
        }

        // Validate & apply maxPlayers
        if (maxPlayers !== undefined) {
          const clamped = Math.min(8, Math.max(2, maxPlayers));
          if (clamped < game.players.length) {
            if (callback) callback({ success: false, error: 'invalidMaxPlayers' });
            return;
          }
          game.maxPlayers = clamped;
        }

        // Validate & apply rules
        if (rules) {
          if (rules.turnDuration !== undefined) {
            const td = Number(rules.turnDuration);
            if (td >= 15 && td <= 120) game.rules.turnDuration = td;
          }
          if (rules.lives !== undefined) {
            const l = Number(rules.lives);
            if (l >= 1 && l <= 5) {
              game.rules.lives = l;
              // Update all waiting players' lives to new value
              for (const player of game.players) {
                player.lives = l;
              }
            }
          }
          if (rules.wordType !== undefined && ['2+', '3+', 'all'].includes(rules.wordType)) {
            game.rules.wordType = rules.wordType;
          }
          if (rules.gameMode !== undefined && ['classic', 'speed'].includes(rules.gameMode)) {
            game.rules.gameMode = rules.gameMode;
          }
          if (rules.allowRepeat !== undefined) game.rules.allowRepeat = !!rules.allowRepeat;
          if (rules.showHint !== undefined) game.rules.showHint = !!rules.showHint;
        }

        // Password handling: undefined = no change, '' or null = remove, non-empty = set
        if (password !== undefined) {
          if (!password) {
            game.password = undefined as any;
          } else {
            game.password = await bcrypt.hash(password, 10);
          }
        }

        await game.save();

        // Build players info for room-updated event
        const playersInfo = await Promise.all(
          game.players.map(async (p) => ({
            slot: p.slot,
            name: await resolvePlayerName(p),
            guestName: p.guestName,
            lives: p.lives,
            score: p.score,
            wordsPlayed: p.wordsPlayed || 0,
            isEliminated: p.isEliminated,
            isConnected: p.isConnected,
            isHost: (p.userId?.toString() || p.guestId) === game.hostPlayerId,
          }))
        );

        io.to(roomId).emit('word-chain:room-updated', {
          rules: game.rules,
          maxPlayers: game.maxPlayers,
          players: playersInfo,
          hasPassword: !!game.password,
        });

        io.emit('word-chain:rooms-updated', { action: 'updated', roomId });

        if (callback) callback({ success: true });
      } catch (error) {
        console.error('[WordChain] Update room error:', error);
        if (callback) callback({ success: false, error: 'failedToUpdate' });
      }
    });


    // ─── UPDATE GUEST NAME ───────────────────────────────────
    socket.on('word-chain:update-guest-name', async (data, callback) => {
      try {
        const { roomId, guestName } = data;
        if (!guestName || !guestName.trim()) return;

        const game = await WordChainGame.findOne({ roomId });
        if (!game) return;

        const playerId = socket.data.wordChainPlayerId;
        // Verify player is guest and exists
        const player = game.players.find(p => p.guestId === playerId);
        if (!player) {
          if (callback) callback({ success: false, error: 'notGuest' });
          return;
        }

        player.guestName = guestName.trim().substring(0, 20); // Limit length
        await game.save();

        // Update cache
        if (roomPlayerNames.has(roomId)) {
          roomPlayerNames.get(roomId)!.set(player.slot, player.guestName || '');
        }

        io.to(roomId).emit('word-chain:player-name-updated', {
          slot: player.slot,
          name: player.guestName,
        });

        if (callback) callback({ success: true });
      } catch (error) {
        console.error('[WordChain] Update guest name error:', error);
        if (callback) callback({ success: false });
      }
    });

    // ─── LEAVE ROOM ──────────────────────────────────────────
    socket.on('word-chain:leave-room', async (data) => {
      try {
        const { roomId } = data;
        const game = await WordChainGame.findOne({ roomId });
        if (!game) return;

        const playerId = socket.data.wordChainPlayerId || data.playerId;

        // Remove player
        const playerIndex = game.players.findIndex(
          p => (p.userId && p.userId.toString() === playerId) || (p.guestId === playerId)
        );

        if (playerIndex === -1) return;

        const removedPlayer = game.players[playerIndex];

        // Cancel any pending disconnect elimination timer for this player
        const timerKey = `${roomId}:${removedPlayer.slot}`;
        const dcTimer = disconnectTimers.get(timerKey);
        if (dcTimer) {
          clearTimeout(dcTimer);
          disconnectTimers.delete(timerKey);
        }

        const wasPlaying = game.gameStatus === 'playing';
        game.players.splice(playerIndex, 1);

        socket.leave(roomId);
        socket.data.wordChainRoomId = undefined;

        // Transfer host if the leaving player was the host
        let newHostPlayerId: string | undefined;
        if (game.players.length === 0) {
          // Empty room — mark abandoned
          game.gameStatus = 'abandoned';
          cleanupRoom(roomId);
        } else if (playerId === game.hostPlayerId) {
          // Assign host to first remaining player
          const newHost = game.players[0];
          game.hostPlayerId = newHost.userId?.toString() || newHost.guestId || '';
          newHostPlayerId = game.hostPlayerId;
        }

        // If game was playing, check if only 1 player remains → auto-finish
        if (wasPlaying && game.players.length > 0) {
          const activePlayers = game.players.filter(p => !p.isEliminated);
          if (activePlayers.length <= 1) {
            await game.save();
            const winner = activePlayers.length === 1 ? activePlayers[0] : 'draw' as const;
            await finishGame(io, game, winner);
            io.emit('word-chain:rooms-updated', { action: 'updated', roomId });
            return;
          }

          // If it was the leaving player's turn, advance to next player
          if (game.currentPlayerSlot === removedPlayer.slot) {
            const nextSlot = getNextPlayerSlot(game.players, removedPlayer.slot);
            if (nextSlot !== -1) {
              game.currentPlayerSlot = nextSlot;
              game.turnStartedAt = new Date();
            }
          }
        }

        await game.save();

        const remainingPlayers = await Promise.all(
          game.players.map(async (p) => ({
            slot: p.slot,
            name: await resolvePlayerName(p),
            guestName: p.guestName,
            lives: p.lives,
            score: p.score,
            wordsPlayed: p.wordsPlayed || 0,
            isEliminated: p.isEliminated,
            isConnected: p.isConnected,
            isHost: (p.userId?.toString() || p.guestId) === game.hostPlayerId,
          }))
        );

        io.to(roomId).emit('word-chain:player-left', {
          slot: removedPlayer.slot,
          players: remainingPlayers,
          playerCount: game.players.length,
          newHostPlayerId,
        });

        io.emit('word-chain:rooms-updated', { action: 'updated', roomId });
      } catch (error) {
        console.error('[WordChain] Leave room error:', error);
      }
    });

    // ─── START GAME ──────────────────────────────────────────
    socket.on('word-chain:start-game', async (data, callback) => {
      try {
        const { roomId } = data;
        const game = await WordChainGame.findOne({ roomId });
        if (!game) {
          if (callback) callback({ success: false, error: 'roomNotFound' });
          return;
        }

        if (game.gameStatus !== 'waiting') {
          if (callback) callback({ success: false, error: 'gameAlreadyStarted' });
          return;
        }

        if (game.players.length < 2) {
          if (callback) callback({ success: false, error: 'needMorePlayers' });
          return;
        }

        // Build room dictionary based on rules
        const roomDict = buildRoomDictionary({ wordType: game.rules.wordType });
        roomDictionaries.set(roomId, roomDict);

        // Select first word
        const firstWord = selectFirstWord(roomDict, game.rules);
        if (!firstWord) {
          if (callback) callback({ success: false, error: 'dictionaryError' });
          return;
        }

        // Set initial game state
        game.gameStatus = 'playing';
        game.currentWord = firstWord;
        game.wordChain = [firstWord];
        game.usedWords = [firstWord];
        // Use first player's actual slot (slots may not start at 1 after leave/rejoin)
        game.currentPlayerSlot = game.players[0].slot;
        game.turnStartedAt = new Date();
        game.startedAt = new Date();
        game.roundNumber = 1;

        await game.save();

        const turnDuration = game.rules.turnDuration;
        const requiredSyllable = getLastSyllable(firstWord);

        // Cache all player names at game start (single batch DB query)
        await cacheAllPlayerNames(game);

        // Build players info using cache (no per-event DB queries)
        const playersInfo = buildPlayersInfo(game);

        io.to(roomId).emit('word-chain:game-started', {
          currentWord: firstWord,
          firstWord,
          requiredSyllable,
          currentPlayerSlot: game.currentPlayerSlot,
          turnStartedAt: game.turnStartedAt.toISOString(),
          turnDuration,
          roundNumber: game.roundNumber,
          players: playersInfo,
        });

        if (callback) callback({ success: true });

        // Start timer for first player
        startTurnTimer(io, roomId, turnDuration * 1000, async () => {
          const freshGame = await WordChainGame.findOne({ roomId });
          if (!freshGame || freshGame.gameStatus !== 'playing') return;

          io.to(roomId).emit('word-chain:turn-timeout', {
            slot: freshGame.currentPlayerSlot,
            livesRemaining: (freshGame.players.find(p => p.slot === freshGame.currentPlayerSlot)?.lives || 1) - 1,
          });

          await handleLifeLoss(io, freshGame, freshGame.currentPlayerSlot, 'timeout');
        });

        io.emit('word-chain:rooms-updated', { action: 'started', roomId });
      } catch (error) {
        console.error('[WordChain] Start game error:', error);
        if (callback) callback({ success: false, error: 'failedToStart' });
      }
    });

    // ─── SUBMIT WORD ─────────────────────────────────────────
    socket.on('word-chain:submit-word', async (data, callback) => {
      try {
        const { roomId, word } = data;
        if (!word || !roomId) return;

        const game = await WordChainGame.findOne({ roomId });
        if (!game || game.gameStatus !== 'playing') {
          if (callback) callback({ success: false, error: 'gameNotActive' });
          return;
        }

        // ─── BUG FIX: Verify that the submitting socket is the current player ───
        const submittingPlayerId = socket.data.wordChainPlayerId;
        const currentPlayer = game.players.find(p => p.slot === game.currentPlayerSlot);
        if (!currentPlayer) {
          if (callback) callback({ success: false, error: 'invalidState' });
          return;
        }
        const currentPlayerId = currentPlayer.userId?.toString() || currentPlayer.guestId;
        if (submittingPlayerId !== currentPlayerId) {
          // Not this player's turn — reject silently
          if (callback) callback({ success: false, error: 'notYourTurn' });
          return;
        }

        // ─── BUG FIX: Check if turn has already timed out (race condition) ───
        const turnElapsedMs = Date.now() - (game.turnStartedAt?.getTime() || 0);
        const turnDurationMs = (game.rules.turnDuration || 60) * 1000;
        // Allow a 2-second grace period for network latency
        if (turnElapsedMs > turnDurationMs + 2000) {
          if (callback) callback({ success: false, error: 'turnExpired' });
          return;
        }

        // Get room dictionary (or rebuild if missing)
        let roomDict = roomDictionaries.get(roomId);
        if (!roomDict) {
          roomDict = buildRoomDictionary({ wordType: game.rules.wordType });
          roomDictionaries.set(roomId, roomDict);
        }

        // Validate
        const result = validateWord(word, game, roomDict);

        if (!result.valid) {
          // Log potentially valid words that are missing from dictionary
          if (result.reason === 'not_in_dictionary') {
            const normalized = normalizeWord(word);
            const isSyntaxValid = isValidVietnameseWord(normalized);
            const isTypeValid = matchesWordType(normalized, game.rules.wordType);
            
            // Check chaining manually since validateWord stopped early
            let isChainValid = true;
            if (game.currentWord) {
              const lastSyll = getLastSyllable(game.currentWord);
              const firstSyll = getFirstSyllable(normalized);
              if (firstSyll !== lastSyll) isChainValid = false;
            }
            
            // Check repetition manually
            const isNew = game.rules.allowRepeat || !game.usedWords.includes(normalized);

            if (isSyntaxValid && isTypeValid && isChainValid && isNew) {
              // Log strictly valid candidates only
              logMissingWord(normalized);
            }
          }

          // Word rejected — player loses 1 life
          io.to(roomId).emit('word-chain:word-rejected', {
            reason: result.reason,
            playerSlot: game.currentPlayerSlot,
            word: normalizeWord(word),
            playerName: getCachedPlayerName(roomId, game.currentPlayerSlot),
            livesRemaining: (currentPlayer?.lives || 1) - 1,
          });

          clearTurnTimer(roomId);
          await handleLifeLoss(io, game, game.currentPlayerSlot, 'rejected');

          if (callback) callback({ success: false, reason: result.reason });
          return;
        }

        // Word accepted
        clearTurnTimer(roomId);
        const normalized = normalizeWord(word);

        if (currentPlayer) {
          currentPlayer.score += calculateScore(normalized);
          currentPlayer.wordsPlayed += 1;
        }

        game.currentWord = normalized;
        game.wordChain.push(normalized);
        game.usedWords.push(normalized);
        game.roundNumber += 1;

        // Check if no words available for next player
        const noWords = checkNoWordsAvailable(
          normalized,
          game.usedWords,
          roomDict,
          game.rules.allowRepeat
        );

        if (noWords) {
          // Emit the accepted word FIRST so players see the final word
          const noWordsPlayersInfo = buildPlayersInfo(game);
          const noWordsRequiredSyllable = getLastSyllable(normalized);
          io.to(roomId).emit('word-chain:word-accepted', {
            word: normalized,
            currentWord: normalized,
            playerSlot: currentPlayer?.slot,
            playerName: getCachedPlayerName(roomId, currentPlayer?.slot || 0),
            score: currentPlayer?.score,
            nextPlayerSlot: game.currentPlayerSlot, // stays same since game ends
            turnStartedAt: new Date().toISOString(),
            turnDuration: game.rules.turnDuration,
            roundNumber: game.roundNumber,
            requiredSyllable: noWordsRequiredSyllable,
            totalWords: game.wordChain.length,
            players: noWordsPlayersInfo,
          });

          await game.save();
          // Determine winner by score instead of always declaring draw
          const winner = determineWinnerByScore(game.players);
          await finishGame(io, game, winner);
          if (callback) callback({ success: true });
          return;
        }

        // Move to next player
        const nextSlot = getNextPlayerSlot(game.players, game.currentPlayerSlot);
        if (nextSlot === -1) {
          await game.save();
          const endCheck = checkGameEnd(game.players);
          await finishGame(io, game, endCheck.winner);
          if (callback) callback({ success: true });
          return;
        }

        game.currentPlayerSlot = nextSlot;
        game.turnStartedAt = new Date();

        let turnDuration = game.rules.turnDuration;
        if (game.rules.gameMode === 'speed') {
          turnDuration = getSpeedModeTurnDuration(game.roundNumber, game.rules.turnDuration);
        }

        await game.save();

        const requiredSyllable = getLastSyllable(normalized);

        // Build players array using cache (no DB queries — fast!)
        const acceptedPlayersInfo = buildPlayersInfo(game);

        io.to(roomId).emit('word-chain:word-accepted', {
          word: normalized,
          currentWord: normalized,
          playerSlot: currentPlayer?.slot,
          playerName: getCachedPlayerName(roomId, currentPlayer?.slot || 0),
          score: currentPlayer?.score,
          nextPlayerSlot: nextSlot,
          turnStartedAt: game.turnStartedAt.toISOString(),
          turnDuration,
          roundNumber: game.roundNumber,
          requiredSyllable,
          totalWords: game.wordChain.length,
          players: acceptedPlayersInfo,
        });

        if (callback) callback({ success: true });

        // Start timer for next player
        startTurnTimer(io, roomId, turnDuration * 1000, async () => {
          const freshGame = await WordChainGame.findOne({ roomId });
          if (!freshGame || freshGame.gameStatus !== 'playing') return;

          io.to(roomId).emit('word-chain:turn-timeout', {
            slot: freshGame.currentPlayerSlot,
            livesRemaining: (freshGame.players.find(p => p.slot === freshGame.currentPlayerSlot)?.lives || 1) - 1,
          });

          await handleLifeLoss(io, freshGame, freshGame.currentPlayerSlot, 'timeout');
        });
      } catch (error) {
        console.error('[WordChain] Submit word error:', error);
        if (callback) callback({ success: false, error: 'serverError' });
      }
    });

    // ─── SURRENDER ───────────────────────────────────────────
    socket.on('word-chain:surrender', async (data) => {
      try {
        const { roomId, slot } = data;
        const game = await WordChainGame.findOne({ roomId });
        if (!game || game.gameStatus !== 'playing') return;

        // Find player by slot, or fallback to socket identity
        let player = slot ? game.players.find(p => p.slot === slot) : null;
        if (!player) {
          const playerId = socket.data.wordChainPlayerId;
          player = game.players.find(
            p => (p.userId && p.userId.toString() === playerId) || (p.guestId === playerId)
          ) || null;
        }
        if (!player || player.isEliminated) return;

        player.lives = 0;
        player.isEliminated = true;

        io.to(roomId).emit('word-chain:player-eliminated', {
          slot: player.slot,
          playerName: getCachedPlayerName(roomId, player.slot),
          reason: 'surrender',
          remainingPlayers: game.players.filter(p => !p.isEliminated).length,
        });

        const endCheck = checkGameEnd(game.players);
        if (endCheck.ended) {
          await game.save();
          await finishGame(io, game, endCheck.winner);
          return;
        }

        // If it was surrendering player's turn, move to next
        if (game.currentPlayerSlot === slot) {
          clearTurnTimer(roomId);
          const nextSlot = getNextPlayerSlot(game.players, game.currentPlayerSlot);
          if (nextSlot === -1) {
            await game.save();
            // Determine winner by score instead of always declaring draw
            const winner = determineWinnerByScore(game.players);
            await finishGame(io, game, winner);
            return;
          }

          game.currentPlayerSlot = nextSlot;
          game.turnStartedAt = new Date();
          await game.save();

          let turnDuration = game.rules.turnDuration;
          if (game.rules.gameMode === 'speed') {
            turnDuration = getSpeedModeTurnDuration(game.roundNumber, game.rules.turnDuration);
          }

          const requiredSyllable = game.currentWord ? getLastSyllable(game.currentWord) : '';
          io.to(roomId).emit('word-chain:new-turn', {
            currentWord: game.currentWord,
            requiredSyllable,
            currentPlayerSlot: game.currentPlayerSlot,
            turnStartedAt: game.turnStartedAt.toISOString(),
            turnDuration,
          });

          startTurnTimer(io, roomId, turnDuration * 1000, async () => {
            const freshGame = await WordChainGame.findOne({ roomId });
            if (!freshGame || freshGame.gameStatus !== 'playing') return;
            io.to(roomId).emit('word-chain:turn-timeout', {
              slot: freshGame.currentPlayerSlot,
              livesRemaining: (freshGame.players.find(p => p.slot === freshGame.currentPlayerSlot)?.lives || 1) - 1,
            });
            await handleLifeLoss(io, freshGame, freshGame.currentPlayerSlot, 'timeout');
          });
        } else {
          await game.save();
        }
      } catch (error) {
        console.error('[WordChain] Surrender error:', error);
      }
    });

    // ─── NEW GAME (Rematch) ──────────────────────────────────
    socket.on('word-chain:new-game', async (data, callback) => {
      try {
        const { roomId } = data;
        const game = await WordChainGame.findOne({ roomId });
        if (!game || game.gameStatus === 'playing') {
          if (callback) callback({ success: false, error: 'cannotReset' });
          return;
        }

        // Reset game state, keep settings and players
        game.gameStatus = 'waiting';
        game.currentPlayerSlot = game.players.length > 0 ? game.players[0].slot : 1;
        game.wordChain = [];
        game.usedWords = [];
        game.currentWord = '';
        game.turnStartedAt = new Date();
        game.roundNumber = 0;
        game.winner = null;
        game.startedAt = null;
        game.finishedAt = null;

        // Reset player states
        for (const player of game.players) {
          player.lives = game.rules.lives;
          player.score = 0;
          player.wordsPlayed = 0;
          player.isEliminated = false;
          player.isConnected = true;
        }

        await game.save();

        const resetPlayersInfo = await Promise.all(
          game.players.map(async (p) => ({
            slot: p.slot,
            name: await resolvePlayerName(p),
            guestName: p.guestName,
            lives: p.lives,
            score: 0,
            wordsPlayed: 0,
            isEliminated: false,
            isConnected: p.isConnected,
          }))
        );

        io.to(roomId).emit('word-chain:game-reset', {
          roomId,
          players: resetPlayersInfo,
          gameStatus: 'waiting',
        });

        // Notify lobby clients that room is available again
        io.emit('word-chain:rooms-updated', { action: 'updated', roomId });

        if (callback) callback({ success: true });
      } catch (error) {
        console.error('[WordChain] New game error:', error);
        if (callback) callback({ success: false, error: 'failedToReset' });
      }
    });

    // ─── DISCONNECT ──────────────────────────────────────────
    socket.on('disconnect', async () => {
      try {
        const roomId = socket.data.wordChainRoomId;
        if (!roomId) return;

        const game = await WordChainGame.findOne({ roomId });
        if (!game) return;

        const playerId = socket.data.wordChainPlayerId;
        if (!playerId) return;

        const player = game.players.find(
          p => (p.userId && p.userId.toString() === playerId) || (p.guestId === playerId)
        );
        if (!player || player.isEliminated) return;

        player.isConnected = false;
        player.disconnectedAt = new Date();
        await game.save();

        io.to(roomId).emit('word-chain:player-disconnected', {
          slot: player.slot,
          playerName: await resolvePlayerName(player),
        });

        // If game is playing and it's this player's turn, start a grace period
        // instead of immediately triggering timeout (fixes tab-switch/app-background issue)
        if (game.gameStatus === 'playing' && game.currentPlayerSlot === player.slot) {
          const graceKey = `${roomId}:${player.slot}`;
          // Don't start duplicate grace timer
          if (!turnGraceTimers.has(graceKey)) {
            const graceTimer = setTimeout(async () => {
              turnGraceTimers.delete(graceKey);
              try {
                const freshGame = await WordChainGame.findOne({ roomId });
                if (!freshGame || freshGame.gameStatus !== 'playing') return;
                const p = freshGame.players.find(pl => pl.slot === player.slot);
                if (!p || p.isConnected || p.isEliminated) return; // reconnected or already out

                // Grace period expired, player still disconnected — treat as timeout
                clearTurnTimer(roomId);
                io.to(roomId).emit('word-chain:turn-timeout', {
                  slot: p.slot,
                  livesRemaining: p.lives - 1,
                });
                await handleLifeLoss(io, freshGame, p.slot, 'timeout');
              } catch (err) {
                console.error('[WordChain] Turn grace timer error:', err);
              }
            }, TURN_GRACE_MS);
            turnGraceTimers.set(graceKey, graceTimer);
          }
        }

        // Start 5-min elimination timer
        if (game.gameStatus === 'playing' || game.gameStatus === 'waiting') {
          const timerKey = `${roomId}:${player.slot}`;
          const timer = setTimeout(async () => {
            disconnectTimers.delete(timerKey);
            try {
              const freshGame = await WordChainGame.findOne({ roomId });
              if (!freshGame) return;
              const p = freshGame.players.find(pl => pl.slot === player.slot);
              if (!p || p.isConnected || p.isEliminated) return;

              // Auto-eliminate after 5 min
              p.lives = 0;
              p.isEliminated = true;
              await freshGame.save();

              io.to(roomId).emit('word-chain:player-eliminated', {
                slot: p.slot,
                playerName: await resolvePlayerName(p),
                reason: 'disconnect_timeout',
                remainingPlayers: freshGame.players.filter(pl => !pl.isEliminated).length,
              });

              // Check game end
              if (freshGame.gameStatus === 'playing') {
                const endCheck = checkGameEnd(freshGame.players);
                if (endCheck.ended) {
                  await finishGame(io, freshGame, endCheck.winner);
                }
              }
            } catch (err) {
              console.error('[WordChain] Disconnect timer error:', err);
            }
          }, RECONNECT_WINDOW_MS);
          disconnectTimers.set(timerKey, timer);
        }
      } catch (error) {
        console.error('[WordChain] Disconnect handler error:', error);
      }
    });
  });
}
