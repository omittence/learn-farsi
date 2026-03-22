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
  letters: Letter[];
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
}

export interface StoryWithWords extends Story {
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
}
