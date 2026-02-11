/**
 * Word Chain Dictionary Service
 * Loads Vietnamese wordlist, builds indexed structures for O(1) lookups.
 * Singleton pattern — loaded once at server startup.
 */
import fs from 'fs';
import path from 'path';
import { DictionaryIndex, WordType } from '../types/word-chain.types';
import MissingWord from '../models/MissingWord';

// ─── Singleton ─────────────────────────────────────────────────
let dictionary: DictionaryIndex | null = null;

// ─── Vietnamese Tone Position Normalization ────────────────────
//
// Vietnamese diphthongs (oa, oe, uy) have ambiguous tone mark placement.
// We normalize to the orthographically CORRECT position per syllable:
//   - Diphthong at syllable end (no following consonant): tone on 1st vowel ("new-style")
//     e.g. hoà → hòa, hoá → hóa, thuỷ → thủy
//   - Diphthong + final consonant: tone on 2nd vowel (universally correct)
//     e.g. hòan → hoàn, tòan → toàn, hòang → hoàng
//
// Applied during dictionary loading AND user input normalization.

/** Diphthong pairs where tone placement is ambiguous */
const DIPHTHONG_PAIRS = [
  { v1: 'o', v2: 'a' },
  { v1: 'o', v2: 'e' },
  { v1: 'u', v2: 'y' },
];

/** base vowel → [ngang, huyền, sắc, hỏi, ngã, nặng] */
const TONE_TABLE: Record<string, string[]> = {
  'o': ['o', 'ò', 'ó', 'ỏ', 'õ', 'ọ'],
  'a': ['a', 'à', 'á', 'ả', 'ã', 'ạ'],
  'e': ['e', 'è', 'é', 'ẻ', 'ẽ', 'ẹ'],
  'u': ['u', 'ù', 'ú', 'ủ', 'ũ', 'ụ'],
  'y': ['y', 'ỳ', 'ý', 'ỷ', 'ỹ', 'ỵ'],
};

/** Reverse lookup: toned character → [base, tone_index] */
const CHAR_TO_TONE: Record<string, [string, number]> = {};
for (const [base, variants] of Object.entries(TONE_TABLE)) {
  variants.forEach((ch, idx) => { CHAR_TO_TONE[ch] = [base, idx]; });
}

/** Normalize tone position for a single Vietnamese syllable */
function normalizeSyllableTone(syllable: string): string {
  for (const { v1, v2 } of DIPHTHONG_PAIRS) {
    for (let i = 0; i < syllable.length - 1; i++) {
      const ch1 = CHAR_TO_TONE[syllable[i]];
      const ch2 = CHAR_TO_TONE[syllable[i + 1]];
      if (!ch1 || !ch2) continue;
      if (ch1[0] !== v1 || ch2[0] !== v2) continue;

      // Skip "qu" + vowel — 'u' is part of consonant cluster, not a diphthong
      if (v1 === 'u' && i > 0 && syllable[i - 1] === 'q') continue;

      const tone1 = ch1[1];
      const tone2 = ch2[1];
      if (tone1 === 0 && tone2 === 0) continue; // No tone mark on diphthong

      const tone = tone1 !== 0 ? tone1 : tone2;
      // Syllable-final → tone on 1st vowel; followed by more chars → tone on 2nd
      const toneOnFirst = (i + 2 >= syllable.length);

      return syllable.substring(0, i)
        + TONE_TABLE[v1][toneOnFirst ? tone : 0]
        + TONE_TABLE[v2][toneOnFirst ? 0 : tone]
        + syllable.substring(i + 2);
    }
  }
  return syllable;
}

/**
 * Normalize Vietnamese tone mark position to correct orthographic form.
 * Processes per-syllable (space-separated) to determine correct placement.
 * E.g. "hòan tòan" → "hoàn toàn", "hoà" → "hòa", "thuỷ" → "thủy"
 */
export function normalizeTonePosition(word: string): string {
  return word.split(' ').map(normalizeSyllableTone).join(' ');
}

// ─── Vietnamese Syllable Helpers ───────────────────────────────

/**
 * NFC normalize + lowercase + trim + tone-position normalize.
 * Critical for Vietnamese diacritics — ensures "hoà" and "hòa" map to same key.
 */
export function normalizeWord(word: string): string {
  const nfc = word.trim().toLowerCase().normalize('NFC');
  return normalizeTonePosition(nfc);
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
    case '2+': return count === 2; // CHỈ 2 âm tiết (User requested: "chỉ những từ 2 âm tiết thôi")
    case '3+': return count >= 3;
    case 'all': return true;
    default: return true;
  }
}

// ─── Validation Helpers ────────────────────────────────────────

// Regex to check if a word contains only valid Vietnamese characters
const VIETNAMESE_CHAR_REGEX = /^[aàáảãạăằắẳẵặâầấẩẫậbcdđeèéẻẽẹêềếểễệghiklmnoòóỏõọôồốổỗộơờớởỡợpqrstuùúủũụưừứửữựvxyỳýỷỹỵ\s]+$/;

export function isValidVietnameseWord(word: string): boolean {
  // 1. Must match regex
  if (!VIETNAMESE_CHAR_REGEX.test(word)) return false;
  
  // 2. Must not contain double spaces
  if (word.includes('  ')) return false;

  // 3. Must check tone placement? (Optional, regex covers most chars)
  return true;
}

// ─── Missing Word Logging (MongoDB) ────────────────────────────

/**
 * Log a potentially valid missing word to MongoDB for later review.
 * Uses upsert to increment count if word already exists.
 * Async but fire-and-forget safe.
 */
export async function logMissingWord(word: string) {
  try {
    await MissingWord.updateOne(
      { word: word },
      { 
        $inc: { count: 1 },
        $set: { lastSeenAt: new Date(), source: 'word-chain' },
        $setOnInsert: { firstSeenAt: new Date(), status: 'pending' }
      },
      { upsert: true }
    );
  } catch (err) {
    console.error('[WordChain] Failed to log missing word to DB:', err);
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
