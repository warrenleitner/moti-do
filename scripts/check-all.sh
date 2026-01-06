#!/bin/bash
# check-all.sh - Run all CI checks locally (sign-off workflow)
# This script runs the same checks that run in CI/CD, including E2E tests
#
# Usage:
#   ./scripts/check-all.sh              # Run ALL tests including E2E (default)
#   ./scripts/check-all.sh --skip-e2e   # Skip E2E tests (unit tests only)
#   ./scripts/check-all.sh --unit-only  # Same as --skip-e2e

set -e  # Exit on first error

# Store the project root
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Parse arguments - E2E is ON by default
RUN_E2E=true
for arg in "$@"; do
  case $arg in
    --skip-e2e|--unit-only)
      RUN_E2E=false
      shift
      ;;
  esac
done

echo "===================================="
echo "Running Python Backend Checks"
echo "===================================="

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

echo ""
echo "→ Formatting code with isort and black..."
$PYTHON_RUN isort .
$PYTHON_RUN black .

echo ""
echo "→ Type checking with mypy..."
$PYTHON_RUN mypy src tests

echo ""
echo "→ Linting with pylint..."
$PYTHON_RUN pylint src tests --fail-under=10

echo ""
echo "→ Running tests with coverage..."
$PYTHON_RUN pytest --cov=motido --cov-report=term-missing --cov-fail-under=100

echo ""
echo "===================================="
echo "Running Frontend Checks"
echo "===================================="

# Use subshell to ensure we return to original directory even on failure
(
  cd frontend || { echo "Error: frontend directory not found"; exit 1; }

  echo ""
  echo "→ Installing frontend dependencies with npm ci..."
  npm ci

  echo ""
  echo "→ Linting with ESLint..."
  npm run lint

  echo ""
  echo "→ Type checking with TypeScript..."
  npx tsc --noEmit

  echo ""
  echo "→ Running tests with coverage (100% required)..."
  npm run test:coverage
  # Vitest enforces thresholds configured in vite.config.ts
  # The test:coverage command will fail if coverage < 100%

  echo ""
  echo "→ Building production bundle..."
  npm run build
)

# ============================================
# E2E Tests (included by default)
# ============================================
if [ "$RUN_E2E" = true ]; then
  echo ""
  echo "===================================="
  echo "Running E2E Tests (Playwright)"
  echo "===================================="

  echo ""
  echo "→ Running E2E tests..."
  bash scripts/run-e2e.sh

  echo ""
  echo "===================================="
  echo "✅ All checks passed (including E2E)!"
  echo "===================================="
else
  echo ""
  echo "===================================="
  echo "✅ Unit checks passed (E2E skipped)"
  echo "(Run without --skip-e2e to include E2E tests)"
  echo "===================================="
fi
