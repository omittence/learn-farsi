import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import type { DraftDailyDebrief, DraftWord } from '../lib/types';
import { generateLetters, tokenizePersianWords } from './lib/persian';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function validateDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new Error(`Debrief date must be YYYY-MM-DD, got "${value}"`);
  }
}

function validateDraft(draft: DraftDailyDebrief) {
  validateDate(draft.debrief_date);

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
  const { data: wordRow } = await supabase
    .from('words')
    .upsert(
      {
        farsi: w.farsi,
        transliteration: w.transliteration,
        meaning: w.meaning,
        pronunciation: w.pronunciation,
        diacritics: w.diacritics,
      },
      { onConflict: 'farsi', ignoreDuplicates: true }
    )
    .select('id')
    .single();

  if (wordRow) return { id: wordRow.id, created: true };

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
  const draft: DraftDailyDebrief = JSON.parse(raw);
  validateDraft(draft);

  console.log(`\nIngesting daily debrief: "${draft.title_en}" (${draft.debrief_date})`);
  console.log(`Words: ${draft.words.length}`);

  const { data: debriefRow, error: debriefErr } = await supabase
    .from('daily_debriefs')
    .insert({
      debrief_date: draft.debrief_date,
      title: draft.title,
      title_en: draft.title_en,
      summary: draft.summary,
      full_text: draft.full_text,
      translation: draft.translation,
      published: true,
    })
    .select('id')
    .single();

  if (debriefErr || !debriefRow) {
    console.error('Failed to insert daily debrief:', debriefErr?.message);
    process.exit(1);
  }

  const debriefId = debriefRow.id;
  let createdWords = 0;
  let reusedWords = 0;

  console.log(`Daily debrief inserted: ${debriefId}`);

  for (let i = 0; i < draft.words.length; i++) {
    const word = {
      ...draft.words[i],
      letters: draft.words[i].letters?.length ? draft.words[i].letters : generateLetters(draft.words[i].farsi),
    };
    const { id: wordId, created } = await upsertWord(word);
    if (created) createdWords += 1;
    else reusedWords += 1;

    const { error: linkErr } = await supabase
      .from('daily_debrief_words')
      .upsert({ debrief_id: debriefId, word_id: wordId, sort_order: i });

    if (linkErr) {
      console.error(`Failed to link word "${word.farsi}":`, linkErr.message);
      process.exit(1);
    }

    const { count } = await supabase
      .from('letters')
      .select('id', { count: 'exact', head: true })
      .eq('word_id', wordId);

    if ((count ?? 0) === 0 && word.letters.length > 0) {
      const letterRows = word.letters.map((letter, li) => ({
        word_id: wordId,
        char: letter.char,
        name: letter.name,
        isolated: letter.isolated,
        initial: letter.initial,
        medial: letter.medial,
        final: letter.final,
        sound: letter.sound,
        sort_order: li,
      }));
      const { error: lettersErr } = await supabase.from('letters').insert(letterRows);
      if (lettersErr) {
        console.error(`Failed to insert letters for "${word.farsi}":`, lettersErr.message);
        process.exit(1);
      }
    }
  }

  console.log(`\nDone! Daily debrief "${draft.title_en}" ingested successfully.`);
  console.log(`Preview: /daily/${draft.debrief_date}`);
  console.log(`Words reused: ${reusedWords}`);
  console.log(`Words created: ${createdWords}`);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npm run ingest-daily-debrief <path-to-daily-debrief.json>');
  process.exit(1);
}

ingest(filePath).catch((err) => {
  console.error('Ingest failed:', err);
  process.exit(1);
});
