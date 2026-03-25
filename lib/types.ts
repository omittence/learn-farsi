export type StoryLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Letter {
  id: string;
  word_id: string;
  char: string;
  name: string;
  isolated: string;
  initial: string;
  medial: string;
  final: string;
  sound: string;
  sort_order: number;
}

export interface Word {
  id: string;
  farsi: string;
  transliteration: string;
  meaning: string;
  pronunciation: string;
  diacritics: string;
  pos?: string;
  lemma?: string;
  letters: Letter[];
}

export type StoryLayout = 'prose' | 'poem';
export type StorySource = 'original' | 'ganjoor';

export interface ReadingDocument {
  title: string;
  title_en: string;
  full_text: string;
  translation: string;
  words: Word[];
  layout: StoryLayout;
  sentences?: SentenceWithWords[];
}

export interface Story {
  id: string;
  title: string;
  title_en: string;
  level: StoryLevel;
  description: string;
  full_text: string;
  translation: string;
  sort_order: number;
  layout: StoryLayout;
  source: StorySource;
  ganjoor_id: number | null;
}

export interface StoryWithWords extends Story {
  words: Word[];
}

export interface DailyDebrief {
  id: string;
  debrief_date: string;
  title: string;
  title_en: string;
  summary: string;
  full_text: string;
  translation: string;
  published: boolean;
  created_at: string;
  layout: 'prose';
}

export interface DailyDebriefCard {
  id: string;
  debrief_date: string;
  title: string;
  title_en: string;
  summary: string;
  full_text: string;
}

export interface DailyDebriefWithWords extends DailyDebrief {
  words: Word[];
}

export interface StoryCard {
  id: string;
  title: string;
  title_en: string;
  level: StoryLevel;
  description: string;
  word_count: number;
  sort_order: number;
  layout: StoryLayout;
}

export interface UserProgress {
  user_id: string;
  story_id: string;
  completed: boolean;
  words_clicked: number;
  last_read_at: string | null;
}

// Draft story JSON format (output from the generation prompt)
export interface DraftLetter {
  char: string;
  name: string;
  isolated: string;
  initial: string;
  medial: string;
  final: string;
  sound: string;
}

export interface DraftWord {
  farsi: string;
  transliteration: string;
  meaning: string;
  pronunciation: string;
  diacritics: string;
  pos?: string;
  lemma?: string;
  letters: DraftLetter[];
}

export interface DraftStory {
  title: string;
  title_en: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  full_text: string;
  translation: string;
  words: DraftWord[];
  sentences?: DraftSentence[];
  layout?: 'prose' | 'poem';
  source?: 'original' | 'ganjoor';
  ganjoor_id?: number;
}

export interface DraftDailyDebrief {
  debrief_date: string;
  title: string;
  title_en: string;
  summary: string;
  full_text: string;
  translation: string;
  words: DraftWord[];
  sentences?: DraftSentence[];
}

// Sentence-level types for hazm NLP integration

export interface Sentence {
  id: string;
  document_id: string;
  document_type: 'story' | 'daily_debrief';
  text: string;
  translation: string | null;
  sort_order: number;
}

export interface SentenceWord {
  sentence_id: string;
  word_id: string;
  sort_order: number;
  dep_head: number | null;
  dep_rel: string | null;
}

export interface SentenceWithWords extends Sentence {
  words: (Word & { dep_head: number | null; dep_rel: string | null })[];
}

export interface DraftSentenceToken {
  surface: string;
  lemma: string;
  pos: string;
  dep_head: number;
  dep_rel: string;
}

export interface DraftSentence {
  text: string;
  translation?: string;
  tokens: DraftSentenceToken[];
}
