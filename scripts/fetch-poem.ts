/**
 * Fetch a poem from Ganjoor and save raw data for Claude Code to annotate.
 *
 * Usage:
 *   npm run fetch-poem https://ganjoor.net/hafez/ghazal/sh1/
 *
 * This saves stories/drafts/raw-<slug>.json, then Claude Code annotates
 * every word and writes the final draft + ingests it.
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

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
  const resp = await fetch(`https://api.ganjoor.net/api/v2/poems/byurl?url=${path}`);
  if (!resp.ok) {
    console.error(`Ganjoor API error: ${resp.status} ${resp.statusText}`);
    process.exit(1);
  }
  const poem: GanjoorPoem = await resp.json();
  console.log(`Found: "${poem.title}" — ${poem.verses.length} verses`);

  const fullText  = buildFullText(poem.verses);
  const poetName  = extractPoetName(poem);

  // Collect unique tokens in order of first appearance
  const allTokens    = fullText.match(/[\p{L}\p{N}]+/gu) ?? [];
  const seen         = new Set<string>();
  const uniqueWords: string[] = [];
  for (const t of allTokens) {
    if (!seen.has(t)) { seen.add(t); uniqueWords.push(t); }
  }

  const raw = {
    title:        poem.title,
    title_en:     `${poetName} — ${poem.title}`,
    ganjoor_id:   poem.id,
    ganjoor_url:  poem.fullUrl ?? normalized,
    full_text:    fullText,
    unique_words: uniqueWords,
  };

  const slug     = path.replace(/\//g, '-').replace(/^-/, '');
  const outPath  = resolve(process.cwd(), `stories/drafts/raw-${slug}.json`);
  writeFileSync(outPath, JSON.stringify(raw, null, 2));

  console.log(`\nRaw poem saved: stories/drafts/raw-${slug}.json`);
  console.log(`Unique words:   ${uniqueWords.length}`);
  console.log(`\nNext: ask Claude Code to annotate and ingest stories/drafts/raw-${slug}.json`);
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
