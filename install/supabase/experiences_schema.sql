-- install/supabase/experiences_schema.sql
-- Run this migration to add experiences support

-- 1. Add duration column to skills
ALTER TABLE skills ADD COLUMN IF NOT EXISTS duration text;

-- 2. Add client and description_html columns to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_location text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_logo text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description_html text;

-- 3. Create experiences table
CREATE TABLE IF NOT EXISTS experiences (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  company_name text NOT NULL,
  company_logo text,
  location text,
  from_date date NOT NULL,
  to_date date,
  is_current boolean NOT NULL DEFAULT false,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create experience_projects junction table
CREATE TABLE IF NOT EXISTS experience_projects (
  experience_id bigint NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  project_id bigint NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (experience_id, project_id)
);

-- 5. Enable RLS
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_projects ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for experiences
CREATE POLICY "Public read experiences" ON experiences
  FOR SELECT USING (is_visible = true);
CREATE POLICY "Auth all experiences" ON experiences
  FOR ALL USING (auth.role() = 'authenticated');

-- 7. RLS policies for experience_projects
CREATE POLICY "Public read experience_projects" ON experience_projects
  FOR SELECT USING (true);
CREATE POLICY "Auth all experience_projects" ON experience_projects
  FOR ALL USING (auth.role() = 'authenticated');

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_experiences_sort ON experiences(sort_order);
CREATE INDEX IF NOT EXISTS idx_experiences_visible ON experiences(is_visible);
CREATE INDEX IF NOT EXISTS idx_experience_projects_exp ON experience_projects(experience_id);
CREATE INDEX IF NOT EXISTS idx_experience_projects_proj ON experience_projects(project_id);
