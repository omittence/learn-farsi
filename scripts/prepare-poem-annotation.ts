import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import type { DraftWord } from '../lib/types';
import { loadCacheLexicon, loadDbLexicon } from './lib/lexicon';
import type {
  MissingWordCandidate,
  MissingWordsFile,
  PoemAnnotationScaffold,
  RawPoemDraft,
} from './lib/poem-files';
import { slugFromRawPath } from './lib/poem-files';
import { normalizeLookupKey } from './lib/persian';

function requireArg(): string {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npm run prepare-poem-annotation <path-to-raw-poem.json>');
    process.exit(1);
  }
  return filePath;
}

async function run(filePath: string) {
  const absolute = resolve(process.cwd(), filePath);
  const raw = JSON.parse(readFileSync(absolute, 'utf8')) as RawPoemDraft;
  const outputDir = dirname(absolute);
  const slug = slugFromRawPath(filePath);
  const existingFinalDraftPath = resolve(outputDir, `${slug}.json`);
  const existingFinalDraft = existsSync(existingFinalDraftPath)
    ? JSON.parse(readFileSync(existingFinalDraftPath, 'utf8')) as Partial<{
        title_en: string;
        level: 'Advanced';
        description: string;
        translation: string;
      }>
    : null;

  const [dbLexicon, cacheLexicon] = await Promise.all([
    loadDbLexicon(),
    Promise.resolve(loadCacheLexicon()),
  ]);

  const reusedWords: DraftWord[] = [];
  const missingWords: MissingWordCandidate[] = [];
  let reusedFromDb = 0;
  let reusedFromCache = 0;

  for (const farsi of raw.unique_words) {
    const normalized = normalizeLookupKey(farsi);
    const diacritics = raw.diacritics_map?.[normalized] ?? farsi;
    const fromDb = dbLexicon.get(normalized);
    const fromCache = cacheLexicon.get(normalized);
    const resolved = fromDb ?? fromCache;

    if (resolved) {
      reusedWords.push({
        farsi,
        transliteration: resolved.transliteration,
        meaning: resolved.meaning,
        pronunciation: resolved.pronunciation,
        letters: resolved.letters,
        diacritics: diacritics || resolved.diacritics,
      });
      if (resolved.source === 'db') reusedFromDb += 1;
      if (resolved.source === 'cache') reusedFromCache += 1;
      continue;
    }

    missingWords.push({
      farsi,
      normalized,
      diacritics,
      transliteration: '',
      meaning: '',
      pronunciation: '',
    });
  }

  const scaffoldPath = resolve(outputDir, `annotation-${slug}.json`);
  const missingWordsPath = resolve(outputDir, `missing-${slug}.json`);
  const finalDraftPath = resolve(outputDir, `${slug}.json`);

  const scaffold: PoemAnnotationScaffold = {
    version: 1,
    source_raw_path: filePath,
    output_slug: slug,
    final_draft_path: `stories/drafts/${slug}.json`,
    missing_words_path: `stories/drafts/missing-${slug}.json`,
    title: raw.title,
    title_en: existingFinalDraft?.title_en ?? raw.title_en,
    level: existingFinalDraft?.level ?? 'Advanced',
    layout: 'poem',
    source: 'ganjoor',
    ganjoor_id: raw.ganjoor_id,
    ganjoor_url: raw.ganjoor_url,
    description: existingFinalDraft?.description ?? '',
    translation: existingFinalDraft?.translation ?? '',
    full_text: raw.full_text,
    word_order: raw.unique_words,
    reused_words: reusedWords,
  };

  const missingFile: MissingWordsFile = {
    version: 1,
    source_raw_path: filePath,
    note:
      'Fill only the lexical fields for each word. Keep farsi unchanged. Keep prefilled diacritics unless you need to correct them.',
    words: missingWords,
  };

  writeFileSync(scaffoldPath, JSON.stringify(scaffold, null, 2) + '\n');
  writeFileSync(missingWordsPath, JSON.stringify(missingFile, null, 2) + '\n');

  console.log(`Prepared poem annotation for ${raw.title_en}`);
  console.log(`Raw file:        ${filePath}`);
  console.log(`Scaffold:        stories/drafts/annotation-${slug}.json`);
  console.log(`Missing words:   stories/drafts/missing-${slug}.json`);
  console.log(`Final draft:     stories/drafts/${slug}.json`);
  console.log(`Unique words:    ${raw.unique_words.length}`);
  console.log(`Reused from DB:  ${reusedFromDb}`);
  console.log(`Reused from cache: ${reusedFromCache}`);
  console.log(`Missing words:   ${missingWords.length}`);
  if (missingWords.length > 0) {
    console.log('\nNext: annotate only stories/drafts/missing-' + slug + '.json, then run npm run finalize-poem stories/drafts/annotation-' + slug + '.json');
  } else {
    console.log('\nNext: run npm run finalize-poem stories/drafts/annotation-' + slug + '.json');
  }
}

run(requireArg()).catch((error) => {
  console.error('Prepare failed:', error);
  process.exit(1);
});
