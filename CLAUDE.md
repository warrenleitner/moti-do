# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test Commands

### All Checks (Python + Frontend)
- **Run all checks**: `poetry run poe check` or `bash scripts/check-all.sh`
  - This runs all Python and frontend checks in one command

### Python Backend
- Format code: `poetry run poe format`
- Lint code: `poetry run poe lint`
- Type check: `poetry run poe typecheck`
- Run all tests: `poetry run poe test`
- Run a single test: `poetry run pytest tests/test_file.py::test_function_name -v`
- Run tests with coverage: `poetry run poe coverage`
- Python-only checks: `poetry run poe check-python`

### Frontend (from frontend/ directory)
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`
- Run tests: `npm run test`
- Build: `npm run build`
- All frontend checks: `poetry run poe frontend-check` (from project root)

## Code Style Guidelines
- Python 3.9+ compatible code with type hints (checked by mypy)
- Line length: 88 characters (Black default)
- Imports: Use isort with Black profile (multi_line_output=3, include_trailing_comma=True)
- Naming: snake_case for variables/functions, PascalCase for classes, UPPER_CASE for constants
- Error handling: Use specific exceptions with descriptive error messages
- Documentation: Docstrings for modules, classes, and functions (triple quotes)
- Testing: Use pytest, aim for 100% test coverage
- Follow Pylint guidelines, minimum score 10.0
- Use Enum classes for constants with limited values (Priority, Difficulty, Duration)

## Development Requirements
When implementing features or modifications for Moti-Do, you MUST:

1. Analyze the impact of changes across the entire project structure (motido.core, motido.data, motido.cli)
2. Write clear, readable, efficient, and well-commented Python code
3. Adhere to Black formatting and isort import sorting rules
4. Use appropriate type hints for all function signatures and significant variables
5. Write comprehensive pytest unit tests for ALL new functionality or modified logic
6. Ensure all existing and new tests pass successfully after changes
7. Aim for high test coverage for new/modified code
8. Consider how changes affect existing tests and update them as needed
9. Use Poetry for managing dependencies (pyproject.toml)
10. Verify compliance with `poetry run poe check` before submitting

## CI/CD Requirements - MANDATORY
**Before completing ANY feature or fix, you MUST verify all CI checks pass locally:**

### Quick Check (Recommended)
Run everything in one command from the project root:
```bash
poetry run poe check
# OR
bash scripts/check-all.sh
```

This single command runs:
- **Python**: format, lint (10.0/10.0), typecheck (0 errors), coverage (100%)
- **Frontend**: lint (ESLint), typecheck (TypeScript), test (Vitest), build

### Manual Verification (if needed)
If you need to run checks individually:

**Python Backend (from project root):**
```bash
poetry run poe format      # Format code with Black + isort
poetry run poe lint        # Pylint must score 10.0/10.0
poetry run poe typecheck   # Mypy strict mode, no errors
poetry run poe coverage    # Pytest with 100% coverage required
poetry run poe check-python  # Run all above Python checks
```

**Frontend (from frontend/ directory):**
```bash
cd frontend
npm run lint               # ESLint must pass
npx tsc --noEmit           # TypeScript must compile without errors
npm run test               # Vitest tests must pass
npm run build              # Build must succeed
```

### Verification Checklist
Before marking any task complete, confirm:
- [ ] **`poetry run poe check`** passes (includes all Python + Frontend checks)

**These checks are enforced by GitHub Actions CI on every PR. Do NOT submit code that fails these checks.**

## Quality Standards
- Python: 100% test coverage, Pylint 10.0, zero Mypy errors
- Frontend: Zero ESLint errors, zero TypeScript errors, all Vitest tests pass
- Always run the full check suite before considering work complete
- This "almost ridiculous" quality standard applies at all times and all phases