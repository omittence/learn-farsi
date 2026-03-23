import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { DraftWord, Letter } from '../../lib/types';
import { generateLetters, normalizeLookupKey } from './persian';

export interface CachedLexiconFile {
  version: 1;
  entries: Record<string, DraftWord>;
}

export interface ResolvedLexiconWord extends DraftWord {
  source: 'db' | 'cache';
}

const DEFAULT_CACHE_PATH = resolve(process.cwd(), 'stories/lexicon-cache.json');

export function getLexiconCachePath(): string {
  return DEFAULT_CACHE_PATH;
}

export function loadLexiconCache(cachePath = DEFAULT_CACHE_PATH): CachedLexiconFile {
  if (!existsSync(cachePath)) {
    return { version: 1, entries: {} };
  }

  return JSON.parse(readFileSync(cachePath, 'utf8')) as CachedLexiconFile;
}

export function saveLexiconCache(cache: CachedLexiconFile, cachePath = DEFAULT_CACHE_PATH) {
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, JSON.stringify(cache, null, 2) + '\n');
}

export function ensureWordLetters(word: DraftWord): DraftWord {
  return {
    ...word,
    letters: word.letters?.length ? word.letters : generateLetters(word.farsi),
  };
}

function mapLetters(letters: Letter[] | null | undefined): DraftWord['letters'] {
  return (letters ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ char, name, isolated, initial, medial, final, sound }) => ({
      char,
      name,
      isolated,
      initial,
      medial,
      final,
      sound,
    }));
}

export async function loadDbLexicon(): Promise<Map<string, ResolvedLexiconWord>> {
  config({ path: resolve(process.cwd(), '.env.local') });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from('words')
    .select(`
      farsi,
      transliteration,
      meaning,
      pronunciation,
      diacritics,
      letters (
        char,
        name,
        isolated,
        initial,
        medial,
        final,
        sound,
        sort_order
      )
    `);

  if (error) {
    throw new Error(`Failed to load words from Supabase: ${error.message}`);
  }

  const lexicon = new Map<string, ResolvedLexiconWord>();
  for (const row of data ?? []) {
    const word = ensureWordLetters({
      farsi: row.farsi,
      transliteration: row.transliteration,
      meaning: row.meaning,
      pronunciation: row.pronunciation,
      diacritics: row.diacritics,
      letters: mapLetters(row.letters as Letter[]),
    });

    const key = normalizeLookupKey(row.farsi);
    if (!key || lexicon.has(key)) continue;
    lexicon.set(key, { ...word, source: 'db' });
  }

  return lexicon;
}

export function loadCacheLexicon(cachePath = DEFAULT_CACHE_PATH): Map<string, ResolvedLexiconWord> {
  const cache = loadLexiconCache(cachePath);
  const lexicon = new Map<string, ResolvedLexiconWord>();

  for (const [key, word] of Object.entries(cache.entries)) {
    if (!key) continue;
    lexicon.set(key, { ...ensureWordLetters(word), source: 'cache' });
  }

  return lexicon;
}

export function upsertCacheEntries(words: DraftWord[], cachePath = DEFAULT_CACHE_PATH) {
  const cache = loadLexiconCache(cachePath);

  for (const word of words) {
    const entry = ensureWordLetters(word);
    cache.entries[normalizeLookupKey(entry.farsi)] = entry;
  }

  saveLexiconCache(cache, cachePath);
}
