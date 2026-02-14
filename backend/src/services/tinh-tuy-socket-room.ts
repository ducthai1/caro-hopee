/**
 * Tinh Tuy Dai Chien — Socket Room Handlers
 * create-room, join-room, leave-room, start-game, update-room
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import TinhTuyGame from '../models/TinhTuyGame';
import { TinhTuyCallback } from '../types/tinh-tuy.types';
import { generateUniqueRoomCode } from './tinh-tuy-engine';
import { shuffleDeck, getKhiVanDeckIds, getCoHoiDeckIds } from './tinh-tuy-cards';
import {
  activePlayerSockets, disconnectTimers, roomPlayerNames,
  resolvePlayerName, cachePlayerName, cachePlayerDevice,
  getDeviceType, cleanupRoom, RECONNECT_WINDOW_MS,
} from './tinh-tuy-socket';

// Input validation helpers
const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;
function sanitizeString(val: any, maxLen = 50): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[\x00-\x1f]/g, '').trim().slice(0, maxLen);
}

export function registerRoomHandlers(io: SocketIOServer, socket: Socket): void {

  // ── Create Room ──────────────────────────────────────────────
  socket.on('tinh-tuy:create-room', async (data: any, callback: TinhTuyCallback) => {
    try {
      const { settings = {}, guestId, guestName, userId } = data;
      const hostPlayerId = sanitizeString(userId || guestId);
      if (!hostPlayerId) return callback({ success: false, error: 'missingPlayerId' });

      const roomId = uuidv4();
      const roomCode = await generateUniqueRoomCode(
        async (code) => !!(await TinhTuyGame.findOne({ roomCode: code }).lean())
      );

      // Hash password if provided
      let hashedPassword: string | null = null;
      if (settings.password?.trim()) {
        const pw = settings.password.trim();
        if (pw.length < 4 || pw.length > 50) {
          return callback({ success: false, error: 'invalidPassword' });
        }
        hashedPassword = await bcrypt.hash(pw, 10);
      }

      const startingPoints = settings.startingPoints || 20000;
      const game = new TinhTuyGame({
        roomId, roomCode, gameType: 'tinh-tuy', hostPlayerId,
        settings: {
          maxPlayers: Math.min(Math.max(settings.maxPlayers || 4, 2), 4),
          startingPoints,
          gameMode: settings.gameMode || 'classic',
          timeLimit: settings.timeLimit || null,
          maxRounds: settings.maxRounds || null,
          turnDuration: settings.turnDuration || 60,
          password: hashedPassword,
        },
        players: [{
          slot: 1, userId: userId || undefined,
          guestId: userId ? undefined : guestId,
          guestName: userId ? undefined : guestName,
          points: startingPoints, position: 0,
          properties: [], houses: {}, hotels: {},
          islandTurns: 0, cards: [], isBankrupt: false,
          isConnected: true, consecutiveDoubles: 0,
          deviceType: getDeviceType(socket),
        }],
      });

      await game.save();

      socket.join(roomId);
      socket.data.tinhTuyRoomId = roomId;
      socket.data.tinhTuyPlayerId = hostPlayerId;
      activePlayerSockets.set(`${roomId}:${hostPlayerId}`, socket.id);

      // Cache name + device
      const hostName = await resolvePlayerName(userId, guestId, guestName);
      cachePlayerName(roomId, 1, hostName);
      cachePlayerDevice(roomId, 1, getDeviceType(socket));

      // Notify lobby
      io.emit('tinh-tuy:room-created', {
        roomId, roomCode, maxPlayers: game.settings.maxPlayers,
        playerCount: 1, hostName, settings: game.settings,
        hasPassword: !!hashedPassword, createdAt: game.createdAt,
      });

      callback({
        success: true, roomId, roomCode,
        settings: game.settings, players: game.players,
      });
    } catch (err: any) {
      console.error('[tinh-tuy:create-room]', err.message);
      callback({ success: false, error: 'failedToCreate' });
    }
  });

  // ── Join Room ────────────────────────────────────────────────
  socket.on('tinh-tuy:join-room', async (data: any, callback: TinhTuyCallback) => {
    try {
      const { roomCode, password, guestId, guestName, userId } = data;
      const sanitizedCode = sanitizeString(roomCode, 6).toUpperCase();
      if (!sanitizedCode || !ROOM_CODE_REGEX.test(sanitizedCode)) {
        return callback({ success: false, error: 'invalidRoomCode' });
      }

      const playerId = sanitizeString(userId || guestId);
      if (!playerId) return callback({ success: false, error: 'missingPlayerId' });

      const game = await TinhTuyGame.findOne({
        roomCode: sanitizedCode,
      }).select('+settings.password');
      if (!game) return callback({ success: false, error: 'roomNotFound' });

      // Check reconnect (player exists but disconnected)
      const existingPlayer = game.players.find(
        p => (userId && p.userId?.toString() === userId) || (guestId && p.guestId === guestId)
      );

      if (existingPlayer) {
        // Reconnect flow — refresh device type from new socket
        existingPlayer.isConnected = true;
        existingPlayer.disconnectedAt = undefined;
        existingPlayer.deviceType = getDeviceType(socket);
        await game.save();

        socket.join(game.roomId);
        socket.data.tinhTuyRoomId = game.roomId;
        socket.data.tinhTuyPlayerId = playerId;
        activePlayerSockets.set(`${game.roomId}:${playerId}`, socket.id);

        // Clear disconnect timer
        const timerKey = `${game.roomId}:${existingPlayer.slot}`;
        const timer = disconnectTimers.get(timerKey);
        if (timer) { clearTimeout(timer); disconnectTimers.delete(timerKey); }

        io.to(game.roomId).emit('tinh-tuy:player-reconnected', { slot: existingPlayer.slot });

        // Send full state for reconnect
        callback({
          success: true, roomId: game.roomId, roomCode: game.roomCode,
          reconnected: true, game: game.toObject(),
        });
        return;
      }

      // New player join
      if (game.gameStatus !== 'waiting') {
        return callback({ success: false, error: 'gameAlreadyStarted' });
      }
      if (game.players.length >= game.settings.maxPlayers) {
        return callback({ success: false, error: 'roomFull' });
      }

      // Password check
      if (game.settings.password) {
        if (!password) return callback({ success: false, error: 'passwordRequired' });
        const valid = await bcrypt.compare(password, game.settings.password);
        if (!valid) return callback({ success: false, error: 'incorrectPassword' });
      }

      // Assign next slot
      const usedSlots = new Set(game.players.map(p => p.slot));
      let newSlot = 1;
      while (usedSlots.has(newSlot) && newSlot <= 4) newSlot++;

      game.players.push({
        slot: newSlot, userId: userId || undefined,
        guestId: userId ? undefined : guestId,
        guestName: userId ? undefined : guestName,
        points: game.settings.startingPoints, position: 0,
        properties: [], houses: {}, hotels: {},
        islandTurns: 0, cards: [], isBankrupt: false,
        isConnected: true, consecutiveDoubles: 0,
        deviceType: getDeviceType(socket),
      } as any);
      await game.save();

      socket.join(game.roomId);
      socket.data.tinhTuyRoomId = game.roomId;
      socket.data.tinhTuyPlayerId = playerId;
      activePlayerSockets.set(`${game.roomId}:${playerId}`, socket.id);

      const playerName = await resolvePlayerName(userId, guestId, guestName);
      cachePlayerName(game.roomId, newSlot, playerName);
      cachePlayerDevice(game.roomId, newSlot, getDeviceType(socket));

      io.to(game.roomId).emit('tinh-tuy:room-updated', {
        players: game.players, playerCount: game.players.length,
      });
      io.emit('tinh-tuy:lobby-room-updated', {
        roomId: game.roomId, roomCode: game.roomCode,
        playerCount: game.players.length, maxPlayers: game.settings.maxPlayers,
      });

      callback({
        success: true, roomId: game.roomId, roomCode: game.roomCode,
        settings: game.settings, players: game.players,
      });
    } catch (err: any) {
      console.error('[tinh-tuy:join-room]', err.message);
      callback({ success: false, error: 'failedToJoin' });
    }
  });

  // ── Leave Room ───────────────────────────────────────────────
  socket.on('tinh-tuy:leave-room', async (data: any, callback: TinhTuyCallback) => {
    try {
      const roomId = socket.data.tinhTuyRoomId as string;
      const playerId = socket.data.tinhTuyPlayerId as string;
      if (!roomId || !playerId) return callback({ success: false, error: 'notInRoom' });

      const game = await TinhTuyGame.findOne({ roomId });
      if (!game) return callback({ success: false, error: 'roomNotFound' });

      const playerIdx = game.players.findIndex(
        p => (p.userId?.toString() === playerId) || (p.guestId === playerId)
      );
      if (playerIdx === -1) return callback({ success: false, error: 'notInRoom' });

      const player = game.players[playerIdx];

      if (game.gameStatus === 'waiting') {
        // Remove from room
        game.players.splice(playerIdx, 1);

        // If host left, transfer or close
        if (game.hostPlayerId === playerId) {
          if (game.players.length > 0) {
            const newHost = game.players[0];
            game.hostPlayerId = (newHost.userId?.toString() || newHost.guestId) as string;
          } else {
            game.gameStatus = 'abandoned';
            cleanupRoom(roomId, true);
          }
        }
        await game.save();
      } else if (game.gameStatus === 'playing') {
        // Mark as surrendered/bankrupt
        player.isBankrupt = true;
        await game.save();
        io.to(roomId).emit('tinh-tuy:player-surrendered', { slot: player.slot });
      }

      socket.leave(roomId);
      socket.data.tinhTuyRoomId = undefined;
      socket.data.tinhTuyPlayerId = undefined;
      activePlayerSockets.delete(`${roomId}:${playerId}`);

      io.to(roomId).emit('tinh-tuy:room-updated', {
        players: game.players, gameStatus: game.gameStatus,
        hostPlayerId: game.hostPlayerId,
      });

      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:leave-room]', err.message);
      callback({ success: false, error: 'failedToLeave' });
    }
  });

  // ── Start Game ───────────────────────────────────────────────
  socket.on('tinh-tuy:start-game', async (data: any, callback: TinhTuyCallback) => {
    try {
      const roomId = socket.data.tinhTuyRoomId as string;
      const playerId = socket.data.tinhTuyPlayerId as string;
      if (!roomId) return callback({ success: false, error: 'notInRoom' });

      const game = await TinhTuyGame.findOne({ roomId });
      if (!game) return callback({ success: false, error: 'roomNotFound' });
      if (game.hostPlayerId !== playerId) {
        return callback({ success: false, error: 'notHost' });
      }
      if (game.gameStatus !== 'waiting') {
        return callback({ success: false, error: 'gameAlreadyStarted' });
      }
      if (game.players.length < 2) {
        return callback({ success: false, error: 'notEnoughPlayers' });
      }

      game.gameStatus = 'playing';
      game.currentPlayerSlot = 1;
      game.turnPhase = 'ROLL_DICE';
      game.turnStartedAt = new Date();
      game.gameStartedAt = new Date();
      game.round = 1;

      // Initialize card decks (shuffled)
      game.luckCardDeck = shuffleDeck(getKhiVanDeckIds());
      game.luckCardIndex = 0;
      game.opportunityCardDeck = shuffleDeck(getCoHoiDeckIds());
      game.opportunityCardIndex = 0;

      await game.save();

      io.to(roomId).emit('tinh-tuy:game-started', {
        game: game.toObject(),
      });

      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:start-game]', err.message);
      callback({ success: false, error: 'failedToStart' });
    }
  });

  // ── Update Room Settings ─────────────────────────────────────
  socket.on('tinh-tuy:update-room', async (data: any, callback: TinhTuyCallback) => {
    try {
      const roomId = socket.data.tinhTuyRoomId as string;
      const playerId = socket.data.tinhTuyPlayerId as string;
      if (!roomId) return callback({ success: false, error: 'notInRoom' });

      const game = await TinhTuyGame.findOne({ roomId });
      if (!game) return callback({ success: false, error: 'roomNotFound' });
      if (game.hostPlayerId !== playerId) {
        return callback({ success: false, error: 'notHost' });
      }
      if (game.gameStatus !== 'waiting') {
        return callback({ success: false, error: 'gameAlreadyStarted' });
      }

      const { settings } = data;
      if (settings) {
        if (settings.maxPlayers != null) {
          game.settings.maxPlayers = Math.min(Math.max(settings.maxPlayers, 2), 4);
        }
        if (settings.startingPoints != null) {
          game.settings.startingPoints = settings.startingPoints;
          // Update all players' starting points
          game.players.forEach(p => { p.points = settings.startingPoints; });
        }
        if (settings.gameMode) game.settings.gameMode = settings.gameMode;
        if (settings.timeLimit != null) game.settings.timeLimit = settings.timeLimit;
        if (settings.maxRounds != null) game.settings.maxRounds = settings.maxRounds;
        if (settings.turnDuration != null) game.settings.turnDuration = settings.turnDuration;
      }
      await game.save();

      io.to(roomId).emit('tinh-tuy:room-updated', {
        settings: game.settings, players: game.players,
      });

      callback({ success: true, settings: game.settings });
    } catch (err: any) {
      console.error('[tinh-tuy:update-room]', err.message);
      callback({ success: false, error: 'failedToUpdate' });
    }
  });
}
