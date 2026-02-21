/**
 * Tinh Tuy Dai Chien — Socket Gameplay Handlers
 * Phase 3: roll-dice (with cards + island), buy-property, skip-buy,
 * build-house, build-hotel, escape-island, surrender, chat, reactions
 */
import crypto from 'crypto';
import { Server as SocketIOServer, Socket } from 'socket.io';
import TinhTuyGame from '../models/TinhTuyGame';
import { TinhTuyCallback, ITinhTuyGame, ITinhTuyPlayer, CardEffectResult } from '../types/tinh-tuy.types';
import {
  rollDice, calculateNewPosition, resolveCellAction,
  getNextActivePlayer, checkGameEnd, sendToIsland,
  handleIslandEscape, canBuildHouse, buildHouse, canBuildHotel, buildHotel,
  calculateRent, getSellPrice, getPropertyTotalSellValue, calculateSellableValue,
} from './tinh-tuy-engine';
import { GO_SALARY, getCell, ISLAND_ESCAPE_COST, getUtilityRent, getStationRent } from './tinh-tuy-board';
import { startTurnTimer, clearTurnTimer, cleanupRoom, isRateLimited, safetyRestartTimer } from './tinh-tuy-socket';
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

/** Check bankruptcy after point loss; returns true if game ended OR sell phase started */
async function checkBankruptcy(
  io: SocketIOServer, game: ITinhTuyGame, player: ITinhTuyPlayer
): Promise<boolean> {
  if (player.points >= 0) return false;

  // Current player can sell buildings to cover debt
  if (game.currentPlayerSlot === player.slot) {
    const completedRounds = Math.max((game.round || 1) - 1, 0);
    const sellableValue = calculateSellableValue(player, completedRounds);
    const deficit = Math.abs(player.points);
    if (sellableValue >= deficit) {
      // Enter sell phase — player must sell buildings
      game.turnPhase = 'AWAITING_SELL';
      await game.save();
      // Send exact sell prices so frontend matches backend calculations
      const sellPrices = buildSellPricesMap(player, completedRounds);
      io.to(game.roomId).emit('tinh-tuy:sell-prompt', { slot: player.slot, deficit, sellPrices });
      // Start timer — auto-sell cheapest on timeout
      startTurnTimer(game.roomId, game.settings.turnDuration * 1000, async () => {
        try {
          const g = await TinhTuyGame.findOne({ roomId: game.roomId });
          if (!g || g.turnPhase !== 'AWAITING_SELL') return;
          const p = g.players.find(pp => pp.slot === player.slot);
          if (!p) return;
          const soldItems = autoSellCheapest(g, p);
          g.turnPhase = 'END_TURN';
          await g.save();
          io.to(game.roomId).emit('tinh-tuy:buildings-sold', {
            slot: p.slot, newPoints: p.points,
            houses: { ...p.houses }, hotels: { ...p.hotels },
            properties: [...p.properties],
            autoSold: soldItems,
          });
          await advanceTurnOrDoubles(io, g, p);
        } catch (err) { console.error('[tinh-tuy] Sell timeout:', err); }
      });
      return true; // Stop caller from advancing turn
    }
  }

  // Instant bankruptcy — no sellable buildings or not current player
  player.isBankrupt = true;
  player.points = 0;
  player.properties = [];
  player.houses = {} as Record<string, number>;
  player.hotels = {} as Record<string, boolean>;
  // Clear game-level festival if this player owned it
  if (game.festival && game.festival.slot === player.slot) {
    game.festival = null;
    game.markModified('festival');
  }
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
/** Build per-player buff snapshot for turn-changed event */
function getPlayerBuffs(game: ITinhTuyGame): Array<{
  slot: number; cards: string[]; immunityNextRent: boolean; doubleRentTurns: number; skipNextTurn: boolean;
}> {
  return game.players.filter(p => !p.isBankrupt).map(p => ({
    slot: p.slot, cards: [...p.cards],
    immunityNextRent: !!p.immunityNextRent,
    doubleRentTurns: p.doubleRentTurns || 0,
    skipNextTurn: !!p.skipNextTurn,
  }));
}

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
      buffs: getPlayerBuffs(game),
    });
    startTurnTimer(game.roomId, game.settings.turnDuration * 1000, async () => {
      try {
        const g = await TinhTuyGame.findOne({ roomId: game.roomId });
        if (!g || g.gameStatus !== 'playing') return;
        // Guard: if player already rolled (turnPhase moved past ROLL_DICE), skip
        if (g.turnPhase !== 'ROLL_DICE') return;
        await advanceTurn(io, g);
      } catch (err) { console.error('[tinh-tuy] Turn timeout:', err); }
    });
  } else {
    await advanceTurn(io, game);
  }
}

