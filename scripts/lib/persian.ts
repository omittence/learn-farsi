import type { DraftLetter, DraftSentence } from '../../lib/types';
import { startHazm } from './hazm-client';
import type { HazmResult } from './hazm-client';

const ARABIC_DIACRITICS_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/gu;
const TATWEEL_RE = /\u0640/gu;
const TOKEN_RE = /[\p{L}\p{N}\p{M}\u200c]+/gu;

type LetterSpec = Omit<DraftLetter, 'char'>;

const LETTER_SPECS: Record<string, LetterSpec> = {
  'ء': { name: 'Hamze', isolated: 'ء', initial: 'ء', medial: 'ء', final: 'ء', sound: 'ʔ' },
  'آ': { name: 'Alef Madda', isolated: 'آ', initial: 'آ', medial: 'ـآ', final: 'ـآ', sound: 'ɑː' },
  'ا': { name: 'Alef', isolated: 'ا', initial: 'ا', medial: 'ـا', final: 'ـا', sound: 'ɑː' },
  'ب': { name: 'Be', isolated: 'ب', initial: 'بـ', medial: 'ـبـ', final: 'ـب', sound: 'b' },
  'پ': { name: 'Pe', isolated: 'پ', initial: 'پـ', medial: 'ـپـ', final: 'ـپ', sound: 'p' },
  'ت': { name: 'Te', isolated: 'ت', initial: 'تـ', medial: 'ـتـ', final: 'ـت', sound: 't' },
  'ث': { name: 'Se', isolated: 'ث', initial: 'ثـ', medial: 'ـثـ', final: 'ـث', sound: 's' },
  'ج': { name: 'Jim', isolated: 'ج', initial: 'جـ', medial: 'ـجـ', final: 'ـج', sound: 'dʒ' },
  'چ': { name: 'Che', isolated: 'چ', initial: 'چـ', medial: 'ـچـ', final: 'ـچ', sound: 'tʃ' },
  'ح': { name: 'He', isolated: 'ح', initial: 'حـ', medial: 'ـحـ', final: 'ـح', sound: 'h' },
  'خ': { name: 'Khe', isolated: 'خ', initial: 'خـ', medial: 'ـخـ', final: 'ـخ', sound: 'x' },
  'د': { name: 'Dal', isolated: 'د', initial: 'د', medial: 'ـد', final: 'ـد', sound: 'd' },
  'ذ': { name: 'Zal', isolated: 'ذ', initial: 'ذ', medial: 'ـذ', final: 'ـذ', sound: 'z' },
  'ر': { name: 'Re', isolated: 'ر', initial: 'ر', medial: 'ـر', final: 'ـر', sound: 'r' },
  'ز': { name: 'Ze', isolated: 'ز', initial: 'ز', medial: 'ـز', final: 'ـز', sound: 'z' },
  'ژ': { name: 'Zhe', isolated: 'ژ', initial: 'ژ', medial: 'ـژ', final: 'ـژ', sound: 'ʒ' },
  'س': { name: 'Sin', isolated: 'س', initial: 'سـ', medial: 'ـسـ', final: 'ـس', sound: 's' },
  'ش': { name: 'Shin', isolated: 'ش', initial: 'شـ', medial: 'ـشـ', final: 'ـش', sound: 'ʃ' },
  'ص': { name: 'Sad', isolated: 'ص', initial: 'صـ', medial: 'ـصـ', final: 'ـص', sound: 's' },
  'ض': { name: 'Zad', isolated: 'ض', initial: 'ضـ', medial: 'ـضـ', final: 'ـض', sound: 'z' },
  'ط': { name: 'Ta', isolated: 'ط', initial: 'طـ', medial: 'ـطـ', final: 'ـط', sound: 't' },
  'ظ': { name: 'Za', isolated: 'ظ', initial: 'ظـ', medial: 'ـظـ', final: 'ـظ', sound: 'z' },
  'ع': { name: 'Ayn', isolated: 'ع', initial: 'عـ', medial: 'ـعـ', final: 'ـع', sound: 'ʔ' },
  'غ': { name: 'Gheyn', isolated: 'غ', initial: 'غـ', medial: 'ـغـ', final: 'ـغ', sound: 'ɣ' },
  'ف': { name: 'Fe', isolated: 'ف', initial: 'فـ', medial: 'ـفـ', final: 'ـف', sound: 'f' },
  'ق': { name: 'Qaf', isolated: 'ق', initial: 'قـ', medial: 'ـقـ', final: 'ـق', sound: 'q' },
  'ک': { name: 'Kaf', isolated: 'ک', initial: 'کـ', medial: 'ـکـ', final: 'ـک', sound: 'k' },
  'گ': { name: 'Gaf', isolated: 'گ', initial: 'گـ', medial: 'ـگـ', final: 'ـگ', sound: 'ɡ' },
  'ل': { name: 'Lam', isolated: 'ل', initial: 'لـ', medial: 'ـلـ', final: 'ـل', sound: 'l' },
  'م': { name: 'Mim', isolated: 'م', initial: 'مـ', medial: 'ـمـ', final: 'ـم', sound: 'm' },
  'ن': { name: 'Nun', isolated: 'ن', initial: 'نـ', medial: 'ـنـ', final: 'ـن', sound: 'n' },
  'و': { name: 'Vav', isolated: 'و', initial: 'و', medial: 'ـو', final: 'ـو', sound: 'v' },
  'ؤ': { name: 'Vav with Hamza', isolated: 'ؤ', initial: 'ؤ', medial: 'ـؤ', final: 'ـؤ', sound: 'ʔ' },
  'ه': { name: 'He', isolated: 'ه', initial: 'هـ', medial: 'ـهـ', final: 'ـه', sound: 'h' },
  'ی': { name: 'Ye', isolated: 'ی', initial: 'یـ', medial: 'ـیـ', final: 'ـی', sound: 'j' },
  'ئ': { name: 'Ye with Hamza', isolated: 'ئ', initial: 'ئـ', medial: 'ـئـ', final: 'ـئ', sound: 'ʔ' },
};

