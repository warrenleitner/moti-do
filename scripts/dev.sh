#!/bin/bash
#
# Launch Moti-Do development servers (frontend + backend).
#
# Supports two modes:
#   - Supabase mode: Uses DATABASE_URL from .env file (connects to Supabase cloud)
#   - Local mode: Uses Docker PostgreSQL container (no cloud resources consumed)
#
# Usage:
#   ./scripts/dev.sh                  # Default: Supabase mode (uses .env)
#   ./scripts/dev.sh --supabase       # Explicit Supabase mode
#   ./scripts/dev.sh --local          # Local Docker PostgreSQL mode
#   ./scripts/dev.sh --offline        # Offline mode (SQLite/JSON, no Docker)
#   ./scripts/dev.sh --sandbox        # Offline mode + Network Sandboxing (Linux only)
#   ./scripts/dev.sh --local --keep   # Keep Docker DB when stopping
#
# Press Ctrl+C to stop all servers.
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
MODE="supabase"
KEEP_DB=false
INIT_BACKEND=""
SANDBOX=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --supabase)
            MODE="supabase"
            ;;
        --local)
            MODE="local"
            ;;
        --offline)
            MODE="offline"
            ;;
        --sandbox)
            MODE="offline"
            SANDBOX=true
            ;;
        --init)
            # Check if next arg exists and is not another flag
            if [[ -n "$2" && "$2" != --* ]]; then
                INIT_BACKEND="$2"
                shift
            else
                echo -e "${RED}Error: --init requires a backend type (db or json)${NC}"
                exit 1
            fi
            ;;
        --keep)
            KEEP_DB=true
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Launch Moti-Do development servers (frontend + backend)."
            echo ""
            echo "Options:"
            echo "  --supabase    Use Supabase database from .env (default)"
            echo "  --local       Use local Docker PostgreSQL database"
            echo "  --offline     Use local file storage (SQLite/JSON) - no Docker needed"
            echo "  --sandbox     Offline mode + Network Sandboxing (Linux only)"
            echo "  --init TYPE   Initialize backend (db or json) and exit"
            echo "  --keep        Keep Docker DB running after stopping (only with --local)"
            echo "  -h, --help    Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Start with Supabase (from .env)"
            echo "  $0 --local            # Start with local Docker PostgreSQL"
            echo "  $0 --offline          # Start in offline mode (no Docker)"
            echo "  $0 --sandbox          # Start in isolated sandbox (no internet)"
            echo "  $0 --init db          # Initialize SQLite backend"
            echo "  $0 --local --keep     # Local mode, keep DB on exit"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

# Store the project root
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Lock file configuration
LOCK_DIR="$PROJECT_ROOT/.run"
DEV_LOCK="$LOCK_DIR/dev.lock"
E2E_LOCK="$LOCK_DIR/e2e.lock"

# Create lock directory if needed
mkdir -p "$LOCK_DIR"