export async function advanceTurn(io: SocketIOServer, game: ITinhTuyGame): Promise<void> {
  const nextSlot = getNextActivePlayer(game.players, game.currentPlayerSlot);
  if (nextSlot <= game.currentPlayerSlot) {
    game.round += 1;
  }

  game.currentPlayerSlot = nextSlot;
  game.turnStartedAt = new Date();
  game.lastDiceResult = null;
  game.markModified('lastDiceResult');

  // Check skip-next-turn for the next player
  const nextPlayer = game.players.find(p => p.slot === nextSlot);

  // skipNextTurn takes priority — keep pendingTravel for next non-skipped turn
  if (nextPlayer?.skipNextTurn) {
    nextPlayer.skipNextTurn = false;
    game.markModified('players');
    // Skip this player — advance again
    await game.save();
    io.to(game.roomId).emit('tinh-tuy:turn-changed', {
      currentSlot: nextSlot, turnPhase: 'ROLL_DICE',
      turnStartedAt: game.turnStartedAt, round: game.round, skipped: true,
      buffs: getPlayerBuffs(game),
    });
    await advanceTurn(io, game);
    return;
  }

  // Set phase based on player status: pendingTravel > island > normal roll
  if (nextPlayer?.pendingTravel) {
    game.turnPhase = 'AWAITING_TRAVEL';
    nextPlayer.pendingTravel = false;
    game.markModified('players');
  } else {
    game.turnPhase = (nextPlayer && nextPlayer.islandTurns > 0) ? 'ISLAND_TURN' : 'ROLL_DICE';
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
    buffs: getPlayerBuffs(game),
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

  // Swap position — teleport both players
  if (effect.swapPosition) {
    const me = game.players.find(p => p.slot === effect.swapPosition!.slot);
    const target = game.players.find(p => p.slot === effect.swapPosition!.targetSlot);
    if (me && target) {
      me.position = effect.swapPosition.myNewPos;
      target.position = effect.swapPosition.targetNewPos;
    }
  }

  // Steal property — transfer ownership, strip buildings
  if (effect.stolenProperty) {
    const victim = game.players.find(p => p.slot === effect.stolenProperty!.fromSlot);
    const thief = game.players.find(p => p.slot === effect.stolenProperty!.toSlot);
    if (victim && thief) {
      const cellIdx = effect.stolenProperty.cellIndex;
      victim.properties = victim.properties.filter(idx => idx !== cellIdx);
      delete victim.houses[String(cellIdx)];
      delete victim.hotels[String(cellIdx)];
      thief.properties.push(cellIdx);
    }
  }

  // All lose one house (storm) — remove 1 random house from each player
  if (effect.allHousesRemoved) {
    for (const rem of effect.allHousesRemoved) {
      const p = game.players.find(pp => pp.slot === rem.slot);
      if (p) {
        const key = String(rem.cellIndex);
        p.houses[key] = Math.max((p.houses[key] || 0) - 1, 0);
      }
    }
  }
}

/** Draw card and resolve — handles most card types immediately */
async function handleCardDraw(
  io: SocketIOServer, game: ITinhTuyGame, player: ITinhTuyPlayer, cellType: 'KHI_VAN' | 'CO_HOI', depth = 0
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
        // Immune — no rent paid, but still offer buyback
        const bb = await emitBuybackPrompt(io, game, player, effect.playerMoved.to, landingAction.ownerSlot);
        if (bb) return;
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
        // Offer buyback after rent
        const bb = await emitBuybackPrompt(io, game, player, effect.playerMoved.to, landingAction.ownerSlot);
        if (bb) return;
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
    } else if (landingAction.action === 'tax') {
      const taxAmt = landingAction.amount || 0;
      if (taxAmt > 0) player.points -= taxAmt;
      io.to(game.roomId).emit('tinh-tuy:tax-paid', {
        slot: player.slot, amount: taxAmt, cellIndex: effect.playerMoved.to,
        houseCount: landingAction.houseCount || 0,
        hotelCount: landingAction.hotelCount || 0,
        perHouse: landingAction.perHouse || 500,
        perHotel: landingAction.perHotel || 1000,
      });
      const gameEnded = await checkBankruptcy(io, game, player);
      if (gameEnded) return;
    } else if (landingAction.action === 'go_to_island') {
      sendToIsland(player);
      io.to(game.roomId).emit('tinh-tuy:player-island', { slot: player.slot, turnsRemaining: 3 });
    } else if (landingAction.action === 'travel') {
      // Card moved player to Travel cell — defer travel to next turn, break doubles
      player.pendingTravel = true;
      player.consecutiveDoubles = 0;
      game.lastDiceResult = null;
      game.markModified('lastDiceResult');
    } else if (landingAction.action === 'build') {
      // Card moved player to own property — let them build
      game.turnPhase = 'AWAITING_BUILD';
      await game.save();
      io.to(game.roomId).emit('tinh-tuy:build-prompt', {
        slot: player.slot, cellIndex: effect.playerMoved.to,
        canBuildHouse: landingAction.canBuildHouse,
        houseCost: landingAction.houseCost,
        canBuildHotel: landingAction.canBuildHotel,
        hotelCost: landingAction.hotelCost,
        currentHouses: landingAction.currentHouses,
        hasHotel: landingAction.hasHotel,
      });
      startTurnTimer(game.roomId, game.settings.turnDuration * 1000, async () => {
        try {
          const g = await TinhTuyGame.findOne({ roomId: game.roomId });
          if (!g || g.turnPhase !== 'AWAITING_BUILD') return;
          g.turnPhase = 'END_TURN';
          await g.save();
          const p = g.players.find(pp => pp.slot === player.slot)!;
          await advanceTurnOrDoubles(io, g, p);
        } catch (err) { console.error('[tinh-tuy] Card build timeout:', err); }
      });
      return; // Wait for player choice
    } else if (landingAction.action === 'festival') {
      // Card moved player to festival cell — let them choose
      game.turnPhase = 'AWAITING_FESTIVAL';
      await game.save();
      io.to(game.roomId).emit('tinh-tuy:festival-prompt', { slot: player.slot });
      startTurnTimer(game.roomId, game.settings.turnDuration * 1000, async () => {
        try {
          const g = await TinhTuyGame.findOne({ roomId: game.roomId });
          if (!g || g.turnPhase !== 'AWAITING_FESTIVAL') return;
          // Auto-pick: apply festival to first owned property
          const p = g.players.find(pp => pp.slot === player.slot)!;
          if (p.properties.length > 0) {
            const autoCell = p.properties[0];
            const autoMult = 1.5;
            g.festival = { slot: p.slot, cellIndex: autoCell, multiplier: autoMult };
            g.markModified('festival');
          }
          g.turnPhase = 'END_TURN';
          await g.save();
          if (p.properties.length > 0) {
            io.to(game.roomId).emit('tinh-tuy:festival-applied', { slot: p.slot, cellIndex: p.properties[0], multiplier: 1.5 });
          }
          await advanceTurnOrDoubles(io, g, p);
        } catch (err) { console.error('[tinh-tuy] Card festival timeout:', err); }
      });
      return; // Wait for player choice
    }
    // Card moved player to another KHI_VAN/CO_HOI cell — skip (no chain draw)
    // Previously drew another card recursively, but this was confusing for players
  }

  // If go to island from card
  if (effect.goToIsland) {
    io.to(game.roomId).emit('tinh-tuy:player-island', { slot: player.slot, turnsRemaining: 3 });
  }

  // FREE_HOUSE: let player choose which property to build on
  if (effect.requiresChoice === 'FREE_HOUSE') {
    const buildableCells = player.properties.filter(idx => {
      // Free house ignores cost — only check structural constraints
      const cell = getCell(idx);
      if (!cell || cell.type !== 'PROPERTY' || !cell.group) return false;
      if ((player.houses[String(idx)] || 0) >= 4) return false;
      if (player.hotels[String(idx)]) return false;
      return true;
    });
    if (buildableCells.length > 0) {
      game.turnPhase = 'AWAITING_FREE_HOUSE';
      await game.save();
      io.to(game.roomId).emit('tinh-tuy:free-house-prompt', {
        slot: player.slot, buildableCells,
      });
      startTurnTimer(game.roomId, game.settings.turnDuration * 1000, async () => {
        try {
          const g = await TinhTuyGame.findOne({ roomId: game.roomId });
          if (!g || g.turnPhase !== 'AWAITING_FREE_HOUSE') return;
          // Auto-pick first buildable on timeout
          const p = g.players.find(pp => pp.slot === player.slot)!;
          p.houses[String(buildableCells[0])] = (p.houses[String(buildableCells[0])] || 0) + 1;
          g.markModified('players');
          g.turnPhase = 'END_TURN';
          await g.save();
          io.to(game.roomId).emit('tinh-tuy:house-built', {
            slot: p.slot, cellIndex: buildableCells[0],
            houseCount: p.houses[String(buildableCells[0])], free: true,
          });
          await advanceTurnOrDoubles(io, g, p);
        } catch (err) { console.error('[tinh-tuy] Free house timeout:', err); }
      });
      return; // Wait for player choice
    }
  }

  // DESTROY_PROPERTY / DOWNGRADE_BUILDING: let player choose opponent's property
  if (effect.requiresChoice === 'DESTROY_PROPERTY' || effect.requiresChoice === 'DOWNGRADE_BUILDING') {
    const targetCells = effect.targetableCells || [];
    if (targetCells.length > 0) {
      const phase = effect.requiresChoice === 'DESTROY_PROPERTY' ? 'AWAITING_DESTROY_PROPERTY' : 'AWAITING_DOWNGRADE_BUILDING';
      game.turnPhase = phase;
      await game.save();
      io.to(game.roomId).emit('tinh-tuy:attack-property-prompt', {
        slot: player.slot, attackType: effect.requiresChoice, targetCells,
      });
      // Auto-pick random on timeout
      startTurnTimer(game.roomId, game.settings.turnDuration * 1000, async () => {
        try {
          const g = await TinhTuyGame.findOne({ roomId: game.roomId });
          if (!g || (g.turnPhase !== 'AWAITING_DESTROY_PROPERTY' && g.turnPhase !== 'AWAITING_DOWNGRADE_BUILDING')) return;
          const p = g.players.find(pp => pp.slot === player.slot)!;
          const randomCell = targetCells[crypto.randomInt(0, targetCells.length)];
          applyPropertyAttack(g, g.turnPhase === 'AWAITING_DESTROY_PROPERTY' ? 'DESTROY_PROPERTY' : 'DOWNGRADE_BUILDING', randomCell, io);
          g.turnPhase = 'END_TURN';
          g.markModified('players');
          await g.save();
          await advanceTurnOrDoubles(io, g, p);
        } catch (err) { console.error('[tinh-tuy] Attack property timeout:', err); }
      });
      return; // Wait for player choice
    }
  }

  // Hold turn for ~4s so frontend card modal can display before turn advances.
  // Without this delay, the turn-changed event arrives immediately after card-drawn,
  // causing the card modal to be skipped or dismissed before players can see it.
  const CARD_DISPLAY_DELAY = 4000;
  game.turnPhase = 'AWAITING_CARD_DISPLAY';
  await game.save();
  startTurnTimer(game.roomId, CARD_DISPLAY_DELAY, async () => {
    try {
      const g = await TinhTuyGame.findOne({ roomId: game.roomId });
      if (!g || g.turnPhase !== 'AWAITING_CARD_DISPLAY') return;
      g.turnPhase = 'END_TURN';
      await g.save();
      const p = g.players.find(pp => pp.slot === player.slot)!;
      await advanceTurnOrDoubles(io, g, p);
    } catch (err) { console.error('[tinh-tuy] Card display timeout:', err); }
  });
}

