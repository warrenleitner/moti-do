#!/bin/bash
# verify.sh - Unified check script for Moti-Do
# Runs all static analysis, unit tests, and optional E2E tests.
# Only prints logs if a step fails.

set -e

# ==============================================================================
# Setup & Helper Functions
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Lock file configuration for E2E
LOCK_DIR="$PROJECT_ROOT/.run"
E2E_LOCK="$LOCK_DIR/e2e.lock"
DEV_LOCK="$LOCK_DIR/dev.lock"
BACKEND_LOG_FILE="$PROJECT_ROOT/.run/backend.log"
FRONTEND_LOG_FILE="$PROJECT_ROOT/.run/frontend.log"
mkdir -p "$LOCK_DIR"

# State tracking
DOCKER_STARTED=false
BACKEND_PID=""
FRONTEND_PID=""

# Cleanup function
cleanup() {
    # Only cleanup if we actually started things (E2E mode)
    if [ -f "$E2E_LOCK" ]; then
        rm -f "$E2E_LOCK" 2>/dev/null || true
    fi

    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi

    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi

    if [ "$DOCKER_STARTED" = true ] && [ "$KEEP_DB" = false ]; then
        $DOCKER_COMPOSE -f docker-compose.test.yml down -v 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Function to run a command quietly, printing output only on failure
run_check() {
    local label="$1"
    local cmd="$2"
    local working_dir="${3:-.}"
    local log_file=$(mktemp)
    
    echo -n "→ $label... "
    
    # We use a subshell to change directory without affecting the main script
    if (cd "$working_dir" && eval "$cmd") > "$log_file" 2>&1; then
        echo "✅ Passed"
        rm "$log_file"
        return 0
    else
        echo "❌ Failed"
        echo "===================================="
        cat "$log_file"
        echo "===================================="
        rm "$log_file"
        return 1
    fi
}

# ==============================================================================
# Argument Parsing
# ==============================================================================

RUN_E2E=true
KEEP_DB=false
USE_DOCKER=true
PLAYWRIGHT_ARGS=()

for arg in "$@"; do
  case $arg in
    --skip-e2e|--unit-only)
      RUN_E2E=false
      ;;
    --keep-db)
      KEEP_DB=true
      ;;
    --no-docker)
      USE_DOCKER=false
      ;;
    *)
      PLAYWRIGHT_ARGS+=("$arg")
      ;;
  esac
done

# ==============================================================================
# Python Backend Checks
# ==============================================================================

echo "===================================="
echo "Checking Backend"
echo "===================================="

# Determine how to run python/poetry
if command -v poetry &> /dev/null; then
    PYTHON_RUN="poetry run"
elif [ -f "$PROJECT_ROOT/.venv/bin/python" ]; then
    PYTHON_RUN="$PROJECT_ROOT/.venv/bin/python -m"
else
    PYTHON_RUN="python3 -m"
fi

export PYTHONPATH="$PROJECT_ROOT/src${PYTHONPATH:+:$PYTHONPATH}"

run_check "Formatting (isort)" "$PYTHON_RUN isort ."
run_check "Formatting (black)" "$PYTHON_RUN black ."
run_check "Type checking (mypy)" "$PYTHON_RUN mypy src tests"
run_check "Linting (pylint)" "$PYTHON_RUN pylint src tests --fail-under=10"
run_check "Unit tests (pytest)" "$PYTHON_RUN pytest --cov=motido --cov-report=term-missing --cov-fail-under=100"

# ==============================================================================
# Frontend Checks
# ==============================================================================

echo ""
echo "===================================="
echo "Checking Frontend"
echo "===================================="

run_check "Installing dependencies" "npm ci" "frontend"
run_check "Linting (ESLint)" "npm run lint" "frontend"
run_check "Type checking (TSC)" "npx tsc --noEmit" "frontend"
run_check "Unit tests (Vitest)" "npm run test:coverage" "frontend"
run_check "Building production bundle" "npm run build" "frontend"


# ==============================================================================
# E2E Tests
# ==============================================================================

if [ "$RUN_E2E" = false ]; then
  echo ""
  echo "✅ Unit checks passed (E2E skipped)"
  exit 0
fi

echo ""
echo "===================================="
echo "Running E2E Tests (Playwright)"
echo "===================================="

