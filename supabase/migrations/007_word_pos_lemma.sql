ALTER TABLE words ADD COLUMN pos text;
ALTER TABLE words ADD COLUMN lemma text;

CREATE INDEX idx_words_lemma ON words(lemma);
