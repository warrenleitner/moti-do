# Motodo

A gamified task and habit tracker with XP, streaks, and badges. Built with FastAPI (Python) backend and React (TypeScript) frontend.

## Quick Start

### Prerequisites

**Required:**
- Python 3.9+
- Node.js 18+ with npm
- Poetry (Python dependency manager)

**Optional (for E2E tests and local database):**
- Docker (for local PostgreSQL and E2E tests)

**macOS Installation (via Homebrew):**
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required dependencies
brew install python@3.11 node@18 poetry

# Install Docker Desktop (optional, for E2E tests)
brew install --cask docker

# OR use Colima (lightweight Docker alternative)
brew install colima docker
colima start
```

**Other platforms:**
- Python: [python.org](https://www.python.org/downloads/)
- Node.js: [nodejs.org](https://nodejs.org/)
- Poetry: `pip install poetry` or [python-poetry.org](https://python-poetry.org/docs/#installation)
- Docker: [docker.com](https://www.docker.com/products/docker-desktop/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/warrenleitner/moti-do
    cd moti-do
    ```

2.  **Install backend dependencies:**
    ```bash
    pip install poetry
    poetry install
    ```

3.  **Install frontend dependencies:**
    ```bash
    cd frontend
    npm install
    cd ..
    ```

4.  **Install Playwright browsers (for E2E tests):**
    ```bash
    cd frontend
    npx playwright install
    cd ..
    ```

### Environment Setup

1.  **Copy the environment template:**
    ```bash
    cp .env.example .env
    ```

2.  **Configure environment variables** in `.env`:
    ```bash
    # Database - Required for persistence
    DATABASE_URL=postgresql://user:password@host:port/database

    # Authentication
    JWT_SECRET=your-secret-key-here  # Generate: openssl rand -hex 32

    # Development mode (bypasses authentication)
    MOTIDO_DEV_MODE=true

    # Python module path
    PYTHONPATH=src
    ```

### Running Locally

#### Quick Start: Using dev.sh (Recommended)

The easiest way to run Moti-Do is with the `dev.sh` script, which starts both frontend and backend with a single command:

```bash
# Run with Supabase database (uses DATABASE_URL from .env)
./scripts/dev.sh

# Run with local Docker PostgreSQL (no cloud resources needed)
./scripts/dev.sh --local

# Run completely offline (uses local SQLite or JSON, no Docker needed)
./scripts/dev.sh --offline

# Run in a network-isolated sandbox (Linux only, no internet access)
./scripts/dev.sh --sandbox
```

### Offline Mode & Local Storage

Moti-Do supports running completely offline without any external dependencies or Docker.

1.  **Switch to SQLite (Recommended for offline):**
    ```bash
    ./scripts/dev.sh --init db
    ```
    This creates a local `motido.db` file in `src/motido/data/`.

2.  **Run in offline mode:**
    ```bash
    ./scripts/dev.sh --offline
    ```
    This unsets `DATABASE_URL` for the session and skips all Docker checks, using your configured local backend (SQLite or JSON).

3.  **Run in Sandbox mode (Linux only):**
    ```bash
    ./scripts/dev.sh --sandbox
    ```
    This uses Linux network namespaces (`unshare`) to completely disable internet access for the application. The servers will only be able to communicate with each other via `127.0.0.1`. 

    **Requirements for Sandbox:**
    - Linux (WSL2 works)
    - `socat` installed (`sudo apt install socat`)
    - `unshare` and `nsenter` (usually pre-installed on Linux)

    The script automatically bridges the sandbox ports to your host so you can still visit `http://localhost:5173` from Windows Edge while the app remains airgapped.

The script:
- Starts both backend (port 8000) and frontend (port 5173)
- Waits for each server to be ready before continuing
- Shows status with colored output
- Handles clean shutdown on Ctrl+C
- In `--local` mode, manages Docker PostgreSQL automatically

