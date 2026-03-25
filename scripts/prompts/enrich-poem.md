# Enrich Poem Seed

You are enriching a Ganjoor poem seed file into a full Farsi Reader story JSON.

## Your task

1. Read the seed file at the path the user gave you
2. For each word in `unique_words`, generate complete word data
3. Build the full story JSON and write it to `stories/drafts/<slug>.json`
4. Delete the `.seed.json` file when done

## Seed file format

```json
{
  "_type": "ganjoor_seed",
  "ganjoor_url": "...",
  "poet": "حافظ",
  "poet_en": "hafez",
  "poem_title": "غزل شمارهٔ ۱",
  "full_text": "...",
  "translation_placeholder": "",
  "unique_words": ["الا", "یا", ...],
  "suggested_level": "Advanced"
}
```

## Output format

Write a file matching the standard story draft format:

```json
{
  "title": "<poet name in Farsi> — <poem title>",
  "title_en": "<poet_en in English title case> — <poem title translated or transliterated>",
  "level": "<use suggested_level from seed>",
  "description": "<1–2 sentence English description of the poem and poet>",
  "full_text": "<copy exactly from seed>",
  "translation": "<translate the full_text to English, preserving line breaks as \\n>",
  "words": [ ... ]
}
```

## Word object rules

Generate one entry per word in `unique_words`. Order the `words` array by first appearance in `full_text`.

```json
{
  "farsi": "<word as it appears in full_text>",
  "transliteration": "<ALA-LC Persian romanization>",
  "meaning": "<concise English meaning, e.g. 'wine' or 'cup-bearer'>",
  "pronunciation": "<stressed syllables in caps, e.g. 'SAA-qi'>",
  "diacritics": "<word with full harakat vowel marks>",
  "letters": [
    {
      "char": "<single Perso-Arabic character>",
      "name": "<letter name, e.g. Alef, Be, Sin, Shin>",
      "isolated": "<isolated form>",
      "initial": "<initial form>",
      "medial": "<medial form>",
      "final": "<final form>",
      "sound": "<IPA symbol>"
    }
  ]
}
```

## Letter rules

- List letters left-to-right in logical order (matching sort_order 0, 1, 2...)
- `char` is the base letter (isolated form)
- Include all four positional forms even if some are identical
- For letters that don't connect on the left (ا، د، ذ، ر، ز، و), initial = isolated and medial = final
- Sound uses IPA: b, p, t, s, ʃ, x, ɣ, f, q, k, ɡ, l, m, n, h, r, z, ʒ, tʃ, dʒ, v, j, ʔ, æ, ɑː, iː, uː, e, o

## Poetry-specific notes

- `full_text` uses ` / ` to separate hemistiches within a couplet, and `\n` between couplets — preserve this exactly
- Classical poetry vocabulary: use scholarly but readable English meanings (e.g. "beloved", "wine-bearer", "veil of mystery")
- For archaic or ambiguous words, give the most common classical Persian interpretation
- `description` should mention the poet, the collection (ghazal/masnavi/etc.), and the theme

## Output file naming

Name the output file by removing `.seed.json` and replacing with `.json`:
- Input:  `stories/drafts/hafez-ghazal-1.seed.json`
- Output: `stories/drafts/hafez-ghazal-1.json`
