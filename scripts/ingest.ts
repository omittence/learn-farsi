import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import type { DraftStory, DraftWord } from '../lib/types';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertWord(w: DraftWord): Promise<string> {
  const { data: wordRow } = await supabase
    .from('words')
    .upsert(
      {
        farsi:           w.farsi,
        transliteration: w.transliteration,
        meaning:         w.meaning,
        pronunciation:   w.pronunciation,
        diacritics:      w.diacritics,
      },
      { onConflict: 'farsi', ignoreDuplicates: true }
    )
    .select('id')
    .single();

  if (wordRow) return wordRow.id;

  // ignoreDuplicates skipped the insert — fetch the existing row
  const { data: existing, error } = await supabase
    .from('words')
    .select('id')
    .eq('farsi', w.farsi)
    .single();

  if (error || !existing) {
    console.error(`Failed to resolve word "${w.farsi}":`, error?.message);
    process.exit(1);
  }
  return existing.id;
}

async function ingest(filePath: string) {
  const absolute = resolve(process.cwd(), filePath);
  const raw = readFileSync(absolute, 'utf-8');
  const draft: DraftStory = JSON.parse(raw);

  console.log(`\nIngesting: "${draft.title_en}" (${draft.level})`);
  console.log(`Words: ${draft.words.length}`);

  // 1. Insert story
  const { data: storyRow, error: storyErr } = await supabase
    .from('stories')
    .insert({
      title:       draft.title,
      title_en:    draft.title_en,
      level:       draft.level.toLowerCase(),
      description: draft.description,
      full_text:   draft.full_text,
      translation: draft.translation,
      layout:      draft.layout ?? 'prose',
      source:      draft.source ?? 'original',
      ganjoor_id:  draft.ganjoor_id ?? null,
    })
    .select('id')
    .single();

  if (storyErr || !storyRow) {
    console.error('Failed to insert story:', storyErr?.message);
    process.exit(1);
  }
  const storyId = storyRow.id;
  console.log(`Story inserted: ${storyId}`);

  // 2. Process each word
  for (let i = 0; i < draft.words.length; i++) {
    const w = draft.words[i];
    const wordId = await upsertWord(w);

    // Link word to story
    const { error: linkErr } = await supabase
      .from('story_words')
      .upsert({ story_id: storyId, word_id: wordId, sort_order: i });
    if (linkErr) {
      console.error(`Failed to link word "${w.farsi}":`, linkErr.message);
      process.exit(1);
    }

    // Insert letters only if this word has none yet
    const { count } = await supabase
      .from('letters')
      .select('id', { count: 'exact', head: true })
      .eq('word_id', wordId);

    if ((count ?? 0) === 0 && w.letters?.length > 0) {
      const letterRows = w.letters.map((l, li) => ({
        word_id:    wordId,
        char:       l.char,
        name:       l.name,
        isolated:   l.isolated,
        initial:    l.initial,
        medial:     l.medial,
        final:      l.final,
        sound:      l.sound,
        sort_order: li,
      }));
      const { error: lettersErr } = await supabase.from('letters').insert(letterRows);
      if (lettersErr) {
        console.error(`Failed to insert letters for "${w.farsi}":`, lettersErr.message);
        process.exit(1);
      }
    }

    console.log(`  [${i + 1}/${draft.words.length}] ${w.farsi} (${w.meaning})`);
  }

  console.log(`\nDone! Story "${draft.title_en}" ingested successfully.`);
  console.log(`Story ID: ${storyId}`);
  console.log(`Preview:  /story/${storyId}`);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npm run ingest <path-to-draft.json>');
  process.exit(1);
}

ingest(filePath).catch((err) => {
  console.error('Ingest failed:', err);
  process.exit(1);
});
