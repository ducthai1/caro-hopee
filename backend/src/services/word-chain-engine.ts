/**
 * Word Chain Game Engine
 * Core game logic: validation, turn rotation, scoring, game end detection.
 */
import { IWordChainGame, IWordChainPlayer, IWordChainRules, DictionaryIndex, WordValidationResult } from '../types/word-chain.types';
import { normalizeWord, getFirstSyllable, getLastSyllable, getSyllableCount, matchesWordType } from './word-chain-dictionary';

// ─── Word Validation Pipeline ──────────────────────────────────

/**
 * Validate a submitted word against game state and dictionary.
 * Order matters: cheapest checks first.
 */
export function validateWord(
  rawWord: string,
  game: IWordChainGame,
  roomDict: DictionaryIndex
): WordValidationResult {
  const word = normalizeWord(rawWord);

  // 1. Exists in dictionary?
  if (!roomDict.allWords.has(word)) {
    return { valid: false, reason: 'not_in_dictionary' };
  }

  // 2. Matches word type filter (syllable count)?
  if (!matchesWordType(word, game.rules.wordType)) {
    return { valid: false, reason: 'wrong_type' };
  }

  // 3. Chains correctly? (first syllable = last syllable of current word)
  if (game.currentWord) {
    const requiredSyllable = getLastSyllable(game.currentWord);
    const firstSyll = getFirstSyllable(word);
    if (firstSyll !== requiredSyllable) {
      return { valid: false, reason: 'wrong_chain' };
    }
  }

  // 4. Not already used? (unless allowRepeat)
  if (!game.rules.allowRepeat && game.usedWords.includes(word)) {
    return { valid: false, reason: 'already_used' };
  }

  return { valid: true };
}

// ─── Turn Rotation ─────────────────────────────────────────────

/**
 * Get next active (non-eliminated) player slot in circular order.
 * Returns -1 if game should end (0 or 1 active players).
 */
export function getNextPlayerSlot(
  players: IWordChainPlayer[],
  currentSlot: number
): number {
  const activePlayers = players.filter(p => !p.isEliminated);
  if (activePlayers.length <= 1) return -1; // game over

  let nextSlot = currentSlot;
  for (let i = 0; i < players.length; i++) {
    nextSlot = (nextSlot % players.length) + 1; // 1-based circular
    const player = players.find(p => p.slot === nextSlot);
    if (player && !player.isEliminated) {
      return nextSlot;
    }
  }

  return -1; // shouldn't reach here if activePlayers > 1
}

// ─── First Word Selection ──────────────────────────────────────

/**
 * Select a random first word that has >= 3 chainable follow-ups.
 * Ensures game doesn't end immediately.
 */
export function selectFirstWord(
  roomDict: DictionaryIndex,
  rules: IWordChainRules
): string {
  const candidates: string[] = [];

  for (const word of roomDict.allWords) {
    if (!matchesWordType(word, rules.wordType)) continue;

    const lastSyll = getLastSyllable(word);
    const followUps = roomDict.byFirstSyllable.get(lastSyll) || [];
    // Need at least 3 follow-ups (excluding self)
    const validFollowUps = followUps.filter(w => w !== word);
    if (validFollowUps.length >= 3) {
      candidates.push(word);
    }
  }

  if (candidates.length === 0) {
    // Fallback: pick any word with at least 1 follow-up
    for (const word of roomDict.allWords) {
      if (!matchesWordType(word, rules.wordType)) continue;
      const lastSyll = getLastSyllable(word);
      const followUps = roomDict.byFirstSyllable.get(lastSyll) || [];
      if (followUps.length > 1) {
        candidates.push(word);
      }
    }
  }

  // Random selection
  return candidates[Math.floor(Math.random() * candidates.length)] || '';
}

// ─── Game End Detection ────────────────────────────────────────

/**
 * Check if game should end based on remaining active players.
 */
export function checkGameEnd(
  players: IWordChainPlayer[]
): { ended: boolean; winner?: IWordChainPlayer | 'draw' } {
  const activePlayers = players.filter(p => !p.isEliminated);

  if (activePlayers.length === 0) {
    return { ended: true, winner: 'draw' };
  }

  if (activePlayers.length === 1) {
    // Last player standing wins — this is a survival game
    return { ended: true, winner: activePlayers[0] };
  }

  return { ended: false };
}

/**
 * Determine winner by comparing scores among active (non-eliminated) players.
 * Returns the player with highest score, or 'draw' if tied.
 */
export function determineWinnerByScore(
  players: IWordChainPlayer[]
): IWordChainPlayer | 'draw' {
  const activePlayers = players.filter(p => !p.isEliminated);
  if (activePlayers.length === 0) return 'draw';
  if (activePlayers.length === 1) return activePlayers[0];

  // Sort by score descending, then by wordsPlayed descending as tiebreaker
  const sorted = [...activePlayers].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.wordsPlayed || 0) - (a.wordsPlayed || 0);
  });

  // If top 2 have same score AND same wordsPlayed, it's a true draw
  if (sorted[0].score === sorted[1].score && 
      (sorted[0].wordsPlayed || 0) === (sorted[1].wordsPlayed || 0)) {
    return 'draw';
  }

  return sorted[0];
}

/**
 * Check if there are any valid words available to chain from current word.
 * If no words available → game ends (winner determined by score comparison).
 */
export function checkNoWordsAvailable(
  currentWord: string,
  usedWords: string[],
  roomDict: DictionaryIndex,
  allowRepeat: boolean
): boolean {
  if (!currentWord) return false;

  const lastSyll = getLastSyllable(currentWord);
  const candidates = roomDict.byFirstSyllable.get(lastSyll) || [];

  if (allowRepeat) {
    return candidates.length === 0;
  }

  // Check if any candidate hasn't been used
  return !candidates.some(w => !usedWords.includes(w));
}

// ─── Scoring ───────────────────────────────────────────────────

/** MVP scoring: 1 point per valid word */
export function calculateScore(_word: string): number {
  return 1;
}

// ─── Speed Mode Timer ──────────────────────────────────────────

/**
 * Get turn duration for speed mode (decreasing timer).
 * Round 1-3: baseDuration, 4-6: 75%, 7-9: 50%, 10-12: 33%, 13+: 25% (min 15s)
 */
export function getSpeedModeTurnDuration(
  roundNumber: number,
  baseDuration: number
): number {
  let multiplier = 1.0;
  if (roundNumber >= 13) multiplier = 0.25;
  else if (roundNumber >= 10) multiplier = 0.33;
  else if (roundNumber >= 7) multiplier = 0.5;
  else if (roundNumber >= 4) multiplier = 0.75;

  return Math.max(15, Math.round(baseDuration * multiplier));
}

// ─── Room Code Generator ───────────────────────────────────────

import WordChainGame from '../models/WordChainGame';

/** Generate unique 6-char room code for word chain games */
export async function generateWordChainRoomCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await WordChainGame.findOne({ roomCode: code });
    if (!existing) isUnique = true;
  }

  return code!;
}
