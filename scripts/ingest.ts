import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import type { DraftStory, DraftWord } from '../lib/types';
import { generateLetters, tokenizePersianWords } from './lib/persian';

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

function validateDraft(draft: DraftStory) {
  const tokenSet = new Set(tokenizePersianWords(draft.full_text));
  const wordSet = new Set<string>();

  for (const word of draft.words) {
    if (wordSet.has(word.farsi)) {
      throw new Error(`Duplicate word "${word.farsi}" in draft`);
    }
    wordSet.add(word.farsi);
  }

  for (const token of tokenSet) {
    if (!wordSet.has(token)) {
      throw new Error(`Missing word entry for token "${token}"`);
    }
  }
}

async function upsertWord(w: DraftWord): Promise<{ id: string; created: boolean }> {
  const insertData: Record<string, string> = {
    farsi:           w.farsi,
    transliteration: w.transliteration,
    meaning:         w.meaning,
    pronunciation:   w.pronunciation,
    diacritics:      w.diacritics,
  };
  if (w.pos) insertData.pos = w.pos;
  if (w.lemma) insertData.lemma = w.lemma;

  const { data: wordRow } = await supabase
    .from('words')
    .upsert(insertData, { onConflict: 'farsi', ignoreDuplicates: true })
    .select('id')
    .single();

  if (wordRow) return { id: wordRow.id, created: true };

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
  return { id: existing.id, created: false };
}

async function ingest(filePath: string) {
  const absolute = resolve(process.cwd(), filePath);
  const raw = readFileSync(absolute, 'utf-8');
  const draft: DraftStory = JSON.parse(raw);
  validateDraft(draft);

  console.log(`\nIngesting: "${draft.title_en}" (${draft.level})`);
  console.log(`Words: ${draft.words.length}`);
  let createdWords = 0;
  let reusedWords = 0;

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
    const word = {
      ...w,
      letters: w.letters?.length ? w.letters : generateLetters(w.farsi),
    };
    const { id: wordId, created } = await upsertWord(word);
    if (created) createdWords += 1;
    else reusedWords += 1;

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

    if ((count ?? 0) === 0 && word.letters.length > 0) {
      const letterRows = word.letters.map((l, li) => ({
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

    console.log(`  [${i + 1}/${draft.words.length}] ${word.farsi} (${word.meaning})`);
  }

  // Ingest sentences if available
  if (draft.sentences && draft.sentences.length > 0) {
    console.log(`\nIngesting ${draft.sentences.length} sentences...`);

    const wordIdMap = new Map<string, string>();
    for (const w of draft.words) {
      const { data } = await supabase
        .from('words')
        .select('id')
        .eq('farsi', w.farsi)
        .single();
      if (data) wordIdMap.set(w.farsi, data.id);
    }

    for (let si = 0; si < draft.sentences.length; si++) {
      const sent = draft.sentences[si];
      const { data: sentRow, error: sentErr } = await supabase
        .from('sentences')
        .insert({
          document_id: storyId,
          document_type: 'story',
          text: sent.text,
          translation: sent.translation ?? null,
          sort_order: si,
        })
        .select('id')
        .single();

      if (sentErr || !sentRow) {
        console.error(`Failed to insert sentence ${si}:`, sentErr?.message);
        continue;
      }

      const swRows = sent.tokens
        .map((tok, ti) => {
          const wordId = wordIdMap.get(tok.surface);
          if (!wordId) return null;
          return {
            sentence_id: sentRow.id,
            word_id: wordId,
            sort_order: ti,
            dep_head: tok.dep_head,
            dep_rel: tok.dep_rel,
          };
        })
        .filter(Boolean);

      if (swRows.length > 0) {
        const { error: swErr } = await supabase
          .from('sentence_words')
          .insert(swRows);
        if (swErr) {
          console.error(`Failed to insert sentence_words for sentence ${si}:`, swErr.message);
        }
      }
    }
    console.log(`Sentences ingested: ${draft.sentences.length}`);
  }

  console.log(`\nDone! Story "${draft.title_en}" ingested successfully.`);
  console.log(`Story ID: ${storyId}`);
  console.log(`Preview:  /story/${storyId}`);
  console.log(`Words reused: ${reusedWords}`);
  console.log(`Words created: ${createdWords}`);
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
