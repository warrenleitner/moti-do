#!/bin/bash
# check-all.sh - Run all CI checks locally
# This script runs the same checks that run in CI/CD

set -e  # Exit on first error

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
echo "→ Security scan with safety..."
poetry run safety scan || echo "⚠️ Security scan failed (non-blocking)"

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
  echo "→ Running tests with coverage..."
  npm run test:coverage

  echo ""
  echo "→ Building production bundle..."
  npm run build
)

echo ""
echo "===================================="
echo "✅ All checks passed!"
echo "===================================="