function toPersianChars(text: string): string {
  return text
    .replace(/[يى]/gu, 'ی')
    .replace(/ك/gu, 'ک')
    .replace(/[أإٱ]/gu, 'ا')
    .replace(/ؤ/gu, 'و')
    .replace(/[ئ]/gu, 'ی')
    .replace(/ة/gu, 'ه');
}

export function stripArabicDiacritics(text: string): string {
  return text.replace(ARABIC_DIACRITICS_RE, '');
}

export function canonicalizeSurfaceText(text: string): string {
  return stripArabicDiacritics(toPersianChars(text)).replace(TATWEEL_RE, '');
}

export function normalizeLookupKey(text: string): string {
  return canonicalizeSurfaceText(text)
    .replace(/\u200c/gu, '')
    .trim();
}

export function tokenizePersianWords(text: string): string[] {
  return text.match(TOKEN_RE) ?? [];
}

export function extractUniqueWords(text: string): string[] {
  const tokens = tokenizePersianWords(text).map(canonicalizeSurfaceText);
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const token of tokens) {
    if (!token || seen.has(token)) continue;
    seen.add(token);
    unique.push(token);
  }

  return unique;
}

export function buildDiacriticsMap(text: string): Record<string, string> {
  const map: Record<string, string> = {};

  for (const token of tokenizePersianWords(text)) {
    const lookup = normalizeLookupKey(token);
    if (!lookup || map[lookup]) continue;
    map[lookup] = toPersianChars(token).replace(TATWEEL_RE, '');
  }

  return map;
}

export interface EnrichmentResult {
  normalizedText: string;
  tokens: string[];
  sentences: DraftSentence[];
  tokenMeta: Map<string, { pos: string; lemma: string }>;
}

/**
 * Run text through hazm for full NLP enrichment.
 * Returns normalized text, tokens, sentence structure, and per-token POS/lemma.
 */
export async function enrichWithHazm(
  text: string,
  splitOnNewlines = false,
): Promise<EnrichmentResult> {
  const hazm = await startHazm();
  try {
    const result: HazmResult = await hazm.analyze(text, splitOnNewlines);

    const tokenSet = new Set<string>();
    const tokens: string[] = [];
    const tokenMeta = new Map<string, { pos: string; lemma: string }>();

    const sentences: DraftSentence[] = result.sentences.map((sent) => ({
      text: sent.text,
      tokens: sent.tokens.map((tok) => {
        if (!tokenSet.has(tok.surface)) {
          tokenSet.add(tok.surface);
          tokens.push(tok.surface);
          tokenMeta.set(tok.surface, { pos: tok.pos, lemma: tok.lemma });
        }
        return {
          surface: tok.surface,
          lemma: tok.lemma,
          pos: tok.pos,
          dep_head: tok.dep_head,
          dep_rel: tok.dep_rel,
        };
      }),
    }));

    return {
      normalizedText: result.normalized_text,
      tokens,
      sentences,
      tokenMeta,
    };
  } finally {
    await hazm.stop();
  }
}

export function generateLetters(word: string): DraftLetter[] {
  return [...word]
    .filter((char) => char !== '\u200c')
    .map((char) => {
      const spec = LETTER_SPECS[char];
      if (!spec) {
        throw new Error(`Unsupported Persian letter "${char}" in "${word}"`);
      }
      return { char, ...spec };
    });
}
