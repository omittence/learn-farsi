CREATE TABLE daily_debriefs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debrief_date  date NOT NULL UNIQUE,
  title         text NOT NULL,
  title_en      text NOT NULL,
  summary       text NOT NULL,
  full_text     text NOT NULL,
  translation   text NOT NULL,
  published     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE daily_debrief_words (
  debrief_id   uuid NOT NULL REFERENCES daily_debriefs(id) ON DELETE CASCADE,
  word_id      uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  sort_order   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (debrief_id, word_id)
);

CREATE INDEX idx_daily_debriefs_date ON daily_debriefs(debrief_date DESC);
CREATE INDEX idx_daily_debrief_words_debrief ON daily_debrief_words(debrief_id, sort_order);
