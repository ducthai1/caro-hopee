/**
 * Tinh Tuy Dai Chien — Socket Gameplay Handlers
 * Phase 3: roll-dice (with cards + island), buy-property, skip-buy,
 * build-house, build-hotel, escape-island, surrender, chat, reactions
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import TinhTuyGame from '../models/TinhTuyGame';
import { TinhTuyCallback, ITinhTuyGame, ITinhTuyPlayer, CardEffectResult } from '../types/tinh-tuy.types';
import {
  rollDice, calculateNewPosition, resolveCellAction,
  getNextActivePlayer, checkGameEnd, sendToIsland,
  handleIslandEscape, canBuildHouse, buildHouse, canBuildHotel, buildHotel,
  calculateRent,
} from './tinh-tuy-engine';
import { GO_SALARY, getCell, ISLAND_ESCAPE_COST } from './tinh-tuy-board';
import { startTurnTimer, clearTurnTimer, cleanupRoom, isRateLimited } from './tinh-tuy-socket';
import { drawCard, getCardById, shuffleDeck, executeCardEffect } from './tinh-tuy-cards';

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

/** Check bankruptcy after point loss; returns true if game ended */
async function checkBankruptcy(
  io: SocketIOServer, game: ITinhTuyGame, player: ITinhTuyPlayer
): Promise<boolean> {
  if (player.points >= 0) return false;

  player.isBankrupt = true;
  player.points = 0;
  player.properties = [];
  player.houses = {} as Record<string, number>;
  player.hotels = {} as Record<string, boolean>;
  game.markModified('players');
  io.to(game.roomId).emit('tinh-tuy:player-bankrupt', { slot: player.slot });

  const endCheck = checkGameEnd(game);
  if (endCheck.ended) {
    await game.save();
    await finishGame(io, game, endCheck.winner, endCheck.reason || 'lastStanding');
    return true;
  }
  return false;
}

/** Advance to next turn, handling doubles (extra turn) and skip-turn flag */
async function advanceTurnOrDoubles(
  io: SocketIOServer, game: ITinhTuyGame, player: ITinhTuyPlayer
): Promise<void> {
  // Decrement doubleRent buff if active
  if (player.doubleRentTurns && player.doubleRentTurns > 0) {
    player.doubleRentTurns--;
  }

  // Skip-next-turn flag (from card)
  if (player.skipNextTurn) {
    player.skipNextTurn = false;
    // Don't give extra turn for doubles if skip is active
    await advanceTurn(io, game);
    return;
  }

  const dice = game.lastDiceResult;
  if (dice && dice.dice1 === dice.dice2 && !player.isBankrupt && player.islandTurns === 0) {
    game.turnPhase = 'ROLL_DICE';
    game.turnStartedAt = new Date();
    await game.save();
    io.to(game.roomId).emit('tinh-tuy:turn-changed', {
      currentSlot: game.currentPlayerSlot,
      turnPhase: 'ROLL_DICE', extraTurn: true,
    });
    startTurnTimer(game.roomId, game.settings.turnDuration * 1000, async () => {
      try {
        const g = await TinhTuyGame.findOne({ roomId: game.roomId });
        if (!g || g.gameStatus !== 'playing') return;
        await advanceTurn(io, g);
      } catch (err) { console.error('[tinh-tuy] Turn timeout:', err); }
    });
  } else {
    await advanceTurn(io, game);
  }
}

