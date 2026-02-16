/**
 * Tinh Tuy Dai Chien — Socket Handler Entry Point
 * Registers all tinh-tuy:* events, manages timers and disconnect/reconnect.
 * Room lifecycle in tinh-tuy-socket-room.ts, gameplay in tinh-tuy-socket-gameplay.ts.
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import TinhTuyGame from '../models/TinhTuyGame';
import User from '../models/User';
import { registerRoomHandlers } from './tinh-tuy-socket-room';
import { registerGameplayHandlers } from './tinh-tuy-socket-gameplay';

// ─── Shared State (exported for sub-modules) ──────────────────

export const activeTimers = new Map<string, NodeJS.Timeout>();
export const disconnectTimers = new Map<string, NodeJS.Timeout>();
export const activePlayerSockets = new Map<string, string>();
export const roomPlayerNames = new Map<string, Map<number, string>>();
export const roomPlayerDevices = new Map<string, Map<number, string>>();

export const RECONNECT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
export const TURN_GRACE_MS = 10 * 1000; // 10s grace before treating disconnect as AFK
const RATE_LIMIT_MS = 500; // 1 action per 500ms per socket

// ─── Rate Limiting ────────────────────────────────────────────

const socketLastAction = new Map<string, number>();

/** Check if socket is rate-limited (1 action per 500ms) */
export function isRateLimited(socketId: string): boolean {
  const now = Date.now();
  const last = socketLastAction.get(socketId) || 0;
  if (now - last < RATE_LIMIT_MS) return true;
  socketLastAction.set(socketId, now);
  return false;
}

