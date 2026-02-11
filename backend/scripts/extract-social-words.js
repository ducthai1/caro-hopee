const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../src/data/sources/social_raw/sents.txt');
const OUTPUT_FILE = path.join(__dirname, '../src/data/sources/social-slang-candidates.txt');

// Config
const MIN_FREQUENCY = 3; // Word must appear at least 3 times to be candidate
const VIETNAMESE_REGEX = /^[aàáảãạăằắẳẵặâầấẩẫậbcdđeèéẻẽẹêềếểễệghiklmnoòóỏõọôồốổỗộơờớởỡợpqrstuùúủũụưừứửữựvxyỳýỷỹỵ]+$/;

function normalize(text) {
  return text.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ");
}

function run() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.log('Skipping social extraction: Input file not found.');
    return;
  }

  console.log('Processing social data from sents.txt...');
  const content = fs.readFileSync(INPUT_FILE, 'utf8');
  const lines = content.split('\n');
  
  const wordCounts = new Map();

  lines.forEach(line => {
    const cleanLine = normalize(line);
    const words = cleanLine.split(/\s+/).filter(w => w && VIETNAMESE_REGEX.test(w));

    // Generate Bigrams (2-syllable words)
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i+1]}`;
      wordCounts.set(bigram, (wordCounts.get(bigram) || 0) + 1);
    }

    // Generate Trigrams (3-syllable words) - Optional but good for slangs like "hết nước chấm"
    for (let i = 0; i < words.length - 2; i++) {
        const trigram = `${words[i]} ${words[i+1]} ${words[i+2]}`;
        wordCounts.set(trigram, (wordCounts.get(trigram) || 0) + 1);
    }
  });

  // Filter by frequency
  const candidates = [];
  for (const [word, count] of wordCounts) {
    if (count >= MIN_FREQUENCY) {
      candidates.push(word);
    }
  }

  // Sort by frequency desc (optional, for manual review)
  candidates.sort((a, b) => wordCounts.get(b) - wordCounts.get(a));

  // Write to output
  fs.writeFileSync(OUTPUT_FILE, candidates.join('\n'));
  console.log(`Extracted ${candidates.length} candidate words/phrases (freq >= ${MIN_FREQUENCY})`);
}

run();