async function advanceTurn(io: SocketIOServer, game: ITinhTuyGame): Promise<void> {
  const nextSlot = getNextActivePlayer(game.players, game.currentPlayerSlot);
  if (nextSlot <= game.currentPlayerSlot) {
    game.round += 1;
  }

  game.currentPlayerSlot = nextSlot;
  game.turnStartedAt = new Date();
  game.lastDiceResult = undefined;

  // Check skip-next-turn for the next player
  const nextPlayer = game.players.find(p => p.slot === nextSlot);

  // Set phase based on island status
  game.turnPhase = (nextPlayer && nextPlayer.islandTurns > 0) ? 'ISLAND_TURN' : 'ROLL_DICE';

  if (nextPlayer?.skipNextTurn) {
    nextPlayer.skipNextTurn = false;
    // Skip this player — advance again
    await game.save();
    io.to(game.roomId).emit('tinh-tuy:turn-changed', {
      currentSlot: nextSlot, turnPhase: 'ROLL_DICE',
      turnStartedAt: game.turnStartedAt, round: game.round, skipped: true,
    });
    await advanceTurn(io, game);
    return;
  }

  await game.save();

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

  startTurnTimer(game.roomId, game.settings.turnDuration * 1000, async () => {
    try {
      const g = await TinhTuyGame.findOne({ roomId: game.roomId });
      if (!g || g.gameStatus !== 'playing') return;
      await advanceTurn(io, g);
    } catch (err) { console.error('[tinh-tuy] Turn timeout:', err); }
  });
}

/** Apply card effect results to game state */
function applyCardEffect(game: ITinhTuyGame, player: ITinhTuyPlayer, effect: CardEffectResult): void {
  // Apply point changes
  for (const [slotStr, delta] of Object.entries(effect.pointsChanged)) {
    const p = game.players.find(pp => pp.slot === Number(slotStr));
    if (p) p.points += delta;
  }

  // Move player
  if (effect.playerMoved) {
    const p = game.players.find(pp => pp.slot === effect.playerMoved!.slot);
    if (p) p.position = effect.playerMoved.to;
  }

  // Hold card
  if (effect.cardHeld) {
    const p = game.players.find(pp => pp.slot === effect.cardHeld!.slot);
    if (p) p.cards.push(effect.cardHeld.cardId);
  }

  // Remove house
  if (effect.houseRemoved) {
    const p = game.players.find(pp => pp.slot === effect.houseRemoved!.slot);
    if (p) {
      const key = String(effect.houseRemoved.cellIndex);
      p.houses[key] = Math.max((p.houses[key] || 0) - 1, 0);
    }
  }

  // Skip turn
  if (effect.skipTurn) player.skipNextTurn = true;

  // Go to island
  if (effect.goToIsland) sendToIsland(player);

  // Double rent
  if (effect.doubleRentTurns) {
    player.doubleRentTurns = (player.doubleRentTurns || 0) + effect.doubleRentTurns;
  }

  // Immunity
  if (effect.immunityNextRent) player.immunityNextRent = true;
}

