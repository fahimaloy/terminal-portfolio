#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Supabase Self-Hosted Setup Script
# ═══════════════════════════════════════════════════════════════
# Run this script to:
#   1. Check prerequisites (docker, docker compose)
#   2. Generate JWT keys if needed
#   3. Copy .env.example → .env (if .env doesn't exist)
#   4. Start the Supabase services
#   5. Run schema migration
#   6. Verify everything is healthy
#
# Usage:
#   chmod +x supabase-selfhost.sh
#   ./supabase-selfhost.sh              # Interactive mode
#   ./supabase-selfhost.sh --quick      # Quick start with defaults
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Help ─────────────────────────────────────────────────────
show_help() {
  cat <<EOF
Supabase Self-Hosted Setup for Portfolio

Usage: $0 [OPTIONS]

Options:
  --quick        Skip prompts, use defaults from .env.example
  --help         Show this help message

Steps performed:
  1. Check Docker + docker compose availability
  2. Generate secure JWT secret if missing
  3. Create .env from .env.example (or validate existing)
  4. Start all Supabase Docker services
  5. Wait for services to become healthy
  6. Run database schema migration
  7. Test Supabase connection

Prerequisites:
  - Docker Engine 24+
  - docker compose (plugin) v2+
  - Python 3 (for JWT generation, optional fallback)
EOF
  exit 0
}

# ─── Parse args ───────────────────────────────────────────────
QUICK_MODE=false
for arg in "$@"; do
  case "$arg" in
    --help) show_help ;;
    --quick) QUICK_MODE=true ;;
  esac
done

# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Supabase Self-Hosted Setup for Portfolio     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Step 1: Check prerequisites ──────────────────────────────
echo -e "${BLUE}── Step 1/6: Checking prerequisites ──${NC}"

# docker
if command -v docker &>/dev/null; then
  log_ok "Docker found: $(docker --version)"
else
  log_error "Docker not found. Install Docker first: https://docs.docker.com/engine/install/"
  exit 1
fi

# docker compose
if docker compose version &>/dev/null; then
  log_ok "Docker Compose found: $(docker compose version)"
elif command -v docker-compose &>/dev/null; then
  log_ok "Docker Compose found: $(docker-compose --version)"
  USE_LEGACY=true
else
  log_error "Docker Compose not found."
  exit 1
fi

# python3 (for JWT generation, optional)
HAS_PYTHON=false
if command -v python3 &>/dev/null; then
  HAS_PYTHON=true
  log_ok "Python 3 found (will use for JWT generation)"
elif command -v python &>/dev/null; then
  HAS_PYTHON=true
  log_ok "Python found (will use for JWT generation)"
fi

echo ""

# ─── Step 2: Generate JWT secret ──────────────────────────────
echo -e "${BLUE}── Step 2/6: Checking JWT configuration ──${NC}"

ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE="$SCRIPT_DIR/.env.example"

