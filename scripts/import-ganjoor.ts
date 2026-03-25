import { writeFileSync } from 'fs';
import { resolve } from 'path';

const GANJOOR_API = 'https://api.ganjoor.net';

interface GanjoorVerse {
  vOrder: number;
  versePosition: number; // 0=right hemistich, 1=left hemistich, 2=single, 3=paragraph
  text: string;
}

interface GanjoorCategory {
  poet: {
    id: number;
    name: string;
    nickname: string;
  };
}

interface GanjoorPoem {
  id: number;
  title: string;
  fullTitle: string;
  fullUrl: string;
  verses: GanjoorVerse[];
  category: GanjoorCategory;
}

interface GanjoorPageResponse {
  id: number;
}

export interface GanjoorSeed {
  _type: 'ganjoor_seed';
  ganjoor_url: string;
  poet: string;
  poet_en: string;
  poem_title: string;
  full_text: string;
  translation_placeholder: string;
  unique_words: string[];
  suggested_level: 'Beginner' | 'Intermediate' | 'Advanced';
}

function buildFullText(verses: GanjoorVerse[]): string {
  const lines: string[] = [];

  for (let i = 0; i < verses.length; i++) {
    const v = verses[i];
    const pos = v.versePosition;

    if (pos === 0) {
      const next = verses[i + 1];
      if (next && next.versePosition === 1) {
        lines.push(`${v.text} / ${next.text}`);
        i++;
      } else {
        lines.push(v.text);
      }
    } else if (pos === 1) {
      lines.push(v.text);
    } else {
      lines.push(v.text);
    }
  }

  return lines.join('\n');
}

function extractUniqueWords(fullText: string): string[] {
  const chunks = fullText.match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(chunks)];
}

function toSlug(str: string): string {
  return str
    .replace(/[\u0600-\u06FF\u200c]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'poem';
}

async function importGanjoor(poemUrl: string) {
  // Normalize: extract relative path from full URL
  const relPath = poemUrl.replace(/^https?:\/\/ganjoor\.net/, '').replace(/\/$/, '');

  console.log(`Fetching page: ${relPath}`);

  // Step 1: resolve URL to poem ID
  const pageRes = await fetch(`${GANJOOR_API}/api/ganjoor/page?url=${encodeURIComponent(relPath)}`);
  if (!pageRes.ok) {
    console.error(`Page lookup failed: ${pageRes.status}`);
    process.exit(1);
  }
  const page = (await pageRes.json()) as GanjoorPageResponse;
  const poemId = page.id;
  console.log(`Poem ID: ${poemId}`);

  // Step 2: fetch full poem with verses
  const poemRes = await fetch(`${GANJOOR_API}/api/ganjoor/poem/${poemId}`);
  if (!poemRes.ok) {
    console.error(`Poem fetch failed: ${poemRes.status}`);
    process.exit(1);
  }
  const poem = (await poemRes.json()) as GanjoorPoem;

  if (!poem.verses?.length) {
    console.error('No verses returned');
    process.exit(1);
  }

  const poet     = poem.category?.poet;
  const poetName = poet?.name     ?? poem.fullTitle.split('»')[0].trim();
  const poetEn   = poet?.nickname ?? toSlug(poetName);

  console.log(`Poet: ${poetName} (${poetEn})`);
  console.log(`Title: ${poem.title}`);
  console.log(`Verses: ${poem.verses.length}`);

  const fullText    = buildFullText(poem.verses);
  const uniqueWords = extractUniqueWords(fullText);
  console.log(`Unique words: ${uniqueWords.length}`);

  const seed: GanjoorSeed = {
    _type:                   'ganjoor_seed',
    ganjoor_url:             poemUrl,
    poet:                    poetName,
    poet_en:                 poetEn,
    poem_title:              poem.title,
    full_text:               fullText,
    translation_placeholder: '',
    unique_words:            uniqueWords,
    suggested_level:         uniqueWords.length > 40 ? 'Advanced' : 'Intermediate',
  };

  const slug    = `${poetEn}-${toSlug(poem.title)}`.slice(0, 60);
  const outPath = resolve(process.cwd(), `stories/drafts/${slug}.seed.json`);
  writeFileSync(outPath, JSON.stringify(seed, null, 2), 'utf-8');

  console.log(`\nSeed: stories/drafts/${slug}.seed.json`);
  return `stories/drafts/${slug}.seed.json`;
}

const url = process.argv[2];
if (!url) {
  console.error('Usage: npm run import-ganjoor <ganjoor_poem_url>');
  process.exit(1);
}

importGanjoor(url).catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