/** Draw card and resolve — handles most card types immediately */
async function handleCardDraw(
  io: SocketIOServer, game: ITinhTuyGame, player: ITinhTuyPlayer, cellType: 'KHI_VAN' | 'CO_HOI'
): Promise<void> {
  const isKhiVan = cellType === 'KHI_VAN';
  const deck = isKhiVan ? game.luckCardDeck : game.opportunityCardDeck;
  const currentIndex = isKhiVan ? game.luckCardIndex : game.opportunityCardIndex;

  const { cardId, newIndex, reshuffle } = drawCard(deck, currentIndex);

  // Update deck index
  if (isKhiVan) {
    game.luckCardIndex = newIndex;
    if (reshuffle) game.luckCardDeck = shuffleDeck([...game.luckCardDeck]);
  } else {
    game.opportunityCardIndex = newIndex;
    if (reshuffle) game.opportunityCardDeck = shuffleDeck([...game.opportunityCardDeck]);
  }

  const card = getCardById(cardId);
  if (!card) {
    // Safety fallback — no card found, skip
    game.turnPhase = 'END_TURN';
    await game.save();
    return;
  }

  const effect = executeCardEffect(game, player.slot, card);
  applyCardEffect(game, player, effect);
  game.markModified('players'); // houses/hotels/cards may have changed

  // Broadcast card drawn
  io.to(game.roomId).emit('tinh-tuy:card-drawn', {
    slot: player.slot,
    card: { id: card.id, type: card.type, nameKey: card.nameKey, descriptionKey: card.descriptionKey },
    effect,
  });

  // Check bankruptcy for point loss
  for (const [slotStr, delta] of Object.entries(effect.pointsChanged)) {
    if (delta < 0) {
      const p = game.players.find(pp => pp.slot === Number(slotStr));
      if (p && p.points < 0) {
        const gameEnded = await checkBankruptcy(io, game, p);
        if (gameEnded) return;
      }
    }
  }

  // If card moved player, resolve the landing cell (max 1 level deep)
  if (effect.playerMoved && !effect.goToIsland) {
    const landingAction = resolveCellAction(game, player.slot, effect.playerMoved.to, 0);
    // Auto-resolve landing cell (rent, tax, etc) — but NOT another card (prevent recursion)
    if (landingAction.action === 'rent' && landingAction.amount && landingAction.ownerSlot) {
      // Check immunity
      if (player.immunityNextRent) {
        player.immunityNextRent = false;
        // Immune — no rent paid
      } else {
        player.points -= landingAction.amount;
        const owner = game.players.find(p => p.slot === landingAction.ownerSlot);
        if (owner) owner.points += landingAction.amount;
        io.to(game.roomId).emit('tinh-tuy:rent-paid', {
          fromSlot: player.slot, toSlot: landingAction.ownerSlot,
          amount: landingAction.amount, cellIndex: effect.playerMoved.to,
        });
        const gameEnded = await checkBankruptcy(io, game, player);
        if (gameEnded) return;
      }
    } else if (landingAction.action === 'buy') {
      // Player can buy — show action prompt
      game.turnPhase = 'AWAITING_ACTION';
      await game.save();
      io.to(game.roomId).emit('tinh-tuy:awaiting-action', {
        slot: player.slot, cellIndex: effect.playerMoved.to,
        cellType: getCell(effect.playerMoved.to)?.type, price: landingAction.amount,
        canAfford: player.points >= (landingAction.amount || 0),
      });
      startTurnTimer(game.roomId, game.settings.turnDuration * 1000, async () => {
        try {
          const g = await TinhTuyGame.findOne({ roomId: game.roomId });
          if (!g || g.turnPhase !== 'AWAITING_ACTION') return;
          g.turnPhase = 'END_TURN';
          await g.save();
          const p = g.players.find(pp => pp.slot === player.slot)!;
          await advanceTurnOrDoubles(io, g, p);
        } catch (err) { console.error('[tinh-tuy] Card action timeout:', err); }
      });
      return; // Don't auto-advance — waiting for player
    } else if (landingAction.action === 'tax' && landingAction.amount) {
      player.points -= landingAction.amount;
      io.to(game.roomId).emit('tinh-tuy:tax-paid', {
        slot: player.slot, amount: landingAction.amount, cellIndex: effect.playerMoved.to,
      });
      const gameEnded = await checkBankruptcy(io, game, player);
      if (gameEnded) return;
    } else if (landingAction.action === 'go_to_island') {
      sendToIsland(player);
      io.to(game.roomId).emit('tinh-tuy:player-island', { slot: player.slot, turnsRemaining: 3 });
    }
    // Don't resolve cards again from card movement (prevent recursion)
  }

  // If go to island from card
  if (effect.goToIsland) {
    io.to(game.roomId).emit('tinh-tuy:player-island', { slot: player.slot, turnsRemaining: 3 });
  }

  // FREE_HOUSE requires player choice — set awaiting phase
  if (effect.requiresChoice === 'FREE_HOUSE') {
    // For simplicity, auto-build on first buildable property. No additional UI needed.
    const buildable = player.properties.find(idx => {
      const check = canBuildHouse(game, player.slot, idx);
      return check.valid;
    });
    if (buildable !== undefined) {
      player.houses[String(buildable)] = (player.houses[String(buildable)] || 0) + 1;
      game.markModified('players');
      io.to(game.roomId).emit('tinh-tuy:house-built', {
        slot: player.slot, cellIndex: buildable,
        houseCount: player.houses[String(buildable)], free: true,
      });
    }
  }

  game.turnPhase = 'END_TURN';
  await game.save();
}

