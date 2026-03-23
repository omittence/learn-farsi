import { supabase } from './supabase';
import type { DailyDebriefCard, DailyDebriefWithWords, StoryCard, StoryWithWords, Word } from './types';

function mapWords(swRows: any[]): Word[] {
  return (swRows ?? []).map((row: any) => ({
    ...row.words,
    letters: (row.words.letters ?? []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    ),
  }));
}

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

  const words = mapWords(swRows ?? []);

  return { ...story, words };
}

export async function getLatestDailyDebriefWithWords(): Promise<DailyDebriefWithWords | null> {
  const { data, error } = await supabase
    .from('daily_debriefs')
    .select('*')
    .eq('published', true)
    .order('debrief_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: dwRows, error: dwError } = await supabase
    .from('daily_debrief_words')
    .select(`
      sort_order,
      words (
        id, farsi, transliteration, meaning, pronunciation, diacritics,
        letters ( id, word_id, char, name, isolated, initial, medial, final, sound, sort_order )
      )
    `)
    .eq('debrief_id', data.id)
    .order('sort_order', { ascending: true });

  if (dwError) throw dwError;

  return { ...data, layout: 'prose', words: mapWords(dwRows ?? []) };
}

export async function getLatestDailyDebriefCard(): Promise<DailyDebriefCard | null> {
  const { data, error } = await supabase
    .from('daily_debriefs')
    .select('id, debrief_date, title, title_en, summary, full_text')
    .eq('published', true)
    .order('debrief_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return data;
}

export async function getDailyDebriefArchiveDates(): Promise<string[]> {
  const { data, error } = await supabase
    .from('daily_debriefs')
    .select('debrief_date')
    .eq('published', true)
    .order('debrief_date', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((item: { debrief_date: string }) => item.debrief_date);
}

export async function getDailyDebriefByDate(date: string): Promise<DailyDebriefWithWords> {
  const { data: debrief, error: debriefError } = await supabase
    .from('daily_debriefs')
    .select('*')
    .eq('debrief_date', date)
    .eq('published', true)
    .single();

  if (debriefError) throw debriefError;

  const { data: dwRows, error: dwError } = await supabase
    .from('daily_debrief_words')
    .select(`
      sort_order,
      words (
        id, farsi, transliteration, meaning, pronunciation, diacritics,
        letters ( id, word_id, char, name, isolated, initial, medial, final, sound, sort_order )
      )
    `)
    .eq('debrief_id', debrief.id)
    .order('sort_order', { ascending: true });

  if (dwError) throw dwError;

  return {
    ...debrief,
    layout: 'prose',
    words: mapWords(dwRows ?? []),
  };
}
