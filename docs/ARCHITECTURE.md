# Moti-Do Architecture & Technology Stack

This document provides a comprehensive overview of Moti-Do's architecture, technology stack, and design decisions.

## Table of Contents

- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Database Layer](#database-layer)
- [API Design](#api-design)
- [Authentication & Security](#authentication--security)
- [Testing Strategy](#testing-strategy)
- [Quality Standards](#quality-standards)
- [Project Structure](#project-structure)

## Project Overview

Moti-Do is a **gamified task and habit tracker** that motivates users through:

- **XP System**: Earn experience points by completing tasks
- **Leveling**: Progress through levels (100 XP = 1 level)
- **Streaks**: Build habits with streak tracking
- **Badges**: Unlock achievements for milestones
- **Penalties**: Stay accountable with overdue task penalties

### Key Features

- Task management with priority, difficulty, and duration
- Habit tracking with complex recurrence patterns
- Multiple views: List, Calendar, Kanban, Dependency Graph
- Configurable scoring with custom multipliers
- PWA support for offline capability
- Mobile-responsive Material Design UI

### Design Philosophy

- **Gamification without addiction**: Motivate, don't manipulate
- **Flexibility**: Highly configurable scoring and views
- **Quality first**: 100% test coverage, strict linting
- **Modern stack**: Latest React, TypeScript, FastAPI

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              React SPA (TypeScript)                  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │  Zustand │ │  Axios   │ │ Material │            │    │
│  │  │  Store   │ │  Client  │ │    UI    │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Server                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              FastAPI (Python)                        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │  Routes  │ │  Scoring │ │   Auth   │            │    │
│  │  │  /api/*  │ │  Engine  │ │   JWT    │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ SQL
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         PostgreSQL (Vercel Postgres)                 │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │  Users   │ │  Tasks   │ │ Projects │            │    │
│  │  │          │ │  Habits  │ │   Tags   │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Backend Architecture

### Framework: FastAPI

**Version**: >=0.115.0

FastAPI was chosen for:
- **Performance**: One of the fastest Python frameworks
- **Type safety**: Native Pydantic integration
- **Auto documentation**: OpenAPI/Swagger built-in
- **Async support**: First-class async/await

### Backend Structure

```
src/motido/
├── api/                    # FastAPI application
│   ├── main.py             # App initialization, CORS, middleware
│   ├── deps.py             # Dependency injection
│   ├── schemas.py          # Pydantic request/response models
│   ├── middleware/
│   │   └── rate_limit.py   # Rate limiting implementation
│   └── routers/
│       ├── auth.py         # Authentication endpoints
│       ├── tasks.py        # Task CRUD operations
│       ├── user.py         # User profile, settings
│       └── views.py        # Task filtering, views
├── core/                   # Business logic
│   ├── models.py           # Data models (Task, User, etc.)
│   ├── scoring.py          # XP calculation engine
│   ├── recurrence.py       # Recurrence rule handling
│   └── utils.py            # Utility functions
├── data/                   # Storage abstraction
│   ├── abstraction.py      # DataManager interface
│   ├── backend_factory.py  # Factory for storage selection
│   ├── config.py           # Configuration loading
│   ├── postgres_manager.py # PostgreSQL implementation
│   ├── json_manager.py     # JSON file storage
│   └── database_manager.py # SQLite implementation
└── cli/                    # Command-line interface
    └── main.py             # CLI entry point
```

### Key Backend Components

#### 1. Data Models (`core/models.py`)

Core domain objects as Python dataclasses:

```python
@dataclass
class Task:
    id: str
    title: str
    priority: Priority
    difficulty: Difficulty
    duration: Duration
    due_date: Optional[date]
    # ... many more fields
```

#### 2. Scoring Engine (`core/scoring.py`)

Multi-factor scoring algorithm:

```python
def calculate_score(task, all_tasks, config, effective_date):
    # Additive base + multiplicative factors
    # See docs/SCORING.md for details
```

#### 3. Storage Abstraction (`data/abstraction.py`)

Interface for pluggable storage backends:

```python
class DataManager(ABC):
    @abstractmethod
    def get_user(self, user_id: str) -> Optional[User]: ...
    @abstractmethod
    def save_task(self, task: Task) -> None: ...
    # ... etc
```

### Backend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | >=0.115.0 | Web framework |
| uvicorn | >=0.32.0 | ASGI server |
| pydantic | >=2.10.0 | Data validation |
| pyjwt | >=2.9.0 | JWT authentication |
| passlib | >=1.7.4 | Password hashing |
| bcrypt | 4.0.1 | Password hashing backend |
| python-dotenv | >=1.0.0 | Environment variables |
| python-dateutil | ^2.8.2 | Date parsing |
| psycopg2-binary | >=2.9.9 | PostgreSQL driver |

## Frontend Architecture

### Framework: React 19

**Key choices:**
- **React 19**: Latest React with concurrent features
- **TypeScript**: Full type safety
- **Vite**: Fast build tool with HMR
- **Material-UI**: Google Material Design components

### Frontend Structure

```
frontend/src/
├── pages/                  # Top-level page components
│   ├── LoginPage.tsx       # Authentication UI
│   ├── Dashboard.tsx       # Home/overview
│   ├── TasksPage.tsx       # Task management
│   ├── CalendarPage.tsx    # Calendar view
│   ├── KanbanPage.tsx      # Kanban board
│   ├── HabitsPage.tsx      # Habit tracking
│   ├── GraphPage.tsx       # Dependency graph
│   └── SettingsPage.tsx    # User settings
├── components/             # Reusable UI components
│   ├── common/             # Shared utilities
│   ├── tasks/              # Task-specific components
│   ├── calendar/           # Calendar integration
│   ├── kanban/             # Kanban UI
│   ├── habits/             # Habit tracking
│   ├── graph/              # Dependency visualization
│   └── layout/             # App layout
├── store/                  # State management (Zustand)
│   ├── taskStore.ts        # Task state, filtering, CRUD
│   └── userStore.ts        # User auth, profile
├── services/               # API client
│   └── api.ts              # Axios HTTP client
├── types/                  # TypeScript definitions
├── utils/                  # Helper functions
├── hooks/                  # Custom React hooks
└── main.tsx                # Entry point
```

### State Management: Zustand

Zustand was chosen over Redux for:
- Simpler API, less boilerplate
- Built-in persistence support
- Better TypeScript integration
- Smaller bundle size

```typescript
// Example: taskStore.ts
const useTaskStore = create<TaskStore>()(
  devtools(
    persist(
      (set, get) => ({
        tasks: [],
        addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
        // ... more actions
      }),
      { name: 'task-storage' }
    )
  )
);
```

### Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.2.0 | UI framework |
| @mui/material | ^7.3.6 | Material Design components |
| zustand | ^5.0.9 | State management |
| axios | ^1.13.2 | HTTP client |
| react-router-dom | ^7.10.1 | Client-side routing |
| @fullcalendar/react | ^6.1.19 | Calendar integration |
| @xyflow/react | ^12.10.0 | Dependency graph |
| @hello-pangea/dnd | ^18.0.1 | Drag and drop |
| rrule | ^2.8.1 | Recurrence rules |
| date-fns | ^4.1.0 | Date utilities |

### Build Configuration

Vite configuration includes:
- Code splitting for vendor chunks (React, MUI, Calendar, etc.)
- PWA support via vite-plugin-pwa
- TypeScript strict mode
- Tailwind CSS integration

## Database Layer

### Storage Abstraction Pattern

Moti-Do uses the **Repository pattern** with pluggable backends:

```
┌─────────────────────┐
│    DataManager      │  ← Abstract interface
│    (abstraction)    │
└─────────┬───────────┘
          │
    ┌─────┴─────┬─────────────┐
    │           │             │
    ▼           ▼             ▼
┌───────┐  ┌───────┐   ┌───────────┐
│ JSON  │  │SQLite │   │PostgreSQL │
│Manager│  │Manager│   │Manager    │
└───────┘  └───────┘   └───────────┘
```

### Backend Selection Priority

1. PostgreSQL (if `DATABASE_URL` is set)
2. Config file-specified backend
3. JSON files (default fallback)

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    total_xp INTEGER DEFAULT 0,
    game_date DATE,
    -- JSON columns for complex data
    badges TEXT,           -- JSON array
    xp_transactions TEXT,  -- JSON array
    settings TEXT          -- JSON object
);
```

#### Tasks Table
```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT,
    difficulty TEXT,
    duration TEXT,
    due_date DATE,
    start_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    -- ... many more fields
    is_habit BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    streak INTEGER DEFAULT 0
);
```

## API Design

### RESTful Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate user |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/tasks` | List tasks (filtered) |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/{id}` | Get task details |
| PUT | `/api/tasks/{id}` | Update task |
| DELETE | `/api/tasks/{id}` | Delete task |
| POST | `/api/tasks/{id}/complete` | Mark task complete |
| GET | `/api/user/profile` | Get user profile |
| PUT | `/api/user/settings` | Update settings |

### API Documentation

- Swagger UI: `/api/docs`
- ReDoc: `/api/redoc`
- OpenAPI JSON: `/api/openapi.json`

### Request/Response Models

Pydantic models ensure type safety:

```python
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Priority = Priority.NOT_SET
    due_date: Optional[date] = None
    # ...

class TaskResponse(TaskCreate):
    id: str
    score: int
    penalty_score: float
    created_at: datetime
```

## Authentication & Security

### JWT Authentication

- Tokens issued on login/register
- 24-hour expiration (configurable)
- Stored in browser localStorage

### Password Security

- Bcrypt hashing with salt
- Minimum 8 character requirement
- Never stored in plaintext

### Rate Limiting

Login endpoint protected:
- 5 attempts per 5 minutes per IP
- Prevents brute-force attacks

### CORS Configuration

```python
# Production: strict origin
if VERCEL_ENV == "production":
    origins = ["https://moti-do-v2.vercel.app"]
else:
    # Development: local hosts
    origins = ["http://localhost:5173", "http://127.0.0.1:5173", ...]
```

### Security Headers (Vercel)

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Testing Strategy

### Three-Layer Testing

```
┌─────────────────────────────────────────┐
│           E2E Tests (Playwright)        │  Full user workflows
│    Authentication, CRUD, Navigation     │
└────────────────────┬────────────────────┘
                     │
┌────────────────────┼────────────────────┐
│      Integration Tests (pytest)         │  Module interactions
│   Scoring calculations, Data flow       │
└────────────────────┬────────────────────┘
                     │
┌────────────────────┴────────────────────┐
│          Unit Tests                      │  Individual functions
│   Python: pytest | Frontend: Vitest     │
└─────────────────────────────────────────┘
```

### Coverage Requirements

| Layer | Tool | Coverage |
|-------|------|----------|
| Python Backend | pytest-cov | 100% |
| Frontend | Vitest/v8 | 100% |
| E2E | Playwright | All user flows |

### E2E Test Infrastructure

```yaml
# Docker PostgreSQL for realistic testing
services:
  postgres:
    image: postgres:16-alpine
    port: 5433
    environment:
      POSTGRES_USER: motido_test
      POSTGRES_PASSWORD: motido_test_password
      POSTGRES_DB: motido_test
```

## Quality Standards

### Python Code Quality

| Tool | Standard | Enforcement |
|------|----------|-------------|
| Black | Line length 88 | `poetry run poe format` |
| isort | Black-compatible | `poetry run poe format` |
| Pylint | Score 10.0/10.0 | `poetry run poe lint` |
| Mypy | Strict mode, 0 errors | `poetry run poe typecheck` |
| pytest-cov | 100% coverage | `poetry run poe coverage` |

### Frontend Code Quality

| Tool | Standard | Enforcement |
|------|----------|-------------|
| ESLint | 0 errors | `npm run lint` |
| TypeScript | Strict mode | `npx tsc --noEmit` |
| Vitest | 100% coverage | `npm run test` |
| Playwright | All E2E pass | `npm run test:e2e` |

### Sign-Off Workflow

Before any PR:

```bash
python3 scripts/verify.py
```

This runs ALL checks matching CI/CD exactly.

## Project Structure

### Complete Directory Layout

```
moti-do/
├── src/motido/              # Python backend source
│   ├── api/                 # FastAPI application
│   ├── core/                # Business logic
│   ├── data/                # Storage layer
│   └── cli/                 # CLI interface
├── frontend/                # React frontend
│   ├── src/                 # Source code
│   ├── e2e/                 # Playwright tests
│   ├── public/              # Static assets
│   └── dist/                # Build output
├── tests/                   # Python tests
│   ├── api/                 # API tests
│   ├── core/                # Core logic tests
│   └── integration/         # Integration tests
├── docs/                    # Documentation
│   ├── SCORING.md           # Scoring algorithm
│   ├── DEPLOYMENT.md        # Deployment guide
│   ├── ARCHITECTURE.md      # This document
│   └── FEATURE_IMPLEMENTATION_PLAN.md
├── scripts/                 # Utility scripts
│   ├── dev.sh               # Development server
│   └── verify.py            # Sign-off workflow (checks + optional E2E)
├── .github/                 # GitHub configuration
│   └── workflows/           # CI/CD pipelines
├── pyproject.toml           # Python config (Poetry)
├── vercel.json              # Vercel deployment
├── docker-compose.test.yml  # Test database
├── README.md                # Project overview
└── AGENTS.md                # Agent development guidelines
```

### Key Configuration Files

| File | Purpose |
|------|---------|
| `pyproject.toml` | Python dependencies, tools, scripts |
| `frontend/package.json` | Frontend dependencies, scripts |
| `frontend/vite.config.ts` | Build configuration |
| `frontend/playwright.config.ts` | E2E test configuration |
| `vercel.json` | Production deployment |
| `docker-compose.test.yml` | Test database |
| `.env.example` | Environment template |

## Design Decisions

### Why These Technologies?

| Choice | Reason |
|--------|--------|
| FastAPI over Django | Lighter, faster, better async |
| React over Vue/Angular | Ecosystem, hiring, flexibility |
| Zustand over Redux | Simpler, less boilerplate |
| PostgreSQL | Production-ready, Vercel support |
| Pydantic | Native FastAPI integration |
| Playwright over Cypress | Better parallelization, faster |

### Architectural Patterns

- **Repository Pattern**: Pluggable storage backends
- **Dependency Injection**: FastAPI's `Depends()` for testability
- **Factory Pattern**: `BackendFactory` for storage selection
- **Component Pattern**: Reusable React components

### Future Considerations

- GraphQL API (for complex queries)
- Real-time updates (WebSockets)
- Mobile native apps (React Native)
- Team/shared tasks feature
