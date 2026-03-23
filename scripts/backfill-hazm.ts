import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';
import { config } from 'dotenv';
import { startHazm } from './lib/hazm-client';
import type { HazmResult } from './lib/hazm-client';

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

interface Document {
  id: string;
  full_text: string;
  title_en: string;
  layout?: string;
}

async function backfillDocument(
  doc: Document,
  documentType: 'story' | 'daily_debrief',
  hazm: Awaited<ReturnType<typeof startHazm>>,
) {
  const label = `${documentType} "${doc.title_en}"`;

  // Check if already backfilled (has sentences)
  const { count } = await supabase
    .from('sentences')
    .select('id', { count: 'exact', head: true })
    .eq('document_id', doc.id)
    .eq('document_type', documentType);

  if ((count ?? 0) > 0) {
    console.log(`  Skipping ${label} — already has sentences`);
    return;
  }

  const isPoem = doc.layout === 'poem';
  let result: HazmResult;

  try {
    result = await hazm.analyze(doc.full_text, isPoem);
  } catch (err) {
    console.error(`  Failed to analyze ${label}: ${err}`);
    return;
  }

  if (result.sentences.length === 0) {
    console.warn(`  No sentences found for ${label}`);
    return;
  }

  // Update word POS and lemma
  let wordsUpdated = 0;
  for (const sent of result.sentences) {
    for (const tok of sent.tokens) {
      const { error } = await supabase
        .from('words')
        .update({ pos: tok.pos, lemma: tok.lemma })
        .eq('farsi', tok.surface)
        .is('pos', null);

      if (!error) wordsUpdated++;
    }
  }

  // Insert sentences and sentence_words
  for (let si = 0; si < result.sentences.length; si++) {
    const sent = result.sentences[si];

    const { data: sentRow, error: sentErr } = await supabase
      .from('sentences')
      .insert({
        document_id: doc.id,
        document_type: documentType,
        text: sent.text,
        translation: null,
        sort_order: si,
      })
      .select('id')
      .single();

    if (sentErr || !sentRow) {
      console.error(`  Failed to insert sentence ${si} for ${label}:`, sentErr?.message);
      continue;
    }

    const swRows = [];
    for (let ti = 0; ti < sent.tokens.length; ti++) {
      const tok = sent.tokens[ti];
      const { data: wordRow } = await supabase
        .from('words')
        .select('id')
        .eq('farsi', tok.surface)
        .single();

      if (wordRow) {
        swRows.push({
          sentence_id: sentRow.id,
          word_id: wordRow.id,
          sort_order: ti,
          dep_head: tok.dep_head,
          dep_rel: tok.dep_rel,
        });
      }
    }

    if (swRows.length > 0) {
      const { error: swErr } = await supabase
        .from('sentence_words')
        .insert(swRows);
      if (swErr) {
        console.error(`  Failed to insert sentence_words for sentence ${si}:`, swErr.message);
      }
    }
  }

  console.log(
    `  ${label}: ${result.sentences.length} sentences, ${wordsUpdated} words updated`,
  );
}

async function backfill() {
  console.log('Starting hazm backfill...\n');

  const hazm = await startHazm();

  try {
    // Process stories
    const { data: stories, error: storyErr } = await supabase
      .from('stories')
      .select('id, full_text, title_en, layout')
      .order('sort_order', { ascending: true });

    if (storyErr) throw storyErr;

    console.log(`Found ${stories?.length ?? 0} stories\n`);
    for (const story of stories ?? []) {
      await backfillDocument(story, 'story', hazm);
    }

    // Process daily debriefs
    const { data: debriefs, error: debriefErr } = await supabase
      .from('daily_debriefs')
      .select('id, full_text, title_en')
      .order('debrief_date', { ascending: true });

    if (debriefErr) throw debriefErr;

    console.log(`\nFound ${debriefs?.length ?? 0} daily debriefs\n`);
    for (const debrief of debriefs ?? []) {
      await backfillDocument(
        { ...debrief, layout: 'prose' },
        'daily_debrief',
        hazm,
      );
    }

    console.log('\nBackfill complete!');
  } finally {
    await hazm.stop();
  }
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
