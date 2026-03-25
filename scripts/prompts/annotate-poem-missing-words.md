# Poem Missing Words Annotator

Fill only the unresolved words in `stories/drafts/missing-<slug>.json`.

## Requirements

- Do not add or remove items from `words`
- Keep `farsi` unchanged
- Keep prefilled `diacritics` unless it is clearly wrong or empty
- Fill only:
  - `transliteration`
  - `meaning`
  - `pronunciation`
  - `diacritics` when needed
- Do not add `letters`
- Do not return a full poem/story JSON

## Output format

Output ONLY valid JSON:

{
  "version": 1,
  "source_raw_path": "<same as input>",
  "note": "<same as input>",
  "words": [
    {
      "farsi": "<unchanged>",
      "normalized": "<unchanged>",
      "diacritics": "<filled or corrected>",
      "transliteration": "<ALA-LC romanization>",
      "meaning": "<English meaning>",
      "pronunciation": "<stressed syllables, e.g. GOR-be>"
    }
  ]
}

## Workflow

1. Run `npm run fetch-poem <ganjoor-url>`
2. Run `npm run prepare-poem-annotation stories/drafts/raw-<slug>.json`
3. Fill `stories/drafts/missing-<slug>.json` using this prompt
4. Add `description` and `translation` to `stories/drafts/annotation-<slug>.json`
5. Run `npm run finalize-poem stories/drafts/annotation-<slug>.json`
6. Run `npm run ingest stories/drafts/<slug>.json`
