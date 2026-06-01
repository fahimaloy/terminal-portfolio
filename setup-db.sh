#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Database Setup Script for External PostgreSQL
# ═══════════════════════════════════════════════════════════════
# Sets up Supabase roles and applies schema to external database
#
# Usage:
#   chmod +x setup-db.sh
#   ./setup-db.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "${CYAN}[STEP]${NC}  $1"; }

# ─── Load .env ───────────────────────────────────────────────
if [ -f ".env" ]; then
  set -a
  source ".env"
  set +a
fi

# Use env values with defaults
DB_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-fahimaloy}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
POSTGRES_DB="${POSTGRES_DB:-portfolio}"

# ─── Check prerequisites ─────────────────────────────────────
if ! command -v psql &>/dev/null; then
  log_error "psql not found. Install PostgreSQL client: https://www.postgresql.org/download/"
  exit 1
fi

log_ok "psql found"

# ─── Test connection ─────────────────────────────────────────
log_step "Testing database connection..."
export PGPASSWORD="$POSTGRES_PASSWORD"
if ! psql -h "$DB_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1" &>/dev/null; then
  log_error "Cannot connect to PostgreSQL at ${DB_HOST}:${POSTGRES_PORT}"
  log_info "Check that PostgreSQL is running and credentials are correct"
  exit 1
fi
log_ok "Connected to PostgreSQL at ${DB_HOST}:${POSTGRES_PORT}"

# ─── Create Supabase roles ───────────────────────────────────
log_step "Creating Supabase roles..."

psql -h "$DB_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<EOF
-- Create roles if they don't exist
DO \$\$
BEGIN
  -- anon role (for public/unauthenticated access)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
    RAISE NOTICE 'Created role: anon';
  ELSE
    RAISE NOTICE 'Role anon already exists';
  END IF;

  -- authenticated role (for logged-in users)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
    RAISE NOTICE 'Created role: authenticated';
  ELSE
    RAISE NOTICE 'Role authenticated already exists';
  END IF;

  -- service_role (bypasses RLS, for backend services)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
    RAISE NOTICE 'Created role: service_role';
  ELSE
    -- Ensure service_role has BYPASSRLS even if it already exists
    ALTER ROLE service_role BYPASSRLS;
    RAISE NOTICE 'Role service_role already exists (ensured BYPASSRLS)';
  END IF;

  -- authenticator role (used by PostgREST to switch roles)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOLOGIN INHERIT;
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
    RAISE NOTICE 'Created role: authenticator';
  ELSE
    RAISE NOTICE 'Role authenticator already exists';
  END IF;
END
\$\$;

-- Grant usage on public schema to roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
EOF

log_ok "Supabase roles created/verified"

# ─── Apply main schema ───────────────────────────────────────
log_step "Applying main schema (schema.sql)..."
if [ -f "install/supabase/schema.sql" ]; then
  psql -h "$DB_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "install/supabase/schema.sql"
  log_ok "Main schema applied"
else
  log_error "install/supabase/schema.sql not found"
  exit 1
fi

# ─── Apply AI schema ─────────────────────────────────────────
log_step "Applying AI schema (ai_schema.sql)..."
if [ -f "install/supabase/ai_schema.sql" ]; then
  psql -h "$DB_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "install/supabase/ai_schema.sql"
  log_ok "AI schema applied"
else
  log_warn "install/supabase/ai_schema.sql not found (skipping)"
fi

# ─── Verify tables ───────────────────────────────────────────
log_step "Verifying tables..."
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "
  SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';
" | tr -d ' ')

log_ok "Found $TABLE_COUNT tables in public schema"

# List tables
log_info "Tables:"
psql -h "$DB_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  ORDER BY table_name;
"

echo ""
log_ok "Database setup complete!"
echo ""
