#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Database Migration Script
# ═══════════════════════════════════════════════════════════════
# Runs the Supabase schema against a PostgreSQL database.
# Works with self-hosted Supabase or any PostgreSQL instance.
#
# Usage:
#   ./migrate.sh                    # Use defaults from .env
#   ./migrate.sh --dry-run          # Show SQL without executing
#   ./migrate.sh --host=myhost      # Custom host
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Parse args ───────────────────────────────────────────────
DRY_RUN=false
CUSTOM_HOST=""
CUSTOM_PORT=""
CUSTOM_DB=""
CUSTOM_USER=""
CUSTOM_PASS=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --host=*) CUSTOM_HOST="${arg#*=}" ;;
    --port=*) CUSTOM_PORT="${arg#*=}" ;;
    --db=*)   CUSTOM_DB="${arg#*=}" ;;
    --user=*) CUSTOM_USER="${arg#*=}" ;;
    --pass=*) CUSTOM_PASS="${arg#*=}" ;;
    --help)
      echo "Usage: $0 [--dry-run] [--host=HOST] [--port=PORT] [--db=DB] [--user=USER] [--pass=PASS]"
      exit 0
      ;;
  esac
done

# ─── Load config ──────────────────────────────────────────────
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

DB_HOST="${CUSTOM_HOST:-localhost}"
DB_PORT="${CUSTOM_PORT:-${POSTGRES_PORT:-5432}}"
DB_NAME="${CUSTOM_DB:-${POSTGRES_DB:-supabase}}"
DB_USER="${CUSTOM_USER:-postgres}"
DB_PASS="${CUSTOM_PASS:-${POSTGRES_PASSWORD:-supabase_db_password}}"

SCHEMA_FILE="$SCRIPT_DIR/install/supabase/schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
  log_error "Schema file not found: $SCHEMA_FILE"
  exit 1
fi

echo -e "${BLUE}── Database Migration ──${NC}"
echo "  Host:     $DB_HOST:$DB_PORT"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo "  Schema:   $SCHEMA_FILE"
echo ""

# ─── Check requirements ───────────────────────────────────────
if ! command -v psql &>/dev/null; then
  log_error "psql not found. Install PostgreSQL client:"
  echo "  Ubuntu/Debian: sudo apt install postgresql-client"
  echo "  macOS:         brew install libpq"
  echo "  Alpine:        apk add postgresql-client"
  exit 1
fi

# ─── Dry run ──────────────────────────────────────────────────
if [ "$DRY_RUN" = true ]; then
  log_info "Dry run — showing SQL without executing:"
  echo ""
  cat "$SCHEMA_FILE"
  exit 0
fi

# ─── Run migration ────────────────────────────────────────────
log_info "Running schema migration..."

# Check connectivity first
PGPASSWORD="$DB_PASS" psql \
  -h "$DB_HOST" -p "$DB_PORT" \
  -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT 1 AS connected;" > /dev/null 2>&1 && \
  log_ok "Database connection successful" || {
  log_error "Cannot connect to database. Check your credentials and ensure PostgreSQL is running."
  exit 1
}

# Run the schema
PGPASSWORD="$DB_PASS" psql \
  -h "$DB_HOST" -p "$DB_PORT" \
  -U "$DB_USER" -d "$DB_NAME" \
  -f "$SCHEMA_FILE" \
  -v ON_ERROR_STOP=1 2>&1

echo ""
log_ok "Schema migration applied successfully"

# Verify tables
log_info "Verifying tables..."
PGPASSWORD="$DB_PASS" psql \
  -h "$DB_HOST" -p "$DB_PORT" \
  -U "$DB_USER" -d "$DB_NAME" \
  -c "\dt public.*"

echo ""
log_ok "Migration complete"
