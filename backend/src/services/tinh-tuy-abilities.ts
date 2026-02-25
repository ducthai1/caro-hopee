/**
 * Tinh Tuy Dai Chien — Character Ability System
 * 13 characters × (1 passive + 1 active) = balanced gameplay depth.
 * Pure logic + definitions. No DB access, no socket emits.
 */
import { ITinhTuyGame, ITinhTuyPlayer, TinhTuyCharacter } from '../types/tinh-tuy.types';
import { getCell, ownsFullGroup, PROPERTY_GROUPS, BOARD_SIZE, checkMonopolyCompleted } from './tinh-tuy-board';
import { calculateNewPosition, rollDice, canBuildHouse, buildHouse } from './tinh-tuy-engine';

// ─── Ability Definitions ─────────────────────────────────────

export interface PassiveAbility {
  id: string;
  nameKey: string;       // i18n key
  descriptionKey: string;
  hook: PassiveHook;
}

export type PassiveHook =
  | 'GO_SALARY_BONUS'        // Shiba: +500 on GO
  | 'RENT_COLLECT_BONUS'     // Kungfu: +15% rent collected
  | 'RENT_PAY_REDUCTION'     // Fox: -15% rent paid
  | 'BUILD_COST_REDUCTION'   // Elephant: -15% build cost
  | 'MONEY_LOSS_REDUCTION'   // Suu Nhi: -10% all money losses
  | 'MOVE_ADJUST'            // Horse: ±1 after dice
  | 'RENT_FLAT_BONUS'        // Ca Sau: +300 flat on buildings
  | 'CARD_MONEY_MODIFIER'    // Seahorse: +25%/-25% card money
  | 'ISLAND_TURN_REDUCTION'  // Pigfish: max 1 island turn
  | 'TURN_START_DRAIN'       // Chicken: drain 200/opponent
  | 'DOUBLE_BONUS_STEPS'     // Rabbit: +3 on doubles
  | 'AUTO_BUILD_ON_MONOPOLY' // Sloth: auto-build on group complete
  | 'CARD_DRAW_PICK_TWO'     // Owl: draw 2, pick 1
  ;

export interface ActiveAbility {
  id: string;
  nameKey: string;
  descriptionKey: string;
  cooldown: number;       // turns between uses
  targetType: ActiveTargetType;
  phase: 'ROLL_DICE' | 'POST_ROLL'; // when usable
}

export type ActiveTargetType =
  | 'NONE'              // no target needed
  | 'OPPONENT'          // pick one opponent
  | 'CELL'              // pick a board cell
  | 'OPPONENT_HOUSE'    // pick opponent's house to destroy
  | 'STEPS'             // pick 2-12 steps
  | 'DECK'              // pick KHI_VAN or CO_HOI
  ;

export interface CharacterAbilityDef {
  passive: PassiveAbility;
  active: ActiveAbility;
}

// ─── 13 Character Definitions ────────────────────────────────

