"""
Tests for CLI project command (project set/clear).
"""

# pylint: disable=redefined-outer-name,unused-argument,too-few-public-methods

import argparse
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from motido.cli.main import handle_project
from motido.core.models import Task, User


class MockArgs(argparse.Namespace):
    """Mock CLI arguments - inherits from Namespace for type safety."""

    def __init__(self, **kwargs: object) -> None:
        super().__init__()
        self.__dict__.update(kwargs)


@pytest.fixture
def mock_user() -> User:
    """Create a mock user with test tasks."""
    user = User(username="test_user")
    user.tasks = [
        Task(
            title="Task A",
            creation_date=datetime(2023, 1, 1, 12, 0, 0),
            id="uuid-a",
            project="ExistingProject",
        ),
        Task(
            title="Task B",
            creation_date=datetime(2023, 1, 2, 12, 0, 0),
            id="uuid-b",
            project=None,
        ),
    ]
    return user


# --- Project Set Tests ---


@patch("builtins.print")
def test_handle_project_set_new_project(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting a new project on a task."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-b", project="NewProject", clear=False, verbose=False)

    handle_project(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-b")
    assert task is not None
    assert task.project == "NewProject"
    mock_print.assert_called_with("Set project to 'NewProject' for task 'Task B'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_project_update_existing_project(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test updating an existing project on a task."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", project="UpdatedProject", clear=False, verbose=False)

    handle_project(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    assert task.project == "UpdatedProject"
    mock_print.assert_called_with("Set project to 'UpdatedProject' for task 'Task A'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_project_with_spaces(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting a project with spaces."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-b", project="My Project Name", clear=False, verbose=False)

    handle_project(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-b")
    assert task is not None
    assert task.project == "My Project Name"
    mock_print.assert_called_with("Set project to 'My Project Name' for task 'Task B'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_project_with_dashes(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting a project with dashes."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-b", project="my-project-name", clear=False, verbose=False)

    handle_project(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-b")
    assert task is not None
    assert task.project == "my-project-name"
    mock_print.assert_called_with("Set project to 'my-project-name' for task 'Task B'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_project_with_underscores(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting a project with underscores."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-b", project="my_project_name", clear=False, verbose=False)

    handle_project(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-b")
    assert task is not None
    assert task.project == "my_project_name"
    mock_print.assert_called_with("Set project to 'my_project_name' for task 'Task B'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_project_with_whitespace(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting a project with leading/trailing whitespace gets stripped."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-b", project="  ProjectName  ", clear=False, verbose=False)

    handle_project(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-b")
    assert task is not None
    assert task.project == "ProjectName"
    assert task.project != "  ProjectName  "
    mock_print.assert_called_with("Set project to 'ProjectName' for task 'Task B'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


# --- Project Clear Tests ---


@patch("builtins.print")
def test_handle_project_clear_existing_project(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test clearing an existing project from a task."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", project=None, clear=True, verbose=False)

    handle_project(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    assert task.project is None
    mock_print.assert_called_with("Cleared project for task 'Task A'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_project_clear_when_no_project(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test clearing project when task has no project."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-b", project=None, clear=True, verbose=False)

    handle_project(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-b")
    assert task is not None
    assert task.project is None
    mock_print.assert_called_with("Cleared project for task 'Task B'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


# --- Validation Tests ---


@patch("builtins.print")
def test_handle_project_invalid_characters(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting a project with invalid characters."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-b", project="Project@#$", clear=False, verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_project(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with(
        "Error: Project name must contain only alphanumeric characters, spaces, dashes, and underscores."
    )
    mock_manager.save_user.assert_not_called()


@patch("builtins.print")
def test_handle_project_no_project_no_clear(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test project command without project name or clear flag."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-b", project=None, clear=False, verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_project(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with(
        "Error: Please provide a project name or use --clear to remove the project."
    )
    mock_manager.save_user.assert_not_called()


# --- Error Handling Tests ---


@patch("builtins.print")
def test_handle_project_task_not_found(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test project command with non-existent task ID."""
    mock_manager = MagicMock()
    args = MockArgs(id="nonexistent", project="Project", clear=False, verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_project(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("Error: Task with ID prefix 'nonexistent' not found.")
    mock_manager.save_user.assert_not_called()


@patch("builtins.print")
def test_handle_project_no_user(  # type: ignore[misc]
    mock_print: MagicMock,
) -> None:
    """Test project command with no user."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", project="Project", clear=False, verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_project(args, mock_manager, None)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("User 'default_user' not found or no data available.")
    mock_manager.save_user.assert_not_called()


@patch("builtins.print")
def test_handle_project_ambiguous_id(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test project command with ambiguous task ID prefix."""
    # Make both tasks have IDs starting with 'uuid-'
    mock_user.tasks[0].id = "uuid-abc"
    mock_user.tasks[1].id = "uuid-abd"

    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", project="Project", clear=False, verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_project(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    assert "Error:" in mock_print.call_args[0][0]
    mock_manager.save_user.assert_not_called()


@patch("builtins.print")
def test_handle_project_save_error(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test project command with save error."""
    mock_manager = MagicMock()
    mock_manager.save_user.side_effect = IOError("Save failed")
    args = MockArgs(id="uuid-b", project="NewProject", clear=False, verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_project(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("Error saving task: Save failed")


@patch("builtins.print")
def test_handle_project_clear_save_error(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test project clear with save error."""
    mock_manager = MagicMock()
    mock_manager.save_user.side_effect = IOError("Save failed")
    args = MockArgs(id="uuid-a", project=None, clear=True, verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_project(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("Error saving task: Save failed")


@patch("builtins.print")
def test_handle_project_generic_exception(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test project command with generic exception."""
    mock_manager = MagicMock()
    mock_manager.save_user.side_effect = RuntimeError("Unexpected error")
    args = MockArgs(id="uuid-b", project="NewProject", clear=False, verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_project(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("Unexpected error: Unexpected error")


@patch("builtins.print")
def test_handle_project_verbose_mode(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test project command in verbose mode."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-b", project="NewProject", clear=False, verbose=True)

    handle_project(args, mock_manager, mock_user)

    # Verbose mode should print debug info
    assert mock_print.call_count >= 2
    mock_manager.save_user.assert_called_once_with(mock_user)
