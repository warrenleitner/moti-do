"""Tests for dependency-aware task filtering in list command."""

from argparse import Namespace
from datetime import datetime
from typing import Any

from pytest_mock import MockerFixture

from motido.cli import main as cli_main
from motido.cli.main import _is_task_blocked
from motido.core.models import Task, User


class TestIsTaskBlocked:
    """Tests for the _is_task_blocked helper function."""

    def test_task_with_no_dependencies_not_blocked(self) -> None:
        """Test that a task with no dependencies is not blocked."""
        task = Task(title="Independent task", creation_date=datetime.now())
        all_tasks = [task]
        assert _is_task_blocked(task, all_tasks) is False

    def test_task_with_completed_dependency_not_blocked(self) -> None:
        """Test that a task with completed dependencies is not blocked."""
        dep_task = Task(
            title="Dependency task", creation_date=datetime.now(), is_complete=True
        )
        task = Task(
            title="Dependent task",
            creation_date=datetime.now(),
            dependencies=[dep_task.id],
        )
        all_tasks = [dep_task, task]
        assert _is_task_blocked(task, all_tasks) is False

    def test_task_with_incomplete_dependency_is_blocked(self) -> None:
        """Test that a task with incomplete dependencies is blocked."""
        dep_task = Task(
            title="Dependency task", creation_date=datetime.now(), is_complete=False
        )
        task = Task(
            title="Dependent task",
            creation_date=datetime.now(),
            dependencies=[dep_task.id],
        )
        all_tasks = [dep_task, task]
        assert _is_task_blocked(task, all_tasks) is True

    def test_task_with_missing_dependency_not_blocked(self) -> None:
        """Test that a task with a missing dependency is not blocked."""
        task = Task(
            title="Dependent task",
            creation_date=datetime.now(),
            dependencies=["nonexistent-id"],
        )
        all_tasks = [task]
        assert _is_task_blocked(task, all_tasks) is False

    def test_task_with_mixed_dependencies(self) -> None:
        """Test task with one complete and one incomplete dependency."""
        dep_complete = Task(
            title="Complete dep", creation_date=datetime.now(), is_complete=True
        )
        dep_incomplete = Task(
            title="Incomplete dep", creation_date=datetime.now(), is_complete=False
        )
        task = Task(
            title="Dependent task",
            creation_date=datetime.now(),
            dependencies=[dep_complete.id, dep_incomplete.id],
        )
        all_tasks = [dep_complete, dep_incomplete, task]
        assert _is_task_blocked(task, all_tasks) is True


class TestHandleListDependencyFilter:
    """Tests for dependency filtering in handle_list."""

    def test_list_hides_blocked_tasks_by_default(
        self, mocker: MockerFixture, capsys: Any
    ) -> None:
        """Test that blocked tasks are hidden by default."""
        mock_manager = mocker.MagicMock()
        dep_task = Task(
            title="Dependency task", creation_date=datetime.now(), is_complete=False
        )
        blocked_task = Task(
            title="Blocked task",
            creation_date=datetime.now(),
            dependencies=[dep_task.id],
        )
        unblocked_task = Task(title="Unblocked task", creation_date=datetime.now())

        user = User(username="testuser")
        user.tasks = [dep_task, blocked_task, unblocked_task]

        args = Namespace(
            verbose=False,
            sort_by=None,
            sort_order="asc",
            include_blocked=False,
        )

        cli_main.handle_list(args, mock_manager, user)
        captured = capsys.readouterr()

        # Verify the correct number of tasks shown and blocked message
        assert "Shown tasks: 2" in captured.out
        assert "Total: 3" in captured.out
        assert "1 blocked tasks hidden" in captured.out
        assert "--include-blocked" in captured.out

    def test_list_shows_blocked_tasks_with_flag(
        self, mocker: MockerFixture, capsys: Any
    ) -> None:
        """Test that blocked tasks are shown when --include-blocked is set."""
        mock_manager = mocker.MagicMock()
        dep_task = Task(
            title="Dependency task", creation_date=datetime.now(), is_complete=False
        )
        blocked_task = Task(
            title="Blocked task",
            creation_date=datetime.now(),
            dependencies=[dep_task.id],
        )
        unblocked_task = Task(title="Unblocked task", creation_date=datetime.now())

        user = User(username="testuser")
        user.tasks = [dep_task, blocked_task, unblocked_task]

        args = Namespace(
            verbose=False,
            sort_by=None,
            sort_order="asc",
            include_blocked=True,
        )

        cli_main.handle_list(args, mock_manager, user)
        captured = capsys.readouterr()

        # Should show all tasks including blocked (Total tasks, no blocked message)
        assert "Total tasks: 3" in captured.out
        assert "blocked tasks hidden" not in captured.out
        assert "[B]" in captured.out  # Blocked indicator

    def test_list_shows_total_when_no_blocked_tasks(
        self, mocker: MockerFixture, capsys: Any
    ) -> None:
        """Test that normal total is shown when no blocked tasks."""
        mock_manager = mocker.MagicMock()
        task1 = Task(title="Task 1", creation_date=datetime.now())
        task2 = Task(title="Task 2", creation_date=datetime.now())

        user = User(username="testuser")
        user.tasks = [task1, task2]

        args = Namespace(
            verbose=False,
            sort_by=None,
            sort_order="asc",
            include_blocked=False,
        )

        cli_main.handle_list(args, mock_manager, user)
        captured = capsys.readouterr()

        assert "Total tasks: 2" in captured.out
        assert "blocked" not in captured.out.lower()

    def test_list_handles_missing_include_blocked_attr(
        self, mocker: MockerFixture, capsys: Any
    ) -> None:
        """Test backward compatibility when include_blocked attr is missing."""
        mock_manager = mocker.MagicMock()
        dep_task = Task(
            title="Dependency task", creation_date=datetime.now(), is_complete=False
        )
        blocked_task = Task(
            title="Blocked task",
            creation_date=datetime.now(),
            dependencies=[dep_task.id],
        )

        user = User(username="testuser")
        user.tasks = [dep_task, blocked_task]

        # Args without include_blocked attribute (simulating old behavior)
        args = Namespace(
            verbose=False,
            sort_by=None,
            sort_order="asc",
        )

        cli_main.handle_list(args, mock_manager, user)
        captured = capsys.readouterr()

        # Should hide blocked tasks by default
        assert "Blocked task" not in captured.out
        assert "1 blocked tasks hidden" in captured.out
