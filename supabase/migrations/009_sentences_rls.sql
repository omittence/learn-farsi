ALTER TABLE sentences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentence_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_sentences" ON sentences
  FOR SELECT USING (true);

CREATE POLICY "public_read_sentence_words" ON sentence_words
  FOR SELECT USING (true);
