/**
 * Tinh Tuy Dai Chien — Card Definitions & Deck Management
 * 16 Khi Van (Luck) + 16 Co Hoi (Opportunity) cards.
 * Fisher-Yates shuffle with crypto.randomInt.
 */
import crypto from 'crypto';
import { ITinhTuyCard, CardEffectResult, ITinhTuyGame, ITinhTuyPlayer } from '../types/tinh-tuy.types';
import { BOARD_CELLS, BOARD_SIZE, PROPERTY_GROUPS, ownsFullGroup } from './tinh-tuy-board';
import { getEffectiveGoSalary } from './tinh-tuy-engine';

// ─── 16 Khi Van Cards ────────────────────────────────────────

export const KHI_VAN_CARDS: ITinhTuyCard[] = [
  { id: 'kv-01', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv01.name', descriptionKey: 'tinhTuy.cards.kv01.desc',
    action: { type: 'MOVE_TO', position: 0 } },
  { id: 'kv-02', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv02.name', descriptionKey: 'tinhTuy.cards.kv02.desc',
    action: { type: 'HOLD_CARD', cardId: 'escape-island' }, holdable: true },
  { id: 'kv-03', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv03.name', descriptionKey: 'tinhTuy.cards.kv03.desc',
    action: { type: 'GAIN_POINTS', amount: 3000 } },
  { id: 'kv-04', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv04.name', descriptionKey: 'tinhTuy.cards.kv04.desc',
    action: { type: 'LOSE_POINTS', amount: 1500 } },
  { id: 'kv-05', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv05.name', descriptionKey: 'tinhTuy.cards.kv05.desc',
    action: { type: 'PER_HOUSE_COST', amount: 500 } },
  { id: 'kv-06', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv06.name', descriptionKey: 'tinhTuy.cards.kv06.desc',
    action: { type: 'MOVE_RELATIVE', steps: -3 } },
  { id: 'kv-07', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv07.name', descriptionKey: 'tinhTuy.cards.kv07.desc',
    action: { type: 'MOVE_TO', position: 13 } },
  { id: 'kv-08', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv08.name', descriptionKey: 'tinhTuy.cards.kv08.desc',
    action: { type: 'GAIN_FROM_EACH', amount: 500 } },
  { id: 'kv-09', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv09.name', descriptionKey: 'tinhTuy.cards.kv09.desc',
    action: { type: 'GO_TO_ISLAND' } },
  { id: 'kv-10', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv10.name', descriptionKey: 'tinhTuy.cards.kv10.desc',
    action: { type: 'IMMUNITY_NEXT_RENT' } },
  { id: 'kv-11', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv11.name', descriptionKey: 'tinhTuy.cards.kv11.desc',
    action: { type: 'GAIN_POINTS', amount: 2000 } },
  { id: 'kv-12', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv12.name', descriptionKey: 'tinhTuy.cards.kv12.desc',
    action: { type: 'SKIP_TURN' } },
  { id: 'kv-13', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv13.name', descriptionKey: 'tinhTuy.cards.kv13.desc',
    action: { type: 'MOVE_TO', position: 9 } },
  { id: 'kv-14', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv14.name', descriptionKey: 'tinhTuy.cards.kv14.desc',
    action: { type: 'LOSE_POINTS', amount: 1000 } },
  { id: 'kv-15', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv15.name', descriptionKey: 'tinhTuy.cards.kv15.desc',
    action: { type: 'GAIN_FROM_EACH', amount: 1000 } },
  { id: 'kv-16', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv16.name', descriptionKey: 'tinhTuy.cards.kv16.desc',
    action: { type: 'GAIN_POINTS', amount: 1500 } },
  { id: 'kv-17', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv17.name', descriptionKey: 'tinhTuy.cards.kv17.desc',
    action: { type: 'DESTROY_PROPERTY' } },
  { id: 'kv-18', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv18.name', descriptionKey: 'tinhTuy.cards.kv18.desc',
    action: { type: 'GAIN_FROM_EACH', amount: 1500 } },
  { id: 'kv-19', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv19.name', descriptionKey: 'tinhTuy.cards.kv19.desc',
    action: { type: 'SWAP_POSITION' } },
  { id: 'kv-20', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv20.name', descriptionKey: 'tinhTuy.cards.kv20.desc',
    action: { type: 'MOVE_RANDOM', min: 1, max: 12 } },
  { id: 'kv-21', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv21.name', descriptionKey: 'tinhTuy.cards.kv21.desc',
    action: { type: 'ALL_LOSE_ONE_HOUSE' } },
  { id: 'kv-22', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv22.name', descriptionKey: 'tinhTuy.cards.kv22.desc',
    action: { type: 'MOVE_TO_FESTIVAL' } },
  { id: 'kv-23', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv23.name', descriptionKey: 'tinhTuy.cards.kv23.desc',
    action: { type: 'CHOOSE_DESTINATION' } },
  { id: 'kv-24', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv24.name', descriptionKey: 'tinhTuy.cards.kv24.desc',
    action: { type: 'TELEPORT_ALL' } },
  { id: 'kv-27', type: 'KHI_VAN', nameKey: 'tinhTuy.cards.kv27.name', descriptionKey: 'tinhTuy.cards.kv27.desc',
    action: { type: 'UNDERDOG_BOOST', boostAmount: 4000, penaltyAmount: 2000 }, minRound: 30 },
];

