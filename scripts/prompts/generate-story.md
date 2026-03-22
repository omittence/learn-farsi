# Farsi Story Generator

Generate a complete Farsi reading story in the exact JSON format below.

## Target level: {LEVEL}
## Topic: {TOPIC}

## Requirements

- `full_text` must be natural Farsi prose (not a word list)
- Words appropriate for the target level:
  - Beginner: 4–8 common words, simple present tense
  - Intermediate: 10–20 words, mix of tenses
  - Advanced: 25+ words, complex sentences
- Every meaningful token in `full_text` must appear in `words` (including particles like و / که / را)
- `diacritics` is the word with full vowel marks (harakat)
- `pronunciation` shows stressed syllables in English (e.g. "GOR-be")
- `transliteration` uses ALA-LC Persian romanization
- `letters` covers each character in the word left-to-right (visual order)
- `letter.char` is the isolated Perso-Arabic character
- All four contextual forms must be included: isolated, initial, medial, final
- `letter.sound` is the closest IPA symbol (e.g. "b", "ɑː", "ʃ")

## Output format

Output ONLY valid JSON — no markdown fences, no commentary before or after:

{
  "title": "<Farsi title>",
  "title_en": "<English title>",
  "level": "<Beginner|Intermediate|Advanced>",
  "description": "<1–2 sentence English description>",
  "full_text": "<full Farsi story text>",
  "translation": "<full English translation>",
  "words": [
    {
      "farsi": "<word as it appears in full_text>",
      "transliteration": "<ALA-LC romanization>",
      "meaning": "<English meaning>",
      "pronunciation": "<stressed syllables, e.g. GOR-be>",
      "diacritics": "<word with harakat>",
      "letters": [
        {
          "char": "<single letter character>",
          "name": "<Persian letter name, e.g. Gaf, Be, Nun>",
          "isolated": "<isolated form>",
          "initial": "<initial form>",
          "medial": "<medial form>",
          "final": "<final form>",
          "sound": "<IPA symbol>"
        }
      ]
    }
  ]
}

## Usage workflow

1. Replace {LEVEL} and {TOPIC} above with your values
2. Paste this prompt into a Claude conversation
3. Save the JSON output to `stories/drafts/<topic>.json`
4. Review the Farsi text and letter breakdowns for accuracy
5. Run: `npm run ingest stories/drafts/<topic>.json`
6. Verify in the app at the URL printed by the ingest script
7. Git push to trigger a Vercel rebuild