/** Build a map of exact sell prices for each property/building the player owns.
 *  Sent to frontend so it displays the same values the backend uses. */
function buildSellPricesMap(
  player: ITinhTuyPlayer, completedRounds: number,
): Record<string, { property: number; house: number; hotel: number }> {
  const map: Record<string, { property: number; house: number; hotel: number }> = {};
  for (const cellIdx of player.properties) {
    map[String(cellIdx)] = {
      property: getPropertyTotalSellValue(player, cellIdx, completedRounds),
      house: getSellPrice(cellIdx, 'house'),
      hotel: getSellPrice(cellIdx, 'hotel'),
    };
  }
  return map;
}

/** Auto-sell cheapest assets (buildings first, then properties) until player points >= 0.
 *  Returns list of sold items for frontend display. */
function autoSellCheapest(
  game: ITinhTuyGame, player: ITinhTuyPlayer,
): Array<{ cellIndex: number; type: 'house' | 'hotel' | 'property'; price: number }> {
  const completedRounds = Math.max((game.round || 1) - 1, 0);
  const soldItems: Array<{ cellIndex: number; type: 'house' | 'hotel' | 'property'; price: number }> = [];

  // Phase 1: sell buildings (cheapest first)
  const buildings: Array<{ cellIndex: number; type: 'house' | 'hotel'; price: number }> = [];
  for (const cellIdx of player.properties) {
    const key = String(cellIdx);
    if (player.hotels[key]) {
      buildings.push({ cellIndex: cellIdx, type: 'hotel', price: getSellPrice(cellIdx, 'hotel') });
    }
    const houses = player.houses[key] || 0;
    for (let i = 0; i < houses; i++) {
      buildings.push({ cellIndex: cellIdx, type: 'house', price: getSellPrice(cellIdx, 'house') });
    }
  }
  buildings.sort((a, b) => a.price - b.price);
  for (const item of buildings) {
    if (player.points >= 0) break;
    const key = String(item.cellIndex);
    if (item.type === 'hotel') {
      player.hotels[key] = false;
    } else {
      player.houses[key] = (player.houses[key] || 0) - 1;
    }
    player.points += item.price;
    soldItems.push(item);
  }

  // Phase 2: sell properties (cheapest land first) if still in debt
  if (player.points < 0) {
    const props = player.properties
      .map(idx => ({ cellIndex: idx, price: getSellPrice(idx, 'property', completedRounds, player) }))
      .sort((a, b) => a.price - b.price);
    for (const prop of props) {
      if (player.points >= 0) break;
      const key = String(prop.cellIndex);
      delete player.houses[key];
      delete player.hotels[key];
      player.properties = player.properties.filter(idx => idx !== prop.cellIndex);
      player.points += prop.price;
      soldItems.push({ cellIndex: prop.cellIndex, type: 'property', price: prop.price });
    }
  }
  game.markModified('players');
  return soldItems;
}

// ─── GO Bonus (landing exactly on cell 0) ────────────────────

const GO_BONUS_FALLBACK = 1000; // Bonus points if no buildable properties

