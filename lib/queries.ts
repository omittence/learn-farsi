import { supabase } from './supabase';
import type { StoryCard, StoryWithWords } from './types';

export async function getAllStoryIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('id')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((s: { id: string }) => s.id);
}

export async function getAllStoryCards(): Promise<StoryCard[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('id, title, title_en, level, description, sort_order, layout, story_words(count)')
    .order('sort_order', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((s: any) => ({
    id: s.id,
    title: s.title,
    title_en: s.title_en,
    level: s.level,
    description: s.description,
    sort_order: s.sort_order,
    layout: s.layout ?? 'prose',
    word_count: s.story_words?.[0]?.count ?? 0,
  }));
}

export async function getStoryWithWords(id: string): Promise<StoryWithWords> {
  const { data: story, error: storyError } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .single();
  if (storyError) throw storyError;

  const { data: swRows, error: swError } = await supabase
    .from('story_words')
    .select(`
      sort_order,
      words (
        id, farsi, transliteration, meaning, pronunciation, diacritics,
        letters ( id, word_id, char, name, isolated, initial, medial, final, sound, sort_order )
      )
    `)
    .eq('story_id', id)
    .order('sort_order', { ascending: true });
  if (swError) throw swError;

  const words = (swRows ?? []).map((row: any) => ({
    ...row.words,
    letters: (row.words.letters ?? []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    ),
  }));

  return { ...story, words };
}
