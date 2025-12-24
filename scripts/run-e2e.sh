#!/bin/bash
#
# Run E2E tests for Moti-Do.
# This script starts the backend and frontend servers, runs the tests, and cleans up.
#
# Usage:
#   ./scripts/run-e2e.sh              # Run all E2E tests
#   ./scripts/run-e2e.sh --ui         # Run tests with Playwright UI
#   ./scripts/run-e2e.sh auth         # Run only auth tests
#   ./scripts/run-e2e.sh --headed     # Run tests in headed browser mode
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting E2E test suite...${NC}"

# Store the project root
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

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

    echo -e "${GREEN}Cleanup complete.${NC}"
}

# Set up cleanup trap
trap cleanup EXIT

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
npx playwright test "$@"
EXIT_CODE=$?

# Report results
echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}All E2E tests passed!${NC}"
else
    echo -e "${RED}Some E2E tests failed.${NC}"
fi

exit $EXIT_CODE
