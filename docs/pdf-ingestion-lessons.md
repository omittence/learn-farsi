# PDF → Story Ingestion: What Went Wrong and How to Fix It

## Overview

Ingesting one 19-page Dari picture book from PDF took significantly longer than it should have. This document captures every blocker, its root cause, and what a faster pipeline would look like.

---

## Issues Encountered

### 1. PDF text uses Arabic presentation forms

**What happened:** Python's `pypdf` extracted text in Arabic Presentation Forms (Unicode block U+FB50–FDFF, U+FE70–FEFF) instead of base Arabic characters (U+0600–U+06FF). For example, the letter خ (U+062E) appeared as ﺨ (U+FEA8). The JavaScript tokenizer (`\p{L}`) matches both, so rendering works — but the extracted tokens don't match anything a human would type.

**Fix applied:** NFKC normalization via Python's `unicodedata.normalize('NFKC', text)` converts presentation forms to base Unicode before any further processing.

**Lesson:** Always NFKC-normalize text extracted from PDFs before tokenizing. This should be the first step in any extraction script.

---

### 2. Dari uses ھ (U+06BE), not ه (U+0647)

**What happened:** Dari (Afghan Persian) uses the "do-chashmi heh" character ھ (U+06BE) where Iranian Persian uses ه (U+0647). Every word ending in "e" or "a" — خانھ، دریاچھ، کھ، بھ — uses this character. The `generateLetters` function in `scripts/lib/persian.ts` only knew about ه (U+0647), so the ingest crashed with `Unsupported Persian letter "ھ"` on word #3, after the story record had already been committed to the database.

**Fix applied:** Added ھ to `LETTER_SPECS` in `persian.ts`. Cleaned up the orphaned story record manually before re-running.

