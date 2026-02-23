-- =============================================
-- Vertiche - pgvector Migration
-- Run this in Supabase SQL Editor AFTER migration.sql
-- =============================================

-- 1. Enable vector extension
create extension if not exists vector with schema extensions;

-- 2. Contract Embeddings table
create table if not exists contract_embeddings (
  id uuid default gen_random_uuid() primary key,
  contract_id uuid not null references contracts(id) on delete cascade,
  contract_name text not null,
  chunk_index integer not null,
  content text not null,
  embedding vector(384) not null,
  created_at timestamptz default now()
);

-- 3. Indexes
create index if not exists idx_contract_embeddings_contract_id
  on contract_embeddings(contract_id);

create index if not exists idx_contract_embeddings_embedding
  on contract_embeddings using hnsw (embedding vector_cosine_ops);

-- 4. Similarity search function
create or replace function match_contract_chunks(
  query_embedding vector(384),
  match_count int default 8,
  filter_contract_ids uuid[] default null
)
returns table (
  id uuid,
  contract_id uuid,
  contract_name text,
  chunk_index int,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    ce.id,
    ce.contract_id,
    ce.contract_name,
    ce.chunk_index,
    ce.content,
    1 - (ce.embedding <=> query_embedding) as similarity
  from contract_embeddings ce
  where
    case
      when filter_contract_ids is not null
      then ce.contract_id = any(filter_contract_ids)
      else true
    end
  order by ce.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 5. Row Level Security
alter table contract_embeddings enable row level security;

create policy "Users can view own contract embeddings" on contract_embeddings
  for select using (
    exists (select 1 from contracts where contracts.id = contract_embeddings.contract_id and contracts.user_id = auth.uid())
  );

create policy "Users can insert own contract embeddings" on contract_embeddings
  for insert with check (
    exists (select 1 from contracts where contracts.id = contract_embeddings.contract_id and contracts.user_id = auth.uid())
  );

create policy "Users can delete own contract embeddings" on contract_embeddings
  for delete using (
    exists (select 1 from contracts where contracts.id = contract_embeddings.contract_id and contracts.user_id = auth.uid())
  );
