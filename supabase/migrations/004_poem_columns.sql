ALTER TABLE stories
  ADD COLUMN layout     text NOT NULL DEFAULT 'prose'
                        CHECK (layout IN ('prose', 'poem')),
  ADD COLUMN source     text NOT NULL DEFAULT 'original'
                        CHECK (source IN ('original', 'ganjoor')),
  ADD COLUMN ganjoor_id integer;
