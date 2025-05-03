# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test Commands
- Format code: `poetry run poe format`
- Lint code: `poetry run poe lint`
- Type check: `poetry run poe typecheck`
- Run all tests: `poetry run poe test`
- Run a single test: `poetry run pytest tests/test_file.py::test_function_name -v`
- Run tests with coverage: `poetry run poe coverage`
- Run all checks: `poetry run poe check`

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