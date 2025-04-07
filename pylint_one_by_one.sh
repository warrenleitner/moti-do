set -e

poetry run pytest

poetry run pylint src/motido/__init__.py --fail-on=W --fail-under=10
poetry run pylint src/motido/cli/__init__.py  --fail-on=W --fail-under=10
poetry run pylint src/motido/cli/main.py  --fail-on=W --fail-under=10
poetry run pylint src/motido/core/__init__.py  --fail-on=W --fail-under=10
poetry run pylint src/motido/core/models.py  --fail-on=W --fail-under=10
poetry run pylint src/motido/core/utils.py  --fail-on=W --fail-under=10
poetry run pylint src/motido/data/__init__.py  --fail-on=W --fail-under=10
poetry run pylint src/motido/data/abstraction.py  --fail-on=W --fail-under=10
poetry run pylint src/motido/data/backend_factory.py  --fail-on=W --fail-under=10
poetry run pylint src/motido/data/config.py  --fail-on=W --fail-under=10
poetry run pylint src/motido/data/database_manager.py  --fail-on=W --fail-under=10
poetry run pylint src/motido/data/json_manager.py  --fail-on=W --fail-under=10
poetry run pylint tests/conftest.py  --fail-on=W --fail-under=10
poetry run pylint tests/test_backend_factory.py  --fail-on=W --fail-under=10
poetry run pylint tests/test_cli_main.py  --fail-on=W --fail-under=10
poetry run pylint tests/test_config.py  --fail-on=W --fail-under=10
poetry run pylint tests/test_database_manager.py  --fail-on=W --fail-under=10
poetry run pylint tests/test_json_manager.py  --fail-on=W --fail-under=10
poetry run pylint tests/test_json_manager_update.py  --fail-on=W --fail-under=10
poetry run pylint tests/test_models.py  --fail-on=W --fail-under=10
poetry run pylint tests/test_utils.py  --fail-on=W --fail-under=10