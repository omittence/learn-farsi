ALTER TABLE daily_debriefs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_debrief_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_daily_debriefs" ON daily_debriefs
  FOR SELECT USING (published = true);

CREATE POLICY "public_read_daily_debrief_words" ON daily_debrief_words
  FOR SELECT USING (true);
