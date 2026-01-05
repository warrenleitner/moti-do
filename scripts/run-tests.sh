#!/bin/bash
#
# Token-Efficient Test Runner for Claude
#
# This script runs tests and captures verbose output to log files,
# printing only a minimal summary to stdout. This dramatically reduces
# token usage when Claude runs tests.
#
# Usage:
#   ./scripts/run-tests.sh              # Run all tests (python + frontend + e2e)
#   ./scripts/run-tests.sh python       # Python tests only
#   ./scripts/run-tests.sh frontend     # Frontend (Vitest) tests only
#   ./scripts/run-tests.sh e2e          # E2E (Playwright) tests only
#   ./scripts/run-tests.sh unit         # Python + Frontend tests (no E2E)
#   ./scripts/run-tests.sh check        # Full check-all.sh (format, lint, typecheck, tests)
#
# Log files are saved to test-logs/ with timestamps.
# Use 'test-logs/latest_<type>.log' symlinks for easy access.
#
# CLAUDE: After running, read failures from logs instead of re-running tests:
#   grep -A20 'FAILED\|Error' test-logs/latest_python.log
#   grep -A20 'FAIL\|✗' test-logs/latest_frontend.log
#   grep -A20 'failed\|✘' test-logs/latest_e2e.log

set -o pipefail

