import { basename } from 'path';
import type { DraftSentence, DraftWord } from '../../lib/types';

export interface RawPoemDraft {
  title: string;
  title_en: string;
  ganjoor_id: number;
  ganjoor_url: string;
  full_text: string;
  unique_words: string[];
  diacritics_map?: Record<string, string>;
  word_meta?: Record<string, { pos: string; lemma: string }>;
  sentences?: DraftSentence[];
}

export interface MissingWordCandidate {
  farsi: string;
  normalized: string;
  diacritics: string;
  transliteration: string;
  meaning: string;
  pronunciation: string;
  pos?: string;
  lemma?: string;
}

export interface PoemAnnotationScaffold {
  version: 1;
  source_raw_path: string;
  output_slug: string;
  final_draft_path: string;
  missing_words_path: string;
  title: string;
  title_en: string;
  level: 'Advanced';
  layout: 'poem';
  source: 'ganjoor';
  ganjoor_id: number;
  ganjoor_url: string;
  description: string;
  translation: string;
  full_text: string;
  word_order: string[];
  reused_words: DraftWord[];
}

export interface MissingWordsFile {
  version: 1;
  source_raw_path: string;
  note: string;
  words: MissingWordCandidate[];
}

export function slugFromRawPath(filePath: string): string {
  return basename(filePath).replace(/^raw-/, '').replace(/\.json$/u, '');
}