**Lesson:** Any Dari content will hit this. The fix is one line in `persian.ts` — but the crash-after-partial-insert pattern is dangerous (see issue #5 below).

---

### 3. Garbled text on some PDF pages

**What happened:** Two pages had unusable extracted text:
- **Page 4:** The words "ماهی گیری" appeared concatenated before the sentence start — `گیریماھیپس از آن` — a PDF column/flow rendering artifact.
- **Page 7:** A completely unrelated paragraph ("وقتی دوستانم با من صحبت نمی کنند...") appeared after the story text, apparently from a background text layer in the PDF from a different document.

**Fix applied:** Manual corrections dictionary in the extraction script; page 7's spurious text stripped by detecting its start token.

**Lesson:** Never trust PDF text extraction for children's picture books. Visual PDFs with embedded fonts and overlapping text layers produce unreliable output. Confirm extracted text visually before building the word list.

---

### 4. No automated migration path

**What happened:** The DB migration (`ALTER TABLE sentences ADD COLUMN image_url text`) could not be applied automatically. There was no postgres password in `.env.local`, `psql` wasn't installed, and the Supabase CLI required interactive login (`supabase login`). The service role key cannot run DDL. The user had to apply the migration manually in the Supabase dashboard.

**Lesson:** Either add a `DATABASE_URL` (with postgres password) to `.env.local` for local migration scripts, or commit migrations to Supabase's managed migration system so `supabase db push` handles them automatically in CI. Right now, every schema change requires a manual dashboard step.

---

### 5. Ingest is not idempotent — partial failures leave orphaned data

**What happened:** When the ingest crashed on word #3 (due to the missing ھ letter), the story row had already been committed. Re-running ingest would have created a duplicate story. A manual cleanup query was required.

**Fix applied:** Deleted the orphaned story via a one-off Node script before re-running.

**Lesson:** The ingest script should either:
- Wrap the entire ingest in a transaction (insert story + words + sentences atomically), or
- Check for an existing story with the same `title_en` / `source` and skip or upsert it.

Currently any mid-run crash requires manual DB cleanup.

---

### 6. PDF tooling wasn't installed

**What happened:** `pdftotext` (from poppler) wasn't installed, so the `Read` tool couldn't render the PDF. Had to install `pypdf` for text extraction, then separately install `pymupdf` (PyMuPDF / fitz) for image rasterization. Both required `--break-system-packages` since the system Python is managed by the OS.

**Lesson:** Add `poppler` and `pymupdf` to the project's dev setup docs or a `Brewfile`. Alternatively, a single `requirements.txt` with `pymupdf` covers both text extraction and image rasterization — no need for two libraries.

---

### 7. 119 words required manual annotation

**What happened:** All 119 unique Dari words needed transliteration, English meaning, pronunciation, diacritics, POS, and lemma — written by hand. This was the single most time-consuming part of the process.

**Lesson:** This should be automated. The existing `prepare-poem-annotation.ts` / Claude annotation pipeline does this for Persian poems. The same flow should work for Dari prose:
1. Run hazm (or a Claude prompt) over the extracted text to get POS and lemma.
2. Use a Claude prompt to fill transliteration, meaning, and pronunciation in bulk.
3. Human review only for corrections, not first-pass entry.

---

### 8. Sentence image_url required a new schema column

**What happened:** The story schema had no image support. Adding it required: a new migration, a types change, an ingest script change, a queries verification, and a ReadingView component update — five separate files touched for a single new field.

**Lesson:** This was unavoidable for the first picture book, but the pattern is now established. Future picture books can be ingested immediately since the schema already supports `image_url`.

---

## Time Breakdown (approximate)

| Phase | Time sink |
|-------|-----------|
| Reading PDF (no poppler) | Needed to install pymupdf |
| Codebase exploration | Understanding sentence/word/ingest pipeline |
| Schema design for images | New migration + 5 file changes |
| Normalizing Dari text | NFKC normalization, garbled page fixes |
| Word annotation (119 words) | Largest single cost — fully manual |
| Debug: missing ھ letter | Crash + orphan cleanup + re-run |
| Debug: no migration path | User had to apply manually |

---

## How to Make the Next One Faster

### Short-term (do these now)

1. **Add `pymupdf` to `requirements.txt`** so the extraction script works without setup friction.
2. **Add `DATABASE_URL` to `.env.local`** (Supabase project settings → Database → Connection string) so migrations can run via script.
3. **Make ingest idempotent** — at minimum, check for an existing story by `title_en` before inserting, and skip gracefully if it already exists.

### Medium-term

4. **Build a `prepare-dari-story.ts` script** analogous to `prepare-poem-annotation.ts`. It should:
   - Accept a PDF path
   - Extract + NFKC-normalize text per page
   - Call Claude to generate all word annotations in one batch prompt
   - Output a ready-to-ingest draft JSON with `image_url` fields pre-filled
5. **Add a Claude annotation prompt** for Dari prose (similar to `scripts/prompts/annotate-poem-missing-words.md`) that generates transliteration, meaning, pronunciation, POS, and lemma for a given word list in one shot.

### Long-term

6. **Structured picture book format** — define a `PictureBook` source type alongside `original` and `ganjoor` so the UI can apply picture-book-specific layout automatically, without needing `sentences` with `image_url` as a workaround.
7. **Supabase migrations in CI** — commit and apply all migrations via `supabase db push` in a deploy step so schema and code always stay in sync.

---

## Reusable Artifacts from This Work

Everything built for this story is now infrastructure for the next one:

- `scripts/extract-pdf-images.py` — reusable for any picture book PDF
- `supabase/migrations/010_sentence_image_url.sql` — already applied; future stories get image support for free
- `components/ReadingView.tsx` (updated) — renders picture-book layout for any story with sentence `image_url`s
- `scripts/lib/persian.ts` — now supports ھ (U+06BE), so all Dari content will work
- `stories/drafts/bear-fishing.json` — template for the draft JSON format with `image_url` in sentences