/** Handle landing exactly on GO: random 50/50 between free upgrade or bonus roll */
async function handleGoBonus(
  io: SocketIOServer, game: ITinhTuyGame, player: ITinhTuyPlayer,
): Promise<void> {
  const roomId = game.roomId;
  const bonusType = crypto.randomInt(2) === 0 ? 'FREE_UPGRADE' : 'BONUS_ROLL';

  if (bonusType === 'FREE_UPGRADE') {
    // Find buildable cells (has property, not max houses, no hotel)
    const buildableCells = player.properties.filter(idx => {
      if (player.hotels[String(idx)]) return false;
      const cell = getCell(idx);
      if (!cell || cell.type !== 'PROPERTY') return false;
      const houses = player.houses[String(idx)] || 0;
      // Can build house (< 4) or upgrade to hotel (= 4)
      return houses < 4 || (houses === 4 && !player.hotels[String(idx)]);
    });

    if (buildableCells.length > 0) {
      game.turnPhase = 'AWAITING_GO_BONUS';
      await game.save();
      io.to(roomId).emit('tinh-tuy:go-bonus', {
        slot: player.slot, bonusType: 'FREE_UPGRADE', buildableCells,
      });
      startTurnTimer(roomId, game.settings.turnDuration * 1000, async () => {
        try {
          const g = await TinhTuyGame.findOne({ roomId });
          if (!g || g.turnPhase !== 'AWAITING_GO_BONUS') return;
          const p = g.players.find(pp => pp.slot === player.slot)!;
          // Auto-pick first buildable on timeout
          const autoPick = buildableCells[0];
          const key = String(autoPick);
          const houses = p.houses[key] || 0;
          if (houses === 4) {
            p.hotels[key] = true;
            p.houses[key] = 0;
          } else {
            p.houses[key] = houses + 1;
          }
          g.markModified('players');
          g.turnPhase = 'END_TURN';
          await g.save();
          io.to(roomId).emit('tinh-tuy:go-bonus-applied', {
            slot: p.slot, bonusType: 'FREE_UPGRADE', cellIndex: autoPick,
            houses: { ...p.houses }, hotels: { ...p.hotels },
          });
          await advanceTurnOrDoubles(io, g, p);
        } catch (err) { console.error('[tinh-tuy] GO bonus timeout:', err); }
      });
      return;
    }

    // No buildable properties → fallback to bonus points
    player.points += GO_BONUS_FALLBACK;
    game.markModified('players');
    await game.save();
    io.to(roomId).emit('tinh-tuy:go-bonus', {
      slot: player.slot, bonusType: 'BONUS_POINTS', amount: GO_BONUS_FALLBACK,
    });
  } else {
    // BONUS_ROLL: give player an extra dice roll (similar to doubles extra turn)
    game.turnPhase = 'ROLL_DICE';
    game.turnStartedAt = new Date();
    await game.save();
    io.to(roomId).emit('tinh-tuy:go-bonus', {
      slot: player.slot, bonusType: 'BONUS_ROLL',
    });
    io.to(roomId).emit('tinh-tuy:turn-changed', {
      currentSlot: game.currentPlayerSlot,
      turnPhase: 'ROLL_DICE', extraTurn: true,
      buffs: getPlayerBuffs(game),
    });
    startTurnTimer(roomId, game.settings.turnDuration * 1000, async () => {
      try {
        const g = await TinhTuyGame.findOne({ roomId });
        if (!g || g.gameStatus !== 'playing') return;
        if (g.turnPhase !== 'ROLL_DICE') return;
        await advanceTurn(io, g);
      } catch (err) { console.error('[tinh-tuy] GO bonus roll timeout:', err); }
    });
    return;
  }

  // Fallback (BONUS_POINTS path): advance turn
  game.turnPhase = 'END_TURN';
  await game.save();
  await advanceTurnOrDoubles(io, game, player);
}

// ─── Property Attack Helpers ─────────────────────────────────

/**
 * Apply a property attack (DESTROY_PROPERTY or DOWNGRADE_BUILDING) to a target cell.
 * Returns the result details for the notification event.
 */
function applyPropertyAttack(
  game: ITinhTuyGame,
  attackType: 'DESTROY_PROPERTY' | 'DOWNGRADE_BUILDING',
  cellIndex: number,
  io: SocketIOServer,
): { victimSlot: number; cellIndex: number; result: 'destroyed' | 'downgraded' | 'demolished' | 'shielded'; prevHouses: number; prevHotel: boolean; newHouses: number; newHotel: boolean } | null {
  // Find the owner of this cell
  const victim = game.players.find(p => p.properties.includes(cellIndex));
  if (!victim) return null;

  // Shield check — if victim holds a shield card, consume it and block the attack
  const shieldIdx = victim.cards.indexOf('shield');
  if (shieldIdx >= 0) {
    victim.cards.splice(shieldIdx, 1);
    const key = String(cellIndex);
    const result = {
      victimSlot: victim.slot, cellIndex, result: 'shielded' as const,
      prevHouses: victim.houses[key] || 0, prevHotel: !!victim.hotels[key],
      newHouses: victim.houses[key] || 0, newHotel: !!victim.hotels[key],
    };
    io.to(game.roomId).emit('tinh-tuy:property-attacked', result);
    return result;
  }

  const key = String(cellIndex);
  const prevHouses = victim.houses[key] || 0;
  const prevHotel = !!victim.hotels[key];

  if (attackType === 'DESTROY_PROPERTY') {
    // Destroy entirely: remove property + all buildings
    delete victim.houses[key];
    delete victim.hotels[key];
    victim.properties = victim.properties.filter(idx => idx !== cellIndex);
    // Clear game-level festival if on this cell
    if (game.festival && game.festival.cellIndex === cellIndex && game.festival.slot === victim.slot) {
      game.festival = null;
      game.markModified('festival');
    }
    const result = { victimSlot: victim.slot, cellIndex, result: 'destroyed' as const, prevHouses, prevHotel, newHouses: 0, newHotel: false };
    io.to(game.roomId).emit('tinh-tuy:property-attacked', result);
    return result;
  }

  // DOWNGRADE_BUILDING: reduce 1 level
  if (prevHotel) {
    // Hotel → remove hotel, land only
    victim.hotels[key] = false;
    const result = { victimSlot: victim.slot, cellIndex, result: 'downgraded' as const, prevHouses, prevHotel, newHouses: prevHouses, newHotel: false };
    io.to(game.roomId).emit('tinh-tuy:property-attacked', result);
    return result;
  } else if (prevHouses > 0) {
    // N houses → N-1
    victim.houses[key] = prevHouses - 1;
    const result = { victimSlot: victim.slot, cellIndex, result: 'downgraded' as const, prevHouses, prevHotel, newHouses: prevHouses - 1, newHotel: false };
    io.to(game.roomId).emit('tinh-tuy:property-attacked', result);
    return result;
  } else {
    // Just land → destroy (unowned)
    delete victim.houses[key];
    delete victim.hotels[key];
    victim.properties = victim.properties.filter(idx => idx !== cellIndex);
    if (game.festival && game.festival.cellIndex === cellIndex && game.festival.slot === victim.slot) {
      game.festival = null;
      game.markModified('festival');
    }
    const result = { victimSlot: victim.slot, cellIndex, result: 'demolished' as const, prevHouses, prevHotel, newHouses: 0, newHotel: false };
    io.to(game.roomId).emit('tinh-tuy:property-attacked', result);
    return result;
  }
}

