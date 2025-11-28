"""Tests for coverage of view commands."""

# pylint: disable=consider-using-with

from datetime import datetime, timedelta
from typing import Any
from unittest.mock import MagicMock, patch

from rich.console import Console

from motido.cli.main import Namespace, handle_view
from motido.cli.views import render_dependency_graph, render_kanban
from motido.core.models import Priority, Task, User
from motido.data.abstraction import DEFAULT_USERNAME, DataManager


def create_mock_args(**kwargs: Any) -> Namespace:
    """Create a mock argparse Namespace."""
    defaults = {"id": None, "view_mode": None, "verbose": False}
    defaults.update(kwargs)
    return Namespace(**defaults)


def test_render_dependency_graph_cycle() -> None:
    """Test render_dependency_graph with a cycle (no roots)."""
    console = Console(file=open("/dev/null", "w", encoding="utf-8"))
    t1 = Task(title="A", id="a", dependencies=["b"], creation_date=datetime.now())
    t2 = Task(title="B", id="b", dependencies=["a"], creation_date=datetime.now())

    # This should hit 'if not roots:'
    render_dependency_graph([t1, t2], console)


def test_render_dependency_graph_complete_child() -> None:
    """Test render_dependency_graph with a complete child task."""
    console = Console(file=open("/dev/null", "w", encoding="utf-8"))
    t1 = Task(title="Root", id="root", creation_date=datetime.now(), is_complete=True)
    t2 = Task(
        title="Child",
        id="child",
        dependencies=["root"],
        is_complete=True,
        creation_date=datetime.now(),
    )

    # This should hit 'if child_task.is_complete:' AND 'if root.is_complete:'
    render_dependency_graph([t1, t2], console)


def test_handle_view_legacy_missing_fields(capsys: Any) -> None:
    """Test handle_view with a task missing optional fields."""
    user = User(username=DEFAULT_USERNAME)
    # Task with NO optional fields set
    task = Task(title="Minimal", id="min", creation_date=datetime.now())
    user.tasks = [task]

    args = create_mock_args(id="min")
    mock_manager = MagicMock(spec=DataManager)

    with patch("motido.cli.main.calculate_score", return_value=None):
        handle_view(args, mock_manager, user)

    captured = capsys.readouterr()
    # Verify output contains "Not set" for various fields
    assert (
        "Due Date:     Not set" in captured.out
        or "Due Date:     Not set" in captured.out.replace("\t", "    ")
    )
    # Actually rich table formatting might add spaces.
    assert "Not set" in captured.out


def test_render_kanban_basic() -> None:
    """Test render_kanban with various task states."""
    console = Console(file=open("/dev/null", "w", encoding="utf-8"))
    today = datetime.now()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)

    # Task in backlog (future start date)
    backlog_task = Task(
        title="Backlog",
        id="backlog",
        creation_date=today,
        start_date=tomorrow,
        priority=Priority.LOW,
    )

    # Task in to do (no dates, not complete)
    todo_task = Task(
        title="To Do",
        id="todo",
        creation_date=today,
        priority=Priority.MEDIUM,
    )

    # Task in progress (start date passed)
    in_progress_task = Task(
        title="In Progress",
        id="inprog",
        creation_date=yesterday,
        start_date=yesterday,
        priority=Priority.HIGH,
    )

    # Blocked task (dependency incomplete)
    blocked_task = Task(
        title="Blocked",
        id="blocked",
        creation_date=today,
        dependencies=["todo"],
        priority=Priority.HIGH,
    )

    # Done task
    done_task = Task(
        title="Done",
        id="done",
        creation_date=yesterday,
        is_complete=True,
        priority=Priority.LOW,
    )

    tasks = [backlog_task, todo_task, in_progress_task, blocked_task, done_task]
    render_kanban(tasks, console)


def test_render_kanban_empty() -> None:
    """Test render_kanban with no tasks."""
    console = Console(file=open("/dev/null", "w", encoding="utf-8"))
    render_kanban([], console)


def test_render_kanban_with_due_date() -> None:
    """Test render_kanban shows due date in task label."""
    console = Console(file=open("/dev/null", "w", encoding="utf-8"))
    tomorrow = datetime.now() + timedelta(days=1)

    task = Task(
        title="With Due",
        id="withdue",
        creation_date=datetime.now(),
        due_date=tomorrow,
        priority=Priority.HIGH,
    )

    render_kanban([task], console)


def test_render_kanban_backlog_due_date_future() -> None:
    """Test that task with future due date but no start date goes to backlog."""
    console = Console(file=open("/dev/null", "w", encoding="utf-8"))
    future = datetime.now() + timedelta(days=7)

    task = Task(
        title="Future Due",
        id="futuredue",
        creation_date=datetime.now(),
        due_date=future,  # No start date but future due
        priority=Priority.MEDIUM,
    )

    # This should go to Backlog
    render_kanban([task], console)
