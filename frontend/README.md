# Moti-Do Frontend

React 19 frontend for Moti-Do - a gamified task and habit tracker.

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast builds and HMR
- **Material-UI (MUI)** for components
- **Zustand** for state management
- **Axios** for API requests
- **React Router** for navigation

### Specialized Libraries

- **FullCalendar** - Calendar view integration
- **@xyflow/react** - Dependency graph visualization
- **@hello-pangea/dnd** - Drag and drop (Kanban)
- **RRule** - Recurrence rule parsing

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

### Commands

```bash
# Development server (port 5173)
npm run dev

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Unit tests
npm run test           # Run once
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage

# Build
npm run build          # Production build
npm run preview        # Preview build

# E2E tests
npm run test:e2e       # Run all
npm run test:e2e:ui    # Playwright UI
npm run test:e2e:headed # Headed browser
```

### Recommended: Use Project Scripts

From the project root, use the unified development scripts:

```bash
# Start frontend + backend together
./scripts/dev.sh

# Run all checks (lint, typecheck, test, build)
poetry run poe frontend-check
```

## Project Structure

```
src/
├── pages/          # Top-level page components
│   ├── Dashboard.tsx
│   ├── TasksPage.tsx
│   ├── CalendarPage.tsx
│   ├── KanbanPage.tsx
│   ├── HabitsPage.tsx
│   ├── GraphPage.tsx
│   └── SettingsPage.tsx
├── components/     # Reusable components
│   ├── common/     # Shared utilities
│   ├── tasks/      # Task-related components
│   ├── calendar/   # Calendar integration
│   ├── kanban/     # Kanban board
│   ├── habits/     # Habit tracking
│   └── graph/      # Dependency graph
├── store/          # Zustand state stores
│   ├── taskStore.ts
│   └── userStore.ts
├── services/       # API client
│   └── api.ts
├── types/          # TypeScript definitions
├── utils/          # Helper functions
├── hooks/          # Custom React hooks
└── main.tsx        # Entry point
```

## Testing

### Unit Tests (Vitest)

```bash
npm run test
```

Tests are co-located with components (`.test.tsx` files).

### E2E Tests (Playwright)

```bash
# From project root (recommended)
python3 scripts/verify.py

# Or from frontend directory
npm run test:e2e
```

E2E tests are in `e2e/` directory and test full user workflows.

### Coverage Requirements

- **100% coverage required** - enforced in CI
- Use `/* v8 ignore */` only when code truly cannot be tested
- Document reason for any coverage exclusions

## Quality Standards

All checks must pass before PR:

```bash
# Run all frontend checks
npm run lint && npx tsc --noEmit && npm run test && npm run build
```

Or from project root:

```bash
poetry run poe frontend-check
```

## Environment Variables

Create `.env.local` for local overrides:

```bash
# Custom API URL (default: auto-detected)
VITE_API_URL=http://localhost:8000/api
```

## Build Output

Production build output goes to `dist/`. This is served by Vercel in production.

Build includes:
- Code splitting for optimal loading
- Vendor chunk separation (React, MUI, etc.)
- PWA service worker

## Key Features

- **PWA Support**: Offline capability via service worker
- **Responsive Design**: Mobile-first with MUI breakpoints
- **Dark/Light Mode**: Follows system preference
- **Optimistic Updates**: Fast UI with background sync
