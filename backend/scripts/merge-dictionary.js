const fs = require('fs');
const path = require('path');

const CURRENT_DICT_PATH = path.join(__dirname, '../src/data/vietnamese-wordlist.txt');
const NEW_DICT_PATH = path.join(__dirname, '../src/data/duyet-wordlist.txt');
const OUTPUT_PATH = path.join(__dirname, '../src/data/vietnamese-wordlist.txt');

// Regex for valid Vietnamese characters + space
// Excludes f, j, w, z, digits, punctuation (except hyphen handled separately)
// Base chars: a b c d e g h i k l m n o p q r s t u v x y (22 chars + d)
// Accented chars: àá...
const INVALID_CHARS_REGEX = /[fjwz0-9!@#$%^&*()_+=<>?:"{}|~`[\]\\;,./]/;

const BLACKLIST = new Set([
  'abc', 'abcd', 'abcdef',
  'admin', 'administrator',
  'test', 'testing',
  'demo',
  'root',
  'user',
  'null', 'undefined',
  'true', 'false',
  'so', 'nhung', // Common stopwords? No, they are valid words "sơ", "nhưng". But without accent "so" might be English "so".
  // Wait, "so" is a valid Vietnamese word ("so sánh").
  // "nhung" (nhung lụa).
  // So do NOT filter unaccented words just because.
  // But words like "posteriori", "priori" should be filtered if they contain invalid chars? No, they use valid chars.
  'posteriori', 'priori', 'post', 'hoc', 
  // Consonants only. Vowels like a, e, i, o, u, y are valid words or particles
  'b', 'c', 'd', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'x'
]);

const VALID_SINGLE_CHARS = new Set([
  'a', 'à', 'á', 'ả', 'ã', 'ạ',
  'ă', 'ằ', 'ắ', 'ẳ', 'ẵ', 'ặ',
  'â', 'ầ', 'ấ', 'ẩ', 'ẫ', 'ậ',
  'e', 'è', 'é', 'ẻ', 'ẽ', 'ẹ',
  'ê', 'ề', 'ế', 'ể', 'ễ', 'ệ',
  'i', 'ì', 'í', 'ỉ', 'ĩ', 'ị',
  'o', 'ò', 'ó', 'ỏ', 'õ', 'ọ',
  'ô', 'ồ', 'ố', 'ổ', 'ỗ', 'ộ',
  'ơ', 'ờ', 'ớ', 'ở', 'ỡ', 'ợ',
  'u', 'ù', 'ú', 'ủ', 'ũ', 'ụ',
  'ư', 'ừ', 'ứ', 'ử', 'ữ', 'ự',
  'y', 'ỳ', 'ý', 'ỷ', 'ỹ', 'ỵ'
]);
// Note: Some might missing but covers most vowels.

function processFile(filePath, wordSet) {
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    
    lines.forEach(line => {
        let word = line.trim().toLowerCase();
        if (!word) return;
        
        // Handle common formatting issues
        word = word.replace(/-/g, ' '); // Replace hyphens with space
        word = word.replace(/\s+/g, ' '); // Normalize spaces
        
        // 1. Check for invalid chars
        if (INVALID_CHARS_REGEX.test(word)) return;
        
        // 2. Filter single letters that are not meaningful syllables or lack vowels
        // A valid Vietnamese syllable must contain at least one vowel
        const VOWEL_REGEX = /[aàáảãạăằắẳẵặâầấẩẫậeèéẻẽẹêềếểễệiìíỉĩịoòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵ]/;
        if (!VOWEL_REGEX.test(word)) return;
        
        // 3. Blacklist
        if (BLACKLIST.has(word)) return;
        
        wordSet.add(word);
    });
}

function main() {
    const wordSet = new Set();
    
    console.log('Processing current dictionary...');
    processFile(CURRENT_DICT_PATH, wordSet);
    
    console.log('Processing new dictionary...');
    processFile(NEW_DICT_PATH, wordSet);
    
    console.log(`Total unique words found: ${wordSet.size}`);
    
    const sortedWords = Array.from(wordSet).sort((a, b) => a.localeCompare(b, 'vi'));
    
    fs.writeFileSync(OUTPUT_PATH, sortedWords.join('\n') + '\n', 'utf8');
    console.log(`Successfully wrote merged dictionary to ${OUTPUT_PATH}`);
}

main();
