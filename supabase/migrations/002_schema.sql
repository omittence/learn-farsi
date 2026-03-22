CREATE TYPE story_level AS ENUM ('beginner', 'intermediate', 'advanced');

CREATE TABLE stories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  title_en    text NOT NULL,
  level       story_level NOT NULL,
  description text NOT NULL,
  full_text   text NOT NULL,
  translation text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE TABLE words (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farsi           text NOT NULL UNIQUE,
  transliteration text NOT NULL,
  meaning         text NOT NULL,
  pronunciation   text NOT NULL,
  diacritics      text NOT NULL
);

CREATE TABLE story_words (
  story_id   uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  word_id    uuid NOT NULL REFERENCES words(id)   ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (story_id, word_id)
);

CREATE TABLE letters (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id    uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  char       text NOT NULL,
  name       text NOT NULL,
  isolated   text NOT NULL,
  initial    text NOT NULL,
  medial     text NOT NULL,
  final      text NOT NULL,
  sound      text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE user_progress (
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id      uuid NOT NULL REFERENCES stories(id)   ON DELETE CASCADE,
  completed     boolean NOT NULL DEFAULT false,
  words_clicked integer NOT NULL DEFAULT 0,
  last_read_at  timestamptz,
  PRIMARY KEY (user_id, story_id)
);

CREATE INDEX idx_story_words_story ON story_words(story_id, sort_order);
CREATE INDEX idx_letters_word      ON letters(word_id, sort_order);
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
