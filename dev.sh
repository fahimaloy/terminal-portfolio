#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Development Server Script
# ═══════════════════════════════════════════════════════════════
# Runs both frontend (Next.js) and backend (Supabase) locally
#
# Usage:
#   chmod +x dev.sh
#   ./dev.sh              # Start all services
#   ./dev.sh --frontend   # Start frontend only
#   ./dev.sh --backend    # Start backend only
#   ./dev.sh --stop       # Stop all services
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

# ─── Load nvm and use compatible Node.js ──────────────────────
setup_node() {
  export NVM_DIR="$HOME/.nvm"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh" 2>/dev/null

    local current_version
    current_version="$(node --version 2>/dev/null || echo "v0.0.0")"
    local current_major="${current_version#v}"
    current_major="${current_major%%.*}"

    # Next.js 12 needs Node.js < 23 (jsonwebtoken uses Buffer.prototype.equal removed in Node 23+)
    if [ "$current_major" -ge 23 ] 2>/dev/null; then
      log_warn "Node.js ${current_version} is incompatible with Next.js 12 (jwt/Buffer issue)"
      log_info "Switching to Node.js 20 via nvm..."

      if nvm ls 20 &>/dev/null; then
        nvm use 20
        log_ok "Switched to $(node --version)"
      elif nvm ls 22 &>/dev/null; then
        nvm use 22
        log_ok "Switched to $(node --version)"
      else
        log_error "No compatible Node.js found via nvm. Install one: nvm install 20"
        exit 1
      fi
    fi
  fi
}

setup_node

# ─── Load .env ───────────────────────────────────────────────
load_env() {
  if [ -f ".env" ]; then
    set -a
    source ".env"
    set +a
  fi
}

load_env

# Use env values with defaults
BACKEND_PORT="${BACKEND_PORT:-3838}"
FRONTEND_PORT="${FRONTEND_PORT:-3355}"

# ─── Help ─────────────────────────────────────────────────────
show_help() {
  cat <<EOF
Development Server for Portfolio

Usage: $0 [OPTIONS]

Options:
  --frontend   Start frontend (Next.js) only
  --backend    Start backend (Supabase Docker) only
  --stop       Stop all services
  --status     Show status of services
  --help       Show this help message

Services:
  Frontend:  Next.js dev server (http://localhost:${FRONTEND_PORT})
  Backend:   Supabase Kong API Gateway (http://localhost:${BACKEND_PORT})
             Supabase PostgREST (via Kong)

EOF
  exit 0
}

# ─── Parse args ───────────────────────────────────────────────
MODE="all"
for arg in "$@"; do
  case "$arg" in
    --frontend) MODE="frontend" ;;
    --backend)  MODE="backend" ;;
    --stop)     MODE="stop" ;;
    --status)   MODE="status" ;;
    --help)     show_help ;;
    *)          log_error "Unknown option: $arg"; show_help ;;
  esac
done

# ─── Status check ─────────────────────────────────────────────
check_status() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║              Service Status                      ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
  echo ""

  # Check Docker containers
  if docker compose -f docker-compose.local.yml ps --format json 2>/dev/null | grep -q "running"; then
    log_ok "Backend (Supabase): Running"
  else
    log_warn "Backend (Supabase): Not running"
  fi

  # Check Next.js
  if curl -sf http://localhost:${FRONTEND_PORT} > /dev/null 2>&1; then
    log_ok "Frontend (Next.js): Running on http://localhost:${FRONTEND_PORT}"
  else
    log_warn "Frontend (Next.js): Not running"
  fi

  echo ""
}

# ─── Stop services ────────────────────────────────────────────
stop_services() {
  echo ""
  log_info "Stopping services..."
  
  # Stop Docker containers
  if docker compose -f docker-compose.local.yml ps --format json 2>/dev/null | grep -q "running"; then
    docker compose -f docker-compose.local.yml down
    log_ok "Backend services stopped"
  else
    log_warn "Backend services were not running"
  fi

  # Kill Next.js if running
  if pgrep -f "next dev" > /dev/null 2>&1; then
    pkill -f "next dev"
    log_ok "Frontend stopped"
  else
    log_warn "Frontend was not running"
  fi

  log_ok "All services stopped"
  echo ""
}

# ─── Check prerequisites ─────────────────────────────────────
check_prerequisites() {
  log_step "Checking prerequisites..."
  
  # Docker
  if ! command -v docker &>/dev/null; then
    log_error "Docker not found. Install Docker: https://docs.docker.com/engine/install/"
    exit 1
  fi
  log_ok "Docker found"

  # Docker Compose
  if ! docker compose version &>/dev/null; then
    log_error "Docker Compose not found"
    exit 1
  fi
  log_ok "Docker Compose found"

  # Node.js
  if ! command -v node &>/dev/null; then
    log_error "Node.js not found. Install Node.js: https://nodejs.org/"
    exit 1
  fi
  log_ok "Node.js found: $(node --version)"

  # npm
  if ! command -v npm &>/dev/null; then
    log_error "npm not found"
    exit 1
  fi
  log_ok "npm found: $(npm --version)"

  # .env file
  if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
      log_warn ".env not found, creating from .env.example"
      cp .env.example .env
      log_ok ".env created"
      load_env
    else
      log_error ".env.example not found"
      exit 1
    fi
  else
    log_ok ".env file found"
  fi

  # node_modules
  if [ ! -d "node_modules" ]; then
    log_warn "node_modules not found, running npm install..."
    npm install
    log_ok "Dependencies installed"
  else
    log_ok "node_modules found"
  fi

  echo ""
}