# Check for conflicting dev server
if [ -f "$DEV_LOCK" ]; then
    DEV_PID=$(cat "$DEV_LOCK" 2>/dev/null)
    if kill -0 "$DEV_PID" 2>/dev/null; then
        echo "❌ Error: dev.sh is currently running (PID: $DEV_PID)"
        echo "Stop the dev server first, or run E2E tests in a separate environment."
        exit 1
    else
        rm -f "$DEV_LOCK"
    fi
fi

# Create lock file
echo $$ > "$E2E_LOCK"

# Database Config
TEST_DB_PORT=5433
TEST_DB_USER=motido_test
TEST_DB_PASSWORD=motido_test_password
TEST_DB_NAME=motido_test
export DATABASE_URL="postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@localhost:${TEST_DB_PORT}/${TEST_DB_NAME}"

# Docker Setup
if [ "$USE_DOCKER" = true ]; then
    # Detect docker compose
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    elif docker-compose version &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    elif /opt/homebrew/bin/docker-compose version &> /dev/null; then
        DOCKER_COMPOSE="/opt/homebrew/bin/docker-compose"
    else
        echo "❌ Docker Compose not found."
        exit 1
    fi

    # Helper for Docker start
    start_docker() {
        if ! command -v docker &> /dev/null; then echo "Docker not installed"; return 1; fi
        if ! docker info &> /dev/null; then
             if command -v colima &> /dev/null; then colima start; else echo "Docker daemon not running"; return 1; fi
        fi
        
        $DOCKER_COMPOSE -f docker-compose.test.yml down -v >/dev/null 2>&1 || true
        docker rm -f motido-test-db >/dev/null 2>&1 || true
        $DOCKER_COMPOSE -f docker-compose.test.yml up -d
    }

    run_check "Starting Docker PostgreSQL" start_docker

    DOCKER_STARTED=true
    
    echo -n "→ Waiting for DB ready... "
    # Wait loop
    DB_READY=false
    for i in {1..30}; do
        if docker exec motido-test-db pg_isready -U $TEST_DB_USER -d $TEST_DB_NAME > /dev/null 2>&1; then
            DB_READY=true
            break
        fi
        sleep 1
    done
    
    if [ "$DB_READY" = true ]; then
        echo "✅ Passed"
    else
        echo "❌ Failed"
        exit 1
    fi

else
    echo "→ Skipping Docker (using JSON)... ✅ Passed"
    export DATABASE_URL=""
    rm -f "$PROJECT_ROOT/src/motido/data/motido_data/users.json" 2>/dev/null || true
fi

# Start Backend
if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "→ Backend already running... ✅ (Using existing)"
else
    echo -n "→ Starting Backend... "
    $PYTHON_RUN uvicorn motido.api.main:app --host 0.0.0.0 --port 8000 > "$BACKEND_LOG_FILE" 2>&1 &
    BACKEND_PID=$!
    
    BACKEND_READY=false
    for i in {1..30}; do
        if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
            BACKEND_READY=true
            break
        fi
        sleep 1
    done

    if [ "$BACKEND_READY" = true ]; then
        echo "✅ Passed"
    else
        echo "❌ Failed"
        echo "Backend Log:"
        tail -n 20 "$BACKEND_LOG_FILE"
        exit 1
    fi
fi

# Start Frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "→ Frontend already running... ✅ (Using existing)"
else
    echo -n "→ Starting Frontend... "
    cd frontend
    npm run dev > "$FRONTEND_LOG_FILE" 2>&1 &
    FRONTEND_PID=$!
    cd ..

    FRONTEND_READY=false
    for i in {1..30}; do
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            FRONTEND_READY=true
            break
        fi
        sleep 1
    done

    if [ "$FRONTEND_READY" = true ]; then
        echo "✅ Passed"
    else
        echo "❌ Failed"
        echo "Frontend Log:"
        tail -n 20 "$FRONTEND_LOG_FILE"
        exit 1
    fi
fi

# Run Playwright
# Join the args array into a string for display/execution
PLAYWRIGHT_CMD="PW_TEST_HTML_REPORT_OPEN=never npx playwright test ${PLAYWRIGHT_ARGS[*]}"
run_check "Running Playwright Tests" "$PLAYWRIGHT_CMD" "frontend"

echo ""
echo "===================================="
echo "✅ All checks passed!"
echo "===================================="
