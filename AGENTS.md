# AGENTS.md

This repo uses automated agents (Copilot, Claude, etc.). This file is the single source of truth for how agents should work in this codebase.

## Sign-off workflow (required)

Run from project root:

- Full suite (Python + Frontend + E2E): `bash scripts/verify.sh`

Notes:
- `scripts/verify.sh` is intentionally **quiet**: it prints only a one-line status per step, and prints detailed logs only when a step fails.
- E2E uses a local Docker PostgreSQL by default (port 5433). Use `--no-docker` to force JSON storage.
- Playwright args pass through: `bash scripts/verify.sh --ui`, `bash scripts/verify.sh auth`, etc.

## Local development

- Standard (Supabase via `.env`): `./scripts/dev.sh`
- Local Docker DB: `./scripts/dev.sh --local`
- Offline (SQLite/JSON): `./scripts/dev.sh --offline`

## Architecture pointers

- Backend logic lives under `src/motido/`.
  - FastAPI routers: `src/motido/api/` (wires HTTP to domain/storage)
  - Domain logic: `src/motido/core/`
  - Storage layer: `src/motido/data/`
- All persistence calls go through `motido.data.abstraction.DataManager`.
  - `backend_factory.py` selects PostgreSQL when `DATABASE_URL` is set; otherwise JSON/SQLite.
- Scoring/XP/recurrence live in `core/scoring.py` and `core/recurrence.py`.
  - Avoid duplicating formulas; consult `docs/SCORING.md`.
- API schemas in `src/motido/api/schemas.py` mirror core dataclasses in `src/motido/core/models.py`.

## Quality guardrails (non-negotiable)

- Python: Black + isort formatted, mypy clean, Pylint must be 10.0/10.0.
- Tests: 100% coverage for Python and frontend.
- Frontend: zero ESLint errors, zero TypeScript errors, tests + build must pass.
- E2E: Playwright must pass for user-facing changes.

## Testing strategy

- Unit tests
  - Python: `tests/` (pytest + coverage enforced)
  - Frontend: `frontend/tests/` (Vitest)
- E2E tests: `frontend/e2e/` (Playwright)

When adding user-facing features:
- Prefer unit tests for logic and state.
- Add/extend E2E tests for full user flows and cross-page behavior.

Coverage exclusions are allowed only when justified:
- Python: `# pragma: no cover` with a reason.
- Frontend: `/* v8 ignore */` with a reason.

## Frontend conventions

- State lives in Zustand stores under `frontend/src/store` (especially `taskStore.ts`).
- API traffic goes through `frontend/src/services/api.ts`; expose endpoints via hooks.
- Date handling uses `date-fns` and `rrule`; reuse utilities under `frontend/src/utils`.

## Versioning

App version is duplicated across multiple files and must stay in sync:
- `frontend/package.json`
- `pyproject.toml`
- `src/motido/api/main.py` (FastAPI `version` and health response)
- `frontend/src/test/mocks/handlers.ts`
- `frontend/src/test/setup.ts`

Use semantic versioning:
- PATCH: fixes/docs/small improvements
- MINOR: new features (non-breaking)
- MAJOR: breaking changes
