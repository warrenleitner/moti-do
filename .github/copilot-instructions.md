# GitHub Copilot Instructions for MotiDo

## Core architecture pointers
- Backend logic lives under `src/motido/` (see `docs/ARCHITECTURE.md` for the full diagram); FastAPI routers in `api/` wire to the core/domain code in `core/` and the storage abstractions in `data/`.
- All persistence calls go through `motido.data.abstraction.DataManager`; `backend_factory.py` chooses PostgreSQL when `DATABASE_URL` is set, otherwise falls back to JSON or SQLite—limit changes to the interface (`abstraction.py`) or a specific manager (`postgres_manager.py`, `json_manager.py`).
- Scoring, XP tracking, and recurrence rules live in `core/scoring.py` and `core/recurrence.py`; avoid duplicating formulas and consult `docs/SCORING.md` for the weight/multiplier definitions.
- API schemas/DTOs (`api/schemas.py`) mirror the core dataclasses in `core/models.py`, so add new fields in both places and keep Pydantic validation in sync with the CLI helpers in `cli/main.py`.

## Developer workflows that matter
- **Local dev servers**: `scripts/dev.sh` orchestrates backend (`uvicorn motido.api.main:app`) plus Vite frontend, manages Docker PostgreSQL when passed `--local`, and exposes `--keep` to keep the DB alive for debugging—inspect it before adjusting startup behavior.
- **Sign-off workflow**: `bash scripts/check-all.sh` (optional `--skip-e2e`) mirrors CI—runs `poetry run poe check` (Python + frontend) and Playwright E2E with Docker. Run it before declaring changes merge-ready.
- **Python helpers**: Always use `poetry run poe <task>` (format, lint, typecheck, coverage, check-python); no backend change should skip `poe check` due to the 100% coverage and Pylint 10.0 standards.
- **Frontend commands**: Within `frontend/`, rely on `npm run lint`, `npx tsc --noEmit`, `npm run test`/`test:watch`, `npm run build`, and the Playwright targets described under `frontend/README.md`/`scripts/run-e2e.sh` when touching UI or tests.

## Backend-specific patterns
- Authentication, CORS, and middleware live in `api/main.py` (with JWT lifetimes and allowed origins). Follow the dependency injection style in `api/deps.py` for shared DB/session resources.
- Database configuration is centralized in `data/config.py`; mutate `Config` only through helper functions so `.env` overrides stay consistent across `scripts/dev.sh`, `scripts/run-e2e.sh`, and CI.
- CLI commands (`src/motido/cli/main.py`) reuse the same storage factory/score engine as the HTTP API—if you add new CLI flags, ensure they integrate with `backend_factory.create_data_manager` and `core/scoring.py` so scoring stays deterministic.

## Frontend conventions
- State is held in Zustand stores (`frontend/src/store`), especially `taskStore.ts` for task filtering, sorting, and CRUD; reuse the existing `persist`+`devtools` wrappers so storage keys remain stable.
- API traffic goes through the Axios client in `frontend/src/services/api.ts`; add endpoints there and expose them via hooks in `frontend/src/hooks` or `pages/*` to keep UI components declarative.
- Layout/UI follows Material-UI + TanStack Query patterns—check `frontend/src/components/layout` and `frontend/src/pages` for example prop composition, and mirror the hook usage from `frontend/src/hooks/useTasks.ts` to avoid manual state handling.
- Date handling relies on `date-fns` and `rrule`; reuse helper utilities under `frontend/src/utils` when normalizing UTC/local times for calendar, habit, and recurrence views.

## Testing & quality guardrails
- Backend pytest suites live under `tests/` (e.g., `test_scoring.py`, `test_recurrence.py`, CLI regression tests). Targeted tests are required for any logic change, as the pipeline enforces 100% coverage—follow the fixture patterns in `tests/conftest.py` to reuse the factory-backed storage.
- Frontend Vitest suites live under `frontend/tests/`, and Playwright E2E scripts live in `frontend/e2e/`; use `scripts/run-e2e.sh` to run the browser tests against Docker Postgres exactly as CI does.
- Use `scripts/check-all.sh` as the canonical gatekeeper; document exceptions (e.g., `--skip-e2e`) when Docker can't start so reviewers understand the gap.

## Repository hygiene & cross-cutting notes
- Always consult `.github/instructions/*.md` (Python, React/TypeScript, Node & Vitest, Angular) before editing files matching those patterns—these contain strict lint/type-check expectations beyond what the code shows.
- Refer back to `CLAUDE.md` for project-wide mandates (100% coverage, linting perfection, testing expectations) before claiming work is complete.
- When adding new configuration, update `.env.example` and verify `scripts/dev.sh`, `scripts/run-e2e.sh`, and `scripts/check-all.sh` honor the new defaults so local dev and CI stay in sync.

## Feedback loop
- After editing instructions or architecture-critical code, ask reviewers if any guidance is missing—point to the README, `docs/ARCHITECTURE.md`, or specific routers/stores you needed to understand.
- If something still feels underspecified, request direct feedback on which files/topics need expanded documentation before the next iteration.
