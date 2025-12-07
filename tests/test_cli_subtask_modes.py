"""Tests for subtask display modes in list command."""

from argparse import Namespace
from datetime import datetime
from typing import Any

from pytest_mock import MockerFixture

from motido.cli import main as cli_main
from motido.core.models import Task, User


class TestSubtaskDisplayModes:
    """Tests for --subtask-mode option in list command."""

    def test_list_subtask_mode_hidden(self, mocker: MockerFixture, capsys: Any) -> None:
        """Test that subtasks are hidden by default."""
        mock_manager = mocker.MagicMock()
        task = Task(
            title="Main task",
            creation_date=datetime.now(),
            subtasks=[
                {"text": "Subtask 1", "complete": False},
                {"text": "Subtask 2", "complete": True},
            ],
        )

        user = User(username="testuser")
        user.tasks = [task]

        args = Namespace(
            verbose=False,
            sort_by=None,
            sort_order="asc",
            include_blocked=False,
            subtask_mode="hidden",
        )

        cli_main.handle_list(args, mock_manager, user)
        captured = capsys.readouterr()

        # Subtask index marker should not be shown
        assert "└─1" not in captured.out
        assert "└─2" not in captured.out
        assert "Total tasks: 1" in captured.out

    def test_list_subtask_mode_inline(self, mocker: MockerFixture, capsys: Any) -> None:
        """Test that subtasks are shown inline (indented)."""
        mock_manager = mocker.MagicMock()
        task = Task(
            title="Main task",
            creation_date=datetime.now(),
            subtasks=[
                {"text": "Subtask 1", "complete": False},
                {"text": "Subtask 2", "complete": True},
            ],
        )

        user = User(username="testuser")
        user.tasks = [task]

        args = Namespace(
            verbose=False,
            sort_by=None,
            sort_order="asc",
            include_blocked=False,
            subtask_mode="inline",
        )

        cli_main.handle_list(args, mock_manager, user)
        captured = capsys.readouterr()

        # Subtask index markers should be shown
        assert "└─1" in captured.out
        assert "└─2" in captured.out

    def test_list_subtask_mode_expanded(
        self, mocker: MockerFixture, capsys: Any
    ) -> None:
        """Test that subtasks are shown expanded (as separate rows)."""
        mock_manager = mocker.MagicMock()
        task = Task(
            title="Main task",
            creation_date=datetime.now(),
            subtasks=[
                {"text": "Subtask A", "complete": False},
                {"text": "Subtask B", "complete": True},
            ],
        )

        user = User(username="testuser")
        user.tasks = [task]

        args = Namespace(
            verbose=False,
            sort_by=None,
            sort_order="asc",
            include_blocked=False,
            subtask_mode="expanded",
        )

        cli_main.handle_list(args, mock_manager, user)
        captured = capsys.readouterr()

        # Subtask index markers should be shown
        assert "└─1" in captured.out
        assert "└─2" in captured.out

    def test_list_subtask_mode_with_optional_columns(
        self, mocker: MockerFixture, capsys: Any
    ) -> None:
        """Test subtask display with optional columns (due_date, etc)."""
        mock_manager = mocker.MagicMock()
        task = Task(
            title="Task",
            creation_date=datetime.now(),
            due_date=datetime.now(),
            start_date=datetime.now(),
            tags=["work"],
            project="X",
            subtasks=[
                {"text": "Sub", "complete": False},
            ],
        )

        user = User(username="testuser")
        user.tasks = [task]

        args = Namespace(
            verbose=False,
            sort_by=None,
            sort_order="asc",
            include_blocked=False,
            subtask_mode="inline",
        )

        cli_main.handle_list(args, mock_manager, user)
        captured = capsys.readouterr()

        # Should have output and not error - verifies code path with optional columns
        assert "Total tasks: 1" in captured.out

    def test_list_task_without_subtasks(
        self, mocker: MockerFixture, capsys: Any
    ) -> None:
        """Test listing task without subtasks in inline mode."""
        mock_manager = mocker.MagicMock()
        task = Task(
            title="Task without subtasks",
            creation_date=datetime.now(),
            subtasks=[],
        )

        user = User(username="testuser")
        user.tasks = [task]

        args = Namespace(
            verbose=False,
            sort_by=None,
            sort_order="asc",
            include_blocked=False,
            subtask_mode="inline",
        )

        cli_main.handle_list(args, mock_manager, user)
        captured = capsys.readouterr()

        # No subtask index marker should be shown (no subtasks)
        assert "└─1" not in captured.out
        assert "Total tasks: 1" in captured.out

    def test_list_subtask_mode_default_hidden(
        self, mocker: MockerFixture, capsys: Any
    ) -> None:
        """Test that subtask_mode defaults to hidden when not specified."""
        mock_manager = mocker.MagicMock()
        task = Task(
            title="Main task",
            creation_date=datetime.now(),
            subtasks=[
                {"text": "Subtask", "complete": False},
            ],
        )

        user = User(username="testuser")
        user.tasks = [task]

        # Don't include subtask_mode in args
        args = Namespace(
            verbose=False,
            sort_by=None,
            sort_order="asc",
            include_blocked=False,
        )

        cli_main.handle_list(args, mock_manager, user)
        captured = capsys.readouterr()

        # Subtasks should be hidden by default
        assert "└─1" not in captured.out
