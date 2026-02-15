/**
 * Tinh Tuy Dai Chien — Card Definitions & Deck Management
 * 16 Khi Van (Luck) + 16 Co Hoi (Opportunity) cards.
 * Fisher-Yates shuffle with crypto.randomInt.
 */
import crypto from 'crypto';
import { ITinhTuyCard, CardEffectResult, ITinhTuyGame, ITinhTuyPlayer } from '../types/tinh-tuy.types';
import { BOARD_CELLS, BOARD_SIZE, GO_SALARY } from './tinh-tuy-board';

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

/** Draw next card from deck. Returns cardId, newIndex, and whether deck needs reshuffle. */
export function drawCard(
  deck: string[], currentIndex: number
): { cardId: string; newIndex: number; reshuffle: boolean } {
  const cardId = deck[currentIndex];
  const newIndex = (currentIndex + 1) % deck.length;
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
      const goBonus = (passGo || action.position === 0) ? GO_SALARY : 0;
      result.playerMoved = { slot: playerSlot, to: action.position, passedGo: passGo || action.position === 0 };
      if (goBonus) result.pointsChanged[playerSlot] = (result.pointsChanged[playerSlot] || 0) + goBonus;
      break;
    }

    case 'MOVE_RELATIVE': {
      const newPos = ((player.position + action.steps) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
      const passedGo = action.steps > 0 && newPos < player.position;
      result.playerMoved = { slot: playerSlot, to: newPos, passedGo };
      if (passedGo) result.pointsChanged[playerSlot] = (result.pointsChanged[playerSlot] || 0) + GO_SALARY;
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
      break;
    }

    case 'LOSE_ONE_HOUSE': {
      const withHouses = player.properties.filter(idx => (player.houses[String(idx)] || 0) > 0);
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
  }

  return result;
}
