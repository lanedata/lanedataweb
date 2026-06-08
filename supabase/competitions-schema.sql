-- ─── Tabla de competiciones RFEA 2026 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS competitions (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha_inicio DATE    NOT NULL,
  fecha_fin    DATE,
  disciplina   TEXT,
  nombre       TEXT    NOT NULL,
  area         TEXT,   -- RFEA | WA | EA
  ciudad       TEXT,
  article_id   UUID    REFERENCES articles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS competitions_fecha_idx     ON competitions (fecha_inicio);
CREATE INDEX IF NOT EXISTS competitions_article_idx   ON competitions (article_id);

-- RLS
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competitions_public_read" ON competitions
  FOR SELECT USING (true);

CREATE POLICY "competitions_auth_insert" ON competitions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "competitions_auth_update" ON competitions
  FOR UPDATE USING (auth.role() = 'authenticated');
