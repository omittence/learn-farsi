/**
 * Fetch a poem from Ganjoor and save raw data for the poem annotation pipeline.
 *
 * Usage:
 *   npm run fetch-poem https://ganjoor.net/hafez/ghazal/sh1/
 *
 * This saves stories/drafts/raw-<slug>.json, then prepare-poem-annotation
 * resolves known words before a model only annotates the missing ones.
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { buildDiacriticsMap, canonicalizeSurfaceText, enrichWithHazm, extractUniqueWords } from './lib/persian';
import type { DraftSentence } from '../lib/types';

interface GanjoorVerse {
  vOrder: number;
  versePosition: number;
  text: string;
}

interface GanjoorPoem {
  id: number;
  title: string;
  fullUrl: string;
  verses: GanjoorVerse[];
  cat?: {
    title?: string;
    parent?: { poet?: { nickname?: string } };
    poet?: { nickname?: string };
  };
  ganjoorPoet?: { poet?: { nickname?: string } };
}

/**
 * Build full_text from Ganjoor verses.
 * Couplets separated by \n\n; hemistiches within a couplet separated by \n.
 * versePosition === 1 is the second hemistich; anything else starts a new couplet.
 */
function buildFullText(verses: GanjoorVerse[]): string {
  const couplets: string[][] = [];
  let current: string[] = [];

  for (const verse of verses) {
    if (verse.versePosition === 1) {
      current.push(verse.text);
    } else {
      if (current.length > 0) couplets.push(current);
      current = [verse.text];
    }
  }
  if (current.length > 0) couplets.push(current);

  return couplets.map((c) => c.join('\n')).join('\n\n');
}

function extractPoetName(poem: GanjoorPoem): string {
  return (
    poem.ganjoorPoet?.poet?.nickname ??
    poem.cat?.parent?.poet?.nickname ??
    poem.cat?.poet?.nickname ??
    'Unknown'
  );
}

async function run(ganjoorUrl: string) {
  const normalized = ganjoorUrl.startsWith('http') ? ganjoorUrl : `https://${ganjoorUrl}`;
  const urlObj = new URL(normalized);
  const path   = urlObj.pathname.replace(/\/$/, '') || '/';

  console.log(`Fetching: ${path}`);
  const poem: GanjoorPoem = await fetchPoemByPath(path);
  console.log(`Found: "${poem.title}" — ${poem.verses.length} verses`);

  const rawFullText = buildFullText(poem.verses);
  const fullText  = canonicalizeSurfaceText(rawFullText);
  const poetName  = extractPoetName(poem);
  const uniqueWords = extractUniqueWords(fullText);
  const diacriticsMap = buildDiacriticsMap(rawFullText);

  // Run hazm enrichment for POS/lemma/sentence data (poems use newline splitting)
  let wordMeta: Record<string, { pos: string; lemma: string }> | undefined;
  let sentences: DraftSentence[] | undefined;
  try {
    console.log('Running hazm NLP enrichment...');
    const enrichment = await enrichWithHazm(fullText, true);
    wordMeta = Object.fromEntries(enrichment.tokenMeta);
    sentences = enrichment.sentences;
    console.log(`  Hazm: ${enrichment.tokens.length} tokens, ${sentences.length} verse-sentences`);
  } catch (err) {
    console.warn(`  Hazm enrichment failed (continuing without): ${err}`);
  }

  const raw = {
    title:        poem.title,
    title_en:     `${poetName} — ${poem.title}`,
    ganjoor_id:   poem.id,
    ganjoor_url:  poem.fullUrl ?? normalized,
    full_text:    fullText,
    unique_words: uniqueWords,
    diacritics_map: diacriticsMap,
    word_meta:    wordMeta,
    sentences,
  };

  const slug     = path.replace(/\//g, '-').replace(/^-/, '');
  const outPath  = resolve(process.cwd(), `stories/drafts/raw-${slug}.json`);
  writeFileSync(outPath, JSON.stringify(raw, null, 2));

  console.log(`\nRaw poem saved: stories/drafts/raw-${slug}.json`);
  console.log(`Unique words:   ${uniqueWords.length}`);
  console.log(`\nNext: run npm run prepare-poem-annotation stories/drafts/raw-${slug}.json`);
}

async function fetchPoemByPath(path: string) {
  const encodedPath = encodeURIComponent(path);
  const v2Resp = await fetch(`https://api.ganjoor.net/api/v2/poems/byurl?url=${encodedPath}`);
  if (v2Resp.ok) {
    return v2Resp.json();
  }

  if (v2Resp.status === 404) {
    console.log('Ganjoor API v2 returned 404, falling back to legacy endpoint.');
    const legacyResp = await fetch(`https://api.ganjoor.net/api/ganjoor/poem?url=${encodedPath}`);
    if (legacyResp.ok) {
      return legacyResp.json();
    }
    throw new Error(`Legacy Ganjoor API error: ${legacyResp.status} ${legacyResp.statusText}`);
  }

  throw new Error(`Ganjoor API error: ${v2Resp.status} ${v2Resp.statusText}`);
}

const inputUrl = process.argv[2];
if (!inputUrl) {
  console.error('Usage: npm run fetch-poem <ganjoor-url>');
  console.error('Example: npm run fetch-poem https://ganjoor.net/hafez/ghazal/sh1/');
  process.exit(1);
}

run(inputUrl).catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
