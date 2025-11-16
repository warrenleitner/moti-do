# MotiDo AI Coding Agent Instructions

## Project Overview

MotiDo is a CLI task management app with a gamified scoring system. Architecture follows a clean three-layer separation:

- **`motido.core`**: Domain models (`Task`, `User`) and business logic (scoring, XP calculation)
- **`motido.data`**: Persistence layer with pluggable backends (JSON/SQLite) via abstract `DataManager` interface
- **`motido.cli`**: Command-line interface using `argparse` and `rich` for styled output

## Critical Architecture Patterns

### Backend Abstraction Pattern
All data access goes through `DataManager` interface (`data/abstraction.py`). Never directly import `JsonDataManager` or `DatabaseDataManager` in CLI or core - always use `get_data_manager()` factory from `backend_factory.py`. This allows runtime backend switching via `config.json`.

```python
# CORRECT - uses factory
from motido.data.backend_factory import get_data_manager
manager = get_data_manager()

# WRONG - breaks abstraction
from motido.data.json_manager import JsonDataManager
manager = JsonDataManager()
```

### Enum-Based Display Pattern
`Priority`, `Difficulty`, and `Duration` enums (all in `core/models.py`) inherit from `str, Enum` and implement two methods:
- `emoji() -> str`: Returns themed emoji (e.g., 🔴 for DEFCON_ONE priority)
- `display_style() -> str`: Returns rich console color name for styling

When adding enum values, maintain the five-level progression pattern (Trivial → Low → Medium → High → Maximum) and include both methods with appropriate emojis/colors.

### Scoring System Architecture
Score calculation (`core/scoring.py`) uses multiplicative formula from `scoring_config.json`:
```
final_score = (base_score + bonuses) × difficulty_mult × duration_mult × age_mult
```

When modifying scoring: update both `scoring.py` logic AND `scoring_config.json` defaults. The config file auto-creates if missing, so changes must preserve backward compatibility.

## Development Workflow

### Essential Commands (via Poe the Poet)
```bash
poetry run poe format      # Black + isort (always run before commit)
poetry run poe lint        # Pylint (must score 10.0/10.0)
poetry run poe typecheck   # Mypy (strict mode, no untyped defs)
poetry run poe coverage    # Pytest with 100% coverage requirement
poetry run poe check       # Runs all above (use before pushing)
```

**Critical**: The project enforces 100% test coverage (`coverage` task) and perfect Pylint score (10.0). Run `poetry run poe check` before completing any feature.

### Running Single Tests
```bash
poetry run pytest tests/test_file.py::test_function_name -v
```

### Manual CLI Testing
```bash
poetry run motido init --backend json
poetry run motido create "Test task" --priority High --difficulty Medium
poetry run motido list
```

## Code Style Requirements

### Type Hints (Enforced by Mypy)
- All function signatures must include type hints
- Use `Type | None` syntax (Python 3.10+), not `Optional[Type]`
- Import from `typing` when needed: `List`, `Dict`, `Any`

```python
def load_user(self, username: str = DEFAULT_USERNAME) -> User | None:
    """Example with proper hints."""
```

### Imports (Enforced by isort)
Configuration uses Black profile. Import order:
1. Standard library
2. Third-party (e.g., `rich`, `pytest`)
3. Local application imports (use absolute: `from motido.core.models import Task`)

### Line Length & Formatting
- 88 characters (Black default, but Pylint allows 120 - stay with 88)
- Use Black formatting - never manually format
- Docstrings required for all modules, classes, and public functions (triple quotes)

### Naming Conventions
- `snake_case`: variables, functions, methods, module files
- `PascalCase`: classes, enums
- `UPPER_CASE`: constants (e.g., `DEFAULT_USERNAME`, `DATA_DIR`)

## Testing Patterns

### Fixture Usage
Common fixtures in `tests/conftest.py`:
- `mock_config_path`: Mocks config path to `/fake/config/dir`
- `manager`: Pre-configured `JsonDataManager` with mocked paths
- `sample_user`: User with two test tasks (ids: "uuid-a", "uuid-b")

Use `mocker.patch` (from `pytest-mock`) for filesystem/external dependencies:

```python
def test_example(mocker):
    mock_exists = mocker.patch("os.path.exists", return_value=False)
    mock_read = mocker.patch.object(manager, "_read_data", return_value={})
    # Test code...
```

### Test Organization
- One test file per source file (e.g., `test_scoring.py` for `scoring.py`)
- Extra test files for edge cases: `test_*_edge_cases.py`, `test_*_extras.py`
- Test names: `test_<function_name>_<scenario>` (e.g., `test_calculate_score_with_age_factor`)

### Coverage Requirement
100% coverage required. Use `# pragma: no cover` ONLY for unreachable defensive code (e.g., enum fallback branches).

## Common Gotchas

### DateTime Handling
Tasks use `datetime` objects (not `date`). When creating test data, use fixed timestamps:
```python
test_date = datetime(2023, 1, 1, 12, 0, 0)
task = Task(description="Test", creation_date=test_date)
```

Serialization format: `"%Y-%m-%d %H:%M:%S"` (see `JsonDataManager._serialize_task`)

### Backend-Specific Paths
- Config: `src/motido/data/config.json` (runtime-generated)
- Data: `src/motido/data/motido_data/users.json` (JSON backend)
- Scoring config: `src/motido/data/scoring_config.json` (auto-creates if missing)

Never hardcode these paths - use helper functions like `get_config_path()` or `get_scoring_config_path()`.

### Rich Console Display
CLI uses `rich` for colored tables. When displaying enum values:
```python
from rich.text import Text
priority_text = Text(task.priority.value, style=task.priority.display_style())
table.add_row(priority_text)
```

## Project-Specific Vocabulary

- **XP**: Experience points earned when completing tasks (stored in `User.total_xp`)
- **Score**: Calculated point value for incomplete tasks (affects sort order)
- **Daily Penalty**: XP deduction for incomplete tasks, tracked per-day
- **Backend**: Data persistence implementation (JSON or SQLite)
- **Manager**: Instance of `DataManager` interface

## File Modification Guidelines

When changing core models (`models.py`):
1. Update serialization logic in BOTH `JsonDataManager` and `DatabaseDataManager`
2. Update all relevant test fixtures in `conftest.py`
3. Add migration logic if schema changes (or note breaking change)

When adding CLI commands (`cli/main.py`):
1. Add handler function: `handle_<command>(args, manager, user)`
2. Register in `main()` with `subparsers.add_parser()`
3. Create comprehensive test file: `tests/test_cli_<command>.py`

## Key Dependencies

- `rich`: Console output styling (tables, colors, emojis)
- `pytest` + `pytest-mock`: Testing framework
- `poetry` + `poethepoet`: Dependency and task management
- `mypy`, `pylint`, `black`, `isort`: Code quality tools

All managed via `pyproject.toml` - add new dependencies with `poetry add <package>`.