# ─── Check database schema ───────────────────────────────────
check_database_schema() {
  # Check if psql is available
  if ! command -v psql &>/dev/null; then
    log_warn "psql not found - cannot verify database schema"
    log_info "If you encounter errors, run: ./setup-db.sh"
    return 0
  fi

  # Test connection and check for profiles table
  export PGPASSWORD="${POSTGRES_PASSWORD:-}"
  local table_exists
  table_exists=$(psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-fahimaloy}" -d "${POSTGRES_DB:-portfolio}" -t -c "
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles'
    );
  " 2>/dev/null | tr -d ' ' || echo "f")

  if [ "$table_exists" != "t" ]; then
    log_warn "Database schema not found!"
    log_info "PostgreSQL database needs to be seeded"
    echo ""
    read -p "Run database setup now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      if [ -f "./setup-db.sh" ]; then
        ./setup-db.sh
      else
        log_error "setup-db.sh not found"
        exit 1
      fi
    else
      log_warn "Skipping database setup"
      log_info "Run './setup-db.sh' manually if you encounter errors"
    fi
  else
    log_ok "Database schema verified"
  fi
}

# ─── Start backend ────────────────────────────────────────────
start_backend() {
  log_step "Starting backend services..."
  
  # Check if already running
  if docker compose -f docker-compose.local.yml ps --format json 2>/dev/null | grep -q "running"; then
    log_warn "Backend services already running"
    return 0
  fi

  # Check database schema for external DB
  check_database_schema

  # Start Docker Compose
  docker compose -f docker-compose.local.yml up -d
  log_ok "Backend services starting..."

  # Wait for Kong to be ready (check PostgREST via Kong)
  log_info "Waiting for Kong API Gateway on port ${BACKEND_PORT}..."
  local retries=0
  local max_retries=30
  local retry_interval=3

  while [ $retries -lt $max_retries ]; do
    # Use rest endpoint — returns data even without auth, confirms Kong + PostgREST are up
    local http_code
    http_code="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${BACKEND_PORT}/rest/v1/" 2>/dev/null || true)"
    if [ -n "$http_code" ] && [ "$http_code" != "000" ]; then
      log_ok "Kong API Gateway is ready (HTTP ${http_code})"
      break
    fi
    retries=$((retries + 1))
    sleep $retry_interval
  done

  if [ $retries -eq $max_retries ]; then
    log_warn "Kong API Gateway health check timed out (may still be starting)"
  fi

  echo ""
}

# ─── Start frontend ───────────────────────────────────────────
start_frontend() {
  log_step "Starting frontend..."
  
  # Check if already running
  if curl -sf http://localhost:${FRONTEND_PORT} > /dev/null 2>&1; then
    log_warn "Frontend already running on http://localhost:${FRONTEND_PORT}"
    return 0
  fi

  # Start Next.js dev server in background with PORT from env
  PORT=${FRONTEND_PORT} npm run dev &
  FRONTEND_PID=$!
  
  # Wait for Next.js to be ready
  log_info "Waiting for Next.js dev server on port ${FRONTEND_PORT}..."
  local retries=0
  local max_retries=30
  local retry_interval=2

  while [ $retries -lt $max_retries ]; do
    if curl -sf http://localhost:${FRONTEND_PORT} > /dev/null 2>&1; then
      log_ok "Next.js dev server is ready"
      break
    fi
    retries=$((retries + 1))
    sleep $retry_interval
  done

  if [ $retries -eq $max_retries ]; then
    log_warn "Next.js dev server health check timed out (may still be starting)"
  fi

  echo ""
}

# ─── Cleanup on exit ─────────────────────────────────────────
cleanup() {
  echo ""
  log_info "Shutting down..."
  
  # Stop Next.js if we started it
  if [ -n "${FRONTEND_PID:-}" ]; then
    kill $FRONTEND_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    log_ok "Frontend stopped"
  fi

  # Stop Docker containers if we started them
  if [ "$MODE" != "frontend" ]; then
    docker compose -f docker-compose.local.yml down 2>/dev/null || true
    log_ok "Backend stopped"
  fi

  echo ""
  echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║              All services stopped                ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""
  exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# ═══════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Portfolio Development Server             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}Frontend port:${NC} ${FRONTEND_PORT}"
echo -e "  ${BLUE}Backend port:${NC}  ${BACKEND_PORT}"
echo ""

case "$MODE" in
  status)
    check_status
    exit 0
    ;;
  stop)
    stop_services
    exit 0
    ;;
  frontend)
    check_prerequisites
    start_frontend
    log_ok "Frontend running at http://localhost:${FRONTEND_PORT}"
    log_info "Press Ctrl+C to stop"
    wait
    ;;
  backend)
    check_prerequisites
    start_backend
    log_ok "Backend running at http://localhost:${BACKEND_PORT}"
    log_info "Press Ctrl+C to stop"
    wait
    ;;
  all)
    check_prerequisites
    start_backend
    start_frontend
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          All services are running!               ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${GREEN}●${NC} Frontend:  http://localhost:${FRONTEND_PORT}"
    echo -e "  ${GREEN}●${NC} Backend:   http://localhost:${BACKEND_PORT}"
    echo ""
    echo -e "  ${YELLOW}Press Ctrl+C to stop all services${NC}"
    echo ""
    
    # Wait for background processes
    wait
    ;;
esac