export const CHARACTER_ABILITIES: Record<TinhTuyCharacter, CharacterAbilityDef> = {
  shiba: {
    passive: {
      id: 'shiba-passive', nameKey: 'tinhTuy.abilities.shiba.passive.name',
      descriptionKey: 'tinhTuy.abilities.shiba.passive.desc', hook: 'GO_SALARY_BONUS',
    },
    active: {
      id: 'shiba-active', nameKey: 'tinhTuy.abilities.shiba.active.name',
      descriptionKey: 'tinhTuy.abilities.shiba.active.desc',
      cooldown: 8, targetType: 'NONE', phase: 'POST_ROLL',
    },
  },
  kungfu: {
    passive: {
      id: 'kungfu-passive', nameKey: 'tinhTuy.abilities.kungfu.passive.name',
      descriptionKey: 'tinhTuy.abilities.kungfu.passive.desc', hook: 'RENT_COLLECT_BONUS',
    },
    active: {
      id: 'kungfu-active', nameKey: 'tinhTuy.abilities.kungfu.active.name',
      descriptionKey: 'tinhTuy.abilities.kungfu.active.desc',
      cooldown: 10, targetType: 'OPPONENT_HOUSE', phase: 'ROLL_DICE',
    },
  },
  fox: {
    passive: {
      id: 'fox-passive', nameKey: 'tinhTuy.abilities.fox.passive.name',
      descriptionKey: 'tinhTuy.abilities.fox.passive.desc', hook: 'RENT_PAY_REDUCTION',
    },
    active: {
      id: 'fox-active', nameKey: 'tinhTuy.abilities.fox.active.name',
      descriptionKey: 'tinhTuy.abilities.fox.active.desc',
      cooldown: 9, targetType: 'OPPONENT', phase: 'ROLL_DICE',
    },
  },
  elephant: {
    passive: {
      id: 'elephant-passive', nameKey: 'tinhTuy.abilities.elephant.passive.name',
      descriptionKey: 'tinhTuy.abilities.elephant.passive.desc', hook: 'BUILD_COST_REDUCTION',
    },
    active: {
      id: 'elephant-active', nameKey: 'tinhTuy.abilities.elephant.active.name',
      descriptionKey: 'tinhTuy.abilities.elephant.active.desc',
      cooldown: 10, targetType: 'CELL', phase: 'ROLL_DICE',
    },
  },
  trau: {
    passive: {
      id: 'trau-passive', nameKey: 'tinhTuy.abilities.trau.passive.name',
      descriptionKey: 'tinhTuy.abilities.trau.passive.desc', hook: 'MONEY_LOSS_REDUCTION',
    },
    active: {
      id: 'trau-active', nameKey: 'tinhTuy.abilities.trau.active.name',
      descriptionKey: 'tinhTuy.abilities.trau.active.desc',
      cooldown: 10, targetType: 'NONE', phase: 'ROLL_DICE',
    },
  },
  horse: {
    passive: {
      id: 'horse-passive', nameKey: 'tinhTuy.abilities.horse.passive.name',
      descriptionKey: 'tinhTuy.abilities.horse.passive.desc', hook: 'MOVE_ADJUST',
    },
    active: {
      id: 'horse-active', nameKey: 'tinhTuy.abilities.horse.active.name',
      descriptionKey: 'tinhTuy.abilities.horse.active.desc',
      cooldown: 8, targetType: 'STEPS', phase: 'ROLL_DICE',
    },
  },
  canoc: {
    passive: {
      id: 'canoc-passive', nameKey: 'tinhTuy.abilities.canoc.passive.name',
      descriptionKey: 'tinhTuy.abilities.canoc.passive.desc', hook: 'RENT_FLAT_BONUS',
    },
    active: {
      id: 'canoc-active', nameKey: 'tinhTuy.abilities.canoc.active.name',
      descriptionKey: 'tinhTuy.abilities.canoc.active.desc',
      cooldown: 10, targetType: 'OPPONENT', phase: 'ROLL_DICE',
    },
  },
  seahorse: {
    passive: {
      id: 'seahorse-passive', nameKey: 'tinhTuy.abilities.seahorse.passive.name',
      descriptionKey: 'tinhTuy.abilities.seahorse.passive.desc', hook: 'CARD_MONEY_MODIFIER',
    },
    active: {
      id: 'seahorse-active', nameKey: 'tinhTuy.abilities.seahorse.active.name',
      descriptionKey: 'tinhTuy.abilities.seahorse.active.desc',
      cooldown: 10, targetType: 'DECK', phase: 'ROLL_DICE',
    },
  },
  pigfish: {
    passive: {
      id: 'pigfish-passive', nameKey: 'tinhTuy.abilities.pigfish.passive.name',
      descriptionKey: 'tinhTuy.abilities.pigfish.passive.desc', hook: 'ISLAND_TURN_REDUCTION',
    },
    active: {
      id: 'pigfish-active', nameKey: 'tinhTuy.abilities.pigfish.active.name',
      descriptionKey: 'tinhTuy.abilities.pigfish.active.desc',
      cooldown: 10, targetType: 'NONE', phase: 'ROLL_DICE',
    },
  },
  chicken: {
    passive: {
      id: 'chicken-passive', nameKey: 'tinhTuy.abilities.chicken.passive.name',
      descriptionKey: 'tinhTuy.abilities.chicken.passive.desc', hook: 'TURN_START_DRAIN',
    },
    active: {
      id: 'chicken-active', nameKey: 'tinhTuy.abilities.chicken.active.name',
      descriptionKey: 'tinhTuy.abilities.chicken.active.desc',
      cooldown: 10, targetType: 'OPPONENT', phase: 'ROLL_DICE',
    },
  },
  rabbit: {
    passive: {
      id: 'rabbit-passive', nameKey: 'tinhTuy.abilities.rabbit.passive.name',
      descriptionKey: 'tinhTuy.abilities.rabbit.passive.desc', hook: 'DOUBLE_BONUS_STEPS',
    },
    active: {
      id: 'rabbit-active', nameKey: 'tinhTuy.abilities.rabbit.active.name',
      descriptionKey: 'tinhTuy.abilities.rabbit.active.desc',
      cooldown: 10, targetType: 'CELL', phase: 'ROLL_DICE',
    },
  },
  sloth: {
    passive: {
      id: 'sloth-passive', nameKey: 'tinhTuy.abilities.sloth.passive.name',
      descriptionKey: 'tinhTuy.abilities.sloth.passive.desc', hook: 'AUTO_BUILD_ON_MONOPOLY',
    },
    active: {
      id: 'sloth-active', nameKey: 'tinhTuy.abilities.sloth.active.name',
      descriptionKey: 'tinhTuy.abilities.sloth.active.desc',
      cooldown: 10, targetType: 'NONE', phase: 'ROLL_DICE',
    },
  },
  owl: {
    passive: {
      id: 'owl-passive', nameKey: 'tinhTuy.abilities.owl.passive.name',
      descriptionKey: 'tinhTuy.abilities.owl.passive.desc', hook: 'CARD_DRAW_PICK_TWO',
    },
    active: {
      id: 'owl-active', nameKey: 'tinhTuy.abilities.owl.active.name',
      descriptionKey: 'tinhTuy.abilities.owl.active.desc',
      cooldown: 9, targetType: 'OPPONENT', phase: 'ROLL_DICE',
    },
  },
};

