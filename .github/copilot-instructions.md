# GitHub Copilot Instructions for MotiDo

MotiDo is a gamified task and habit tracker with XP, streaks, and badges. Built with FastAPI (Python) backend and React (TypeScript) frontend.

## Project Overview

### Tech Stack
- **Backend**: Python 3.9+ with FastAPI, PostgreSQL, Pydantic validation, JWT authentication
- **Frontend**: React 19 with TypeScript, Material-UI, TanStack Query, Zustand, Vite
- **Development**: Poetry for Python dependencies, npm for frontend, Vitest for frontend testing, pytest for backend
- **Quality**: 100% test coverage required, Pylint 10.0/10.0, strict TypeScript, zero linting errors

### Architecture
- Monorepo structure with `/src/motido/` (Python backend) and `/frontend/` (React app)
- RESTful API with `/api` prefix
- Component-based frontend with hooks and functional components
- PostgreSQL database with in-memory fallback for development

## Build and Test Commands

### Quick Check (All)
```bash
poetry run poe check  # Runs ALL Python + Frontend checks
```

### Python Backend
```bash
poetry run poe format      # Black + isort
poetry run poe lint        # Pylint (must score 10.0/10.0)
poetry run poe typecheck   # Mypy strict mode
poetry run poe test        # pytest
poetry run poe coverage    # pytest with 100% coverage
poetry run poe check-python  # All Python checks
```

### Frontend (from frontend/ directory)
```bash
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript type checking
npm run test          # Vitest
npm run build         # Production build
```

From project root:
```bash
poetry run poe frontend-check  # All frontend checks
```

## Code Style Guidelines

### Python
- Python 3.9+ with type hints (checked by mypy strict mode)
- Line length: 88 characters (Black default)
- Imports: isort with Black profile
- Naming: snake_case for variables/functions, PascalCase for classes, UPPER_CASE for constants
- Docstrings: Follow PEP 257 for all modules, classes, and functions
- Use Enum classes for constants with limited values (Priority, Difficulty, Duration)
- Specific exceptions with descriptive error messages

### TypeScript/React
- Functional components with hooks (React 19+)
- TypeScript strict mode enabled
- Material-UI components for consistent styling
- Component composition over inheritance
- Custom hooks for reusable logic
- Proper prop types and interfaces

### Testing
- **Python**: pytest with 100% coverage required, test all new functionality
- **Frontend**: Vitest for unit/integration tests, React Testing Library patterns
- Test edge cases and error conditions
- Mock external dependencies appropriately

## CI/CD Requirements (MANDATORY)

**Before completing ANY feature or fix:**
```bash
poetry run poe check  # Must pass ALL checks
```

This enforces:
- Python: format, lint (10.0/10.0), typecheck (0 errors), coverage (100%)
- Frontend: lint (ESLint), typecheck (TypeScript), test (Vitest), build

**These checks are enforced by GitHub Actions CI on every PR. Do NOT submit code that fails these checks.**

## Development Workflow

1. **Analyze Impact**: Consider changes across motido.core, motido.data, motido.cli, motido.api
2. **Write Code**: Clear, readable, efficient code with appropriate type hints
3. **Format**: Run `poetry run poe format` for Python
4. **Test**: Write comprehensive tests for ALL new/modified functionality
5. **Verify**: Run `poetry run poe check` before submitting
6. **Document**: Update docstrings and README if needed

## Security Best Practices

- Sanitize user inputs to prevent XSS and SQL injection
- Validate all data with Pydantic models
- Use JWT for authentication with secure secret keys
- Never store sensitive data in localStorage or commit secrets
- Use environment variables for configuration (see .env.example)
- Follow OWASP guidelines for web application security

## Project Structure

```
moti-do/
├── src/motido/           # Python backend
│   ├── api/              # FastAPI endpoints
│   ├── cli/              # CLI interface
│   ├── core/             # Core business logic
│   └── data/             # Data models and persistence
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── services/     # API client
│   │   └── stores/       # Zustand state
│   └── tests/            # Frontend tests
├── tests/                # Backend tests
└── .github/
    ├── instructions/     # File-type specific instructions
    └── workflows/        # CI/CD workflows
```

## Additional Guidelines

- **Dependencies**: Use Poetry for Python (pyproject.toml), npm for frontend
- **Environment**: Use .env for configuration (copy from .env.example)
- **Documentation**: See CLAUDE.md for detailed development requirements
- **File-Specific**: Check .github/instructions/ for language-specific guidelines
- **Commits**: Write clear, descriptive commit messages
- **Quality**: Maintain "almost ridiculous" quality standards at all times

## Common Patterns

### Python
- Use FastAPI dependencies for request handling
- Pydantic models for validation
- Async/await for I/O operations
- Type hints everywhere

### React
- Functional components with hooks
- TanStack Query for server state
- Zustand for client state
- Custom hooks for reusable logic
- Material-UI for consistent UI

## File-Type Specific Instructions

This repository has detailed instructions for specific file types in `.github/instructions/`:
- Python: `.github/instructions/python.instructions.md`
- React/TypeScript: `.github/instructions/reactjs.instructions.md`
- Node.js/JavaScript: `.github/instructions/nodejs-javascript-vitest.instructions.md`
- Angular: `.github/instructions/angular.instructions.md` (reference)

These instructions apply automatically to matching file patterns and provide detailed coding standards.

## Running the Application

### Development Mode (No Database)
```bash
# Backend (port 8000)
poetry run uvicorn motido.api.main:app --reload

# Frontend (port 5173)
cd frontend && npm run dev
```

### With PostgreSQL or Supabase
Set `DATABASE_URL` in `.env`, then run same commands above.

### Development Mode Authentication
Set `MOTIDO_DEV_MODE=true` in `.env` to bypass authentication during development.

## Key Features to Understand

- **XP System**: Tasks earn XP based on difficulty (EASY=10, MEDIUM=20, HARD=30, EXTREME=50)
- **Streaks**: Daily completion tracking
- **Badges**: Achievement system based on milestones
- **Priority**: Tasks have priority levels (LOW, MEDIUM, HIGH, CRITICAL)
- **Duration**: Estimated time (QUICK, SHORT, MEDIUM, LONG, EXTENDED)
- **PWA**: Progressive Web App with offline support

## Quality Standards Summary

This project maintains exceptionally high quality standards:
- **Python**: 100% test coverage, Pylint 10.0/10.0, zero Mypy errors
- **Frontend**: Zero ESLint errors, zero TypeScript errors, all tests pass
- **Always** run full check suite before considering work complete
- **Never** submit code that fails CI checks

When in doubt, check CLAUDE.md for comprehensive development requirements.
