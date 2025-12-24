#!/bin/bash
#
# Run E2E tests for Moti-Do.
# This script starts a Docker PostgreSQL container, backend, frontend, runs tests, and cleans up.
#
# Uses a LOCAL PostgreSQL database via Docker - no cloud resources (Supabase) consumed.
#
# Usage:
#   ./scripts/run-e2e.sh              # Run all E2E tests
#   ./scripts/run-e2e.sh --ui         # Run tests with Playwright UI
#   ./scripts/run-e2e.sh auth         # Run only auth tests
#   ./scripts/run-e2e.sh --headed     # Run tests in headed browser mode
#   ./scripts/run-e2e.sh --keep-db    # Keep Docker database running after tests
#   ./scripts/run-e2e.sh --no-docker  # Skip Docker, use JSON storage instead
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
KEEP_DB=false
USE_DOCKER=true
PLAYWRIGHT_ARGS=()

for arg in "$@"; do
  case $arg in
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

echo -e "${GREEN}Starting E2E test suite...${NC}"

# Store the project root
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Test database configuration
TEST_DB_PORT=5433
TEST_DB_USER=motido_test
TEST_DB_PASSWORD=motido_test_password
TEST_DB_NAME=motido_test
export DATABASE_URL="postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@localhost:${TEST_DB_PORT}/${TEST_DB_NAME}"

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"

    # Kill backend if running
    if [ ! -z "$BACKEND_PID" ]; then
        echo "Stopping backend server (PID: $BACKEND_PID)"
        kill $BACKEND_PID 2>/dev/null || true
    fi

    # Kill frontend if running
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Stopping frontend server (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null || true
    fi

    # Stop Docker if we started it and --keep-db wasn't specified
    if [ "$DOCKER_STARTED" = true ] && [ "$KEEP_DB" = false ]; then
        echo "Stopping Docker PostgreSQL container..."
        docker compose -f docker-compose.test.yml down -v 2>/dev/null || true
    elif [ "$KEEP_DB" = true ]; then
        echo -e "${BLUE}Keeping Docker PostgreSQL running (use 'docker compose -f docker-compose.test.yml down -v' to stop)${NC}"
    fi

    echo -e "${GREEN}Cleanup complete.${NC}"
}

# Set up cleanup trap
trap cleanup EXIT

# Track if we started Docker
DOCKER_STARTED=false

if [ "$USE_DOCKER" = true ]; then
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Install Docker or use --no-docker flag.${NC}"
        exit 1
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        echo -e "${RED}Docker daemon is not running. Start Docker or use --no-docker flag.${NC}"
        exit 1
    fi

    # Check if test database container is already running
    if docker ps --format '{{.Names}}' | grep -q '^motido-test-db$'; then
        echo -e "${YELLOW}Docker PostgreSQL already running on port ${TEST_DB_PORT}${NC}"
    else
        echo -e "${GREEN}Starting Docker PostgreSQL container...${NC}"
        docker compose -f docker-compose.test.yml up -d
        DOCKER_STARTED=true

        # Wait for PostgreSQL to be ready
        echo "Waiting for PostgreSQL to be ready..."
        for i in {1..30}; do
            if docker exec motido-test-db pg_isready -U $TEST_DB_USER -d $TEST_DB_NAME > /dev/null 2>&1; then
                echo -e "${GREEN}PostgreSQL ready!${NC}"
                break
            fi
            sleep 1
        done

        if ! docker exec motido-test-db pg_isready -U $TEST_DB_USER -d $TEST_DB_NAME > /dev/null 2>&1; then
            echo -e "${RED}PostgreSQL failed to start!${NC}"
            exit 1
        fi
    fi

    echo -e "${BLUE}Using PostgreSQL: $DATABASE_URL${NC}"
else
    echo -e "${YELLOW}Skipping Docker, using JSON storage${NC}"
    unset DATABASE_URL
fi

# Check if servers are already running
BACKEND_RUNNING=false
FRONTEND_RUNNING=false

if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo -e "${YELLOW}Backend already running at http://localhost:8000${NC}"
    BACKEND_RUNNING=true
fi

if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${YELLOW}Frontend already running at http://localhost:5173${NC}"
    FRONTEND_RUNNING=true
fi

# Start backend if not running
if [ "$BACKEND_RUNNING" = false ]; then
    echo -e "${GREEN}Starting backend server...${NC}"
    poetry run uvicorn motido.api.main:app --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!

    # Wait for backend to be ready
    echo "Waiting for backend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}Backend ready!${NC}"
            break
        fi
        sleep 1
    done

    if ! curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo -e "${RED}Backend failed to start!${NC}"
        exit 1
    fi
fi

# Start frontend if not running
if [ "$FRONTEND_RUNNING" = false ]; then
    echo -e "${GREEN}Starting frontend dev server...${NC}"
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..

    # Wait for frontend to be ready
    echo "Waiting for frontend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            echo -e "${GREEN}Frontend ready!${NC}"
            break
        fi
        sleep 1
    done

    if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${RED}Frontend failed to start!${NC}"
        exit 1
    fi
fi

# Run Playwright tests
echo -e "\n${GREEN}Running E2E tests...${NC}"
cd frontend
npx playwright test "${PLAYWRIGHT_ARGS[@]}"
EXIT_CODE=$?

# Report results
echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}All E2E tests passed!${NC}"
else
    echo -e "${RED}Some E2E tests failed.${NC}"
fi

exit $EXIT_CODE
