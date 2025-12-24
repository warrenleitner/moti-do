#!/bin/bash
# check-all.sh - Run all CI checks locally
# This script runs the same checks that run in CI/CD
#
# Usage:
#   ./scripts/check-all.sh          # Run unit tests only (fast)
#   ./scripts/check-all.sh --e2e    # Include E2E tests (slow, requires servers)
#   ./scripts/check-all.sh --all    # Run everything including E2E

set -e  # Exit on first error

# Parse arguments
RUN_E2E=false
for arg in "$@"; do
  case $arg in
    --e2e|--all)
      RUN_E2E=true
      shift
      ;;
  esac
done

echo "===================================="
echo "Running Python Backend Checks"
echo "===================================="

echo ""
echo "→ Formatting code with isort and black..."
poetry run isort .
poetry run black .

echo ""
echo "→ Type checking with mypy..."
poetry run mypy src tests

echo ""
echo "→ Linting with pylint..."
poetry run pylint src tests --fail-under=10

echo ""
echo "→ Running tests with coverage..."
poetry run pytest --cov=motido --cov-report=term-missing --cov-fail-under=100

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
# E2E Tests (optional, slow)
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
  echo "✅ All unit checks passed!"
  echo "(Run with --e2e to include E2E tests)"
  echo "===================================="
fi