# Colors (disabled if not terminal or if NO_COLOR set)
if [ -t 1 ] && [ -z "$NO_COLOR" ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Configuration
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

LOG_DIR="$PROJECT_ROOT/test-logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Test type (default: all)
TEST_TYPE="${1:-all}"

# Helper: print summary header
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Helper: extract Python test summary from pytest output
extract_python_summary() {
    local log_file="$1"

    # Get the summary line (e.g., "120 passed in 5.23s" or "3 failed, 117 passed in 5.23s")
    local summary=$(grep -E "^(=+ .* =+|[0-9]+ passed|FAILED|ERROR)" "$log_file" | tail -5)

    # Extract passed/failed counts
    local passed=$(grep -oE "[0-9]+ passed" "$log_file" | tail -1 | grep -oE "[0-9]+")
    local failed=$(grep -oE "[0-9]+ failed" "$log_file" | tail -1 | grep -oE "[0-9]+")
    local errors=$(grep -oE "[0-9]+ error" "$log_file" | tail -1 | grep -oE "[0-9]+")

    echo "Passed: ${passed:-0}, Failed: ${failed:-0}, Errors: ${errors:-0}"

    # List failed tests if any
    if [ "${failed:-0}" -gt 0 ] || [ "${errors:-0}" -gt 0 ]; then
        echo -e "\n${RED}Failed tests:${NC}"
        grep -E "^FAILED |^ERROR " "$log_file" | head -20
        echo -e "\n${YELLOW}Debug: grep -B5 -A20 'FAILED\\|AssertionError' $log_file${NC}"
    fi
}

# Helper: extract Frontend (Vitest) test summary
extract_frontend_summary() {
    local log_file="$1"

    # Vitest outputs lines like "✓ src/..." for passed and "✗ src/..." for failed
    local passed=$(grep -c "✓" "$log_file" 2>/dev/null || echo 0)
    local failed=$(grep -c "✗\|FAIL" "$log_file" 2>/dev/null || echo 0)

    # Also look for the summary line
    local summary=$(grep -E "Tests.*passed|Test Files" "$log_file" | tail -2)

    if [ -n "$summary" ]; then
        echo "$summary"
    else
        echo "Passed: $passed, Failed: $failed"
    fi

    # List failed tests if any
    if [ "$failed" -gt 0 ]; then
        echo -e "\n${RED}Failed tests:${NC}"
        grep -E "✗|FAIL" "$log_file" | head -20
        echo -e "\n${YELLOW}Debug: grep -B5 -A20 'FAIL\\|Error\\|✗' $log_file${NC}"
    fi
}

# Helper: extract E2E (Playwright) test summary
extract_e2e_summary() {
    local log_file="$1"

    # Playwright outputs summary like "X passed" or "X failed, Y passed"
    local passed=$(grep -oE "[0-9]+ passed" "$log_file" | tail -1 | grep -oE "[0-9]+")
    local failed=$(grep -oE "[0-9]+ failed" "$log_file" | tail -1 | grep -oE "[0-9]+")
    local skipped=$(grep -oE "[0-9]+ skipped" "$log_file" | tail -1 | grep -oE "[0-9]+")

    echo "Passed: ${passed:-0}, Failed: ${failed:-0}, Skipped: ${skipped:-0}"

    # List failed tests if any
    if [ "${failed:-0}" -gt 0 ]; then
        echo -e "\n${RED}Failed tests:${NC}"
        grep -E "✘|FAILED|Error:" "$log_file" | head -20
        echo -e "\n${YELLOW}Debug: grep -B5 -A30 '✘\\|FAILED\\|Error:' $log_file${NC}"
    fi
}

# Helper: extract check-all summary (format, lint, typecheck + tests)
extract_check_summary() {
    local log_file="$1"

    # Check for various failure indicators
    local format_ok=$(grep -q "Formatting.*isort and black" "$log_file" && echo "✓" || echo "?")
    local mypy_ok=$(grep -qE "Success:|Found 0 errors" "$log_file" && echo "✓" || echo "✗")
    local pylint_ok=$(grep -q "rated at 10.00/10" "$log_file" && echo "✓" || echo "✗")
    local pytest_ok=$(grep -q "passed" "$log_file" && ! grep -q "failed" "$log_file" && echo "✓" || echo "✗")
    local eslint_ok=$(grep -qE "ESLint.*Done|→ Linting with ESLint\.\.\." "$log_file" && ! grep -qE "error.*ESLint" "$log_file" && echo "✓" || echo "?")
    local tsc_ok=$(grep -qE "Type checking.*TypeScript" "$log_file" && ! grep -qE "error TS" "$log_file" && echo "✓" || echo "?")
    local vitest_ok=$(grep -qE "Tests.*passed|test.*passed" "$log_file" && echo "✓" || echo "?")
    local build_ok=$(grep -qE "Building|built in" "$log_file" && echo "✓" || echo "?")
    local e2e_ok=$(grep -qE "All E2E tests passed|E2E.*passed" "$log_file" && echo "✓" || echo "?")

    echo "Python: format=$format_ok mypy=$mypy_ok pylint=$pylint_ok pytest=$pytest_ok"
    echo "Frontend: eslint=$eslint_ok tsc=$tsc_ok vitest=$vitest_ok build=$build_ok"
    echo "E2E: $e2e_ok"

    # Show any errors
    if grep -qE "error|FAILED|Error:|✗" "$log_file"; then
        echo -e "\n${RED}Errors found:${NC}"
        grep -E "^error|FAILED|Error:|error TS|✗" "$log_file" | head -20
        echo -e "\n${YELLOW}Debug: grep -B5 -A10 'error\\|FAILED\\|Error:' $log_file${NC}"
    fi
}

# Run Python tests
run_python_tests() {
    local log_file="$LOG_DIR/python_${TIMESTAMP}.log"
    local latest_link="$LOG_DIR/latest_python.log"

    print_header "Python Tests"
    echo "Log: $log_file"
    echo "Follow: tail -f $log_file"

    local start_time=$(date +%s)

    # Run pytest with coverage
    poetry run pytest --cov=motido --cov-report=term-missing --cov-fail-under=100 > "$log_file" 2>&1
    local exit_code=$?

    local duration=$(($(date +%s) - start_time))

    # Create symlink
    ln -sf "python_${TIMESTAMP}.log" "$latest_link"

    # Print summary
    echo -e "\nDuration: ${duration}s"
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}RESULT: PASSED${NC}"
    else
        echo -e "${RED}RESULT: FAILED${NC}"
    fi
    extract_python_summary "$log_file"

    return $exit_code
}

