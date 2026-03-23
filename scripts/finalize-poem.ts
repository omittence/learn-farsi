import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import type { DraftStory, DraftWord } from '../lib/types';
import { ensureWordLetters, upsertCacheEntries } from './lib/lexicon';
import type { MissingWordsFile, PoemAnnotationScaffold } from './lib/poem-files';

function requireArg(): string {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npm run finalize-poem <path-to-annotation-scaffold.json>');
    process.exit(1);
  }
  return filePath;
}

function validateWord(word: DraftWord) {
  if (!word.farsi.trim()) throw new Error('Word is missing farsi');
  if (!word.transliteration.trim()) throw new Error(`Word "${word.farsi}" is missing transliteration`);
  if (!word.meaning.trim()) throw new Error(`Word "${word.farsi}" is missing meaning`);
  if (!word.pronunciation.trim()) throw new Error(`Word "${word.farsi}" is missing pronunciation`);
  if (!word.diacritics.trim()) throw new Error(`Word "${word.farsi}" is missing diacritics`);
}

async function run(filePath: string) {
  const scaffoldPath = resolve(process.cwd(), filePath);
  const scaffold = JSON.parse(readFileSync(scaffoldPath, 'utf8')) as PoemAnnotationScaffold;
  const absoluteMissingPath = resolve(dirname(scaffoldPath), scaffold.missing_words_path.split('/').pop() ?? '');
  const missingFile = JSON.parse(readFileSync(absoluteMissingPath, 'utf8')) as MissingWordsFile;

  if (!scaffold.description.trim()) {
    throw new Error(`Description is empty in ${filePath}`);
  }
  if (!scaffold.translation.trim()) {
    throw new Error(`Translation is empty in ${filePath}`);
  }

  const wordsByFarsi = new Map<string, DraftWord>();
  for (const word of scaffold.reused_words) {
    const ensured = ensureWordLetters({
      farsi: word.farsi,
      transliteration: word.transliteration,
      meaning: word.meaning,
      pronunciation: word.pronunciation,
      diacritics: word.diacritics,
      letters: word.letters,
    });
    validateWord(ensured);
    wordsByFarsi.set(ensured.farsi, ensured);
  }

  const newlyAnnotated: DraftWord[] = [];
  for (const word of missingFile.words) {
    const ensured = ensureWordLetters({
      farsi: word.farsi,
      transliteration: word.transliteration,
      meaning: word.meaning,
      pronunciation: word.pronunciation,
      diacritics: word.diacritics || word.farsi,
      letters: [],
    });
    validateWord(ensured);
    wordsByFarsi.set(ensured.farsi, ensured);
    newlyAnnotated.push(ensured);
  }

  const duplicateCheck = new Set<string>();
  const orderedWords = scaffold.word_order.map((farsi) => {
    if (duplicateCheck.has(farsi)) {
      throw new Error(`Duplicate word "${farsi}" in word_order`);
    }
    duplicateCheck.add(farsi);
    const resolved = wordsByFarsi.get(farsi);
    if (!resolved) {
      throw new Error(`Missing annotation for "${farsi}"`);
    }
    return resolved;
  });

  const draft: DraftStory & { layout: 'poem'; source: 'ganjoor'; ganjoor_id: number } = {
    title: scaffold.title,
    title_en: scaffold.title_en,
    level: scaffold.level,
    description: scaffold.description,
    full_text: scaffold.full_text,
    translation: scaffold.translation,
    words: orderedWords,
    layout: scaffold.layout,
    source: scaffold.source,
    ganjoor_id: scaffold.ganjoor_id,
  };

  const finalDraftPath = resolve(dirname(scaffoldPath), scaffold.final_draft_path.split('/').pop() ?? '');
  writeFileSync(finalDraftPath, JSON.stringify(draft, null, 2) + '\n');
  if (newlyAnnotated.length > 0) {
    upsertCacheEntries(newlyAnnotated);
  }

  console.log(`Finalized poem draft: ${scaffold.final_draft_path}`);
  console.log(`Words reused: ${scaffold.reused_words.length}`);
  console.log(`Words added:  ${newlyAnnotated.length}`);
}

run(requireArg()).catch((error) => {
  console.error('Finalize failed:', error);
  process.exit(1);
});
