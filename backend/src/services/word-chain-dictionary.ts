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
// Vietnamese has two conventions for placing tone marks on diphthongs:
//   Old style (tone on 2nd vowel): hoà, hoá, hoẻ, thuỷ, uỵ
//   New style (tone on 1st vowel): hòa, hóa, hỏa, thủy, ụy
//
// We normalize ALL words to "new style" so both inputs match the same
// canonical form. This is applied during dictionary loading AND user input.

/** Map old-style → new-style tone placement (NFC characters) */
const TONE_POSITION_MAP: Record<string, string> = {
  // oa group: tone on 'a' → tone on 'o'
  'oà': 'òa', 'oá': 'óa', 'oả': 'ỏa', 'oã': 'õa', 'oạ': 'ọa',
  // oe group: tone on 'e' → tone on 'o'
  'oè': 'òe', 'oé': 'óe', 'oẻ': 'ỏe', 'oẽ': 'õe', 'oẹ': 'ọe',
  // uy group: tone on 'y' → tone on 'u'
  'uỳ': 'ùy', 'uý': 'úy', 'uỷ': 'ủy', 'uỹ': 'ũy', 'uỵ': 'ụy',
};

/**
 * Normalize Vietnamese tone mark position to "new style".
 * Only applies to syllable-final diphthongs (oa, oe, uy).
 * E.g. "hoà" → "hòa", "mã hoá" → "mã hóa", "thuỷ" → "thủy"
 */
export function normalizeTonePosition(word: string): string {
  let result = word;
  for (const [oldStyle, newStyle] of Object.entries(TONE_POSITION_MAP)) {
    if (result.includes(oldStyle)) {
      result = result.split(oldStyle).join(newStyle);
    }
  }
  return result;
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
