ALTER TABLE stories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE words         ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_words   ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_stories"     ON stories     FOR SELECT USING (true);
CREATE POLICY "public_read_words"       ON words       FOR SELECT USING (true);
CREATE POLICY "public_read_story_words" ON story_words FOR SELECT USING (true);
CREATE POLICY "public_read_letters"     ON letters     FOR SELECT USING (true);

CREATE POLICY "own_progress_select" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own_progress_insert" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_progress_update" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);