// ─── Buyback Price Calculation ────────────────────────────────

/** Calculate buyback price = total property value × 1.1
 *  For utilities: uses current rent value (scales with round) as base
 *  For stations: uses rent value (scales with stations owned) as base */
function calculateBuybackPrice(owner: ITinhTuyPlayer, cellIndex: number, completedRounds: number): number {
  const cell = getCell(cellIndex);
  if (!cell || !cell.price) return 0;
  const key = String(cellIndex);

  let total: number;
  if (cell.type === 'UTILITY') {
    // Utility value scales with rounds — use current rent as base
    total = getUtilityRent(cell.price, completedRounds);
  } else if (cell.type === 'STATION') {
    // Station value scales with how many stations owned
    const stationsOwned = owner.properties.filter(i => getCell(i)?.type === 'STATION').length;
    total = cell.price + getStationRent(stationsOwned);
  } else {
    total = cell.price;
    const houses = owner.houses[key] || 0;
    if (houses > 0) total += houses * (cell.houseCost || 0);
    if (owner.hotels[key]) total += (cell.hotelCost || 0);
  }
  return Math.ceil(total * 1.1);
}

/**
 * Emit buyback prompt after rent payment.
 * If player can't afford, still emit with canAfford=false for frontend notification.
 * Returns true if we entered AWAITING_BUYBACK phase (caller should return/not advance).
 */