// ─── 16 Co Hoi Cards ────────────────────────────────────────

export const CO_HOI_CARDS: ITinhTuyCard[] = [
  { id: 'ch-01', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch01.name', descriptionKey: 'tinhTuy.cards.ch01.desc',
    action: { type: 'DOUBLE_RENT_NEXT', turns: 1 } },
  { id: 'ch-02', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch02.name', descriptionKey: 'tinhTuy.cards.ch02.desc',
    action: { type: 'GAIN_POINTS', amount: 4000 } },
  { id: 'ch-03', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch03.name', descriptionKey: 'tinhTuy.cards.ch03.desc',
    action: { type: 'LOSE_POINTS', amount: 2000 } },
  { id: 'ch-04', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch04.name', descriptionKey: 'tinhTuy.cards.ch04.desc',
    action: { type: 'MOVE_TO', position: 35 } },
  { id: 'ch-05', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch05.name', descriptionKey: 'tinhTuy.cards.ch05.desc',
    action: { type: 'FREE_HOUSE' } },
  { id: 'ch-06', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch06.name', descriptionKey: 'tinhTuy.cards.ch06.desc',
    action: { type: 'MOVE_RELATIVE', steps: 4 } },
  { id: 'ch-07', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch07.name', descriptionKey: 'tinhTuy.cards.ch07.desc',
    action: { type: 'ALL_LOSE_POINTS', amount: 1000 } },
  { id: 'ch-08', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch08.name', descriptionKey: 'tinhTuy.cards.ch08.desc',
    action: { type: 'GAIN_POINTS', amount: 5000 } },
  { id: 'ch-09', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch09.name', descriptionKey: 'tinhTuy.cards.ch09.desc',
    action: { type: 'DOUBLE_RENT_NEXT', turns: 1 } },
  { id: 'ch-10', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch10.name', descriptionKey: 'tinhTuy.cards.ch10.desc',
    action: { type: 'LOSE_ONE_HOUSE' } },
  { id: 'ch-11', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch11.name', descriptionKey: 'tinhTuy.cards.ch11.desc',
    action: { type: 'MOVE_RELATIVE', steps: -5 } },
  { id: 'ch-12', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch12.name', descriptionKey: 'tinhTuy.cards.ch12.desc',
    action: { type: 'LOSE_POINTS', amount: 1000 } },
  { id: 'ch-13', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch13.name', descriptionKey: 'tinhTuy.cards.ch13.desc',
    action: { type: 'RANDOM_POINTS', min: 0, max: 3000 } },
  { id: 'ch-14', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch14.name', descriptionKey: 'tinhTuy.cards.ch14.desc',
    action: { type: 'GAIN_FROM_EACH', amount: 500 } },
  { id: 'ch-15', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch15.name', descriptionKey: 'tinhTuy.cards.ch15.desc',
    action: { type: 'IMMUNITY_NEXT_RENT' } },
  { id: 'ch-16', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch16.name', descriptionKey: 'tinhTuy.cards.ch16.desc',
    action: { type: 'LOSE_TO_EACH', amount: 500 } },
  { id: 'ch-17', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch17.name', descriptionKey: 'tinhTuy.cards.ch17.desc',
    action: { type: 'DOWNGRADE_BUILDING' } },
  { id: 'ch-18', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch18.name', descriptionKey: 'tinhTuy.cards.ch18.desc',
    action: { type: 'STEAL_PROPERTY' } },
  { id: 'ch-19', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch19.name', descriptionKey: 'tinhTuy.cards.ch19.desc',
    action: { type: 'TAX_RICHEST', amount: 3000 } },
  { id: 'ch-20', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch20.name', descriptionKey: 'tinhTuy.cards.ch20.desc',
    action: { type: 'GAMBLE', win: 6000, lose: 3000 } },
  { id: 'ch-21', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch21.name', descriptionKey: 'tinhTuy.cards.ch21.desc',
    action: { type: 'HOLD_CARD', cardId: 'shield' }, holdable: true },
  { id: 'ch-22', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch22.name', descriptionKey: 'tinhTuy.cards.ch22.desc',
    action: { type: 'EXTRA_TURN' } },
  { id: 'ch-23', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch23.name', descriptionKey: 'tinhTuy.cards.ch23.desc',
    action: { type: 'FORCED_TRADE' } },
  { id: 'ch-25', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch25.name', descriptionKey: 'tinhTuy.cards.ch25.desc',
    action: { type: 'RENT_FREEZE' } },
  { id: 'ch-27', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch27.name', descriptionKey: 'tinhTuy.cards.ch27.desc',
    action: { type: 'WEALTH_TRANSFER', amount: 3000 }, minRound: 40 },
  { id: 'ch-28', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch28.name', descriptionKey: 'tinhTuy.cards.ch28.desc',
    action: { type: 'FREE_HOTEL' } },
  { id: 'ch-29', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch29.name', descriptionKey: 'tinhTuy.cards.ch29.desc',
    action: { type: 'BUY_BLOCKED', turns: 2 } },
  { id: 'ch-30', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch30.name', descriptionKey: 'tinhTuy.cards.ch30.desc',
    action: { type: 'EMINENT_DOMAIN' } },
  { id: 'ch-31', type: 'CO_HOI', nameKey: 'tinhTuy.cards.ch31.name', descriptionKey: 'tinhTuy.cards.ch31.desc',
    action: { type: 'GAIN_PER_GROUP', amount: 1500 } },
];