Access the app at [http://localhost:5173](http://localhost:5173)

#### Option 1: Development Mode (No Database)

Run without PostgreSQL using in-memory storage (manual startup):

```bash
# Backend (port 8000)
poetry run uvicorn motido.api.main:app --reload

# Frontend (port 5173) - in separate terminal
cd frontend
npm run dev
```

#### Option 2: With Local PostgreSQL

1.  **Start PostgreSQL** (via Homebrew, Docker, or postgres.app)
2.  **Create database:**
    ```bash
    createdb motido
    ```
3.  **Update `.env`:**
    ```bash
    DATABASE_URL=postgresql://localhost/motido
    ```
4.  **Run the application:**
    ```bash
    # Backend
    poetry run uvicorn motido.api.main:app --reload

    # Frontend
    cd frontend
    npm run dev
    ```

#### Option 3: With Supabase (Recommended for Testing)

Supabase provides a free PostgreSQL database perfect for local development and testing.

1.  **Create a Supabase project:**
    - Go to [supabase.com](https://supabase.com)
    - Create a new project (free tier available)
    - Wait for database provisioning

2.  **Get database credentials:**
    - In your Supabase dashboard: Settings → Database
    - Copy the "Connection string" under "Connection pooling"
    - Use the "Transaction" mode connection string
    - Example format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

3.  **Update `.env`:**

    Choose one configuration based on your testing needs:

    **For testing WITHOUT authentication** (easier for development):
    ```bash
    DATABASE_URL=your-supabase-connection-string
    JWT_SECRET=your-secret-key-here
    MOTIDO_DEV_MODE=true  # Bypasses authentication
    ```

    **For testing WITH authentication** (more realistic):
    ```bash
    DATABASE_URL=your-supabase-connection-string
    JWT_SECRET=your-secret-key-here
    MOTIDO_DEV_MODE=false  # Requires login
    ```

4.  **Run the application:**
    ```bash
    # Backend
    poetry run uvicorn motido.api.main:app --reload

    # Frontend (in a separate terminal)
    cd frontend
    npm run dev
    ```

5.  **First-time setup:**

    **If using `MOTIDO_DEV_MODE=true`:**
    - Go to [http://localhost:5173](http://localhost:5173)
    - You'll be logged in automatically as `default_user`
    - Your tasks will load immediately

    **If using `MOTIDO_DEV_MODE=false`:**
    - Go to [http://localhost:5173](http://localhost:5173)
    - Click "Register" tab
    - Username: `default_user` (required for single-user mode)
    - Set a password (minimum 8 characters)
    - After registration, you'll be logged in automatically
    - **Note:** If you already have data for `default_user` in the database, you must first set a password using registration, then use login with that password

6.  **Access points:**
    - Frontend: [http://localhost:5173](http://localhost:5173)
    - API Docs: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

### Frontend Environment Variables (Optional)

Create `frontend/.env.local` to override API URL:

```bash
# Custom API URL (default: http://localhost:8000/api in dev)
VITE_API_URL=http://localhost:8000/api
```

## Development

This project uses Poetry for dependency management and packaging.

**Development Tools:**

This project uses [Poe the Poet](https://github.com/nat-n/poethepoet) for task running, configured in `pyproject.toml`.

**Scripts (in `scripts/` directory):**
*   **`./scripts/dev.sh`** ⭐ **Start development servers** (frontend + backend)
*   **`./scripts/dev.sh --local`** - Use local Docker PostgreSQL instead of Supabase
*   **`python3 scripts/verify.py`** ⭐ **Sign-off workflow** - Run all checks before committing

**Poe tasks** (run with `poetry run poe <task_name>`):

*   **`poe check`** - Run all unit tests (Python + Frontend, no E2E)
*   **`poe format`** - Format code with Black and isort
*   **`poe lint`** - Run Pylint
*   **`poe typecheck`** - Run mypy type checking
*   **`poe test`** - Run Python tests
*   **`poe coverage`** - Run tests with coverage (requires 100%)
*   **`poe check-python`** - Run all Python checks (format, lint, typecheck, coverage)
*   **`poe frontend-check`** - Run all frontend checks (lint, typecheck, test, build)

### Frontend Development Commands

```bash
cd frontend

# Development server
npm run dev

# Linting
npm run lint

# Type checking
npx tsc --noEmit

# Tests
npm run test              # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage

# Production build
npm run build
npm run preview           # Preview build

# E2E Tests (Playwright)
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Run with Playwright UI
npm run test:e2e:headed   # Run in headed browser
npm run test:e2e:debug    # Debug mode
```

### E2E Testing

E2E tests use Playwright to test full user workflows through the browser with a **local Docker PostgreSQL** database:

```bash
# Run from project root (starts Docker PostgreSQL + servers automatically)
python3 scripts/verify.py

# Run with Playwright UI for debugging
python3 scripts/verify.py --ui

# Keep Docker database running after tests (for inspection)
python3 scripts/verify.py --keep-db

# Use JSON storage instead of Docker (faster, less realistic)
python3 scripts/verify.py --no-docker

# Run unit checks only (skip E2E)
python3 scripts/verify.py --skip-e2e

# If a previous run failed, verify.py resumes from the failed step by default.
# To start from the beginning, clear the checkpoint:
python3 scripts/verify.py --clear-checkpoint
```

**Prerequisites for E2E tests:**
- Docker installed and running (or use `--no-docker` flag)
- Port 5433 available for PostgreSQL test container

E2E tests cover:
- Authentication (login, registration, session management)
- Task CRUD operations
- All views (Calendar, Kanban, Habits, Graph, Settings)
- Cross-page navigation and data consistency

### CI/CD Requirements

Before submitting code, ensure all checks pass:

**Sign-Off Workflow (Required):**
```bash
python3 scripts/verify.py      # Official sign-off - run before committing
```

This is the **official sign-off workflow** that matches our CI/CD pipeline exactly.

This single command verifies:
- Python: format, lint (10.0/10.0), typecheck (0 errors), coverage (100%)
- Frontend: lint (ESLint), typecheck (TypeScript), test (Vitest), build
- E2E: Playwright tests against Docker PostgreSQL

**Skip E2E tests:** `python3 scripts/verify.py --skip-e2e` (use sparingly)

**Alternative:** `poetry run poe check` (unit tests only, no E2E)

**Manual Checks (if needed):**
```bash
# Python only
poetry run poe check-python

# Frontend only (from project root)
poetry run poe frontend-check

# OR run frontend checks from frontend/ directory
cd frontend
npm run lint              # ESLint must pass
npx tsc --noEmit          # TypeScript must compile
npm run test              # Vitest tests must pass
npm run build             # Build must succeed
```

All checks (including E2E tests) are enforced by GitHub Actions on every PR.

## Deployment

### Vercel Deployment (Production)

The application is configured for deployment on Vercel with Vercel Postgres.

**Backend Setup:**

1.  **Set environment variables** in Vercel dashboard:
    ```bash
    DATABASE_URL=<your-vercel-postgres-connection-string>
    JWT_SECRET=<strong-random-secret>
    MOTIDO_DEV_MODE=false
    PYTHONPATH=src
    ```

2.  **Database setup:**
    - Enable Vercel Postgres in your project
    - Copy the connection string from Postgres dashboard
    - Tables are created automatically on first run

**Frontend Setup:**

1.  **Configure build settings:**
    - Build Command: `cd frontend && npm install && npm run build`
    - Output Directory: `frontend/dist`
    - Install Command: `npm install`

2.  **Environment variables** (optional):
    ```bash
    VITE_API_URL=/api  # Use relative URL for same-origin requests
    ```

**CORS Configuration:**

The backend automatically configures CORS based on environment:
- **Production** (`VERCEL_ENV=production`): Only allows `https://moti-do-v2.vercel.app`
- **Development**: Allows `localhost:5173`, `localhost:3000`, and `127.0.0.1` variants

Update allowed origins in [src/motido/api/main.py:38-41](src/motido/api/main.py#L38-L41) for custom domains.

### Other Deployment Options

#### Docker (Coming Soon)

Containerized deployment with Docker Compose for easy self-hosting.

#### Railway / Render

Similar to Vercel deployment:
1. Set same environment variables
2. Configure build commands
3. Ensure PostgreSQL addon is enabled

#### Self-Hosted

Requirements:
- PostgreSQL 12+
- Python 3.9+ environment
- Node.js for building frontend
- Reverse proxy (nginx/caddy) recommended

## Troubleshooting

### Database Connection Issues

**Problem:** `DATABASE_URL environment variable is required`
- **Solution:** Ensure `.env` file exists and contains `DATABASE_URL`
- Check that the connection string format is correct
- For Supabase, use the "Transaction" pooling mode, not "Session"

**Problem:** Connection timeouts with Supabase
- **Solution:** Use the connection pooling URL (port 6543), not direct connection (port 5432)
- Verify your IP is not blocked (Supabase free tier allows all IPs by default)

### Frontend API Connection Issues

**Problem:** API requests failing with CORS errors
- **Solution:** Check that backend is running on port 8000
- Verify frontend is running on port 5173
- Check CORS configuration in [src/motido/api/main.py](src/motido/api/main.py)

**Problem:** 404 errors for API endpoints
- **Solution:** Ensure API URLs use `/api` prefix (e.g., `/api/tasks`, not `/tasks`)
- Check `VITE_API_URL` in frontend `.env.local` if customized

### Authentication Issues

**Problem:** Backend shows "User loaded with X tasks" but UI shows no tasks
- **Solution:** The UI defaults to showing only **active** (incomplete) tasks
- **Fix**: Look for the status filter dropdown/toggle in the Tasks page and change from "Active" to "All"
- **Why**: If your database tasks are mostly completed, they won't show with the default "Active" filter
- **Alternative**: Check browser console (F12) for any API errors

**Problem:** Login succeeds but redirects to login page or shows authentication errors
- **Solution:** This happens when the database has tasks for `default_user` but no password is set
- **Fix Option 1** (Recommended for testing): Set `MOTIDO_DEV_MODE=true` in `.env` and restart backend
- **Fix Option 2**: Register a password:
  1. Go to login page and click "Register"
  2. Username: `default_user`
  3. Set a password (min 8 chars)
  4. After registration, your existing tasks will appear
- **Fix Option 3**: Use API docs to set password directly at [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

**Problem:** "Invalid token" errors
- **Solution:** Ensure `JWT_SECRET` is set and consistent
- Clear browser localStorage and login again
- In development, set `MOTIDO_DEV_MODE=true` to bypass auth

**Problem:** "User not registered" error on login
- **Solution:** The user exists but has no password set
- Click "Register" tab and set a password for `default_user`
- Or set `MOTIDO_DEV_MODE=true` to bypass authentication

### Build Issues

**Problem:** Frontend build fails
- **Solution:** Delete `node_modules` and `package-lock.json`, run `npm install`
- Ensure Node.js version is 18+
- Check for TypeScript errors: `npx tsc --noEmit`

**Problem:** Python tests fail
- **Solution:** Run `poetry install` to ensure all dependencies are installed
- Check Python version: `python --version` (must be 3.9+)
- Ensure `PYTHONPATH=src` is set

## Architecture

### Tech Stack

**Backend:**
- FastAPI (Python web framework)
- PostgreSQL (primary database)
- In-memory fallback (for development)
- JWT authentication
- Pydantic for validation

**Frontend:**
- React 19 with TypeScript
- Material-UI (MUI) components
- Zustand (state management)
- React Router (routing)
- Vite (build tool)
- Vitest (testing)

**Features:**
- XP system with difficulty-based scoring
- Task management with priority, difficulty, duration
- Habit tracking with streaks and heatmaps
- Multiple views: List, Calendar, Kanban, Dependency Graph
- PWA support (offline capable)
- Responsive design

## Documentation

Detailed documentation is available in the `docs/` directory:

- **[Architecture](docs/ARCHITECTURE.md)** - Tech stack, system design, and code structure
- **[Scoring Algorithm](docs/SCORING.md)** - How XP, penalties, and badges work
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Local development and production deployment
- **[Feature Plan](docs/FEATURE_IMPLEMENTATION_PLAN.md)** - Planned features and roadmap

## Contributing

See [AGENTS.md](AGENTS.md) for development guidelines and quality standards.

Key requirements:
- 100% test coverage for Python and frontend code
- Pylint score 10.0/10.0
- Zero TypeScript/ESLint errors
- All CI checks must pass (run `python3 scripts/verify.py`)

## License

This project is licensed under the MIT License. See `pyproject.toml` for license details.