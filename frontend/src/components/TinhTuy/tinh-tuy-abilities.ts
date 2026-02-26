/**
 * Tinh Tuy Dai Chien — Frontend Ability Definitions
 * Display-only definitions for UI rendering.
 */
import { TinhTuyCharacter } from './tinh-tuy-types';

export type ActiveTargetType = 'NONE' | 'OPPONENT' | 'CELL' | 'OPPONENT_HOUSE' | 'STEPS' | 'DECK';

export interface AbilityDisplayDef {
  passive: {
    nameKey: string;
    descriptionKey: string;
    icon: string;        // emoji for quick display
  };
  active: {
    nameKey: string;
    descriptionKey: string;
    icon: string;
    cooldown: number;
    targetType: ActiveTargetType;
    phase: 'ROLL_DICE' | 'POST_ROLL';
  };
  role: string;          // i18n key for role tag
}

export const CHARACTER_ABILITIES: Record<TinhTuyCharacter, AbilityDisplayDef> = {
  shiba: {
    passive: { nameKey: 'tinhTuy.abilities.shiba.passive.name', descriptionKey: 'tinhTuy.abilities.shiba.passive.desc', icon: '💰' },
    active: { nameKey: 'tinhTuy.abilities.shiba.active.name', descriptionKey: 'tinhTuy.abilities.shiba.active.desc', icon: '🎲', cooldown: 8, targetType: 'NONE', phase: 'POST_ROLL' },
    role: 'tinhTuy.abilities.roles.income',
  },
  kungfu: {
    passive: { nameKey: 'tinhTuy.abilities.kungfu.passive.name', descriptionKey: 'tinhTuy.abilities.kungfu.passive.desc', icon: '👊' },
    active: { nameKey: 'tinhTuy.abilities.kungfu.active.name', descriptionKey: 'tinhTuy.abilities.kungfu.active.desc', icon: '🦶', cooldown: 10, targetType: 'OPPONENT_HOUSE', phase: 'ROLL_DICE' },
    role: 'tinhTuy.abilities.roles.attack',
  },
  fox: {
    passive: { nameKey: 'tinhTuy.abilities.fox.passive.name', descriptionKey: 'tinhTuy.abilities.fox.passive.desc', icon: '🦊' },
    active: { nameKey: 'tinhTuy.abilities.fox.active.name', descriptionKey: 'tinhTuy.abilities.fox.active.desc', icon: '🔄', cooldown: 9, targetType: 'OPPONENT', phase: 'ROLL_DICE' },
    role: 'tinhTuy.abilities.roles.defense',
  },
  elephant: {
    passive: { nameKey: 'tinhTuy.abilities.elephant.passive.name', descriptionKey: 'tinhTuy.abilities.elephant.passive.desc', icon: '🏗️' },
    active: { nameKey: 'tinhTuy.abilities.elephant.active.name', descriptionKey: 'tinhTuy.abilities.elephant.active.desc', icon: '🏠', cooldown: 10, targetType: 'CELL', phase: 'ROLL_DICE' },
    role: 'tinhTuy.abilities.roles.build',
  },
  trau: {
    passive: { nameKey: 'tinhTuy.abilities.trau.passive.name', descriptionKey: 'tinhTuy.abilities.trau.passive.desc', icon: '🛡️' },
    active: { nameKey: 'tinhTuy.abilities.trau.active.name', descriptionKey: 'tinhTuy.abilities.trau.active.desc', icon: '🌾', cooldown: 6, targetType: 'NONE', phase: 'ROLL_DICE' },
    role: 'tinhTuy.abilities.roles.defense',
  },
  horse: {
    passive: { nameKey: 'tinhTuy.abilities.horse.passive.name', descriptionKey: 'tinhTuy.abilities.horse.passive.desc', icon: '🐎' },
    active: { nameKey: 'tinhTuy.abilities.horse.active.name', descriptionKey: 'tinhTuy.abilities.horse.active.desc', icon: '💨', cooldown: 8, targetType: 'STEPS', phase: 'ROLL_DICE' },
    role: 'tinhTuy.abilities.roles.movement',
  },
  canoc: {
    passive: { nameKey: 'tinhTuy.abilities.canoc.passive.name', descriptionKey: 'tinhTuy.abilities.canoc.passive.desc', icon: '🐊' },
    active: { nameKey: 'tinhTuy.abilities.canoc.active.name', descriptionKey: 'tinhTuy.abilities.canoc.active.desc', icon: '🦷', cooldown: 10, targetType: 'OPPONENT', phase: 'ROLL_DICE' },
    role: 'tinhTuy.abilities.roles.attack',
  },
  seahorse: {
    passive: { nameKey: 'tinhTuy.abilities.seahorse.passive.name', descriptionKey: 'tinhTuy.abilities.seahorse.passive.desc', icon: '🍀' },
    active: { nameKey: 'tinhTuy.abilities.seahorse.active.name', descriptionKey: 'tinhTuy.abilities.seahorse.active.desc', icon: '🃏', cooldown: 10, targetType: 'DECK', phase: 'ROLL_DICE' },
    role: 'tinhTuy.abilities.roles.tactical',
  },
  pigfish: {
    passive: { nameKey: 'tinhTuy.abilities.pigfish.passive.name', descriptionKey: 'tinhTuy.abilities.pigfish.passive.desc', icon: '💧' },
    active: { nameKey: 'tinhTuy.abilities.pigfish.active.name', descriptionKey: 'tinhTuy.abilities.pigfish.active.desc', icon: '🫧', cooldown: 10, targetType: 'NONE', phase: 'ROLL_DICE' },
    role: 'tinhTuy.abilities.roles.defense',
  },
  chicken: {
    passive: { nameKey: 'tinhTuy.abilities.chicken.passive.name', descriptionKey: 'tinhTuy.abilities.chicken.passive.desc', icon: '🐔' },
    active: { nameKey: 'tinhTuy.abilities.chicken.active.name', descriptionKey: 'tinhTuy.abilities.chicken.active.desc', icon: '🚫', cooldown: 10, targetType: 'OPPONENT', phase: 'ROLL_DICE' },
    role: 'tinhTuy.abilities.roles.attack',
  },
  rabbit: {
    passive: { nameKey: 'tinhTuy.abilities.rabbit.passive.name', descriptionKey: 'tinhTuy.abilities.rabbit.passive.desc', icon: '🐰' },
    active: { nameKey: 'tinhTuy.abilities.rabbit.active.name', descriptionKey: 'tinhTuy.abilities.rabbit.active.desc', icon: '✨', cooldown: 10, targetType: 'CELL', phase: 'ROLL_DICE' },
    role: 'tinhTuy.abilities.roles.movement',
  },
  sloth: {
    passive: { nameKey: 'tinhTuy.abilities.sloth.passive.name', descriptionKey: 'tinhTuy.abilities.sloth.passive.desc', icon: '🦥' },
    active: { nameKey: 'tinhTuy.abilities.sloth.active.name', descriptionKey: 'tinhTuy.abilities.sloth.active.desc', icon: '😴', cooldown: 10, targetType: 'NONE', phase: 'ROLL_DICE' },
    role: 'tinhTuy.abilities.roles.build',
  },
  owl: {
    passive: { nameKey: 'tinhTuy.abilities.owl.passive.name', descriptionKey: 'tinhTuy.abilities.owl.passive.desc', icon: '🦉' },
    active: { nameKey: 'tinhTuy.abilities.owl.active.name', descriptionKey: 'tinhTuy.abilities.owl.active.desc', icon: '⚖️', cooldown: 9, targetType: 'OPPONENT', phase: 'ROLL_DICE' },
    role: 'tinhTuy.abilities.roles.tactical',
  },
};
