-- ─────────────────────────────────────────────────────────────────────────────
-- lanedata — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Articles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  excerpt          TEXT,
  html_content     TEXT NOT NULL DEFAULT '',
  cover_image_url  TEXT,
  category         TEXT,
  published_at     TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'published')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Full-text search vector (Spanish stemmer, title weighted higher)
  search_vector    TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(excerpt, '')), 'B')
  ) STORED
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS articles_slug_idx
  ON articles (slug);

CREATE INDEX IF NOT EXISTS articles_published_idx
  ON articles (published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS articles_search_idx
  ON articles USING GIN (search_vector);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_set_updated_at ON articles;
CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read published articles
CREATE POLICY "public_read_published"
  ON articles FOR SELECT
  USING (
    status = 'published'
    AND published_at IS NOT NULL
    AND published_at <= NOW()
  );

-- Authenticated users (admins) have full access
CREATE POLICY "auth_full_access"
  ON articles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- Storage bucket for cover images
-- ─────────────────────────────────────────────────────────────────────────────
-- Run this in Storage > New bucket, or via the SQL below.

INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/delete images
CREATE POLICY "auth_upload_covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'covers');

CREATE POLICY "auth_delete_covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'covers');

-- Allow public read of covers
CREATE POLICY "public_read_covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');