// ─── Constants ───────────────────────────────────────────────

export const SHIBA_GO_BONUS = 500;
export const KUNGFU_RENT_COLLECT_MULT = 0.15;   // +15%
export const FOX_RENT_PAY_MULT = 0.15;          // -15%
export const ELEPHANT_BUILD_DISCOUNT = 0.15;     // -15%
export const TRAU_LOSS_REDUCTION = 0.10;         // -10%
export const CANOC_RENT_FLAT_BONUS = 300;
export const SEAHORSE_CARD_MODIFIER = 0.25;      // ±25%
export const PIGFISH_MAX_ISLAND = 1;
export const CHICKEN_DRAIN_AMOUNT = 200;
export const RABBIT_DOUBLE_BONUS = 3;
export const CANOC_STEAL_AMOUNT = 1000;
export const TRAU_ACTIVE_AMOUNT = 1000;
export const SLOTH_HIBERNATE_AMOUNT = 1500;

// ─── Guard: Check if abilities are enabled + player has passive ──

export function hasPassive(game: ITinhTuyGame, player: ITinhTuyPlayer, hook: PassiveHook): boolean {
  if (!game.settings.abilitiesEnabled) return false;
  if (player.isBankrupt) return false;
  const abilityDef = CHARACTER_ABILITIES[player.character];
  return abilityDef?.passive.hook === hook;
}

export function abilitiesEnabled(game: ITinhTuyGame): boolean {
  return !!game.settings.abilitiesEnabled;
}

// ─── Passive Hook Helpers ────────────────────────────────────

/** Shiba: extra GO salary */
export function getGoSalaryBonus(game: ITinhTuyGame, player: ITinhTuyPlayer): number {
  return hasPassive(game, player, 'GO_SALARY_BONUS') ? SHIBA_GO_BONUS : 0;
}

/** Kungfu: rent collect multiplier (applied to owner) */
export function getRentCollectMultiplier(game: ITinhTuyGame, owner: ITinhTuyPlayer): number {
  return hasPassive(game, owner, 'RENT_COLLECT_BONUS') ? 1 + KUNGFU_RENT_COLLECT_MULT : 1;
}

/** Fox: rent pay reduction (applied to payer) */
export function getRentPayMultiplier(game: ITinhTuyGame, payer: ITinhTuyPlayer): number {
  return hasPassive(game, payer, 'RENT_PAY_REDUCTION') ? 1 - FOX_RENT_PAY_MULT : 1;
}

/** Elephant: build cost reduction */
export function getBuildCostMultiplier(game: ITinhTuyGame, player: ITinhTuyPlayer): number {
  return hasPassive(game, player, 'BUILD_COST_REDUCTION') ? 1 - ELEPHANT_BUILD_DISCOUNT : 1;
}

/** Suu Nhi: money loss reduction (rent, tax, card losses) */
export function getMoneyLossMultiplier(game: ITinhTuyGame, player: ITinhTuyPlayer): number {
  return hasPassive(game, player, 'MONEY_LOSS_REDUCTION') ? 1 - TRAU_LOSS_REDUCTION : 1;
}

