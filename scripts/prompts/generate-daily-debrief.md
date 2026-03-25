# Daily Debrief Generator

Generate a daily Farsi reading debrief in valid JSON for the `learn-farsi` app.

## Purpose

Create a learner-friendly digest of the top world stories for one specific date.

## Requirements

- Use current, real world news for the target date
- Synthesize multiple major stories into one coherent Farsi reading
- Keep the prose natural, readable, and informative
- Write for language learners, not for experts
- `summary` must be a short English summary for the homepage card
- `translation` must be a full English translation of `full_text`
- Every meaningful token in `full_text` must appear in `words`
- Include common particles such as `و`, `که`, `در`, `به`, `از`, `را`
- `letters` must be included for each word
- `diacritics` should contain the word with helpful harakat when useful

## Output format

Output ONLY valid JSON:

{
  "debrief_date": "2026-03-23",
  "title": "<Farsi title>",
  "title_en": "<English title>",
  "summary": "<1-2 sentence English summary for homepage preview>",
  "full_text": "<full Farsi daily debrief>",
  "translation": "<full English translation>",
  "words": [
    {
      "farsi": "<word as it appears in full_text>",
      "transliteration": "<ALA-LC romanization>",
      "meaning": "<English meaning>",
      "pronunciation": "<stressed syllables>",
      "diacritics": "<word with harakat when useful>",
      "letters": [
        {
          "char": "<single character>",
          "name": "<letter name>",
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

## Workflow

1. Research the top world stories for the chosen date
2. Write the learner-friendly Farsi debrief
3. Save it to `daily-debriefs/drafts/YYYY-MM-DD.json`
4. Run `npm run ingest-daily-debrief daily-debriefs/drafts/YYYY-MM-DD.json`