async function emitBuybackPrompt(
  io: SocketIOServer, game: ITinhTuyGame, player: ITinhTuyPlayer,
  cellIndex: number, ownerSlot: number,
): Promise<boolean> {
  const owner = game.players.find(p => p.slot === ownerSlot);
  if (!owner || owner.isBankrupt) return false;
  // Hotel properties cannot be bought back
  if (owner.hotels[String(cellIndex)]) return false;
  const completedRounds = Math.max((game.round || 1) - 1, 0);
  const price = calculateBuybackPrice(owner, cellIndex, completedRounds);
  if (price <= 0) return false;
  const canAfford = player.points >= price;

  if (!canAfford) {
    // Just notify — not enough money, don't enter waiting phase
    io.to(game.roomId).emit('tinh-tuy:buyback-prompt', {
      slot: player.slot, ownerSlot, cellIndex, price, canAfford: false,
    });
    return false;
  }

  // Enter buyback phase
  game.turnPhase = 'AWAITING_BUYBACK';
  await game.save();
  io.to(game.roomId).emit('tinh-tuy:buyback-prompt', {
    slot: player.slot, ownerSlot, cellIndex, price, canAfford: true,
  });

  startTurnTimer(game.roomId, game.settings.turnDuration * 1000, async () => {
    try {
      const g = await TinhTuyGame.findOne({ roomId: game.roomId });
      if (!g || g.turnPhase !== 'AWAITING_BUYBACK') return;
      // Auto-decline on timeout
      g.turnPhase = 'END_TURN';
      await g.save();
      const p = g.players.find(pp => pp.slot === player.slot)!;
      await advanceTurnOrDoubles(io, g, p);
    } catch (err) { console.error('[tinh-tuy] Buyback timeout:', err); }
  });
  return true;
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
      game.markModified('lastDiceResult');

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
            slot: player.slot, from: oldPos, to: 27, passedGo: false, teleport: true,
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
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
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
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
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
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
    }
  });

  // ── Travel To (choose destination from Travel cell) ─────────
  socket.on('tinh-tuy:travel-to', async (data: any, callback: TinhTuyCallback) => {
    try {
      if (isRateLimited(socket.id)) return callback({ success: false, error: 'tooFast' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (!roomId) return callback({ success: false, error: 'notInRoom' });

      const { cellIndex } = data || {};
      if (typeof cellIndex !== 'number' || cellIndex < 0 || cellIndex > 35) {
        return callback({ success: false, error: 'invalidCell' });
      }

      const game = await TinhTuyGame.findOne({ roomId });
      if (!game || game.gameStatus !== 'playing') {
        return callback({ success: false, error: 'gameNotActive' });
      }

      const player = findPlayerBySocket(game, socket);
      if (!player || !isCurrentPlayer(game, player)) {
        return callback({ success: false, error: 'notYourTurn' });
      }
      if (game.turnPhase !== 'AWAITING_TRAVEL') {
        return callback({ success: false, error: 'invalidPhase' });
      }

      // Validate destination: GO, unowned buyable cells, or own properties only
      const destCell = getCell(cellIndex);
      if (!destCell) return callback({ success: false, error: 'invalidCell' });
      if (cellIndex === player.position) return callback({ success: false, error: 'sameCell' });
      const isBuyable = destCell.type === 'PROPERTY' || destCell.type === 'STATION' || destCell.type === 'UTILITY';
      const owner = isBuyable ? game.players.find(p => p.properties.includes(cellIndex)) : undefined;
      const isGo = destCell.type === 'GO';
      const isUnowned = isBuyable && !owner;
      const isOwnProperty = isBuyable && owner?.slot === player.slot;
      if (!isGo && !isUnowned && !isOwnProperty) {
        return callback({ success: false, error: 'invalidDestination' });
      }

      clearTurnTimer(roomId);

      // Move player to destination — always forward (clockwise), may pass GO
      const oldPos = player.position;
      const passedGo = cellIndex < oldPos; // forward wrap = passed GO
      player.position = cellIndex;
      if (passedGo) player.points += GO_SALARY;
      await game.save();

      io.to(roomId).emit('tinh-tuy:player-moved', {
        slot: player.slot, from: oldPos, to: cellIndex,
        passedGo, goBonus: passedGo ? GO_SALARY : 0, isTravel: true,
      });

      // Resolve destination cell
      await resolveAndAdvance(io, game, player, cellIndex, { dice1: 0, dice2: 0, total: 0, isDouble: false });
      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:travel-to]', err.message);
      callback({ success: false, error: 'travelFailed' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
    }
  });

  // ── Apply Festival (choose property to host festival) ────────
  socket.on('tinh-tuy:apply-festival', async (data: any, callback: TinhTuyCallback) => {
    try {
      if (isRateLimited(socket.id)) return callback({ success: false, error: 'tooFast' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (!roomId) return callback({ success: false, error: 'notInRoom' });

      const { cellIndex } = data || {};
      if (typeof cellIndex !== 'number' || cellIndex < 0 || cellIndex > 35) {
        return callback({ success: false, error: 'invalidCell' });
      }

      const game = await TinhTuyGame.findOne({ roomId });
      if (!game || game.gameStatus !== 'playing') {
        return callback({ success: false, error: 'gameNotActive' });
      }

      const player = findPlayerBySocket(game, socket);
      if (!player || !isCurrentPlayer(game, player)) {
        return callback({ success: false, error: 'notYourTurn' });
      }
      if (game.turnPhase !== 'AWAITING_FESTIVAL') {
        return callback({ success: false, error: 'invalidPhase' });
      }

      // Must own the property
      if (!player.properties.includes(cellIndex)) {
        return callback({ success: false, error: 'notOwned' });
      }

      clearTurnTimer(roomId);

      // Compute new festival state (global — only 1 on board)
      let newMultiplier = 1.5;
      if (game.festival && game.festival.slot === player.slot && game.festival.cellIndex === cellIndex) {
        // Same player, same cell → stack +0.5
        newMultiplier = game.festival.multiplier + 0.5;
      }
      // Any other case (different cell, different player, or no festival) → reset to 1.5
      game.festival = { slot: player.slot, cellIndex, multiplier: newMultiplier };
      game.markModified('festival');

      game.turnPhase = 'END_TURN';
      await game.save();

      io.to(roomId).emit('tinh-tuy:festival-applied', {
        slot: player.slot, cellIndex, multiplier: newMultiplier,
      });
      await advanceTurnOrDoubles(io, game, player);
      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:apply-festival]', err.message);
      callback({ success: false, error: 'festivalFailed' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
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

      const wasAwaitingBuild = game.turnPhase === 'AWAITING_BUILD';
      if (wasAwaitingBuild) clearTurnTimer(roomId);

      buildHouse(game, player.slot, cellIndex);
      game.markModified('players');

      if (wasAwaitingBuild) game.turnPhase = 'END_TURN';
      await game.save();

      io.to(roomId).emit('tinh-tuy:house-built', {
        slot: player.slot, cellIndex,
        houseCount: player.houses[String(cellIndex)],
        remainingPoints: player.points,
      });

      // Advance turn if this was the landing build prompt
      if (wasAwaitingBuild) await advanceTurnOrDoubles(io, game, player);

      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:build-house]', err.message);
      callback({ success: false, error: 'buildFailed' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
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

      const wasAwaitingBuild = game.turnPhase === 'AWAITING_BUILD';
      if (wasAwaitingBuild) clearTurnTimer(roomId);

      buildHotel(game, player.slot, cellIndex);
      game.markModified('players');

      if (wasAwaitingBuild) game.turnPhase = 'END_TURN';
      await game.save();

      io.to(roomId).emit('tinh-tuy:hotel-built', {
        slot: player.slot, cellIndex,
        remainingPoints: player.points,
      });

      if (wasAwaitingBuild) await advanceTurnOrDoubles(io, game, player);

      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:build-hotel]', err.message);
      callback({ success: false, error: 'buildFailed' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
    }
  });

  // ── GO Bonus: Free Upgrade Choose ────────────────────────────
  socket.on('tinh-tuy:go-bonus-choose', async (data: any, callback: TinhTuyCallback) => {
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
      if (game.turnPhase !== 'AWAITING_GO_BONUS') {
        return callback({ success: false, error: 'invalidPhase' });
      }

      const cellIndex = data?.cellIndex;
      if (typeof cellIndex !== 'number') return callback({ success: false, error: 'invalidCell' });
      if (!player.properties.includes(cellIndex)) return callback({ success: false, error: 'notOwned' });

      const cell = getCell(cellIndex);
      if (!cell || cell.type !== 'PROPERTY') return callback({ success: false, error: 'notBuildable' });

      const key = String(cellIndex);
      const houses = player.houses[key] || 0;
      if (player.hotels[key]) return callback({ success: false, error: 'hasHotel' });

      // Build house or upgrade to hotel (free)
      if (houses === 4) {
        player.hotels[key] = true;
        player.houses[key] = 0;
      } else if (houses < 4) {
        player.houses[key] = houses + 1;
      } else {
        return callback({ success: false, error: 'maxBuildings' });
      }

      clearTurnTimer(roomId);
      game.markModified('players');
      game.turnPhase = 'END_TURN';
      await game.save();

      io.to(roomId).emit('tinh-tuy:go-bonus-applied', {
        slot: player.slot, bonusType: 'FREE_UPGRADE', cellIndex,
        houses: { ...player.houses }, hotels: { ...player.hotels },
      });

      await advanceTurnOrDoubles(io, game, player);
      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:go-bonus-choose]', err.message);
      callback({ success: false, error: 'goBonusFailed' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
    }
  });

  // ── Skip Build ────────────────────────────────────────────────
  socket.on('tinh-tuy:skip-build', async (_data: any, callback: TinhTuyCallback) => {
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
      if (game.turnPhase !== 'AWAITING_BUILD') {
        return callback({ success: false, error: 'invalidPhase' });
      }

      clearTurnTimer(roomId);
      game.turnPhase = 'END_TURN';
      await game.save();

      await advanceTurnOrDoubles(io, game, player);
      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:skip-build]', err.message);
      callback({ success: false, error: 'skipFailed' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
    }
  });

  // ── Free House Choose (from Co Hoi card) ─────────────────────
  socket.on('tinh-tuy:free-house-choose', async (data: any, callback: TinhTuyCallback) => {
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
      if (game.turnPhase !== 'AWAITING_FREE_HOUSE') {
        return callback({ success: false, error: 'invalidPhase' });
      }

      const cellIndex = data?.cellIndex;
      if (typeof cellIndex !== 'number') return callback({ success: false, error: 'invalidCell' });

      // Validate: must be own property, buildable (ignoring cost)
      const cell = getCell(cellIndex);
      if (!cell || cell.type !== 'PROPERTY' || !cell.group) {
        return callback({ success: false, error: 'notBuildable' });
      }
      if (!player.properties.includes(cellIndex)) {
        return callback({ success: false, error: 'notOwned' });
      }
      if ((player.houses[String(cellIndex)] || 0) >= 4 || player.hotels[String(cellIndex)]) {
        return callback({ success: false, error: 'maxBuildings' });
      }

      clearTurnTimer(roomId);

      player.houses[String(cellIndex)] = (player.houses[String(cellIndex)] || 0) + 1;
      game.markModified('players');
      game.turnPhase = 'END_TURN';
      await game.save();

      io.to(roomId).emit('tinh-tuy:house-built', {
        slot: player.slot, cellIndex,
        houseCount: player.houses[String(cellIndex)], free: true,
      });

      await advanceTurnOrDoubles(io, game, player);
      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:free-house-choose]', err.message);
      callback({ success: false, error: 'freeHouseFailed' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
    }
  });

  // ── Attack Property (destroy or downgrade opponent's property) ─
  socket.on('tinh-tuy:attack-property-choose', async (data: any, callback: TinhTuyCallback) => {
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

      const { cellIndex } = data || {};
      if (typeof cellIndex !== 'number') {
        return callback({ success: false, error: 'invalidCell' });
      }

      // Validate phase
      const isDestroy = game.turnPhase === 'AWAITING_DESTROY_PROPERTY';
      const isDowngrade = game.turnPhase === 'AWAITING_DOWNGRADE_BUILDING';
      if (!isDestroy && !isDowngrade) {
        return callback({ success: false, error: 'invalidPhase' });
      }

      // Validate target is an opponent's property
      const victim = game.players.find(p => !p.isBankrupt && p.slot !== player.slot && p.properties.includes(cellIndex));
      if (!victim) {
        return callback({ success: false, error: 'invalidTarget' });
      }

      clearTurnTimer(roomId);
      const attackType = isDestroy ? 'DESTROY_PROPERTY' : 'DOWNGRADE_BUILDING';
      applyPropertyAttack(game, attackType, cellIndex, io);
      game.turnPhase = 'END_TURN';
      game.markModified('players');
      await game.save();

      if (game.turnPhase !== 'END_TURN') return; // guard
      await advanceTurnOrDoubles(io, game, player);
      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:attack-property-choose]', err.message);
      callback({ success: false, error: 'attackFailed' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
    }
  });

  // ── Buyback Property (after paying rent) ─────────────────────
  socket.on('tinh-tuy:buyback-property', async (data: any, callback: TinhTuyCallback) => {
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
      if (game.turnPhase !== 'AWAITING_BUYBACK') {
        return callback({ success: false, error: 'invalidPhase' });
      }

      const { accept, cellIndex } = data || {};
      if (typeof cellIndex !== 'number') {
        return callback({ success: false, error: 'invalidCell' });
      }

      clearTurnTimer(roomId);

      if (!accept) {
        // Decline — just advance turn
        game.turnPhase = 'END_TURN';
        await game.save();
        await advanceTurnOrDoubles(io, game, player);
        callback({ success: true });
        return;
      }

      // Accept — transfer property from owner to buyer
      const owner = game.players.find(p => !p.isBankrupt && p.properties.includes(cellIndex));
      if (!owner) {
        game.turnPhase = 'END_TURN';
        await game.save();
        await advanceTurnOrDoubles(io, game, player);
        return callback({ success: false, error: 'propertyNotFound' });
      }

      const completedRounds = Math.max((game.round || 1) - 1, 0);
      const price = calculateBuybackPrice(owner, cellIndex, completedRounds);
      if (player.points < price) {
        game.turnPhase = 'END_TURN';
        await game.save();
        await advanceTurnOrDoubles(io, game, player);
        return callback({ success: false, error: 'cantAfford' });
      }

      // Transfer payment
      player.points -= price;
      owner.points += price;

      // Transfer property + buildings
      const key = String(cellIndex);
      owner.properties = owner.properties.filter(idx => idx !== cellIndex);
      player.properties.push(cellIndex);
      player.houses[key] = owner.houses[key] || 0;
      player.hotels[key] = !!owner.hotels[key];
      delete owner.houses[key];
      delete owner.hotels[key];

      // Transfer festival if on this cell
      if (game.festival && game.festival.cellIndex === cellIndex && game.festival.slot === owner.slot) {
        game.festival.slot = player.slot;
        game.markModified('festival');
      }

      game.turnPhase = 'END_TURN';
      game.markModified('players');
      await game.save();

      io.to(roomId).emit('tinh-tuy:buyback-completed', {
        buyerSlot: player.slot,
        ownerSlot: owner.slot,
        cellIndex,
        price,
        buyerPoints: player.points,
        ownerPoints: owner.points,
        houses: player.houses[key] || 0,
        hotel: !!player.hotels[key],
      });

      await advanceTurnOrDoubles(io, game, player);
      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:buyback-property]', err.message);
      callback({ success: false, error: 'buybackFailed' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
    }
  });

  // ── Sell Buildings (to avoid bankruptcy) ─────────────────────
  socket.on('tinh-tuy:sell-buildings', async (data: any, callback: TinhTuyCallback) => {
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
      if (game.turnPhase !== 'AWAITING_SELL') {
        return callback({ success: false, error: 'invalidPhase' });
      }

      const selections: Array<{ cellIndex: number; type: 'house' | 'hotel' | 'property'; count: number }> = data?.selections;
      if (!Array.isArray(selections) || selections.length === 0) {
        return callback({ success: false, error: 'noSelections' });
      }

      // Validate and calculate total
      const completedRounds = Math.max((game.round || 1) - 1, 0);
      let totalSellValue = 0;
      for (const sel of selections) {
        const { cellIndex, type, count } = sel;
        if (!player.properties.includes(cellIndex)) {
          return callback({ success: false, error: 'notOwned' });
        }
        const key = String(cellIndex);
        if (type === 'property') {
          // Selling whole property (land + any buildings on it)
          totalSellValue += getPropertyTotalSellValue(player, cellIndex, completedRounds);
        } else if (type === 'hotel') {
          if (!player.hotels[key]) return callback({ success: false, error: 'noHotel' });
          totalSellValue += getSellPrice(cellIndex, 'hotel');
        } else {
          const available = player.houses[key] || 0;
          if (count > available || count <= 0) return callback({ success: false, error: 'notEnoughHouses' });
          totalSellValue += count * getSellPrice(cellIndex, 'house');
        }
      }

      // Must cover deficit
      const deficit = Math.abs(player.points);
      if (totalSellValue < deficit) {
        return callback({ success: false, error: 'insufficientSell' });
      }

      // Apply sells — process property sells last to avoid index issues
      const propertySells = selections.filter(s => s.type === 'property');
      const buildingSells = selections.filter(s => s.type !== 'property');
      for (const sel of buildingSells) {
        const key = String(sel.cellIndex);
        if (sel.type === 'hotel') {
          player.hotels[key] = false;
        } else {
          player.houses[key] = (player.houses[key] || 0) - sel.count;
        }
      }
      for (const sel of propertySells) {
        const key = String(sel.cellIndex);
        delete player.houses[key];
        delete player.hotels[key];
        player.properties = player.properties.filter(idx => idx !== sel.cellIndex);
      }
      player.points += totalSellValue;

      clearTurnTimer(roomId);
      game.turnPhase = 'END_TURN';
      game.markModified('players');
      await game.save();

      io.to(roomId).emit('tinh-tuy:buildings-sold', {
        slot: player.slot, newPoints: player.points,
        houses: { ...player.houses }, hotels: { ...player.hotels },
        properties: [...player.properties],
      });

      await advanceTurnOrDoubles(io, game, player);
      callback({ success: true });
    } catch (err: any) {
      console.error('[tinh-tuy:sell-buildings]', err.message);
      callback({ success: false, error: 'sellFailed' });
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
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
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
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
      // Clear game-level festival if this player owned it
  if (game.festival && game.festival.slot === player.slot) {
    game.festival = null;
    game.markModified('festival');
  }
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
      const roomId = socket.data.tinhTuyRoomId as string;
      if (roomId) safetyRestartTimer(io, roomId);
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

  // ── GO Bonus: landing exactly on cell 0 triggers random bonus ──
  if (cellIndex === 0) {
    await handleGoBonus(io, game, player);
    return;
  }

  switch (cellAction.action) {
    case 'rent': {
      if (!cellAction.amount || !cellAction.ownerSlot) break;
      // Check immunity
      if (player.immunityNextRent) {
        player.immunityNextRent = false;
        // Immune — skip rent, but still offer buyback
        const buybackStarted = await emitBuybackPrompt(io, game, player, cellIndex, cellAction.ownerSlot);
        if (buybackStarted) return;
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

      // Offer buyback after paying rent (if still solvent)
      const buybackStarted = await emitBuybackPrompt(io, game, player, cellIndex, cellAction.ownerSlot);
      if (buybackStarted) return;
      break;
    }
    case 'tax': {
      // Per-building tax — 0 if no buildings
      const taxAmount = cellAction.amount || 0;
      if (taxAmount > 0) player.points -= taxAmount;
      io.to(roomId).emit('tinh-tuy:tax-paid', {
        slot: player.slot, amount: taxAmount, cellIndex,
        houseCount: cellAction.houseCount || 0,
        hotelCount: cellAction.hotelCount || 0,
        perHouse: cellAction.perHouse || 500,
        perHotel: cellAction.perHotel || 1000,
      });
      if (taxAmount > 0) {
        const gameEnded = await checkBankruptcy(io, game, player);
        if (gameEnded) return;
      }
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
      // If player has no properties, skip festival (no effect)
      if (player.properties.length === 0) {
        break; // falls to advanceTurn
      }
      game.turnPhase = 'AWAITING_FESTIVAL';
      await game.save();
      io.to(roomId).emit('tinh-tuy:festival-prompt', { slot: player.slot });
      startTurnTimer(roomId, game.settings.turnDuration * 1000, async () => {
        try {
          const g = await TinhTuyGame.findOne({ roomId });
          if (!g || g.turnPhase !== 'AWAITING_FESTIVAL') return;
          const p = g.players.find(pp => pp.slot === player.slot)!;
          const autoCell = p.properties[0];
          // Auto-pick: stack if same cell, otherwise new at 1.5x
          let autoMult = 1.5;
          if (g.festival && g.festival.slot === p.slot && g.festival.cellIndex === autoCell) {
            autoMult = g.festival.multiplier + 0.5;
          }
          g.festival = { slot: p.slot, cellIndex: autoCell, multiplier: autoMult };
          g.markModified('festival');
          g.turnPhase = 'END_TURN';
          await g.save();
          io.to(roomId).emit('tinh-tuy:festival-applied', { slot: p.slot, cellIndex: autoCell, multiplier: autoMult });
          await advanceTurnOrDoubles(io, g, p);
        } catch (err) { console.error('[tinh-tuy] Festival timeout:', err); }
      });
      return;
    }
    case 'card': {
      const cell = getCell(cellIndex);
      if (cell && (cell.type === 'KHI_VAN' || cell.type === 'CO_HOI')) {
        await handleCardDraw(io, game, player, cell.type);
        // handleCardDraw may set a waiting phase (AWAITING_ACTION, AWAITING_FREE_HOUSE, etc.)
        // Only advance turn if it completed with END_TURN
        if (game.turnPhase !== 'END_TURN') return;
        await advanceTurnOrDoubles(io, game, player);
        return;
      }
      break;
    }
    case 'travel': {
      // Deferred travel: end turn now, next turn starts as AWAITING_TRAVEL
      player.pendingTravel = true;
      player.consecutiveDoubles = 0; // break doubles chain
      game.lastDiceResult = null; // prevent doubles extra turn
      game.markModified('lastDiceResult');
      game.turnPhase = 'END_TURN';
      game.markModified('players');
      await game.save();
      io.to(roomId).emit('tinh-tuy:travel-pending', { slot: player.slot });
      await advanceTurn(io, game); // force advance, no doubles
      return;
    }
    case 'build': {
      game.turnPhase = 'AWAITING_BUILD';
      await game.save();
      io.to(roomId).emit('tinh-tuy:build-prompt', {
        slot: player.slot, cellIndex,
        canBuildHouse: cellAction.canBuildHouse,
        houseCost: cellAction.houseCost,
        canBuildHotel: cellAction.canBuildHotel,
        hotelCost: cellAction.hotelCost,
        currentHouses: cellAction.currentHouses,
        hasHotel: cellAction.hasHotel,
      });
      startTurnTimer(roomId, game.settings.turnDuration * 1000, async () => {
        try {
          const g = await TinhTuyGame.findOne({ roomId });
          if (!g || g.turnPhase !== 'AWAITING_BUILD') return;
          g.turnPhase = 'END_TURN';
          await g.save();
          const p = g.players.find(pp => pp.slot === player.slot)!;
          await advanceTurnOrDoubles(io, g, p);
        } catch (err) { console.error('[tinh-tuy] Build timeout:', err); }
      });
      return;
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
