#!/bin/bash
# check-all.sh - Run all CI checks locally
# This script runs the same checks that run in CI/CD

set -e  # Exit on first error

echo "===================================="
echo "Running Python Backend Checks"
echo "===================================="

echo ""
echo "→ Formatting code with isort and black..."
python -m isort .
python -m black .

echo ""
echo "→ Type checking with mypy..."
python -m mypy src tests

echo ""
echo "→ Linting with pylint..."
python -m pylint src tests --fail-under=10

echo ""
echo "→ Running tests with coverage..."
python -m pytest --cov=motido --cov-report=term-missing --cov-fail-under=100

echo ""
echo "===================================="
echo "Running Frontend Checks"
echo "===================================="

cd frontend

echo ""
echo "→ Linting with ESLint..."
npm run lint

echo ""
echo "→ Type checking with TypeScript..."
npx tsc --noEmit

echo ""
echo "→ Running tests..."
npm run test

echo ""
echo "→ Building production bundle..."
npm run build

cd ..

echo ""
echo "===================================="
echo "✅ All checks passed!"
echo "===================================="