/** Seahorse: card money modifier (+25% gains, -25% losses) */
export function getCardMoneyMultiplier(game: ITinhTuyGame, player: ITinhTuyPlayer, isGain: boolean): number {
  if (!hasPassive(game, player, 'CARD_MONEY_MODIFIER')) return 1;
  return isGain ? 1 + SEAHORSE_CARD_MODIFIER : 1 - SEAHORSE_CARD_MODIFIER;
}

/** Pigfish: max island turns */
export function getMaxIslandTurns(game: ITinhTuyGame, player: ITinhTuyPlayer): number {
  return hasPassive(game, player, 'ISLAND_TURN_REDUCTION') ? PIGFISH_MAX_ISLAND : 3;
}

/** Rabbit: bonus steps on doubles */
export function getDoubleBonusSteps(game: ITinhTuyGame, player: ITinhTuyPlayer): number {
  return hasPassive(game, player, 'DOUBLE_BONUS_STEPS') ? RABBIT_DOUBLE_BONUS : 0;
}

/** Ca Sau: flat rent bonus per building on owned cells */
export function getRentFlatBonus(game: ITinhTuyGame, owner: ITinhTuyPlayer, cellIndex: number): number {
  if (!hasPassive(game, owner, 'RENT_FLAT_BONUS')) return 0;
  const key = String(cellIndex);
  const hasBuilding = (owner.houses[key] || 0) > 0 || !!owner.hotels[key];
  return hasBuilding ? CANOC_RENT_FLAT_BONUS : 0;
}

// ─── Active Ability Validation ───────────────────────────────

export interface ActiveAbilityValidation {
  valid: boolean;
  error?: string;
}

export function canUseActiveAbility(
  game: ITinhTuyGame, player: ITinhTuyPlayer
): ActiveAbilityValidation {
  if (!game.settings.abilitiesEnabled) return { valid: false, error: 'abilitiesDisabled' };
  if (game.gameStatus !== 'playing') return { valid: false, error: 'gameNotActive' };
  if (player.isBankrupt) return { valid: false, error: 'playerBankrupt' };
  if (player.abilityCooldown > 0) return { valid: false, error: 'abilityOnCooldown' };
  if (player.abilityUsedThisTurn) return { valid: false, error: 'abilityAlreadyUsed' };

  const abilityDef = CHARACTER_ABILITIES[player.character];
  if (!abilityDef) return { valid: false, error: 'noAbility' };

  // Phase check: most abilities require ROLL_DICE, Shiba requires POST_ROLL (handled by caller)
  return { valid: true };
}

// ─── Active Ability Execution Results ────────────────────────

export interface ActiveAbilityResult {
  success: boolean;
  error?: string;
  /** Points changed: slot → delta */
  pointsChanged?: Record<number, number>;
  /** Player moved to new position */
  playerMoved?: { slot: number; from: number; to: number; passedGo: boolean };
  /** Shiba reroll: two dice results for player to pick */
  shibaReroll?: { original: { dice1: number; dice2: number }; rerolled: { dice1: number; dice2: number } };
  /** Horse: player chose exact steps */
  horseSteps?: number;
  /** Fox: swap positions */
  foxSwap?: { mySlot: number; targetSlot: number; myNewPos: number; targetNewPos: number };
  /** Kungfu: house destroyed */
  kungfuDestroy?: { targetSlot: number; cellIndex: number; refund: number };
  /** Seahorse: extra card draw from chosen deck */
  seahorseDeck?: 'KHI_VAN' | 'CO_HOI';
  /** Owl: force target to draw KHI_VAN */
  owlForceTarget?: number;
  /** Chicken: skip target's turn */
  chickenSkipTarget?: number;
  /** Rabbit: teleport to cell */
  rabbitTeleport?: { from: number; to: number; passedGo: boolean };
  /** Sloth: skip turn + gain points */
  slothHibernate?: boolean;
  /** Pigfish: next rent immunity */
  pigfishImmunity?: boolean;
  /** Ca Sau: steal from target */
  canocSteal?: { targetSlot: number; amount: number };
  /** Trau: gain from bank */
  trauGain?: number;
  /** Elephant: free house built */
  elephantFreeBuild?: { cellIndex: number };
  /** Requires further UI choice (e.g. Shiba pick, Horse steps) */
  requiresChoice?: 'SHIBA_PICK' | 'HORSE_STEPS' | 'OWL_PICK';
}

