-- Supabase schema for portfolio data (free-tier friendly)

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text,
  bio text,
  email text,
  location text,
  website text,
  github text,
  linkedin text,
  resume_url text,
  avatar_url text,
  summary text,
  phone text,
  welcome_message text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_texts (
  id bigint generated always as identity primary key,
  key text not null unique,
  value text not null,
  category text not null default 'ui',
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id bigint generated always as identity primary key,
  name text not null,
  category text,
  level text,
  icon_key text,
  icon_type text,
  icon_color text,
  duration text,
  sort_order integer not null default 0,
  is_visible boolean not null default true
);

create table if not exists public.projects (
  id bigint generated always as identity primary key,
  title text not null,
  short_title text,
  description text,
  image_url text,
  thumbnail_url text,
  icon_key text,
  project_url text,
  repo_url text,
  client_name text,
  client_location text,
  client_logo text,
  description_html text,
  languages text[] not null default '{}',
  tags text[] not null default '{}',
  featured boolean not null default false,
  featured_order integer not null default 0,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.project_media (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  url text not null,
  thumbnail_url text,
  video_provider text check (video_provider in ('youtube', 'vimeo', 'direct')),
  media_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text,
  password_hash text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.admin_users(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  date date not null,
  time time not null,
  reason text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'unread',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists summary text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists welcome_message text;
alter table public.site_texts add column if not exists category text not null default 'ui';
alter table public.site_texts add column if not exists description text;
alter table public.skills add column if not exists icon_key text;
alter table public.skills add column if not exists icon_type text;
alter table public.skills add column if not exists icon_color text;
alter table public.projects add column if not exists short_title text;
alter table public.projects add column if not exists thumbnail_url text;
alter table public.projects add column if not exists icon_key text;
alter table public.projects add column if not exists featured_order integer not null default 0;

alter table public.profiles enable row level security;
alter table public.site_texts enable row level security;
alter table public.skills enable row level security;
alter table public.projects enable row level security;
alter table public.project_media enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.meetings enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists "Public read profiles" on public.profiles;
drop policy if exists "Public read site_texts" on public.site_texts;
drop policy if exists "Authenticated write site_texts" on public.site_texts;
drop policy if exists "Public read skills" on public.skills;
drop policy if exists "Public read projects" on public.projects;
drop policy if exists "Public read project_media" on public.project_media;
drop policy if exists "Authenticated write profiles" on public.profiles;
drop policy if exists "Authenticated write skills" on public.skills;
drop policy if exists "Authenticated write projects" on public.projects;
drop policy if exists "Authenticated write project_media" on public.project_media;
drop policy if exists "Service role admin_users" on public.admin_users;
drop policy if exists "Service role admin_sessions" on public.admin_sessions;
drop policy if exists "Service role meetings" on public.meetings;
drop policy if exists "Service role contact_messages" on public.contact_messages;
drop policy if exists "Public insert meetings" on public.meetings;
drop policy if exists "Public insert contact_messages" on public.contact_messages;

create policy "Public read profiles"
  on public.profiles
  for select
  to anon
  using (true);

create policy "Public read site_texts"
  on public.site_texts
  for select
  to anon
  using (true);

create policy "Authenticated write site_texts"
  on public.site_texts
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Public read skills"
  on public.skills
  for select
  to anon
  using (true);

create policy "Public read projects"
  on public.projects
  for select
  to anon
  using (true);

create policy "Public read project_media"
  on public.project_media
  for select
  to anon
  using (true);

create policy "Authenticated write profiles"
  on public.profiles
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated write skills"
  on public.skills
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated write projects"
  on public.projects
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated write project_media"
  on public.project_media
  for all
  to authenticated
  using (true)
  with check (true);

-- Service role bypass policies for admin tables
create policy "Service role admin_users"
  on public.admin_users
  for all
  to service_role
  using (true)
  with check (true);

create policy "Service role admin_sessions"
  on public.admin_sessions
  for all
  to service_role
  using (true)
  with check (true);

-- Public insert policies for meetings and contact_messages (allow anonymous submissions)
create policy "Public insert meetings"
  on public.meetings
  for insert
  to anon
  with check (true);

create policy "Public insert contact_messages"
  on public.contact_messages
  for insert
  to anon
  with check (true);

-- Service role bypass for meetings and contact_messages
create policy "Service role meetings"
  on public.meetings
  for all
  to service_role
  using (true)
  with check (true);

create policy "Service role contact_messages"
  on public.contact_messages
  for all
  to service_role
  using (true)
  with check (true);

insert into public.profiles (
  full_name,
  title,
  bio,
  summary,
  email,
  website,
  github,
  linkedin,
  resume_url,
  welcome_message,
  is_active
)
values (
  'Your Name',
  'Full-Stack Developer',
  'I build web apps and love clean architecture.',
  'Building web experiences with a terminal soul.',
  'you@example.com',
  'https://your-domain.dev',
  'https://github.com/your-handle',
  'https://www.linkedin.com/in/your-handle/',
  'https://example.com/resume.pdf',
  'Hi! I am a Full-Stack Web and App Developer. Ask me about my projects, skills, or experience.',
  true
)
on conflict do nothing;

insert into public.site_texts (key, value, category, description, sort_order)
values
  ('developer_profile_label', 'DEVELOPER PROFILE', 'ui', 'Label for developer profile section', 1),
  ('quick_commands_label', 'QUICK COMMANDS', 'ui', 'Label for quick commands section', 2),
  ('terminal_version', 'TERMINAL v3.4.2', 'ui', 'Terminal version display', 3),
  ('status_ready', 'STATUS: READY', 'ui', 'System status display', 4),
  ('compiling_label', 'COMPILING', 'loading', 'Loading step 1 - Compiling', 5),
  ('linking_label', 'LINKING', 'loading', 'Loading step 2 - Linking', 6),
  ('executing_label', 'EXECUTING', 'loading', 'Loading step 3 - Executing', 7),
  ('last_command_label', 'LAST COMMAND', 'ui', 'Label for last command display', 8),
  ('developer_label', 'DEVELOPER', 'ui', 'Label for developer badge', 9),
  ('active_label', 'ACTIVE', 'ui', 'Label for active status', 10)
on conflict do nothing;

insert into public.skills (name, category, level, sort_order)
values
  ('Next.js', 'Frontend', 'advanced', 1),
  ('TypeScript', 'Language', 'advanced', 2),
  ('PostgreSQL', 'Database', 'intermediate', 3)
on conflict do nothing;

insert into public.projects (
  title,
  short_title,
  description,
  image_url,
  thumbnail_url,
  project_url,
  repo_url,
  languages,
  tags,
  featured,
  featured_order,
  sort_order
)
values
  (
    'Terminal Portfolio',
    'Portfolio',
    'Interactive terminal-style portfolio built with Next.js.',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    'https://your-portfolio.vercel.app',
    'https://github.com/your-handle/portfolio',
    '{TypeScript,Next.js,PostgreSQL}',
    '{portfolio,terminal,web}',
    true,
    1,
    1
  )
on conflict do nothing;

insert into public.project_media (
  project_id,
  media_type,
  url,
  thumbnail_url,
  video_provider,
  media_order,
  is_visible
)
select
  p.id,
  'image',
  p.image_url,
  p.thumbnail_url,
  null,
  1,
  true
from public.projects p
where p.title = 'Terminal Portfolio'
on conflict do nothing;

create table if not exists public.experiences (
  id bigint generated always as identity primary key,
  title text not null,
  company_name text not null,
  company_logo text,
  location text,
  from_date date not null,
  to_date date,
  is_current boolean not null default false,
  description text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.experience_projects (
  experience_id bigint not null references public.experiences(id) on delete cascade,
  project_id bigint not null references public.projects(id) on delete cascade,
  primary key (experience_id, project_id)
);

alter table public.experiences enable row level security;
alter table public.experience_projects enable row level security;

create policy "Public read experiences"
  on public.experiences
  for select
  to anon
  using (is_visible = true);

create policy "Authenticated all experiences"
  on public.experiences
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Public read experience_projects"
  on public.experience_projects
  for select
  to anon
  using (true);

create policy "Authenticated all experience_projects"
  on public.experience_projects
  for all
  to authenticated
  using (true)
  with check (true);

create index if not exists idx_experiences_sort on public.experiences(sort_order);
create index if not exists idx_experiences_visible on public.experiences(is_visible);
create index if not exists idx_experience_projects_exp on public.experience_projects(experience_id);
create index if not exists idx_experience_projects_proj on public.experience_projects(project_id);
