-- install/supabase/blog_schema.sql
-- Canonical DDL for blog_posts + deferred reels teaser column.
-- blog_posts is hosted-only today (no CREATE in schema.sql);
-- this file proposes the migration so hosted and repo stay in sync.
-- Apply after schema.sql / ai_schema.sql / experiences_schema.sql.

-- 1. Create blog_posts if it does not exist (matches src/types/blog.ts,
--    LIST_COLUMNS in src/pages/api/blogs/index.ts, and admin payloads in
--    src/pages/api/admin/blogs/{index,[id]}.ts). Idempotent.
create table if not exists public.blog_posts (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  excerpt text,
  content_html text not null,
  cover_image_url text,
  cover_image_alt text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  featured boolean not null default false,
  tags text[] not null default '{}',
  reading_minutes integer,
  view_count integer not null default 0,
  seo_title text,
  seo_description text,
  seo_keywords text[],
  canonical_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Deferred Phase 6 §1: short teaser for reels full-bleed chrome.
--    Kept separate from excerpt so grid vs reels can tune copy length
--    without duplicating content_html.
alter table public.blog_posts
  add column if not exists teaser text;

-- 3. Helpful indexes (idempotent) for listing/search paths in api/blogs
create index if not exists idx_blog_posts_status on public.blog_posts(status);
create index if not exists idx_blog_posts_published_at on public.blog_posts(published_at desc);
create index if not exists idx_blog_posts_featured on public.blog_posts(featured) where featured = true;
create index if not exists idx_blog_posts_tags on public.blog_posts using gin (tags);

-- 4. RLS (blog_posts was missing RLS in schema.sql)
alter table public.blog_posts enable row level security;

drop policy if exists "Public read published blog_posts" on public.blog_posts;
create policy "Public read published blog_posts"
  on public.blog_posts for select to anon
  using (status = 'published');

drop policy if exists "Authenticated write blog_posts" on public.blog_posts;
create policy "Authenticated write blog_posts"
  on public.blog_posts for all to authenticated
  using (true) with check (true);

drop policy if exists "Service role blog_posts" on public.blog_posts;
create policy "Service role blog_posts"
  on public.blog_posts for all to service_role
  using (true) with check (true);