/** Validate and get targetable opponents (non-bankrupt, not self) */
export function getTargetableOpponents(game: ITinhTuyGame, playerSlot: number): ITinhTuyPlayer[] {
  return game.players.filter(p => !p.isBankrupt && p.slot !== playerSlot);
}

/** Get opponent houses that Kungfu can destroy (no hotels, must have ≥1 house) */
export function getKungfuTargets(game: ITinhTuyGame, playerSlot: number): Array<{ slot: number; cellIndex: number; houses: number }> {
  const targets: Array<{ slot: number; cellIndex: number; houses: number }> = [];
  for (const opp of getTargetableOpponents(game, playerSlot)) {
    for (const cellIdx of opp.properties) {
      const key = String(cellIdx);
      const houses = opp.houses[key] || 0;
      if (houses > 0 && !opp.hotels[key]) {
        targets.push({ slot: opp.slot, cellIndex: cellIdx, houses });
      }
    }
  }
  return targets;
}

/** Get cells where Elephant can build a free house */
export function getElephantBuildTargets(game: ITinhTuyGame, player: ITinhTuyPlayer): number[] {
  return player.properties.filter(cellIdx => {
    const cell = getCell(cellIdx);
    if (!cell || cell.type !== 'PROPERTY') return false;
    const key = String(cellIdx);
    if (player.hotels[key]) return false;
    if ((player.houses[key] || 0) >= 4) return false;
    return true;
  });
}

/** Get cells where Rabbit can teleport */
export function getRabbitTeleportTargets(): number[] {
  // Can go to any cell 0-35
  return Array.from({ length: BOARD_SIZE }, (_, i) => i);
}

/** Execute Sloth auto-build on monopoly completion */
export function executeSlothAutoBuild(game: ITinhTuyGame, player: ITinhTuyPlayer, completedGroup: string): {
  built: boolean; cellIndex?: number;
} {
  if (!hasPassive(game, player, 'AUTO_BUILD_ON_MONOPOLY')) return { built: false };

  const groupCells = (PROPERTY_GROUPS as Record<string, number[]>)[completedGroup];
  if (!groupCells) return { built: false };

  // Find cheapest buildable cell in group
  let cheapest: { cellIndex: number; cost: number } | null = null;
  for (const cellIdx of groupCells) {
    const cell = getCell(cellIdx);
    if (!cell || cell.type !== 'PROPERTY') continue;
    const key = String(cellIdx);
    if (player.hotels[key]) continue;
    if ((player.houses[key] || 0) >= 4) continue;
    const cost = cell.houseCost || 0;
    if (!cheapest || cost < cheapest.cost) {
      cheapest = { cellIndex: cellIdx, cost };
    }
  }

  if (!cheapest) return { built: false }; // all cells maxed

  // Build for free (no cost deducted)
  player.houses[String(cheapest.cellIndex)] = (player.houses[String(cheapest.cellIndex)] || 0) + 1;
  return { built: true, cellIndex: cheapest.cellIndex };
}

/** Execute Chicken drain at turn start */
export function executeChickenDrain(
  game: ITinhTuyGame, chickenPlayer: ITinhTuyPlayer
): { drained: Array<{ slot: number; amount: number }>; totalGained: number } {
  if (!hasPassive(game, chickenPlayer, 'TURN_START_DRAIN')) {
    return { drained: [], totalGained: 0 };
  }

  const drained: Array<{ slot: number; amount: number }> = [];
  let totalGained = 0;

  for (const opp of game.players) {
    if (opp.isBankrupt || opp.slot === chickenPlayer.slot) continue;
    const drainAmount = Math.min(CHICKEN_DRAIN_AMOUNT, opp.points);
    if (drainAmount <= 0) continue;
    opp.points -= drainAmount;
    chickenPlayer.points += drainAmount; // goes into Chicken's pocket, not bank
    totalGained += drainAmount;
    drained.push({ slot: opp.slot, amount: drainAmount });
  }

  return { drained, totalGained };
}

/** Decrement ability cooldowns for a player (called each turn in advanceTurn) */
export function decrementCooldown(player: ITinhTuyPlayer): void {
  if (player.abilityCooldown > 0) {
    player.abilityCooldown--;
  }
  player.abilityUsedThisTurn = false;
}

/** Set cooldown after ability use */
export function setAbilityCooldown(player: ITinhTuyPlayer): void {
  const abilityDef = CHARACTER_ABILITIES[player.character];
  if (abilityDef) {
    player.abilityCooldown = abilityDef.active.cooldown;
    player.abilityUsedThisTurn = true;
  }
}
