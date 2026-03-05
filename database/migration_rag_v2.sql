-- =============================================
-- Vertiche - RAG v2 Migration
-- Run this in Supabase SQL Editor AFTER migration_pgvector.sql
-- Upgrades: 384 -> 768 dim embeddings, section metadata, hybrid search
-- =============================================

-- 1. Add section column for semantic chunking metadata
ALTER TABLE contract_embeddings
  ADD COLUMN IF NOT EXISTS section text DEFAULT 'General';

-- 2. Drop old HNSW index (384 dims - incompatible with new 768 dim embeddings)
DROP INDEX IF EXISTS idx_contract_embeddings_embedding;

-- 3. Change embedding column from vector(384) to vector(768)
ALTER TABLE contract_embeddings
  ALTER COLUMN embedding TYPE vector(768);

-- 4. Recreate HNSW index for 768-dimensional vectors
CREATE INDEX idx_contract_embeddings_embedding
  ON contract_embeddings USING hnsw (embedding vector_cosine_ops);

-- 5. Add GIN index for full-text search (hybrid search support)
ALTER TABLE contract_embeddings
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_contract_embeddings_tsv
  ON contract_embeddings USING gin (content_tsv);

-- 6. Updated similarity search function (768 dims + section metadata)
CREATE OR REPLACE FUNCTION match_contract_chunks(
  query_embedding vector(768),
  match_count int default 8,
  filter_contract_ids uuid[] default null
)
RETURNS TABLE (
  id uuid,
  contract_id uuid,
  contract_name text,
  chunk_index int,
  content text,
  section text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.contract_id,
    ce.contract_name,
    ce.chunk_index,
    ce.content,
    ce.section,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM contract_embeddings ce
  WHERE
    CASE
      WHEN filter_contract_ids IS NOT NULL
      THEN ce.contract_id = ANY(filter_contract_ids)
      ELSE true
    END
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
