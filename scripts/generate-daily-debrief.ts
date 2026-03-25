import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import type { DraftDailyDebrief, DraftWord, DraftSentence } from '../lib/types';
import { tokenizePersianWords, enrichWithHazm } from './lib/persian';
import type { EnrichmentResult } from './lib/persian';

config({ path: resolve(process.cwd(), '.env.local') });

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Missing ANTHROPIC_API_KEY in .env.local');
  process.exit(1);
}

const client = new Anthropic({ apiKey });

interface ArticleDraft {
  title: string;
  title_en: string;
  summary: string;
  full_text: string;
  translation: string;
}

function extractJson(text: string): string {
  const stripped = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const start = stripped.search(/[{\[]/);
  if (start === -1) throw new Error('No JSON found in response');
  return stripped.slice(start);
}

async function generateArticle(date: string): Promise<ArticleDraft> {
  console.log('Step 1: Generating article...');

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system: `You are a Farsi language learning content creator. You write short, beginner-friendly Farsi news articles for language learners.

Output ONLY a raw JSON object — no markdown, no code fences, no explanation. The object must have exactly these fields:
- "title": short Farsi headline (5-8 words)
- "title_en": English translation of the title
- "summary": 2-3 sentence English description of the article (written for learners)
- "full_text": the Farsi article body (4-6 sentences, 50-80 words, simple common vocabulary)
- "translation": a natural English translation of full_text, sentence by sentence

Rules for full_text:
- Use simple, high-frequency vocabulary a beginner would know
- Short sentences, present or simple past tense
- Write verb prefix می as a separate word with a space (می شود not می‌شود) to keep word boundaries clean
- Use Persian characters only: ی not ي, ک not ك, و not ؤ where appropriate
- No digits or numbers — write any numbers as Persian words`,
    messages: [
      {
        role: 'user',
        content: `Write a beginner-friendly Farsi news article for the date ${date}. Pick an interesting, relevant topic for this time of year. Output only the JSON object.`,
      },
    ],
  });

  process.stdout.write('  generating');
  stream.on('text', () => process.stdout.write('.'));
  const message = await stream.finalMessage();
  console.log(' done');

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text block in response');

  return JSON.parse(extractJson(textBlock.text)) as ArticleDraft;
}

async function generateWordDefinitions(
  tokens: string[],
  tokenMeta?: Map<string, { pos: string; lemma: string }>,
): Promise<DraftWord[]> {
  console.log(`\nStep 3: Generating definitions for ${tokens.length} tokens...`);
  console.log(`  Tokens: ${tokens.join(', ')}`);

  const tokenList = tokens
    .map((t, i) => {
      const meta = tokenMeta?.get(t);
      if (meta) {
        const hint = meta.lemma !== t ? `${meta.pos}, lemma: ${meta.lemma}` : meta.pos;
        return `${i + 1}. ${t} (${hint})`;
      }
      return `${i + 1}. ${t}`;
    })
    .join('\n');

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: `You are a Farsi language expert creating vocabulary entries for language learners.

You will be given a numbered list of Persian word tokens, some with part-of-speech and lemma hints in parentheses. Use the POS hint to disambiguate meanings for homographs. Output a JSON array with one object per token, in the same order.

Each object must have exactly these fields:
- "farsi": the EXACT token string as given in the list — copy it character for character, do not modify
- "transliteration": standard romanization using â for long a, u for long u, i for long i (e.g. "ketâb", "miravad")
- "meaning": concise English meaning; include a grammar note in parentheses for particles/affixes (e.g. "book", "he/she goes", "(direct object marker)")
- "pronunciation": syllabified with the stressed syllable in capitals (e.g. "ke-TAAB", "mee-ra-VAD")
- "diacritics": the word with Arabic short vowel marks (fatha/kasra/damma) added
- "letters": []

Output ONLY a raw JSON array — no markdown, no code fences, no explanation.`,
    messages: [
      {
        role: 'user',
        content: `Provide a vocabulary entry for each of these Persian tokens:\n\n${tokenList}`,
      },
    ],
  });

  process.stdout.write('  generating');
  stream.on('text', () => process.stdout.write('.'));
  const message = await stream.finalMessage();
  console.log(' done');

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text block in response');

  return JSON.parse(extractJson(textBlock.text)) as DraftWord[];
}

async function generate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    console.error('Date must be YYYY-MM-DD');
    process.exit(1);
  }

  const outPath = resolve(process.cwd(), `stories/drafts/daily-${date}.json`);
  if (existsSync(outPath)) {
    console.error(`File already exists: stories/drafts/daily-${date}.json`);
    console.error('Delete it first if you want to regenerate.');
    process.exit(1);
  }

  // Step 1: generate the article text
  const article = await generateArticle(date);
  console.log(`\n  Title: ${article.title_en}`);
  console.log(`  Text preview: ${article.full_text.slice(0, 80)}...`);

  // Step 2: run through hazm for NLP enrichment (POS, lemma, sentences, deps)
  console.log('\nStep 2: Running hazm NLP enrichment...');
  let enrichment: EnrichmentResult | null = null;
  let tokens: string[];
  let sentences: DraftSentence[] | undefined;

  try {
    enrichment = await enrichWithHazm(article.full_text);
    tokens = enrichment.tokens;
    sentences = enrichment.sentences;
    console.log(`  Hazm found ${tokens.length} tokens across ${sentences.length} sentences`);
  } catch (err) {
    console.warn(`  Hazm enrichment failed, falling back to regex tokenizer: ${err}`);
    tokens = [...new Set(tokenizePersianWords(article.full_text))];
  }

  if (tokens.length === 0) {
    throw new Error('No tokens extracted from full_text — check the generated article');
  }

  // Step 3: generate definitions for exactly those tokens (with POS hints from hazm)
  const words = await generateWordDefinitions(tokens, enrichment?.tokenMeta);

  // Rebuild words array keyed by farsi, then ordered to match tokens exactly
  const wordMap = new Map(words.map((w) => [w.farsi, w]));
  const finalWords: DraftWord[] = tokens.map((token) => {
    const word = wordMap.get(token);
    if (!word) throw new Error(`Claude did not return a definition for token "${token}"`);
    const meta = enrichment?.tokenMeta.get(token);
    return {
      ...word,
      farsi: token,
      letters: [],
      pos: meta?.pos,
      lemma: meta?.lemma,
    };
  });

  // Step 4: assemble and write
  const draft: DraftDailyDebrief = {
    debrief_date: date,
    title: article.title,
    title_en: article.title_en,
    summary: article.summary,
    full_text: article.full_text,
    translation: article.translation,
    words: finalWords,
    sentences,
  };

  writeFileSync(outPath, JSON.stringify(draft, null, 2), 'utf-8');

  console.log(`\nWritten to: stories/drafts/daily-${date}.json`);
  console.log(`Words: ${finalWords.length}`);
  console.log(`\nNext step:`);
  console.log(`  npm run ingest-daily-debrief stories/drafts/daily-${date}.json`);
}

const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);

generate(date).catch((err) => {
  console.error('\nGeneration failed:', err.message ?? err);
  process.exit(1);
});
