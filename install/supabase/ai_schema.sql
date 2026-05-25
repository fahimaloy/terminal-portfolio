-- AI Provider & Model Management Schema
-- Run this after the main schema.sql

-- Knowledge Bases table (referenced by chat.ts but was missing from schema.sql)
create table if not exists public.knowledge_bases (
  id bigint generated always as identity primary key,
  category text not null,
  content text not null,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.knowledge_bases enable row level security;

create policy "Public read knowledge_bases"
  on public.knowledge_bases
  for select
  to anon
  using (is_visible = true);

create policy "Service role knowledge_bases"
  on public.knowledge_bases
  for all
  to service_role
  using (true)
  with check (true);

-- AI Providers table
create table if not exists public.ai_providers (
  id bigint generated always as identity primary key,
  name text not null,
  provider_type text not null check (provider_type in ('gemini', 'openai_compatible')),
  identifier_slug text not null unique,
  api_key text not null,
  base_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- AI Models table
create table if not exists public.ai_models (
  id bigint generated always as identity primary key,
  provider_id bigint not null references public.ai_providers(id) on delete cascade,
  model_name text not null,
  display_name text,
  identifier text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  rpm_limit integer,
  rpd_limit integer,
  cooldown_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- AI Request Logs (for analytics)
create table if not exists public.ai_request_logs (
  id bigint generated always as identity primary key,
  model_id bigint references public.ai_models(id) on delete set null,
  provider_id bigint references public.ai_providers(id) on delete set null,
  model_identifier text,
  provider_name text,
  request_type text not null check (request_type in ('chat', 'project-match')),
  prompt_tokens integer default 0,
  completion_tokens integer default 0,
  total_tokens integer default 0,
  latency_ms integer default 0,
  success boolean not null default true,
  error_message text,
  created_at timestamptz not null default now()
);

-- Index for faster usage analytics queries
create index if not exists idx_ai_request_logs_created_at on public.ai_request_logs(created_at);
create index if not exists idx_ai_request_logs_model_id on public.ai_request_logs(model_id);
create index if not exists idx_ai_request_logs_provider_id on public.ai_request_logs(provider_id);
create index if not exists idx_ai_request_logs_success on public.ai_request_logs(success);
create index if not exists idx_ai_models_sort_order on public.ai_models(sort_order);
create index if not exists idx_ai_models_provider_id on public.ai_models(provider_id);

-- Enable RLS
alter table public.ai_providers enable row level security;
alter table public.ai_models enable row level security;
alter table public.ai_request_logs enable row level security;

-- Service role only access for AI tables
create policy "Service role ai_providers"
  on public.ai_providers
  for all
  to service_role
  using (true)
  with check (true);

create policy "Service role ai_models"
  on public.ai_models
  for all
  to service_role
  using (true)
  with check (true);

create policy "Service role ai_request_logs"
  on public.ai_request_logs
  for all
  to service_role
  using (true)
  with check (true);

-- Allow public read of active models (for chat API to fetch available models)
create policy "Public read ai_models"
  on public.ai_models
  for select
  to anon
  using (is_active = true);

-- Allow public read of active providers
create policy "Public read ai_providers"
  on public.ai_providers
  for select
  to anon
  using (is_active = true);