// ─── Device Detection ─────────────────────────────────────────

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function detectDeviceType(userAgent?: string): DeviceType {
  if (!userAgent) return 'desktop';
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function getDeviceType(socket: Socket): DeviceType {
  if (socket.data.deviceType) return socket.data.deviceType as DeviceType;
  const ua = socket.handshake.headers['user-agent'] as string | undefined;
  const deviceType = detectDeviceType(ua);
  socket.data.deviceType = deviceType;
  return deviceType;
}

export function cachePlayerDevice(roomId: string, slot: number, deviceType: DeviceType): void {
  if (!roomPlayerDevices.has(roomId)) roomPlayerDevices.set(roomId, new Map());
  roomPlayerDevices.get(roomId)!.set(slot, deviceType);
}

// ─── Timer Helpers (exported for sub-modules) ─────────────────

export function startTurnTimer(roomId: string, durationMs: number, onTimeout: () => void): void {
  clearTurnTimer(roomId);
  activeTimers.set(roomId, setTimeout(onTimeout, durationMs));
}

export function clearTurnTimer(roomId: string): void {
  const timer = activeTimers.get(roomId);
  if (timer) { clearTimeout(timer); activeTimers.delete(roomId); }
}

/**
 * Safety net: if no turn timer is running after an error, start one to prevent stuck games.
 * Loads fresh game from DB and advances turn after a short delay.
 */
export function safetyRestartTimer(io: SocketIOServer, roomId: string): void {
  if (activeTimers.has(roomId)) return; // Timer already running — no action needed
  console.warn(`[tinh-tuy] Safety timer activated for room ${roomId}`);
  startTurnTimer(roomId, 5000, async () => {
    try {
      const g = await TinhTuyGame.findOne({ roomId });
      if (!g || g.gameStatus !== 'playing') return;
      const { advanceTurn: advTurn } = await import('./tinh-tuy-socket-gameplay');
      g.turnPhase = 'END_TURN';
      await g.save();
      await advTurn(io, g);
    } catch (err) { console.error('[tinh-tuy] Safety timer error:', err); }
  });
}

export function cleanupRoom(roomId: string, full = false): void {
  clearTurnTimer(roomId);
  if (full) {
    roomPlayerNames.delete(roomId);
    roomPlayerDevices.delete(roomId);
  }
  // Clear disconnect timers for this room
  for (const [key, timer] of disconnectTimers.entries()) {
    if (key.startsWith(`${roomId}:`)) {
      clearTimeout(timer);
      disconnectTimers.delete(key);
    }
  }
}

// ─── Name Resolution ──────────────────────────────────────────

export async function resolvePlayerName(
  userId?: string | null, guestId?: string | null, guestName?: string | null
): Promise<string> {
  if (userId) {
    const user = await User.findById(userId).select('username').lean();
    return user?.username || 'Player';
  }
  return guestName || (guestId ? `Guest ${guestId.slice(-6)}` : 'Player');
}

export function cachePlayerName(roomId: string, slot: number, name: string): void {
  if (!roomPlayerNames.has(roomId)) roomPlayerNames.set(roomId, new Map());
  roomPlayerNames.get(roomId)!.set(slot, name);
}

// ─── Main Setup ───────────────────────────────────────────────

export function setupTinhTuySocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    registerRoomHandlers(io, socket);
    registerGameplayHandlers(io, socket);

    // ── Disconnect ──
    socket.on('disconnect', async () => {
      const roomId = socket.data.tinhTuyRoomId as string | undefined;
      const playerId = socket.data.tinhTuyPlayerId as string | undefined;
      if (!roomId || !playerId) return;

      // Prevent stale disconnect: only process if this is the active socket
      const socketKey = `${roomId}:${playerId}`;
      if (activePlayerSockets.get(socketKey) !== socket.id) return;
      activePlayerSockets.delete(socketKey);

      try {
        const game = await TinhTuyGame.findOne({ roomId });
        if (!game || game.gameStatus === 'finished' || game.gameStatus === 'abandoned') return;

        const player = game.players.find(
          p => (p.userId?.toString() === playerId) || (p.guestId === playerId)
        );
        if (!player) return;

        player.isConnected = false;
        player.disconnectedAt = new Date();
        await game.save();

        io.to(roomId).emit('tinh-tuy:player-disconnected', { slot: player.slot });

        // Start 5-min reconnect timer
        const timerKey = `${roomId}:${player.slot}`;
        disconnectTimers.set(timerKey, setTimeout(async () => {
          disconnectTimers.delete(timerKey);
          try {
            const g = await TinhTuyGame.findOne({ roomId });
            if (!g) return;
            const p = g.players.find(pl => pl.slot === player.slot);
            if (!p || p.isConnected) return;

            // If waiting room, remove player entirely
            if (g.gameStatus === 'waiting') {
              g.players = g.players.filter(pl => pl.slot !== player.slot) as any;
              if (g.players.length === 0) {
                g.gameStatus = 'abandoned';
                cleanupRoom(roomId, true);
              }
              await g.save();
              io.to(roomId).emit('tinh-tuy:room-updated', {
                players: g.players, gameStatus: g.gameStatus,
              });
              return;
            }

            // In-game: mark as bankrupt (no AI, just eliminate)
            p.isBankrupt = true;
            g.markModified('players');
            await g.save();
            io.to(roomId).emit('tinh-tuy:player-bankrupt', { slot: p.slot });

            // Check if game should end
            const activePlayers = g.players.filter(pl => !pl.isBankrupt);
            if (activePlayers.length <= 1) {
              const winner = activePlayers[0];
              g.gameStatus = 'finished';
              g.finishedAt = new Date();
              if (winner) {
                g.winner = {
                  slot: winner.slot,
                  userId: winner.userId,
                  guestId: winner.guestId,
                  guestName: winner.guestName,
                  finalPoints: winner.points,
                };
              }
              await g.save();
              cleanupRoom(roomId);
              io.to(roomId).emit('tinh-tuy:game-finished', {
                winner: g.winner, reason: 'lastStanding',
              });
            } else if (g.currentPlayerSlot === p.slot) {
              // Skip their turn
              const { getNextActivePlayer } = await import('./tinh-tuy-engine');
              g.currentPlayerSlot = getNextActivePlayer(g.players, g.currentPlayerSlot);
              g.turnPhase = 'ROLL_DICE';
              g.turnStartedAt = new Date();
              await g.save();
              io.to(roomId).emit('tinh-tuy:turn-changed', {
                currentSlot: g.currentPlayerSlot,
                turnPhase: g.turnPhase,
                turnStartedAt: g.turnStartedAt,
              });
              // Start timer for next player's turn
              startTurnTimer(roomId, (g.settings?.turnDuration || 60) * 1000, async () => {
                try {
                  const g2 = await TinhTuyGame.findOne({ roomId });
                  if (!g2 || g2.gameStatus !== 'playing') return;
                  const { advanceTurn: advTurn } = await import('./tinh-tuy-socket-gameplay');
                  await advTurn(io, g2);
                } catch (e) { console.error('[tinh-tuy] Disconnect skip timer error:', e); }
              });
            }
          } catch (err) {
            console.error('[tinh-tuy] Disconnect timer error:', err);
          }
        }, RECONNECT_WINDOW_MS));
      } catch (err) {
        console.error('[tinh-tuy] Disconnect handler error:', err);
      }
    });
  });
}
