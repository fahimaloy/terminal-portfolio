### Live Demo : [Click Here](http://fahimaloy.herokuapp.com/)
## Built using:
- Typescript
- React
- Next JS

## Free Serverless Backend (Supabase)

This project now supports a backend-free setup with Supabase (free tier):

- Postgres tables for `profiles`, `skills`, `projects`
- Public read policies for portfolio content
- No separate backend server required

### 1. Create Supabase Project

1. Go to Supabase and create a free project.
2. Open SQL Editor and run `install/supabase/schema.sql`.

### 2. Configure Environment

1. Copy `.env.example` to `.env.local`.
2. Fill in:
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- `SUPABASE_SERVICE_ROLE_KEY`
	- `ADMIN_DEFAULT_USERNAME`
	- `ADMIN_DEFAULT_PASSWORD`
	- `ADMIN_DEFAULT_EMAIL`

### 3. Run App

```bash
npm install
npm run dev
```

### 4. Commands Using Supabase

- `projects`: reads from `projects` table
- `skills`: reads from `skills` table
- `about`: reads from `profiles` table

If Supabase env vars are missing, commands fall back to previous behavior/static defaults.

## Admin Panel and New UX

- Command `sudosuperuser-ostaad` now asks for password in terminal input.
- Login is now server-side with HTTP-only session cookies.
- Default seed credentials are created from env: `ADMIN_DEFAULT_USERNAME`, `ADMIN_DEFAULT_PASSWORD`, `ADMIN_DEFAULT_EMAIL`.
- On success, a new tab opens: `/sudosuperuser-ostaad`.
- Dashboard includes a credentials section to change username, password, and private email.

Admin panel currently supports:

- Profile edit: name, about, summary, phone, email, social links
- Skills CRUD: add/edit/delete and drag-drop reorder
- Projects CRUD: add/edit/delete, featured toggle and ordering
- Media manager: multiple image/video entries via URL or upload

Storage note:

- For uploads, create Supabase Storage bucket named `portfolio-media` and make it public.