// ─── Chat Rate Limiting ──────────────────────────────────────
const chatLastMessage = new Map<string, number>();
const CHAT_RATE_MS = 1000;
const REACTION_RATE_MS = 500;

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

      // Allow ROLL_DICE or ISLAND_TURN (rolling to escape island)
      if (game.turnPhase !== 'ROLL_DICE' && game.turnPhase !== 'ISLAND_TURN') {
        return callback({ success: false, error: 'invalidPhase' });
      }

      clearTurnTimer(roomId);
      const dice = rollDice();
      game.lastDiceResult = { dice1: dice.dice1, dice2: dice.dice2 };

      // === Island escape via roll ===
      if (player.islandTurns > 0 && game.turnPhase === 'ISLAND_TURN') {
        const escapeResult = handleIslandEscape(player, 'ROLL', dice);
        await game.save();

        io.to(roomId).emit('tinh-tuy:dice-result', dice);

        if (escapeResult.escaped) {
          io.to(roomId).emit('tinh-tuy:island-escaped', {
            slot: player.slot, method: 'ROLL',
            costPaid: escapeResult.costPaid || 0,
          });
          // Player is free — move with dice result
          const oldPos = player.position;
          const { position: newPos, passedGo } = calculateNewPosition(oldPos, dice.total);
          player.position = newPos;
          if (passedGo) player.points += GO_SALARY;
          await game.save();

          io.to(roomId).emit('tinh-tuy:player-moved', {
            slot: player.slot, from: oldPos, to: newPos, passedGo,
            goBonus: passedGo ? GO_SALARY : 0,
          });

          // Resolve landing cell
          await resolveAndAdvance(io, game, player, newPos, dice);
        } else {
          // Still trapped
          io.to(roomId).emit('tinh-tuy:player-island', {
            slot: player.slot, turnsRemaining: player.islandTurns,
          });
          await advanceTurn(io, game);
        }

        callback({ success: true });
        return;
      }

      // === Normal dice roll ===

      // Handle doubles
      if (dice.isDouble) {
        player.consecutiveDoubles += 1;
        if (player.consecutiveDoubles >= 3) {
          const oldPos = player.position;
          sendToIsland(player);
          game.turnPhase = 'END_TURN';
          await game.save();

          io.to(roomId).emit('tinh-tuy:dice-result', dice);
          io.to(roomId).emit('tinh-tuy:player-moved', {
            slot: player.slot, from: oldPos, to: 27, passedGo: false,
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

      if (passedGo) player.points += GO_SALARY;

      await game.save();

      // Broadcast
      io.to(roomId).emit('tinh-tuy:dice-result', dice);
      io.to(roomId).emit('tinh-tuy:player-moved', {
        slot: player.slot, from: oldPos, to: newPos, passedGo,
        goBonus: passedGo ? GO_SALARY : 0,
      });

      // Resolve landing cell
      await resolveAndAdvance(io, game, player, newPos, dice);

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

      await advanceTurnOrDoubles(io, game, player);
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

      await advanceTurnOrDoubles(io, game, player);
      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:skip-buy]', err.message);
      callback({ success: false, error: 'skipFailed' });
    }
  });

  // ── Build House ──────────────────────────────────────────────
  socket.on('tinh-tuy:build-house', async (data: any, callback: TinhTuyCallback) => {
    try {
      if (isRateLimited(socket.id)) return callback({ success: false, error: 'tooFast' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (!roomId) return callback({ success: false, error: 'notInRoom' });

      const { cellIndex } = data || {};
      if (typeof cellIndex !== 'number') return callback({ success: false, error: 'invalidCell' });

      const game = await TinhTuyGame.findOne({ roomId });
      if (!game || game.gameStatus !== 'playing') {
        return callback({ success: false, error: 'gameNotActive' });
      }

      const player = findPlayerBySocket(game, socket);
      if (!player || player.isBankrupt) {
        return callback({ success: false, error: 'cannotBuild' });
      }

      const check = canBuildHouse(game, player.slot, cellIndex);
      if (!check.valid) return callback({ success: false, error: check.error || 'cannotBuild' });

      buildHouse(game, player.slot, cellIndex);
      game.markModified('players');
      await game.save();

      io.to(roomId).emit('tinh-tuy:house-built', {
        slot: player.slot, cellIndex,
        houseCount: player.houses[String(cellIndex)],
        remainingPoints: player.points,
      });

      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:build-house]', err.message);
      callback({ success: false, error: 'buildFailed' });
    }
  });

  // ── Build Hotel ──────────────────────────────────────────────
  socket.on('tinh-tuy:build-hotel', async (data: any, callback: TinhTuyCallback) => {
    try {
      if (isRateLimited(socket.id)) return callback({ success: false, error: 'tooFast' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (!roomId) return callback({ success: false, error: 'notInRoom' });

      const { cellIndex } = data || {};
      if (typeof cellIndex !== 'number') return callback({ success: false, error: 'invalidCell' });

      const game = await TinhTuyGame.findOne({ roomId });
      if (!game || game.gameStatus !== 'playing') {
        return callback({ success: false, error: 'gameNotActive' });
      }

      const player = findPlayerBySocket(game, socket);
      if (!player || player.isBankrupt) {
        return callback({ success: false, error: 'cannotBuild' });
      }

      const check = canBuildHotel(game, player.slot, cellIndex);
      if (!check.valid) return callback({ success: false, error: check.error || 'cannotBuild' });

      buildHotel(game, player.slot, cellIndex);
      game.markModified('players');
      await game.save();

      io.to(roomId).emit('tinh-tuy:hotel-built', {
        slot: player.slot, cellIndex,
        remainingPoints: player.points,
      });

      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:build-hotel]', err.message);
      callback({ success: false, error: 'buildFailed' });
    }
  });

  // ── Escape Island ────────────────────────────────────────────
  socket.on('tinh-tuy:escape-island', async (data: any, callback: TinhTuyCallback) => {
    try {
      if (isRateLimited(socket.id)) return callback({ success: false, error: 'tooFast' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (!roomId) return callback({ success: false, error: 'notInRoom' });

      const { method } = data || {};
      if (!['PAY', 'USE_CARD'].includes(method)) {
        return callback({ success: false, error: 'invalidMethod' });
      }

      const game = await TinhTuyGame.findOne({ roomId });
      if (!game || game.gameStatus !== 'playing') {
        return callback({ success: false, error: 'gameNotActive' });
      }

      const player = findPlayerBySocket(game, socket);
      if (!player || !isCurrentPlayer(game, player)) {
        return callback({ success: false, error: 'notYourTurn' });
      }
      if (player.islandTurns <= 0) {
        return callback({ success: false, error: 'notOnIsland' });
      }

      clearTurnTimer(roomId);
      const result = handleIslandEscape(player, method);

      if (!result.escaped) {
        return callback({ success: false, error: method === 'PAY' ? 'cannotAfford' : 'noEscapeCard' });
      }

      // Player escaped — now they get to roll dice normally
      game.turnPhase = 'ROLL_DICE';
      game.turnStartedAt = new Date();
      await game.save();

      io.to(roomId).emit('tinh-tuy:island-escaped', {
        slot: player.slot, method,
        costPaid: result.costPaid || 0,
      });

      // Start turn timer for the roll
      startTurnTimer(roomId, game.settings.turnDuration * 1000, async () => {
        try {
          const g = await TinhTuyGame.findOne({ roomId });
          if (!g || g.gameStatus !== 'playing') return;
          await advanceTurn(io, g);
        } catch (err) { console.error('[tinh-tuy] Escape timeout:', err); }
      });

      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:escape-island]', err.message);
      callback({ success: false, error: 'escapeFailed' });
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
      player.properties = [];
      player.houses = {} as Record<string, number>;
      player.hotels = {} as Record<string, boolean>;
      game.markModified('players');
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

  // ── Chat Message ─────────────────────────────────────────────
  socket.on('tinh-tuy:send-chat', async (data: any, callback?: TinhTuyCallback) => {
    const cb = typeof callback === 'function' ? callback : () => {};
    try {
      const roomId = socket.data.tinhTuyRoomId as string;
      if (!roomId) return cb({ success: false, error: 'notInRoom' });

      // Rate limit: 1 msg per second
      const now = Date.now();
      const lastMsg = chatLastMessage.get(socket.id) || 0;
      if (now - lastMsg < CHAT_RATE_MS) return cb({ success: false, error: 'tooFast' });
      chatLastMessage.set(socket.id, now);

      const { message } = data || {};
      if (!message || typeof message !== 'string') return cb({ success: false, error: 'invalidMessage' });

      const trimmed = message.trim().slice(0, 200);
      if (!trimmed) return cb({ success: false, error: 'emptyMessage' });

      const game = await TinhTuyGame.findOne({ roomId }).lean();
      if (!game) return cb({ success: false, error: 'roomNotFound' });

      const playerId = socket.data.tinhTuyPlayerId as string;
      const player = game.players.find(
        p => (p.userId?.toString() === playerId) || (p.guestId === playerId)
      );
      if (!player) return cb({ success: false, error: 'notInRoom' });

      io.to(roomId).emit('tinh-tuy:chat-message', {
        slot: player.slot, message: trimmed, timestamp: now,
      });
      cb({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:send-chat]', err.message);
      cb({ success: false, error: 'chatFailed' });
    }
  });

  // ── Reaction ─────────────────────────────────────────────────
  socket.on('tinh-tuy:send-reaction', async (data: any, callback?: TinhTuyCallback) => {
    const cb = typeof callback === 'function' ? callback : () => {};
    try {
      const roomId = socket.data.tinhTuyRoomId as string;
      if (!roomId) return cb({ success: false, error: 'notInRoom' });

      // Rate limit: 1 per 500ms
      const now = Date.now();
      const lastReact = chatLastMessage.get(`react:${socket.id}`) || 0;
      if (now - lastReact < REACTION_RATE_MS) return cb({ success: false, error: 'tooFast' });
      chatLastMessage.set(`react:${socket.id}`, now);

      const { emoji, reaction } = data || {};
      const emojiVal = emoji || reaction;
      if (!emojiVal || typeof emojiVal !== 'string' || emojiVal.length > 8) {
        return cb({ success: false, error: 'invalidEmoji' });
      }

      const playerId = socket.data.tinhTuyPlayerId as string;
      const game = await TinhTuyGame.findOne({ roomId }).lean();
      if (!game) return cb({ success: false, error: 'roomNotFound' });

      const player = game.players.find(
        p => (p.userId?.toString() === playerId) || (p.guestId === playerId)
      );
      if (!player) return cb({ success: false, error: 'notInRoom' });

      io.to(roomId).emit('tinh-tuy:reaction', {
        slot: player.slot, emoji: emojiVal, timestamp: now,
      });
      cb({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:send-reaction]', err.message);
      cb({ success: false, error: 'reactionFailed' });
    }
  });
}

// ─── Cell Resolution (after movement) ─────────────────────────

async function resolveAndAdvance(
  io: SocketIOServer, game: ITinhTuyGame, player: ITinhTuyPlayer,
  cellIndex: number, dice: { dice1: number; dice2: number; total: number; isDouble: boolean }
): Promise<void> {
  const cellAction = resolveCellAction(game, player.slot, cellIndex, dice.total);
  const roomId = game.roomId;

  switch (cellAction.action) {
    case 'rent': {
      if (!cellAction.amount || !cellAction.ownerSlot) break;
      // Check immunity
      if (player.immunityNextRent) {
        player.immunityNextRent = false;
        // Immune — skip rent
        break;
      }
      player.points -= cellAction.amount;
      const owner = game.players.find(p => p.slot === cellAction.ownerSlot);
      if (owner) owner.points += cellAction.amount;

      io.to(roomId).emit('tinh-tuy:rent-paid', {
        fromSlot: player.slot, toSlot: cellAction.ownerSlot,
        amount: cellAction.amount, cellIndex,
      });

      const gameEnded = await checkBankruptcy(io, game, player);
      if (gameEnded) return;
      break;
    }
    case 'tax': {
      if (!cellAction.amount) break;
      player.points -= cellAction.amount;
      io.to(roomId).emit('tinh-tuy:tax-paid', {
        slot: player.slot, amount: cellAction.amount, cellIndex,
      });
      const gameEnded = await checkBankruptcy(io, game, player);
      if (gameEnded) return;
      break;
    }
    case 'go_to_island': {
      sendToIsland(player);
      await game.save();
      io.to(roomId).emit('tinh-tuy:player-island', { slot: player.slot, turnsRemaining: 3 });
      await advanceTurn(io, game);
      return;
    }
    case 'festival': {
      const festivalAmount = cellAction.amount || 500;
      const amounts: Record<number, number> = {};
      for (const p of game.players.filter(pp => !pp.isBankrupt)) {
        p.points -= festivalAmount;
        amounts[p.slot] = -festivalAmount;
      }
      io.to(roomId).emit('tinh-tuy:festival-paid', { amounts });
      // Check bankruptcy for all
      for (const p of game.players.filter(pp => !pp.isBankrupt && pp.points < 0)) {
        const gameEnded = await checkBankruptcy(io, game, p);
        if (gameEnded) return;
      }
      break;
    }
    case 'card': {
      const cell = getCell(cellIndex);
      if (cell && (cell.type === 'KHI_VAN' || cell.type === 'CO_HOI')) {
        await handleCardDraw(io, game, player, cell.type);
        // handleCardDraw manages its own END_TURN + advanceTurn
        // Check if it set AWAITING_ACTION (card moved player to buyable cell)
        if (game.turnPhase === 'AWAITING_ACTION') return;
        // Otherwise it set END_TURN
        await advanceTurnOrDoubles(io, game, player);
        return;
      }
      break;
    }
    case 'buy': {
      game.turnPhase = 'AWAITING_ACTION';
      await game.save();
      io.to(roomId).emit('tinh-tuy:awaiting-action', {
        slot: player.slot, cellIndex,
        cellType: getCell(cellIndex)?.type, price: cellAction.amount,
        canAfford: player.points >= (cellAction.amount || 0),
      });
      startTurnTimer(roomId, game.settings.turnDuration * 1000, async () => {
        try {
          const g = await TinhTuyGame.findOne({ roomId });
          if (!g || g.turnPhase !== 'AWAITING_ACTION') return;
          g.turnPhase = 'END_TURN';
          await g.save();
          const p = g.players.find(pp => pp.slot === player.slot)!;
          await advanceTurnOrDoubles(io, g, p);
        } catch (err) { console.error('[tinh-tuy] Action timeout:', err); }
      });
      return; // Waiting for player action
    }
    default:
      break;
  }

  // Default: advance turn (with doubles check)
  game.turnPhase = 'END_TURN';
  await game.save();
  await advanceTurnOrDoubles(io, game, player);
}
