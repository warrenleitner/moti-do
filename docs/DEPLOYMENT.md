# Moti-Do Deployment Guide

This guide covers deployment options for Moti-Do, from local development to production hosting.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Production Deployment (Vercel)](#production-deployment-vercel)
- [Alternative Deployment Options](#alternative-deployment-options)
- [Environment Variables](#environment-variables)
- [Database Configuration](#database-configuration)
- [Security Configuration](#security-configuration)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Python | 3.10+ | Backend runtime |
| Node.js | 18+ | Frontend build |
| Poetry | Latest | Python dependency management |
| npm | Latest | Frontend package management |

### Optional Software

| Software | Purpose |
|----------|---------|
| Docker | Local PostgreSQL for E2E tests |
| Colima | Lightweight Docker alternative (macOS) |

### macOS Installation (Homebrew)

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install python@3.11 node@18 poetry

# Install Docker (choose one)
brew install --cask docker  # Docker Desktop
# OR
brew install colima docker && colima start  # Lightweight alternative
```

### Other Platforms

- Python: [python.org](https://www.python.org/downloads/)
- Node.js: [nodejs.org](https://nodejs.org/)
- Poetry: `pip install poetry` or [python-poetry.org](https://python-poetry.org/docs/#installation)
- Docker: [docker.com](https://www.docker.com/products/docker-desktop/)

## Local Development

### Quick Start with dev.sh (Recommended)

The `dev.sh` script manages both frontend and backend servers:

```bash
# With Supabase database (uses DATABASE_URL from .env)
./scripts/dev.sh

# With local Docker PostgreSQL (no cloud resources)
./scripts/dev.sh --local

# Keep Docker DB running after stopping
./scripts/dev.sh --local --keep
```

The script:
- Starts backend on port 8000, frontend on port 5173
- Manages Docker PostgreSQL automatically (with `--local`)
- Provides colored status output
- Handles clean shutdown on Ctrl+C

**Access Points:**
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/api/docs

### Manual Setup

#### 1. Install Dependencies

```bash
# Backend
poetry install

# Frontend
cd frontend && npm install && cd ..

# Playwright browsers (for E2E tests)
cd frontend && npx playwright install && cd ..
```

#### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```bash
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key-here  # Generate: openssl rand -hex 32
MOTIDO_DEV_MODE=true  # Bypass auth in development
PYTHONPATH=src
```

#### 3. Start Servers

```bash
# Terminal 1: Backend
poetry run uvicorn motido.api.main:app --reload

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Database Options for Development

#### Option A: No Database (In-Memory)

Set `MOTIDO_DEV_MODE=true` and omit `DATABASE_URL`. Data persists only during session.

#### Option B: Local PostgreSQL

```bash
createdb motido
# Update .env: DATABASE_URL=postgresql://localhost/motido
```

#### Option C: Supabase (Cloud)

1. Create project at [supabase.com](https://supabase.com)
2. Copy connection string: Settings → Database → Connection pooling
3. Update `.env` with connection string

#### Option D: Docker PostgreSQL

```bash
./scripts/dev.sh --local
```

Uses `docker-compose.test.yml` configuration:
- Port: 5433 (avoids conflict with local PostgreSQL)
- User: `motido_test`
- Password: `motido_test_password`
- Database: `motido_test`

## Production Deployment (Vercel)

### Step 1: Connect Repository

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import the GitHub repository
4. Select the repository: `warrenleitner/moti-do`

### Step 2: Configure Build Settings

| Setting | Value |
|---------|-------|
| Framework Preset | Other |
| Build Command | `cd frontend && npm install && npm run build` |
| Output Directory | `frontend/dist` |
| Install Command | `npm install` |

### Step 3: Configure Environment Variables

In the Vercel dashboard, add these environment variables:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Vercel Postgres connection string | Yes |
| `JWT_SECRET` | Strong random secret (`openssl rand -hex 32`) | Yes |
| `MOTIDO_DEV_MODE` | `false` | Yes |
| `PYTHONPATH` | `src` | Yes |
| `VITE_API_URL` | `/api` | Optional |

### Step 4: Enable Vercel Postgres

1. In your Vercel project, go to Storage
2. Click "Create Database" → "Postgres"
3. Follow setup wizard
4. Connection string is automatically added as `DATABASE_URL`

### Step 5: Deploy

1. Push to the main branch
2. Vercel automatically builds and deploys
3. Tables are created automatically on first run

### Vercel Configuration Details

The `vercel.json` file configures:

```json
{
  "builds": [
    {"src": "api/index.py", "use": "@vercel/python@4.5.0"},
    {"src": "frontend/package.json", "use": "@vercel/static-build"}
  ],
  "routes": [
    {"src": "/api/(.*)", "dest": "api/index.py"},
    {"src": "/(.*)", "dest": "/frontend/dist/$1"}
  ]
}
```

### Security Headers

The following headers are configured in `vercel.json`:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### CORS Configuration

CORS is automatically configured based on environment:

- **Production** (`VERCEL_ENV=production`): Only `https://moti-do-v2.vercel.app`
- **Development**: Allows localhost variants

To add custom domains, update `src/motido/api/main.py`:

```python
# Line ~38-41
if os.getenv("VERCEL_ENV") == "production":
    allowed_origins = [
        "https://moti-do-v2.vercel.app",
        "https://your-custom-domain.com",  # Add custom domains here
    ]
```

## Alternative Deployment Options

### Railway / Render

Similar to Vercel deployment:

1. Connect GitHub repository
2. Set environment variables (same as Vercel)
3. Configure build commands
4. Enable PostgreSQL addon

### Self-Hosted

#### Requirements

- PostgreSQL 12+
- Python 3.10+ environment
- Node.js 18+ for building frontend
- Reverse proxy (nginx/caddy) recommended

#### Setup Steps

```bash
# 1. Clone repository
git clone https://github.com/warrenleitner/moti-do
cd moti-do

# 2. Install dependencies
poetry install
cd frontend && npm install && npm run build && cd ..

# 3. Configure environment
cp .env.example .env
# Edit .env with production values

# 4. Run with production server
poetry run uvicorn motido.api.main:app --host 0.0.0.0 --port 8000

# 5. Serve frontend build (e.g., with nginx)
# Point document root to frontend/dist
```

#### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name moti-do.example.com;

    # Frontend static files
    location / {
        root /path/to/moti-do/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Docker (Coming Soon)

Containerized deployment with Docker Compose is planned.

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | `openssl rand -hex 32` |
| `PYTHONPATH` | Python module path | `src` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MOTIDO_DEV_MODE` | Bypass authentication | `false` |
| `VITE_API_URL` | API URL for frontend | Auto-detected |
| `VERCEL_ENV` | Vercel environment | Set by Vercel |

### Security Notes

- **Never commit `.env`** - it's in `.gitignore`
- Use **strong JWT secrets** in production (32+ random bytes)
- Set **`MOTIDO_DEV_MODE=false`** in production
- Rotate secrets periodically

## Database Configuration

### Supported Databases

| Database | Use Case | Configuration |
|----------|----------|---------------|
| PostgreSQL | Production | `DATABASE_URL` env var |
| JSON Files | Development | No `DATABASE_URL` |
| SQLite | Optional | Via config file |

### Schema Management

- Tables are created automatically on first run
- No manual migrations required
- Schema includes: users, tasks, projects, tags, xp_transactions

### Connection Pooling

For Supabase, use the **Transaction mode** connection string (port 6543), not Session mode (port 5432).

## Security Configuration

### Authentication

- JWT-based authentication with bcrypt password hashing
- Tokens expire after 24 hours (configurable)
- Rate limiting: 5 login attempts per 5 minutes

### Development Mode

Setting `MOTIDO_DEV_MODE=true`:
- Bypasses authentication
- Uses default user automatically
- **Never enable in production**

### Password Requirements

- Minimum 8 characters
- Validated at registration time

## CI/CD Pipeline

### GitHub Actions Workflow

The CI pipeline (`.github/workflows/ci.yml`) runs on every PR and push to main:

#### Jobs

1. **Python Backend**
   - `python-lint`: Black, isort, Pylint (10.0/10.0)
   - `python-typecheck`: Mypy strict mode
   - `python-test`: Pytest with 100% coverage

2. **Frontend**
   - `frontend-lint`: ESLint
   - `frontend-typecheck`: TypeScript
   - `frontend-test`: Vitest with 100% coverage
   - `frontend-build`: Production build

3. **E2E Tests**
   - 3 parallel shards with Playwright
   - Docker PostgreSQL service container
   - Runs after unit tests pass

4. **Security Scan**
   - Safety dependency check (non-blocking)

### Local CI Replication

```bash
# Run all checks (recommended before PR)
python3 scripts/verify.py

# Skip E2E tests (faster, less thorough)
python3 scripts/verify.py --skip-e2e
```

## Monitoring and Maintenance

### Health Checks

- API health: `GET /api/system/health`
- Database connectivity checked on startup

### Logs

- Vercel: View in Vercel dashboard → Deployments → Logs
- Self-hosted: Configure via uvicorn logging

### Backup

For Vercel Postgres:
- Automatic daily backups (paid plans)
- Manual backup via `pg_dump`

For self-hosted:
```bash
pg_dump -h localhost -U user motido > backup.sql
```

## Troubleshooting

### Database Connection Issues

**Problem:** `DATABASE_URL environment variable is required`
- Ensure `.env` exists with `DATABASE_URL`
- For Supabase, use Transaction pooling mode (port 6543)

**Problem:** Connection timeouts
- Use connection pooling URL, not direct connection
- Check firewall/network settings

### Build Failures

**Problem:** Frontend build fails
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Problem:** Python tests fail
```bash
poetry install
export PYTHONPATH=src
poetry run pytest
```

### Authentication Issues

**Problem:** "User not registered" on login
- Click "Register" to set password for existing user
- Or set `MOTIDO_DEV_MODE=true` for development

**Problem:** "Invalid token" errors
- Clear browser localStorage
- Ensure `JWT_SECRET` is consistent
- Re-login

### CORS Errors

**Problem:** API requests blocked by CORS
- Verify backend is running on port 8000
- Check allowed origins in `src/motido/api/main.py`
- Ensure frontend runs on port 5173 (development)

### E2E Test Failures

**Problem:** Tests fail to start
```bash
# Ensure no dev server is running
# Kill any process on ports 5173, 8000, 5433

# Run E2E tests with fresh state
python3 scripts/verify.py
```

**Problem:** Docker not available
```bash
# Use JSON storage instead
python3 scripts/verify.py --no-docker
```
