# Vietnamese Word Chain Dictionary Sources

This file documents the complete list of data sources used to build the final `vietnamese-wordlist.txt` for the Word Chain game.
This prevents future duplication of effort when looking for new word lists.

## 🟢 Used Sources (Merged via `mega-merge-dictionary.js`)

The current dictionary is a merge of the following 11+ distinct sources, filtered and cleaned.

### 1. Hồ Ngọc Đức Project
*   **File:** `src/data/sources/hongocduc-words.txt`
*   **Origin:** [Ho Ngoc Duc's Free Vietnamese Dictionary Project](https://www.informatik.uni-leipzig.de/~duc/Dict/)
*   **Description:** A fundamental open-source dictionary for Vietnamese.

### 2. TudienTV (Tu Dien Tieng Viet)
*   **File:** `src/data/sources/tudientv-words.txt`
*   **Origin:** Crawled/Extracted from online dictionary TudienTV.
*   **Description:** Broad coverage of common Vietnamese vocabulary.

### 3. Wiktionary Vietnamese
*   **File:** `src/data/sources/wiktionary-words.txt`
*   **Origin:** [Wiktionary Vietnamese Dump](https://vi.wiktionary.org/)
*   **Description:** Community-edited dictionary, very extensive but requires cleaning of non-Vietnamese terms.

### 4. Duyệt Dev / Viet74K
*   **File:** `src/data/sources/Viet74K.txt`
*   **Origin:** [duyet/vietnamese-wordlist](https://github.com/duyet/vietnamese-wordlist)
*   **Description:** A curated list of ~74,000 common Vietnamese words.

### 5. Winston Lee Collection
*   **Origin:** [winstonewert/vietnamese-wordlist](https://github.com/winstonewert/vietnamese-wordlist) (or similar compilation)
*   **Files:**
    *   `src/data/sources/tudien-main.txt` (Main core)
    *   `src/data/sources/tudien-danhtu.txt` (Nouns)
    *   `src/data/sources/tudien-dongtu.txt` (Verbs)
    *   `src/data/sources/tudien-tinhtu.txt` (Adjectives)
    *   `src/data/sources/tudien-photu.txt` (Adverbs)
    *   `src/data/sources/tudien-lientu.txt` (Conjunctions)
    *   `src/data/sources/tudien-danhtunhanxung.txt` (Pronouns)

### 6. Tagged Dictionaries (POS Tagged)
*   **Origin:** NLP Research Datasets
*   **Files:**
    *   `src/data/sources/tudien-tagged1.txt`
    *   `src/data/sources/tudien-tagged2.txt`
    *   `src/data/sources/tudien-ast.txt`

### 7. Vietnamese Syllable Lists
*   **Usage:** Used to validate if a word is composed of valid Vietnamese syllables.
*   **Files:**
    *   `src/data/sources/all-syllables-2022.txt`
    *   `src/data/sources/hieuthi-all-syllables.txt`
    *   `src/data/sources/vn-syllable-6674.txt`
    *   `src/data/sources/vn-syllable-7884.txt`

### 8. Pyvi NLP Toolkit
*   **File:** `src/data/sources/pyvi-words.txt`
*   **Origin:** [Pyvi (Python Vietnamese) Library](https://pypi.org/project/pyvi/)
*   **Description:** Dictionary used for tokenization in Pyvi.

### 9. VinAI Research
*   **Origin:** VinAI NLP projects (PhoBERT/BARTpho vocabularies)
*   **Files:**
    *   `src/data/sources/vinai-dictionary.txt`
    *   `src/data/sources/vinai-vn-dictionary.txt`

### 10. Previous Duyệt Wordlist (Legacy)
*   **File:** `src/data/sources/duyet-wordlist.txt` (if exists)
*   **Status:** Merged for backward compatibility.
*   **Origin:** Older version of the dataset used in this project.

---

## ⚙️ Generation Logic (Phase 3)

In addition to static files, the dictionary is expanded algorithmically:

### 11. Compound Word Generation
*   **Script:** `backend/scripts/mega-merge-dictionary.js`
*   **Method:** "Productive Morpheme Expansion"
*   **Logic:**
    1.  Identifies "Productive Prefixes" (e.g., *siêu, bất, vô, hóa*) and "Suffixes" (e.g., *gia, viên, hóa, học*).
    2.  Combines them with validated existing syllables/words.
    3.  Validates the resulting combinations against linguistic rules (frequency checking).
*   **Contribution:** Adds ~120,000 compound words (e.g., "siêu xe", "hóa học").

---

## 🧹 Cleaning & Validation Rules

All words from the above sources undergo these checks before acceptance:
1.  **Regex Check:** Must match Vietnamese alphabet (no numbers, punctuation, foreign chars).
2.  **Tone Check:** Must have valid tone placement (or be a valid unaccented syllable).
3.  **Length Check:** Must be 2-4 syllables (single syllables excluded for game difficulty, >4 excluded to avoid phrases).
4.  **Blacklist:** English stop words (*admin, user, test*) and technical terms (*html, css*) are removed.

## 📊 Summary
*   **Total Sources:** ~10+ distinct datasets.
*   **Total Words:** ~200,173 unique words.
