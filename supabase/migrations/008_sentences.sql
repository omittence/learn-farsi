CREATE TABLE sentences (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('story', 'daily_debrief')),
  text          text NOT NULL,
  translation   text,
  sort_order    integer NOT NULL DEFAULT 0
);

CREATE TABLE sentence_words (
  sentence_id uuid NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
  word_id     uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  dep_head    integer,
  dep_rel     text,
  PRIMARY KEY (sentence_id, word_id, sort_order)
);

CREATE INDEX idx_sentences_doc ON sentences(document_type, document_id);
CREATE INDEX idx_sentence_words_sentence ON sentence_words(sentence_id, sort_order);
