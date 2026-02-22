-- =============================================
-- Vertiche - Database Migration for Supabase
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Contracts
create table if not exists contracts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  s3_key text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing_ocr', 'processing_extraction', 'processing_embeddings', 'ready', 'error')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Contract Metadata
create table if not exists contract_metadata (
  id uuid default gen_random_uuid() primary key,
  contract_id uuid not null unique references contracts(id) on delete cascade,
  arrendador text,
  arrendatario text,
  direccion text,
  ciudad text,
  estado text,
  codigo_postal text,
  metros_cuadrados numeric,
  fecha_inicio date,
  fecha_vencimiento date,
  duracion_meses integer,
  renta_mensual numeric,
  incremento_anual numeric,
  deposito_garantia numeric,
  moneda text default 'MXN',
  uso_permitido text,
  clausula_renovacion text,
  penalizacion_terminacion_anticipada text,
  mantenimiento_responsable text,
  seguros_requeridos text,
  fiador text,
  notas_adicionales text,
  created_at timestamptz default now()
);

-- 3. Chat Sessions
create table if not exists chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nueva conversación',
  contract_ids uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Chat Messages
create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz default now()
);

-- 5. Dashboard Alerts
create table if not exists dashboard_alerts (
  id uuid default gen_random_uuid() primary key,
  contract_id uuid not null references contracts(id) on delete cascade,
  alert_type text not null,
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  message text not null,
  alert_date timestamptz default now(),
  created_at timestamptz default now()
);

-- =============================================
-- Indexes
-- =============================================
create index if not exists idx_contracts_user_id on contracts(user_id);
create index if not exists idx_contracts_status on contracts(status);
create index if not exists idx_contract_metadata_contract_id on contract_metadata(contract_id);
create index if not exists idx_chat_sessions_user_id on chat_sessions(user_id);
create index if not exists idx_chat_messages_session_id on chat_messages(session_id);
create index if not exists idx_dashboard_alerts_contract_id on dashboard_alerts(contract_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================
alter table contracts enable row level security;
alter table contract_metadata enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table dashboard_alerts enable row level security;

-- Contracts
create policy "Users can view own contracts" on contracts
  for select using (auth.uid() = user_id);
create policy "Users can insert own contracts" on contracts
  for insert with check (auth.uid() = user_id);
create policy "Users can update own contracts" on contracts
  for update using (auth.uid() = user_id);
create policy "Users can delete own contracts" on contracts
  for delete using (auth.uid() = user_id);

-- Contract Metadata
create policy "Users can view own contract metadata" on contract_metadata
  for select using (
    exists (select 1 from contracts where contracts.id = contract_metadata.contract_id and contracts.user_id = auth.uid())
  );
create policy "Users can insert own contract metadata" on contract_metadata
  for insert with check (
    exists (select 1 from contracts where contracts.id = contract_metadata.contract_id and contracts.user_id = auth.uid())
  );
create policy "Users can update own contract metadata" on contract_metadata
  for update using (
    exists (select 1 from contracts where contracts.id = contract_metadata.contract_id and contracts.user_id = auth.uid())
  );
create policy "Users can delete own contract metadata" on contract_metadata
  for delete using (
    exists (select 1 from contracts where contracts.id = contract_metadata.contract_id and contracts.user_id = auth.uid())
  );

-- Chat Sessions
create policy "Users can view own chat sessions" on chat_sessions
  for select using (auth.uid() = user_id);
create policy "Users can insert own chat sessions" on chat_sessions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own chat sessions" on chat_sessions
  for update using (auth.uid() = user_id);
create policy "Users can delete own chat sessions" on chat_sessions
  for delete using (auth.uid() = user_id);

-- Chat Messages
create policy "Users can view own chat messages" on chat_messages
  for select using (
    exists (select 1 from chat_sessions where chat_sessions.id = chat_messages.session_id and chat_sessions.user_id = auth.uid())
  );
create policy "Users can insert own chat messages" on chat_messages
  for insert with check (
    exists (select 1 from chat_sessions where chat_sessions.id = chat_messages.session_id and chat_sessions.user_id = auth.uid())
  );
create policy "Users can delete own chat messages" on chat_messages
  for delete using (
    exists (select 1 from chat_sessions where chat_sessions.id = chat_messages.session_id and chat_sessions.user_id = auth.uid())
  );

-- Dashboard Alerts
create policy "Users can view own alerts" on dashboard_alerts
  for select using (
    exists (select 1 from contracts where contracts.id = dashboard_alerts.contract_id and contracts.user_id = auth.uid())
  );
create policy "Users can insert own alerts" on dashboard_alerts
  for insert with check (
    exists (select 1 from contracts where contracts.id = dashboard_alerts.contract_id and contracts.user_id = auth.uid())
  );
create policy "Users can delete own alerts" on dashboard_alerts
  for delete using (
    exists (select 1 from contracts where contracts.id = dashboard_alerts.contract_id and contracts.user_id = auth.uid())
  );