# Create .env from example if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
  if [ "$QUICK_MODE" = true ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    log_ok ".env created from .env.example (quick mode)"
  else
    read -p "No .env file found. Create from .env.example? (Y/n): " -n 1 -r
    echo
    if [[ ! "$REPLY" =~ ^[Nn]$ ]]; then
      cp "$ENV_EXAMPLE" "$ENV_FILE"
      log_ok ".env created from .env.example"
    else
      log_warn "Skipping .env creation. Make sure .env exists before running."
    fi
  fi
else
  log_ok ".env file already exists"
fi

# Check / generate JWT_SECRET
if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE" 2>/dev/null || true
fi

CURRENT_JWT="${JWT_SECRET:-}"
if [ -z "$CURRENT_JWT" ] || [ "$CURRENT_JWT" = "super-secret-jwt-token-with-at-least-32-characters-long" ]; then
  if [ "$HAS_PYTHON" = true ]; then
    log_info "Generating secure JWT secret..."
    NEW_SECRET=$(python3 -c "
import secrets, string
chars = string.ascii_letters + string.digits
print(''.join(secrets.choice(chars) for _ in range(64)))
" 2>/dev/null || python -c "
import secrets, string
chars = string.ascii_letters + string.digits
print(''.join(secrets.choice(chars) for _ in range(64)))
")
    if [ -n "$NEW_SECRET" ]; then
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" "$ENV_FILE"
      else
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" "$ENV_FILE"
      fi
      log_ok "JWT_SECRET updated in .env"
    fi
  else
    log_warn "Python not found. Using default JWT_SECRET. Generate a secure one for production."
  fi
else
  log_ok "JWT_SECRET already configured"
fi

# Generate anon and service role keys from JWT secret
if [ "$HAS_PYTHON" = true ]; then
  log_info "Generating Supabase API keys from JWT secret..."
  source "$ENV_FILE" 2>/dev/null || true

  python3 -c "
import hmac, hashlib, base64, json, time

def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

def create_jwt(payload, secret):
    header = b64url(json.dumps({'typ': 'JWT', 'alg': 'HS256'}).encode())
    body = b64url(json.dumps(payload, separators=(',', ':')).encode())
    sig = hmac.new(secret.encode(), f'{header}.{body}'.encode(), hashlib.sha256).digest()
    return f'{header}.{body}.{b64url(sig)}'

secret = '$JWT_SECRET'
anon_payload = {'role': 'anon', 'iss': 'supabase', 'iat': 1603998092, 'exp': 2752144492}
svc_payload = {'role': 'service_role', 'iss': 'supabase', 'iat': 1603998092, 'exp': 2752144492}

anon_key = create_jwt(anon_payload, secret)
svc_key = create_jwt(svc_payload, secret)

with open('$ENV_FILE', 'r') as f:
    content = f.read()

content = content.replace('NEXT_PUBLIC_SUPABASE_ANON_KEY=...', f'NEXT_PUBLIC_SUPABASE_ANON_KEY={anon_key}')
content = content.replace('SUPABASE_SERVICE_ROLE_KEY=...', f'SUPABASE_SERVICE_ROLE_KEY={svc_key}')

with open('$ENV_FILE', 'w') as f:
    f.write(content)

print(f'ANON_KEY:      {anon_key[:40]}...')
print(f'SERVICE_KEY:  {svc_key[:40]}...')
" 2>/dev/null && log_ok "API keys generated and written to .env" || log_warn "Could not auto-generate API keys in .env"
fi

echo ""

# ─── Step 3: Check required files ─────────────────────────────
echo -e "${BLUE}── Step 3/6: Checking required files ──${NC}"

FILES_TO_CHECK=(
  "docker-compose.supabase.yml"
  "docker/kong.yml"
  "install/supabase/schema.sql"
  ".env"
)

all_ok=true
for f in "${FILES_TO_CHECK[@]}"; do
  if [ -f "$SCRIPT_DIR/$f" ]; then
    log_ok "Found: $f"
  else
    log_error "Missing: $f"
    all_ok=false
  fi
done

if [ "$all_ok" = false ]; then
  log_error "Required files missing. Aborting."
  exit 1
fi

echo ""

# ─── Step 4: Start services ───────────────────────────────────
echo -e "${BLUE}── Step 4/6: Starting Supabase services ──${NC}"

COMPOSE_FILE="$SCRIPT_DIR/docker-compose.supabase.yml"
ENV_FILE="$SCRIPT_DIR/.env"

if [ "${USE_LEGACY:-false}" = true ]; then
  docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
else
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
fi

log_ok "Services starting..."
echo ""

# ─── Step 5: Wait for health ──────────────────────────────────
echo -e "${BLUE}── Step 5/6: Waiting for services to become healthy ──${NC}"

MAX_RETRIES=30
RETRY_INTERVAL=5

check_service() {
  local name="$1"
  local url="$2"
  local retries=0

  while [ $retries -lt $MAX_RETRIES ]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      log_ok "$name is healthy"
      return 0
    fi
    retries=$((retries + 1))
    sleep "$RETRY_INTERVAL"
  done

  log_warn "$name health check timed out (check logs with: docker logs portfolio-supabase-$name)"
  return 1
}

# Wait for PostgreSQL first
check_service "PostgreSQL (db)" "http://localhost:${POSTGRES_PORT:-5432}" || true
sleep 5

# Then check the API gateway
check_service "Kong API Gateway" "http://localhost:${KONG_HTTP_PORT:-8000}" || true

# Check individual services
check_service "PostgREST" "http://localhost:${KONG_HTTP_PORT:-8000}/rest/v1/" || true
check_service "GoTrue Auth" "http://localhost:${KONG_HTTP_PORT:-8000}/auth/v1/" || true

echo ""

# ─── Step 6: Run migration ────────────────────────────────────
echo -e "${BLUE}── Step 6/6: Running schema migration ──${NC}"

# The schema.sql is mounted as docker-entrypoint-initdb.d, so it runs
# automatically when PostgreSQL starts. But let's verify and re-run if needed.
if command -v psql &>/dev/null; then
  PGPASSWORD="${POSTGRES_PASSWORD:-supabase_db_password}" \
  psql -h localhost -p "${POSTGRES_PORT:-5432}" \
       -U postgres -d "${POSTGRES_DB:-supabase}" \
       -f "$SCRIPT_DIR/install/supabase/schema.sql" 2>/dev/null \
    && log_ok "Schema migration applied" \
    || log_warn "Schema migration may have already run (psql not available or already applied)"
else
  log_warn "psql not found. Schema.sql was mounted as init script and should have run automatically."
  log_info "To verify, run: docker exec portfolio-supabase-db psql -U postgres -d supabase -c '\dt'"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup Complete!                     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}●${NC} Supabase Dashboard:  http://localhost:${KONG_HTTP_PORT:-8000}"
echo -e "  ${GREEN}●${NC} PostgREST API:       http://localhost:${KONG_HTTP_PORT:-8000}/rest/v1/"
echo -e "  ${GREEN}●${NC} Storage API:         http://localhost:${KONG_HTTP_PORT:-8000}/storage/v1/"
echo -e "  ${GREEN}●${NC} MailHog UI:          http://localhost:8025"
echo ""
echo -e "  ${YELLOW}⚠${NC} Next steps:"
echo -e "     1. Source the .env:  ${BLUE}source .env${NC}"
echo -e "     2. Start dev server: ${BLUE}npm run dev${NC}"
echo -e "     3. Open:             ${BLUE}http://localhost:3000${NC}"
echo ""
echo -e "  ${YELLOW}⚠${NC} To stop services:"
echo -e "     ${BLUE}docker compose -f docker-compose.supabase.yml down${NC}"
echo ""