# Run Frontend tests
run_frontend_tests() {
    local log_file="$LOG_DIR/frontend_${TIMESTAMP}.log"
    local latest_link="$LOG_DIR/latest_frontend.log"

    print_header "Frontend Tests (Vitest)"
    echo "Log: $log_file"
    echo "Follow: tail -f $log_file"

    local start_time=$(date +%s)

    # Run vitest with coverage
    (cd frontend && npm run test:coverage) > "$log_file" 2>&1
    local exit_code=$?

    local duration=$(($(date +%s) - start_time))

    # Create symlink
    ln -sf "frontend_${TIMESTAMP}.log" "$latest_link"

    # Print summary
    echo -e "\nDuration: ${duration}s"
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}RESULT: PASSED${NC}"
    else
        echo -e "${RED}RESULT: FAILED${NC}"
    fi
    extract_frontend_summary "$log_file"

    return $exit_code
}

# Run E2E tests
run_e2e_tests() {
    local log_file="$LOG_DIR/e2e_${TIMESTAMP}.log"
    local latest_link="$LOG_DIR/latest_e2e.log"

    print_header "E2E Tests (Playwright)"
    echo "Log: $log_file"
    echo "Follow: tail -f $log_file"

    local start_time=$(date +%s)

    # Run e2e script
    bash scripts/run-e2e.sh > "$log_file" 2>&1
    local exit_code=$?

    local duration=$(($(date +%s) - start_time))

    # Create symlink
    ln -sf "e2e_${TIMESTAMP}.log" "$latest_link"

    # Print summary
    echo -e "\nDuration: ${duration}s"
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}RESULT: PASSED${NC}"
    else
        echo -e "${RED}RESULT: FAILED${NC}"
    fi
    extract_e2e_summary "$log_file"

    return $exit_code
}

# Run full check-all.sh
run_check_all() {
    local log_file="$LOG_DIR/check_${TIMESTAMP}.log"
    local latest_link="$LOG_DIR/latest_check.log"

    print_header "Full Check Suite (check-all.sh)"
    echo "Log: $log_file"
    echo "Follow: tail -f $log_file"

    local start_time=$(date +%s)

    # Run check-all
    bash scripts/check-all.sh > "$log_file" 2>&1
    local exit_code=$?

    local duration=$(($(date +%s) - start_time))

    # Create symlink
    ln -sf "check_${TIMESTAMP}.log" "$latest_link"

    # Print summary
    echo -e "\nDuration: ${duration}s"
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}RESULT: ALL CHECKS PASSED${NC}"
    else
        echo -e "${RED}RESULT: CHECKS FAILED${NC}"
    fi
    extract_check_summary "$log_file"

    return $exit_code
}

# Main execution
FINAL_EXIT_CODE=0

case "$TEST_TYPE" in
    python|py)
        run_python_tests || FINAL_EXIT_CODE=$?
        ;;
    frontend|fe|vitest)
        run_frontend_tests || FINAL_EXIT_CODE=$?
        ;;
    e2e|playwright)
        run_e2e_tests || FINAL_EXIT_CODE=$?
        ;;
    unit)
        # Unit tests only (python + frontend, no E2E)
        run_python_tests || FINAL_EXIT_CODE=$?
        run_frontend_tests || FINAL_EXIT_CODE=$?
        ;;
    check|all-check)
        # Full check-all.sh including E2E
        run_check_all || FINAL_EXIT_CODE=$?
        ;;
    all)
        # All tests separately (gives better summaries per type)
        run_python_tests || FINAL_EXIT_CODE=$?
        run_frontend_tests || FINAL_EXIT_CODE=$?
        run_e2e_tests || FINAL_EXIT_CODE=$?
        ;;
    *)
        echo "Unknown test type: $TEST_TYPE"
        echo "Usage: $0 [python|frontend|e2e|unit|check|all]"
        exit 1
        ;;
esac

# Final summary
print_header "FINAL SUMMARY"
echo "Log directory: $LOG_DIR"
echo "Latest logs:"
ls -la "$LOG_DIR"/latest_*.log 2>/dev/null | awk '{print "  " $NF " -> " $11}'

if [ $FINAL_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✓ All requested tests passed${NC}"
else
    echo -e "\n${RED}✗ Some tests failed - check logs above for details${NC}"
    echo -e "${YELLOW}CLAUDE: Read the log files instead of re-running tests!${NC}"
fi

exit $FINAL_EXIT_CODE