// ─── Deck Management ─────────────────────────────────────────

/** Fisher-Yates shuffle with crypto.randomInt */
export function shuffleDeck(cardIds: string[]): string[] {
  const shuffled = [...cardIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Draw next card from deck. Returns cardId, newIndex, and whether deck needs reshuffle.
 *  If deck is empty or index out of range, re-initializes from full deck IDs. */
export function drawCard(
  deck: string[], currentIndex: number, isKhiVan?: boolean
): { cardId: string; newIndex: number; reshuffle: boolean } {
  // Safety: if deck is empty, rebuild from source
  if (!deck || deck.length === 0) {
    console.warn('[tinh-tuy:drawCard] Empty deck detected — rebuilding');
    const rebuilt = isKhiVan ? getKhiVanDeckIds() : getCoHoiDeckIds();
    const shuffled = shuffleDeck(rebuilt);
    return { cardId: shuffled[0], newIndex: 1, reshuffle: false };
  }
  // Safety: protect against NaN/undefined index — reset to 0
  const idx = (typeof currentIndex === 'number' && !isNaN(currentIndex)) ? currentIndex : 0;
  const safeIndex = ((idx % deck.length) + deck.length) % deck.length; // handle negative too
  const cardId = deck[safeIndex];
  // Extra safety: if cardId is somehow undefined (shouldn't happen), use deck[0]
  if (!cardId) {
    console.warn(`[tinh-tuy:drawCard] undefined cardId at index ${safeIndex}, deckLen=${deck.length} — using deck[0]`);
    return { cardId: deck[0], newIndex: 1, reshuffle: false };
  }
  const newIndex = (safeIndex + 1) % deck.length;
  return { cardId, newIndex, reshuffle: newIndex === 0 };
}

/** Find card definition by ID */
export function getCardById(id: string): ITinhTuyCard | undefined {
  return [...KHI_VAN_CARDS, ...CO_HOI_CARDS].find(c => c.id === id);
}

/** Get all card IDs for initial deck */
export function getKhiVanDeckIds(): string[] {
  return KHI_VAN_CARDS.map(c => c.id);
}

export function getCoHoiDeckIds(): string[] {
  return CO_HOI_CARDS.map(c => c.id);
}

// ─── Card Effect Execution ───────────────────────────────────

/** Execute card effect — pure logic, returns result for socket handler to apply */
export function executeCardEffect(
  game: ITinhTuyGame,
  playerSlot: number,
  card: ITinhTuyCard
): CardEffectResult {
  const result: CardEffectResult = { pointsChanged: {} };
  const player = game.players.find(p => p.slot === playerSlot);
  if (!player) return result;

  const action = card.action;

  switch (action.type) {
    case 'GAIN_POINTS':
      result.pointsChanged[playerSlot] = action.amount;
      break;

    case 'LOSE_POINTS':
      result.pointsChanged[playerSlot] = -action.amount;
      break;

    case 'GAIN_FROM_EACH': {
      const active = game.players.filter(p => !p.isBankrupt && p.slot !== playerSlot);
      for (const p of active) {
        result.pointsChanged[p.slot] = -action.amount;
      }
      result.pointsChanged[playerSlot] = action.amount * active.length;
      break;
    }

    case 'LOSE_TO_EACH': {
      const active = game.players.filter(p => !p.isBankrupt && p.slot !== playerSlot);
      for (const p of active) {
        result.pointsChanged[p.slot] = action.amount;
      }
      result.pointsChanged[playerSlot] = -(action.amount * active.length);
      break;
    }

    case 'MOVE_TO': {
      const passGo = action.position !== 0 && action.position < player.position;
      const goBonus = (passGo || action.position === 0) ? getEffectiveGoSalary(game.round || 0) : 0;
      result.playerMoved = { slot: playerSlot, to: action.position, passedGo: passGo || action.position === 0 };
      if (goBonus) result.pointsChanged[playerSlot] = (result.pointsChanged[playerSlot] || 0) + goBonus;
      break;
    }

    case 'MOVE_RELATIVE': {
      const newPos = ((player.position + action.steps) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
      const passedGo = action.steps > 0 && newPos < player.position;
      result.playerMoved = { slot: playerSlot, to: newPos, passedGo };
      if (passedGo) result.pointsChanged[playerSlot] = (result.pointsChanged[playerSlot] || 0) + getEffectiveGoSalary(game.round || 0);
      break;
    }

    case 'GO_TO_ISLAND':
      result.goToIsland = true;
      result.playerMoved = { slot: playerSlot, to: 27, passedGo: false };
      break;

    case 'HOLD_CARD':
      result.cardHeld = { slot: playerSlot, cardId: action.cardId };
      break;

    case 'SKIP_TURN':
      result.skipTurn = true;
      break;

    case 'PER_HOUSE_COST': {
      let totalBuildings = 0;
      for (const cellIdx of player.properties) {
        totalBuildings += player.houses[String(cellIdx)] || 0;
        if (player.hotels[String(cellIdx)]) totalBuildings += 1;
      }
      result.pointsChanged[playerSlot] = -(action.amount * totalBuildings);
      break;
    }

    case 'ALL_LOSE_POINTS':
      for (const p of game.players.filter(pp => !pp.isBankrupt)) {
        result.pointsChanged[p.slot] = -action.amount;
      }
      break;

    case 'RANDOM_POINTS': {
      const amount = crypto.randomInt(action.min, action.max + 1);
      result.pointsChanged[playerSlot] = amount;
      result.randomPoints = amount;
      break;
    }

    case 'LOSE_ONE_HOUSE': {
      // Only target properties with houses but no hotel — hotels are immune
      const withHouses = player.properties.filter(idx =>
        (player.houses[String(idx)] || 0) > 0 && !player.hotels[String(idx)]
      );
      if (withHouses.length > 0) {
        const target = withHouses[crypto.randomInt(0, withHouses.length)];
        result.houseRemoved = { slot: playerSlot, cellIndex: target };
      }
      break;
    }

    case 'FREE_HOUSE':
      result.requiresChoice = 'FREE_HOUSE';
      break;

    case 'DOUBLE_RENT_NEXT':
      result.doubleRentTurns = action.turns;
      break;

    case 'IMMUNITY_NEXT_RENT':
      result.immunityNextRent = true;
      break;

    case 'DESTROY_PROPERTY': {
      // Collect all opponents' properties — hotels are immune
      const opponentProps = game.players
        .filter(p => !p.isBankrupt && p.slot !== playerSlot)
        .flatMap(p => p.properties.filter(idx => !p.hotels[String(idx)]));
      if (opponentProps.length > 0) {
        result.requiresChoice = 'DESTROY_PROPERTY';
        result.targetableCells = opponentProps;
      }
      break;
    }

    case 'DOWNGRADE_BUILDING': {
      // Collect all opponents' properties — hotels are immune
      const opponentProps2 = game.players
        .filter(p => !p.isBankrupt && p.slot !== playerSlot)
        .flatMap(p => p.properties.filter(idx => !p.hotels[String(idx)]));
      if (opponentProps2.length > 0) {
        result.requiresChoice = 'DOWNGRADE_BUILDING';
        result.targetableCells = opponentProps2;
      }
      break;
    }

    case 'SWAP_POSITION': {
      // Pick random non-bankrupt opponent to swap positions with
      const swapCandidates = game.players.filter(p => !p.isBankrupt && p.slot !== playerSlot);
      if (swapCandidates.length > 0) {
        const target = swapCandidates[crypto.randomInt(0, swapCandidates.length)];
        result.swapPosition = {
          slot: playerSlot,
          targetSlot: target.slot,
          myNewPos: target.position,
          targetNewPos: player.position,
        };
        // Also set playerMoved so the card-drawer's new cell is resolved
        // (rent, tax, buy, etc.) — the other player is NOT affected
        result.playerMoved = {
          slot: playerSlot,
          to: target.position,
          passedGo: false, // swap doesn't pass GO
        };
      }
      break;
    }

    case 'STEAL_PROPERTY': {
      // Pick random non-hotel property from random opponent — hotels are immune
      const victims = game.players
        .filter(p => !p.isBankrupt && p.slot !== playerSlot)
        .map(p => ({ ...p, stealable: p.properties.filter(idx => !p.hotels[String(idx)]) }))
        .filter(p => p.stealable.length > 0);
      if (victims.length > 0) {
        const victim = victims[crypto.randomInt(0, victims.length)];
        const cellIdx = victim.stealable[crypto.randomInt(0, victim.stealable.length)];
        const stolenHouses = victim.houses[String(cellIdx)] || 0;
        result.stolenProperty = { fromSlot: victim.slot, toSlot: playerSlot, cellIndex: cellIdx, houses: stolenHouses };
      }
      break;
    }

    case 'TAX_RICHEST': {
      // Find richest non-bankrupt opponent
      const opponents = game.players.filter(p => !p.isBankrupt && p.slot !== playerSlot);
      if (opponents.length > 0) {
        const richest = opponents.reduce((a, b) => a.points > b.points ? a : b);
        result.pointsChanged[richest.slot] = -action.amount;
        result.pointsChanged[playerSlot] = action.amount;
        result.taxedSlot = richest.slot;
      }
      break;
    }

    case 'MOVE_RANDOM': {
      const steps = crypto.randomInt(action.min, action.max + 1);
      const newPos = ((player.position + steps) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
      const passedGo = newPos < player.position;
      result.playerMoved = { slot: playerSlot, to: newPos, passedGo };
      if (passedGo) result.pointsChanged[playerSlot] = (result.pointsChanged[playerSlot] || 0) + getEffectiveGoSalary(game.round || 0);
      result.randomSteps = steps;
      break;
    }

    case 'GAMBLE': {
      // 50/50 chance: win big or lose
      const won = crypto.randomInt(0, 2) === 1;
      result.pointsChanged[playerSlot] = won ? action.win : -action.lose;
      result.gambleWon = won;
      break;
    }

    case 'ALL_LOSE_ONE_HOUSE': {
      // Each non-bankrupt player loses 1 random house — hotels are immune
      const removed: Array<{ slot: number; cellIndex: number }> = [];
      for (const p of game.players.filter(pp => !pp.isBankrupt)) {
        const withHouses = p.properties.filter(idx =>
          (p.houses[String(idx)] || 0) > 0 && !p.hotels[String(idx)]
        );
        if (withHouses.length > 0) {
          const target = withHouses[crypto.randomInt(0, withHouses.length)];
          removed.push({ slot: p.slot, cellIndex: target });
        }
      }
      result.allHousesRemoved = removed;
      break;
    }

    case 'CHOOSE_DESTINATION':
      result.requiresChoice = 'CHOOSE_DESTINATION';
      break;

    case 'TELEPORT_ALL': {
      // Teleport all non-bankrupt, non-island players to random positions (0-35)
      // Players on island stay put (immune to teleport)
      const teleports: Array<{ slot: number; to: number }> = [];
      for (const p of game.players.filter(pp => !pp.isBankrupt && pp.islandTurns === 0)) {
        const newPos = crypto.randomInt(0, BOARD_SIZE);
        teleports.push({ slot: p.slot, to: newPos });
        // Set playerMoved for the card drawer so their landing cell is resolved
        if (p.slot === playerSlot) {
          result.playerMoved = { slot: playerSlot, to: newPos, passedGo: false };
        }
      }
      result.teleportAll = teleports;
      break;
    }

    case 'UNDERDOG_BOOST': {
      // Poorest gets boost, everyone else loses penalty. Tie = not poorest.
      const active = game.players.filter(p => !p.isBankrupt);
      const minPoints = Math.min(...active.map(p => p.points));
      const poorest = active.filter(p => p.points === minPoints);
      // Only count as poorest if strictly the lowest (tie = not poorest)
      const isPoorest = poorest.length === 1 && poorest[0].slot === playerSlot;
      if (isPoorest) {
        result.pointsChanged[playerSlot] = action.boostAmount;
      } else {
        result.pointsChanged[playerSlot] = -action.penaltyAmount;
      }
      result.underdogBoosted = isPoorest;
      break;
    }

    case 'EXTRA_TURN':
      result.extraTurn = true;
      break;

    case 'WEALTH_TRANSFER': {
      // Richest → poorest transfer. Ties broken by random.
      const activePlayers = game.players.filter(p => !p.isBankrupt);
      if (activePlayers.length < 2) break;
      const maxPts = Math.max(...activePlayers.map(p => p.points));
      const minPts = Math.min(...activePlayers.map(p => p.points));
      // If everyone has same points, no transfer
      if (maxPts === minPts) break;
      const richCandidates = activePlayers.filter(p => p.points === maxPts);
      const poorCandidates = activePlayers.filter(p => p.points === minPts);
      const richest = richCandidates[crypto.randomInt(0, richCandidates.length)];
      const poorest2 = poorCandidates[crypto.randomInt(0, poorCandidates.length)];
      // Cap transfer so richest can't go negative (non-current player has no sell phase → instant bankruptcy)
      const transferAmount = Math.min(action.amount, richest.points);
      if (transferAmount <= 0) break;
      result.pointsChanged[richest.slot] = (result.pointsChanged[richest.slot] || 0) - transferAmount;
      result.pointsChanged[poorest2.slot] = (result.pointsChanged[poorest2.slot] || 0) + transferAmount;
      result.wealthTransfer = { richestSlot: richest.slot, poorestSlot: poorest2.slot, amount: transferAmount };
      break;
    }

    case 'FORCED_TRADE':
      // Check if player has at least 1 property AND opponents have at least 1 non-hotel property
      if (player.properties.length === 0) break; // No own properties to trade
      {
        const opponentNonHotel = game.players
          .filter(p => !p.isBankrupt && p.slot !== playerSlot)
          .flatMap(p => p.properties.filter(ci => !p.hotels?.[String(ci)]));
        if (opponentNonHotel.length === 0) break; // No valid opponent targets
      }
      result.requiresChoice = 'FORCED_TRADE';
      break;

    case 'RENT_FREEZE': {
      // Player picks an opponent's property to freeze rent for 2 turns
      const freezeTargets = game.players
        .filter(p => !p.isBankrupt && p.slot !== playerSlot)
        .flatMap(p => p.properties);
      if (freezeTargets.length === 0) break;
      result.requiresChoice = 'RENT_FREEZE';
      result.targetableCells = freezeTargets;
      break;
    }

    case 'FREE_HOTEL':
      result.requiresChoice = 'FREE_HOTEL';
      break;

    case 'BUY_BLOCKED': {
      // Player chooses an opponent to block from buying for N rounds
      const blockTargets = game.players.filter(p => !p.isBankrupt && p.slot !== playerSlot);
      if (blockTargets.length > 0) {
        result.requiresChoice = 'BUY_BLOCK_TARGET';
        result.buyBlockedTurns = action.turns;
      }
      break;
    }

    case 'EMINENT_DOMAIN': {
      // Force-buy opponent's non-hotel property at original price (must be affordable)
      const affordableProps = game.players
        .filter(p => !p.isBankrupt && p.slot !== playerSlot)
        .flatMap(p => p.properties.filter(idx => {
          if (p.hotels[String(idx)]) return false; // hotels immune
          const c = BOARD_CELLS[idx];
          return c && (c.price || 0) <= player.points; // must afford
        }));
      if (affordableProps.length > 0) {
        result.requiresChoice = 'EMINENT_DOMAIN';
        result.targetableCells = affordableProps;
      }
      break;
    }

    case 'GAIN_PER_GROUP': {
      // Gain points for each completed color group the player owns
      const allGroups = Object.keys(PROPERTY_GROUPS) as Array<keyof typeof PROPERTY_GROUPS>;
      const completed = allGroups.filter(g => ownsFullGroup(g, player.properties));
      const bonus = completed.length * action.amount;
      if (bonus > 0) result.pointsChanged[playerSlot] = bonus;
      result.completedGroups = completed.length;
      break;
    }

    case 'MOVE_TO_FESTIVAL': {
      // Move to the cell hosting the active festival; if no festival, stay in place
      if (game.festival && typeof game.festival.cellIndex === 'number') {
        const dest = game.festival.cellIndex;
        const passedGo = dest < player.position && dest !== player.position;
        result.playerMoved = { slot: playerSlot, to: dest, passedGo };
        if (passedGo) result.pointsChanged[playerSlot] = (result.pointsChanged[playerSlot] || 0) + getEffectiveGoSalary(game.round || 0);
        result.movedToFestival = true;
      }
      // No festival → no movement, card has no effect
      break;
    }
  }

  return result;
}
