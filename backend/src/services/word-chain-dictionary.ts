/**
 * Word Chain Dictionary Service
 * Loads Vietnamese wordlist, builds indexed structures for O(1) lookups.
 * Singleton pattern — loaded once at server startup.
 */
import fs from 'fs';
import path from 'path';
import { DictionaryIndex, WordType } from '../types/word-chain.types';

// ─── Singleton ─────────────────────────────────────────────────
let dictionary: DictionaryIndex | null = null;

// ─── Vietnamese Syllable Helpers ───────────────────────────────

/** NFC normalize + lowercase + trim. Critical for Vietnamese diacritics. */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().normalize('NFC');
}

/** Count syllables (space-separated). "hoa hồng" → 2 */
export function getSyllableCount(word: string): number {
  return word.split(' ').length;
}

/** Get first syllable. "hoa hồng" → "hoa" */
export function getFirstSyllable(word: string): string {
  return word.split(' ')[0];
}

/** Get last syllable. "hoa hồng" → "hồng" */
export function getLastSyllable(word: string): string {
  const parts = word.split(' ');
  return parts[parts.length - 1];
}

/** Check if word matches syllable-count filter */
export function matchesWordType(word: string, type: WordType): boolean {
  const count = getSyllableCount(word);
  switch (type) {
    case '2+': return count >= 2;
    case '3+': return count >= 3;
    case 'all': return true;
    default: return true;
  }
}

// ─── Dictionary Loading ────────────────────────────────────────

/** Build index structures from a Set of words */
function buildIndex(words: Set<string>): DictionaryIndex {
  const byFirstSyllable = new Map<string, string[]>();
  const bySyllableCount = new Map<number, Set<string>>();
  let totalCompound = 0;
  let totalSingle = 0;

  for (const word of words) {
    const firstSyll = getFirstSyllable(word);
    const syllCount = getSyllableCount(word);

    // Index by first syllable
    if (!byFirstSyllable.has(firstSyll)) {
      byFirstSyllable.set(firstSyll, []);
    }
    byFirstSyllable.get(firstSyll)!.push(word);

    // Index by syllable count
    if (!bySyllableCount.has(syllCount)) {
      bySyllableCount.set(syllCount, new Set());
    }
    bySyllableCount.get(syllCount)!.add(word);

    // Stats
    if (syllCount >= 2) totalCompound++;
    else totalSingle++;
  }

  return {
    allWords: words,
    byFirstSyllable,
    bySyllableCount,
    totalWords: words.size,
    totalCompound,
    totalSingle,
  };
}

/**
 * Load wordlist from file, parse, normalize, build indexes.
 * Called once at server startup.
 */
export function loadDictionary(filePath?: string): DictionaryIndex {
  const resolvedPath = filePath || path.join(__dirname, '..', 'data', 'vietnamese-wordlist.txt');

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`[WordChain] Dictionary file not found: ${resolvedPath}`);
  }

  const startTime = Date.now();
  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const lines = raw.split('\n');

  const words = new Set<string>();
  let skipped = 0;

  for (const line of lines) {
    const normalized = normalizeWord(line);
    if (normalized.length === 0) {
      skipped++;
      continue;
    }
    words.add(normalized);
  }

  dictionary = buildIndex(words);
  const elapsed = Date.now() - startTime;

  console.log(`[WordChain] Dictionary loaded in ${elapsed}ms`);
  console.log(`[WordChain]   Total: ${dictionary.totalWords} words (${dictionary.totalCompound} compound, ${dictionary.totalSingle} single)`);
  console.log(`[WordChain]   Skipped: ${skipped} blank lines`);
  console.log(`[WordChain]   First-syllable index: ${dictionary.byFirstSyllable.size} entries`);

  return dictionary;
}

/** Get loaded dictionary singleton. Throws if not loaded yet. */
export function getDictionary(): DictionaryIndex {
  if (!dictionary) {
    throw new Error('[WordChain] Dictionary not loaded. Call loadDictionary() first.');
  }
  return dictionary;
}

/**
 * Build a filtered dictionary for a specific room's rules.
 * Filters by wordType (syllable count).
 */
export function buildRoomDictionary(rules: { wordType: WordType }): DictionaryIndex {
  const full = getDictionary();

  // No filtering needed for 'all' mode
  if (rules.wordType === 'all') {
    return full;
  }

  const filtered = new Set<string>();
  for (const word of full.allWords) {
    if (matchesWordType(word, rules.wordType)) {
      filtered.add(word);
    }
  }

  return buildIndex(filtered);
}
