/**
 * Tinh Tuy Dai Chien — Socket Gameplay Handlers
 * roll-dice, buy-property, skip-buy, end-turn, surrender
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import TinhTuyGame from '../models/TinhTuyGame';
import { TinhTuyCallback, ITinhTuyGame, ITinhTuyPlayer } from '../types/tinh-tuy.types';
import {
  rollDice, calculateNewPosition, resolveCellAction,
  calculateRent, getNextActivePlayer, checkGameEnd,
} from './tinh-tuy-engine';
import { GO_SALARY, BOARD_SIZE, getCell } from './tinh-tuy-board';
import { startTurnTimer, clearTurnTimer, cleanupRoom, isRateLimited } from './tinh-tuy-socket';

// ─── Helpers ──────────────────────────────────────────────────

function findPlayerBySocket(game: ITinhTuyGame, socket: Socket): ITinhTuyPlayer | undefined {
  const playerId = socket.data.tinhTuyPlayerId as string;
  return game.players.find(
    p => (p.userId?.toString() === playerId) || (p.guestId === playerId)
  );
}

function isCurrentPlayer(game: ITinhTuyGame, player: ITinhTuyPlayer): boolean {
  return game.currentPlayerSlot === player.slot && !player.isBankrupt;
}

async function finishGame(
  io: SocketIOServer, game: ITinhTuyGame, winner: ITinhTuyPlayer | undefined, reason: string
): Promise<void> {
  game.gameStatus = 'finished';
  game.finishedAt = new Date();
  if (winner) {
    game.winner = {
      slot: winner.slot, userId: winner.userId,
      guestId: winner.guestId, guestName: winner.guestName,
      finalPoints: winner.points,
    };
  }
  await game.save();
  cleanupRoom(game.roomId);
  io.to(game.roomId).emit('tinh-tuy:game-finished', { winner: game.winner, reason });
}

async function advanceTurn(io: SocketIOServer, game: ITinhTuyGame): Promise<void> {
  // Check round increment: all active players had a turn
  const nextSlot = getNextActivePlayer(game.players, game.currentPlayerSlot);
  if (nextSlot <= game.currentPlayerSlot) {
    game.round += 1;
  }

  game.currentPlayerSlot = nextSlot;
  game.turnPhase = 'ROLL_DICE';
  game.turnStartedAt = new Date();
  game.lastDiceResult = undefined;
  await game.save();

  // Check game end (rounds mode)
  const endCheck = checkGameEnd(game);
  if (endCheck.ended) {
    await finishGame(io, game, endCheck.winner, endCheck.reason || 'roundsComplete');
    return;
  }

  io.to(game.roomId).emit('tinh-tuy:turn-changed', {
    currentSlot: game.currentPlayerSlot,
    turnPhase: game.turnPhase,
    turnStartedAt: game.turnStartedAt,
    round: game.round,
  });

  // Start turn timer (auto-skip on timeout)
  startTurnTimer(game.roomId, game.settings.turnDuration * 1000, async () => {
    try {
      const g = await TinhTuyGame.findOne({ roomId: game.roomId });
      if (!g || g.gameStatus !== 'playing') return;
      // Auto-skip: advance to next turn
      await advanceTurn(io, g);
    } catch (err) {
      console.error('[tinh-tuy] Turn timeout error:', err);
    }
  });
}

// ─── Gameplay Event Registration ──────────────────────────────

export function registerGameplayHandlers(io: SocketIOServer, socket: Socket): void {

  // ── Roll Dice ────────────────────────────────────────────────
  socket.on('tinh-tuy:roll-dice', async (_data: any, callback: TinhTuyCallback) => {
    try {
      if (isRateLimited(socket.id)) return callback({ success: false, error: 'tooFast' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (!roomId) return callback({ success: false, error: 'notInRoom' });

      const game = await TinhTuyGame.findOne({ roomId });
      if (!game || game.gameStatus !== 'playing') {
        return callback({ success: false, error: 'gameNotActive' });
      }

      const player = findPlayerBySocket(game, socket);
      if (!player || !isCurrentPlayer(game, player)) {
        return callback({ success: false, error: 'notYourTurn' });
      }
      if (game.turnPhase !== 'ROLL_DICE') {
        return callback({ success: false, error: 'invalidPhase' });
      }

      clearTurnTimer(roomId);

      const dice = rollDice();
      game.lastDiceResult = { dice1: dice.dice1, dice2: dice.dice2 };

      // Handle doubles
      if (dice.isDouble) {
        player.consecutiveDoubles += 1;
        if (player.consecutiveDoubles >= 3) {
          // 3 doubles → go to island
          player.position = 27; // ISLAND cell
          player.islandTurns = 3;
          player.consecutiveDoubles = 0;
          game.turnPhase = 'END_TURN';
          await game.save();

          io.to(roomId).emit('tinh-tuy:dice-result', dice);
          io.to(roomId).emit('tinh-tuy:player-moved', {
            slot: player.slot, from: player.position, to: 27, passedGo: false,
          });
          io.to(roomId).emit('tinh-tuy:player-island', { slot: player.slot, turnsRemaining: 3 });
          callback({ success: true });
          await advanceTurn(io, game);
          return;
        }
      } else {
        player.consecutiveDoubles = 0;
      }

      // Calculate movement
      const oldPos = player.position;
      const { position: newPos, passedGo } = calculateNewPosition(oldPos, dice.total);
      player.position = newPos;

      let goBonus = 0;
      if (passedGo) {
        goBonus = GO_SALARY;
        player.points += GO_SALARY;
      }

      // Resolve cell action
      const cellAction = resolveCellAction(game, player.slot, newPos, dice.total);

      // Set phase based on action needed
      if (cellAction.action === 'buy' || cellAction.action === 'card') {
        game.turnPhase = 'AWAITING_ACTION';
      } else {
        game.turnPhase = 'END_TURN';
      }

      await game.save();

      // Broadcast events
      io.to(roomId).emit('tinh-tuy:dice-result', dice);
      io.to(roomId).emit('tinh-tuy:player-moved', {
        slot: player.slot, from: oldPos, to: newPos, passedGo, goBonus,
      });

      // Auto-resolve non-interactive actions
      if (cellAction.action === 'rent' && cellAction.amount && cellAction.ownerSlot) {
        player.points -= cellAction.amount;
        const owner = game.players.find(p => p.slot === cellAction.ownerSlot);
        if (owner) owner.points += cellAction.amount;

        io.to(roomId).emit('tinh-tuy:rent-paid', {
          fromSlot: player.slot, toSlot: cellAction.ownerSlot,
          amount: cellAction.amount, cellIndex: newPos,
        });

        // Bankruptcy check (rent)
        if (player.points < 0) {
          player.isBankrupt = true;
          player.points = 0;
          player.properties = [];
          player.houses = {};
          player.hotels = {};
          io.to(roomId).emit('tinh-tuy:player-bankrupt', { slot: player.slot });

          const endCheck = checkGameEnd(game);
          if (endCheck.ended) {
            await game.save();
            await finishGame(io, game, endCheck.winner, endCheck.reason || 'lastStanding');
            callback({ success: true });
            return;
          }
        }
        game.turnPhase = 'END_TURN';
        await game.save();
      } else if (cellAction.action === 'tax' && cellAction.amount) {
        player.points -= cellAction.amount;
        io.to(roomId).emit('tinh-tuy:tax-paid', {
          slot: player.slot, amount: cellAction.amount, cellIndex: newPos,
        });

        if (player.points < 0) {
          player.isBankrupt = true;
          player.points = 0;
          player.properties = [];
          player.houses = {};
          player.hotels = {};
          io.to(roomId).emit('tinh-tuy:player-bankrupt', { slot: player.slot });

          const endCheck = checkGameEnd(game);
          if (endCheck.ended) {
            await game.save();
            await finishGame(io, game, endCheck.winner, endCheck.reason || 'lastStanding');
            callback({ success: true });
            return;
          }
        }
        game.turnPhase = 'END_TURN';
        await game.save();
      } else if (cellAction.action === 'go_to_island') {
        player.position = 27;
        player.islandTurns = 3;
        game.turnPhase = 'END_TURN';
        await game.save();
        io.to(roomId).emit('tinh-tuy:player-island', { slot: player.slot, turnsRemaining: 3 });
      } else if (cellAction.action === 'buy') {
        io.to(roomId).emit('tinh-tuy:awaiting-action', {
          slot: player.slot, cellIndex: newPos,
          cellType: getCell(newPos)?.type, price: cellAction.amount,
          canAfford: player.points >= (cellAction.amount || 0),
        });
        // Start action timer
        startTurnTimer(roomId, game.settings.turnDuration * 1000, async () => {
          try {
            const g = await TinhTuyGame.findOne({ roomId });
            if (!g || g.turnPhase !== 'AWAITING_ACTION') return;
            g.turnPhase = 'END_TURN';
            await g.save();
            await advanceTurn(io, g);
          } catch (err) {
            console.error('[tinh-tuy] Action timeout:', err);
          }
        });
      }

      // Phase 1: cards = no-op, advance turn
      if (cellAction.action === 'card') {
        game.turnPhase = 'END_TURN';
        await game.save();
      }

      // Auto-advance if END_TURN
      if (game.turnPhase === 'END_TURN') {
        // Doubles: same player gets another turn
        if (dice.isDouble && !player.isBankrupt && player.islandTurns === 0) {
          game.turnPhase = 'ROLL_DICE';
          game.turnStartedAt = new Date();
          await game.save();
          io.to(roomId).emit('tinh-tuy:turn-changed', {
            currentSlot: game.currentPlayerSlot,
            turnPhase: 'ROLL_DICE',
            turnStartedAt: game.turnStartedAt,
            extraTurn: true,
          });
          startTurnTimer(roomId, game.settings.turnDuration * 1000, async () => {
            try {
              const g = await TinhTuyGame.findOne({ roomId });
              if (!g || g.gameStatus !== 'playing') return;
              await advanceTurn(io, g);
            } catch (err) {
              console.error('[tinh-tuy] Turn timeout:', err);
            }
          });
        } else {
          await advanceTurn(io, game);
        }
      }

      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:roll-dice]', err.message);
      callback({ success: false, error: 'rollFailed' });
    }
  });

  // ── Buy Property ─────────────────────────────────────────────
  socket.on('tinh-tuy:buy-property', async (_data: any, callback: TinhTuyCallback) => {
    try {
      if (isRateLimited(socket.id)) return callback({ success: false, error: 'tooFast' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (!roomId) return callback({ success: false, error: 'notInRoom' });

      const game = await TinhTuyGame.findOne({ roomId });
      if (!game || game.gameStatus !== 'playing') {
        return callback({ success: false, error: 'gameNotActive' });
      }

      const player = findPlayerBySocket(game, socket);
      if (!player || !isCurrentPlayer(game, player)) {
        return callback({ success: false, error: 'notYourTurn' });
      }
      if (game.turnPhase !== 'AWAITING_ACTION') {
        return callback({ success: false, error: 'invalidPhase' });
      }

      const cell = getCell(player.position);
      if (!cell || !cell.price) return callback({ success: false, error: 'notBuyable' });

      // Check not already owned
      const alreadyOwned = game.players.some(p => p.properties.includes(player.position));
      if (alreadyOwned) return callback({ success: false, error: 'alreadyOwned' });

      if (player.points < cell.price) {
        return callback({ success: false, error: 'cantAfford' });
      }

      clearTurnTimer(roomId);

      player.points -= cell.price;
      player.properties.push(player.position);
      game.turnPhase = 'END_TURN';
      await game.save();

      io.to(roomId).emit('tinh-tuy:property-bought', {
        slot: player.slot, cellIndex: player.position,
        price: cell.price, remainingPoints: player.points,
      });

      // Check doubles for extra turn
      const dice = game.lastDiceResult;
      if (dice && dice.dice1 === dice.dice2 && !player.isBankrupt && player.islandTurns === 0) {
        game.turnPhase = 'ROLL_DICE';
        game.turnStartedAt = new Date();
        await game.save();
        io.to(roomId).emit('tinh-tuy:turn-changed', {
          currentSlot: game.currentPlayerSlot,
          turnPhase: 'ROLL_DICE', extraTurn: true,
        });
      } else {
        await advanceTurn(io, game);
      }

      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:buy-property]', err.message);
      callback({ success: false, error: 'buyFailed' });
    }
  });

  // ── Skip Buy ─────────────────────────────────────────────────
  socket.on('tinh-tuy:skip-buy', async (_data: any, callback: TinhTuyCallback) => {
    try {
      if (isRateLimited(socket.id)) return callback({ success: false, error: 'tooFast' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (!roomId) return callback({ success: false, error: 'notInRoom' });

      const game = await TinhTuyGame.findOne({ roomId });
      if (!game || game.gameStatus !== 'playing') {
        return callback({ success: false, error: 'gameNotActive' });
      }

      const player = findPlayerBySocket(game, socket);
      if (!player || !isCurrentPlayer(game, player)) {
        return callback({ success: false, error: 'notYourTurn' });
      }
      if (game.turnPhase !== 'AWAITING_ACTION') {
        return callback({ success: false, error: 'invalidPhase' });
      }

      clearTurnTimer(roomId);
      game.turnPhase = 'END_TURN';
      await game.save();

      // Check doubles for extra turn
      const dice = game.lastDiceResult;
      if (dice && dice.dice1 === dice.dice2 && !player.isBankrupt && player.islandTurns === 0) {
        game.turnPhase = 'ROLL_DICE';
        game.turnStartedAt = new Date();
        await game.save();
        io.to(roomId).emit('tinh-tuy:turn-changed', {
          currentSlot: game.currentPlayerSlot,
          turnPhase: 'ROLL_DICE', extraTurn: true,
        });
      } else {
        await advanceTurn(io, game);
      }

      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:skip-buy]', err.message);
      callback({ success: false, error: 'skipFailed' });
    }
  });

  // ── Surrender ────────────────────────────────────────────────
  socket.on('tinh-tuy:surrender', async (_data: any, callback: TinhTuyCallback) => {
    try {
      if (isRateLimited(socket.id)) return callback({ success: false, error: 'tooFast' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (!roomId) return callback({ success: false, error: 'notInRoom' });

      const game = await TinhTuyGame.findOne({ roomId });
      if (!game || game.gameStatus !== 'playing') {
        return callback({ success: false, error: 'gameNotActive' });
      }

      const player = findPlayerBySocket(game, socket);
      if (!player || player.isBankrupt) {
        return callback({ success: false, error: 'alreadyBankrupt' });
      }

      player.isBankrupt = true;
      player.points = 0;
      // Release properties back to bank
      player.properties = [];
      player.houses = {};
      player.hotels = {};
      await game.save();

      io.to(roomId).emit('tinh-tuy:player-surrendered', { slot: player.slot });

      const endCheck = checkGameEnd(game);
      if (endCheck.ended) {
        await finishGame(io, game, endCheck.winner, endCheck.reason || 'lastStanding');
      } else if (game.currentPlayerSlot === player.slot) {
        await advanceTurn(io, game);
      }

      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:surrender]', err.message);
      callback({ success: false, error: 'surrenderFailed' });
    }
  });
}