# Handle Sandboxing (Linux only)
if [ "$SANDBOX" = true ] && [ "$IN_SANDBOX" != "true" ]; then
    if ! command -v unshare &> /dev/null; then
        echo -e "${RED}Error: 'unshare' command not found. Sandboxing requires Linux namespaces.${NC}"
        exit 1
    fi
    
    if ! command -v socat &> /dev/null; then
        echo -e "${RED}Error: 'socat' command not found. Sandboxing requires socat for the WSL bridge.${NC}"
        echo -e "${YELLOW}Install it with: sudo apt install socat${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Initializing Network Sandbox${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "${YELLOW}Internet access will be DISABLED.${NC}"
    echo -e "${YELLOW}Only local communication (127.0.0.1) is allowed.${NC}"
    echo ""
    
    # Trigger sudo early to cache credentials for the bridge
    echo -e "${YELLOW}Sudo access is required for the network bridge...${NC}"
    sudo -v
    
    # Re-run this script inside a new network namespace
    # -n: new network namespace
    # -r: map current user to root (to allow 'ip link set lo up')
    export IN_SANDBOX=true
    
    # Disable common telemetry/update checks
    export DO_NOT_TRACK=1
    export VITE_TELEMETRY_DISABLED=1
    export CHECKPOINT_DISABLE=1
    export PIP_DISABLE_PIP_VERSION_CHECK=1
    
    # Start the sandbox in the background
    # Use bash -c with -- so "$0" and "$@" are passed as separate args
    # This avoids nested-quote parsing issues when re-invoking the script
    unshare -n -r -- bash -c 'ip link set lo up; exec "$@"' -- "$0" "$@" &
    SANDBOX_PID=$!
    
    echo -e "${GREEN}Sandbox started with PID: $SANDBOX_PID${NC}"
    echo -e "${YELLOW}Waiting for servers to initialize...${NC}"
    sleep 5
    
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  WSL Bridge: Connecting Windows to Sandbox${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "To access the app from Windows Edge, keep this terminal open."
    echo ""
    
    # Use socat to bridge the ports from host to sandbox
    # This allows Windows to see the ports while the app remains airgapped
    # Note: sudo is required for nsenter to join the network namespace
    # We escape colons (\:) in the inner address because socat uses : as a separator
    echo -e "[*] Bridge active: http://localhost:5173 -> Sandbox:5173"
    socat TCP-LISTEN:5173,fork,reuseaddr "SYSTEM:sudo nsenter -t $SANDBOX_PID -n socat - TCP\:127.0.0.1\:5173" &
    BRIDGE_PID1=$!
    
    echo -e "[*] Bridge active: http://localhost:8000 -> Sandbox:8000"
    socat TCP-LISTEN:8000,fork,reuseaddr "SYSTEM:sudo nsenter -t $SANDBOX_PID -n socat - TCP\:127.0.0.1\:8000" &
    BRIDGE_PID2=$!

    echo ""
    echo -e "${YELLOW}[!] Press Ctrl+C to stop the bridge and sandbox${NC}"
    echo ""

    # Wait for user to stop
    trap "kill $BRIDGE_PID1 $BRIDGE_PID2 $SANDBOX_PID 2>/dev/null; exit 0" INT TERM
    wait $SANDBOX_PID
    
    kill $BRIDGE_PID1 $BRIDGE_PID2 2>/dev/null || true
    exit 0
fi

# Check for conflicting E2E tests
if [ -f "$E2E_LOCK" ]; then
    E2E_PID=$(cat "$E2E_LOCK" 2>/dev/null)
    if kill -0 "$E2E_PID" 2>/dev/null; then
        echo -e "${RED}ERROR: E2E tests are currently running (PID: $E2E_PID)${NC}"
        echo -e "${YELLOW}Wait for E2E tests to finish, or stop them first.${NC}"
        echo -e "${YELLOW}To stop E2E tests: kill $E2E_PID${NC}"
        exit 1
    else
        # Stale lock file, remove it
        rm -f "$E2E_LOCK"
    fi
fi

# Create our lock file
echo $$ > "$DEV_LOCK"

# Determine how to run python/poetry
if command -v poetry &> /dev/null; then
    PYTHON_RUN="poetry run"
elif [ -f "$PROJECT_ROOT/.venv/bin/python" ]; then
    PYTHON_RUN="$PROJECT_ROOT/.venv/bin/python -m"
else
    PYTHON_RUN="python3 -m"
fi

# Ensure src is in PYTHONPATH so motido module can be found
export PYTHONPATH="$PROJECT_ROOT/src${PYTHONPATH:+:$PYTHONPATH}"

# Handle initialization if requested
if [ -n "$INIT_BACKEND" ]; then
    echo -e "${GREEN}Initializing backend: $INIT_BACKEND${NC}"
    $PYTHON_RUN motido init --backend "$INIT_BACKEND"
    rm -f "$DEV_LOCK"
    exit 0
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Moti-Do Development Server${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"

    # Remove lock file
    rm -f "$DEV_LOCK" 2>/dev/null || true

    # Kill backend if running
    if [ ! -z "$BACKEND_PID" ]; then
        echo "Stopping backend server (PID: $BACKEND_PID)"
        kill $BACKEND_PID 2>/dev/null || true
        wait $BACKEND_PID 2>/dev/null || true
    fi

    # Kill frontend if running
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Stopping frontend server (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null || true
        wait $FRONTEND_PID 2>/dev/null || true
    fi

    # Stop Docker if we started it and --keep wasn't specified
    if [ "$DOCKER_STARTED" = true ] && [ "$KEEP_DB" = false ]; then
        echo "Stopping Docker PostgreSQL container..."
        # Use detected docker-compose command, or fallback to docker-compose
        ${DOCKER_COMPOSE:-docker-compose} -f docker-compose.test.yml down -v 2>/dev/null || true
    elif [ "$DOCKER_STARTED" = true ] && [ "$KEEP_DB" = true ]; then
        echo -e "${BLUE}Keeping Docker PostgreSQL running (use 'docker-compose -f docker-compose.test.yml down -v' to stop)${NC}"
    fi

    echo -e "${GREEN}Goodbye!${NC}"
}

# Set up cleanup trap
trap cleanup INT TERM

# Track if we started Docker
DOCKER_STARTED=false

# Configure database based on mode
if [ "$MODE" = "offline" ]; then
    echo -e "${BLUE}Mode: Offline (Local SQLite/JSON)${NC}"
    echo ""
    
    # Unset DATABASE_URL to force local storage
    unset DATABASE_URL
    
    echo -e "${YELLOW}Using local file storage. No Docker required.${NC}"
    echo -e "${YELLOW}To switch between SQLite and JSON, use: ./scripts/dev.sh --init [db|json]${NC}"

elif [ "$MODE" = "local" ]; then
    echo -e "${BLUE}Mode: Local Docker PostgreSQL${NC}"
    echo ""

    # Local Docker PostgreSQL configuration
    TEST_DB_PORT=5433
    TEST_DB_USER=motido_test
    TEST_DB_PASSWORD=motido_test_password
    TEST_DB_NAME=motido_test
    export DATABASE_URL="postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@localhost:${TEST_DB_PORT}/${TEST_DB_NAME}"

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Install Docker or use --supabase mode.${NC}"
        exit 1
    fi

    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        # Try to start Colima if available
        if command -v colima &> /dev/null; then
            echo -e "${YELLOW}Docker daemon not running. Starting Colima...${NC}"
            colima start
            if ! docker info &> /dev/null; then
                echo -e "${RED}Failed to start Colima. Please start Docker manually or use --supabase mode.${NC}"
                exit 1
            fi
            echo -e "${GREEN}Colima started successfully!${NC}"
        else
            echo -e "${RED}Docker daemon is not running. Start Docker/Colima or use --supabase mode.${NC}"
            exit 1
        fi
    fi

    # Detect docker compose command (V2 plugin vs standalone)
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    elif docker-compose version &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    elif /opt/homebrew/bin/docker-compose version &> /dev/null; then
        # Homebrew install on macOS (may not be in PATH)
        DOCKER_COMPOSE="/opt/homebrew/bin/docker-compose"
    else
        echo -e "${RED}Docker Compose is not installed. Install docker-compose or use --supabase mode.${NC}"
        exit 1
    fi

    # Check if test database container is already running
    if docker ps --format '{{.Names}}' | grep -q '^motido-test-db$'; then
        echo -e "${YELLOW}Docker PostgreSQL already running on port ${TEST_DB_PORT}${NC}"
    else
        echo -e "${GREEN}Starting Docker PostgreSQL container...${NC}"
        $DOCKER_COMPOSE -f docker-compose.test.yml up -d
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

    echo -e "${BLUE}Database: $DATABASE_URL${NC}"

else
    echo -e "${BLUE}Mode: Supabase (from .env)${NC}"
    echo ""

    # Load environment from .env file
    if [ -f "$PROJECT_ROOT/.env" ]; then
        echo -e "${GREEN}Loading environment from .env${NC}"
        set -a
        source "$PROJECT_ROOT/.env"
        set +a

        if [ -z "$DATABASE_URL" ]; then
            echo -e "${YELLOW}Warning: DATABASE_URL not set in .env${NC}"
            echo -e "${YELLOW}Backend will use JSON file storage instead of PostgreSQL${NC}"
        else
            echo -e "${BLUE}Database: Supabase (from .env)${NC}"
        fi
    else
        echo -e "${YELLOW}Warning: .env file not found${NC}"
        echo -e "${YELLOW}Backend will use JSON file storage${NC}"
    fi
fi

echo ""

# Start backend
echo -e "${GREEN}Starting backend server on http://localhost:8000...${NC}"
$PYTHON_RUN uvicorn motido.api.main:app --host 0.0.0.0 --port 8000 --reload &
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

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install Node.js and npm.${NC}"
    exit 1
fi

# Check frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Frontend dependencies missing. Running npm install...${NC}"
    cd frontend
    if ! npm install; then
        echo -e "${RED}Failed to install frontend dependencies!${NC}"
        exit 1
    fi
    cd ..
fi

# Start frontend
echo -e "${GREEN}Starting frontend dev server on http://localhost:5173...${NC}"
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

# All systems go!
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  All servers running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
if [ "$SANDBOX" = true ]; then
    echo -e "${YELLOW}SANDBOX ACTIVE: Network is isolated.${NC}"
    echo -e "The WSL Bridge is active. You can access the app directly from Windows."
    echo ""
fi
echo -e "  Frontend: ${BLUE}http://localhost:5173${NC}"
echo -e "  Backend:  ${BLUE}http://localhost:8000${NC}"
echo -e "  API Docs: ${BLUE}http://localhost:8000/docs${NC}"
if [ "$MODE" = "local" ]; then
    echo -e "  Database: ${BLUE}Docker PostgreSQL (port 5433)${NC}"
elif [ "$MODE" = "offline" ]; then
    echo -e "  Database: ${BLUE}Local file storage (SQLite/JSON)${NC}"
else
    if [ -n "$DATABASE_URL" ]; then
        echo -e "  Database: ${BLUE}Supabase${NC}"
    else
        echo -e "  Database: ${YELLOW}JSON file storage${NC}"
    fi
fi
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Wait for processes to finish (or Ctrl+C)
wait
