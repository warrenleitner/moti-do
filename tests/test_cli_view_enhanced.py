"""
Tests for the enhanced View CLI commands (Calendar, Graph).
"""

# pylint: disable=redefined-outer-name,unused-argument,too-few-public-methods
# pylint: disable=consider-using-with

import argparse
from datetime import datetime, timedelta
from typing import Any, Dict
from unittest.mock import MagicMock, patch

import pytest
from rich.console import Console

from motido.cli.main import handle_view
from motido.cli.views import render_calendar, render_dependency_graph
from motido.core.models import Priority, Task, User
from motido.data.abstraction import DEFAULT_USERNAME, DataManager


def create_mock_args(**kwargs: Any) -> argparse.Namespace:
    """Create a mock argparse Namespace."""
    # Ensure defaults for view command
    defaults: Dict[str, Any] = {
        "id": None,
        "view_mode": None,
        "verbose": False,
        "status": "all",
        "project": None,
        "tag": None,
    }
    defaults.update(kwargs)
    return argparse.Namespace(**defaults)


@pytest.fixture
def sample_user_with_tasks() -> User:
    """Create a user with some tasks for viewing."""
    user = User(username=DEFAULT_USERNAME)

    today = datetime.now()
    tomorrow = today + timedelta(days=1)

    task1 = Task(
        id="t1",
        title="Task 1",
        creation_date=today,
        due_date=tomorrow,
        priority=Priority.HIGH,
    )
    task2 = Task(
        id="t2",
        title="Task 2",
        creation_date=today,
        dependencies=["t1"],  # t2 depends on t1
        priority=Priority.LOW,
    )

    user.tasks = [task1, task2]
    return user


def test_handle_view_calendar(sample_user_with_tasks: User) -> None:
    """Test viewing calendar."""
    args = create_mock_args(view_mode="calendar")
    mock_manager = MagicMock(spec=DataManager)

    with patch("motido.cli.views.render_calendar") as mock_render:
        handle_view(args, mock_manager, sample_user_with_tasks)
        mock_render.assert_called_once()
        # Verify arguments passed to render_calendar
        # args: (tasks, console)
        call_args = mock_render.call_args
        assert call_args[0][0] == sample_user_with_tasks.tasks


def test_handle_view_graph(sample_user_with_tasks: User) -> None:
    """Test viewing dependency graph."""
    args = create_mock_args(view_mode="graph")
    mock_manager = MagicMock(spec=DataManager)

    with patch("motido.cli.views.render_dependency_graph") as mock_render:
        handle_view(args, mock_manager, sample_user_with_tasks)
        mock_render.assert_called_once()
        call_args = mock_render.call_args
        assert call_args[0][0] == sample_user_with_tasks.tasks


def test_handle_view_legacy_id(sample_user_with_tasks: User, capsys: Any) -> None:
    """Test legacy view with --id."""
    args = create_mock_args(id="t1")
    mock_manager = MagicMock(spec=DataManager)

    # Mock calculate_score to avoid config loading issues
    with patch("motido.cli.main.calculate_score", return_value=100):
        # We expect output to stdout
        handle_view(args, mock_manager, sample_user_with_tasks)

    captured = capsys.readouterr()
    # assert "Viewing task with ID prefix: 't1'" in captured.out # Only in verbose mode
    # Should show task details
    assert "Task 1" in captured.out
    assert "Title:" in captured.out


def test_handle_view_no_args(capsys: Any) -> None:
    """Test view with no arguments (should fail)."""
    args = create_mock_args()
    mock_manager = MagicMock(spec=DataManager)
    user = User(username=DEFAULT_USERNAME)

    with pytest.raises(SystemExit):
        handle_view(args, mock_manager, user)

    captured = capsys.readouterr()
    assert (
        "Error: Please provide a task ID prefix using --id, or use a subcommand"
        in captured.out
    )


def test_render_calendar_execution(sample_user_with_tasks: User) -> None:
    """Test that render_calendar runs without error."""
    console = Console(file=open("/dev/null", "w", encoding="utf-8"))
    render_calendar(sample_user_with_tasks.tasks, console)

    # Test with no tasks
    render_calendar([], console)

    # Test with task without date
    task_no_date = Task(title="No Date", id="t3", creation_date=datetime.now())
    render_calendar([task_no_date], console)


def test_render_dependency_graph_execution(sample_user_with_tasks: User) -> None:
    """Test that render_dependency_graph runs without error."""
    console = Console(file=open("/dev/null", "w", encoding="utf-8"))
    render_dependency_graph(sample_user_with_tasks.tasks, console)

    # Test with no tasks
    render_dependency_graph([], console)

    # Test with cycle (should handle gracefully or at least not crash)
    t1 = Task(title="A", id="a", dependencies=["b"], creation_date=datetime.now())
    t2 = Task(title="B", id="b", dependencies=["a"], creation_date=datetime.now())
    render_dependency_graph([t1, t2], console)

    # Test with complete dependency
    t3 = Task(title="C", id="c", creation_date=datetime.now())
    t4 = Task(
        title="D",
        id="d",
        dependencies=["c"],
        creation_date=datetime.now(),
        is_complete=True,
    )
    # t3 is root. t4 depends on t3.
    # Wait, t4 depends on t3. So t3 is prerequisite.
    # In my graph logic: Roots are tasks with NO dependencies.
    # So t3 is root. t4 is child of t3.
    # t4 is complete.
    render_dependency_graph([t3, t4], console)


def test_render_calendar_coverage(sample_user_with_tasks: User) -> None:
    """Test render_calendar coverage cases."""
    console = Console(file=open("/dev/null", "w", encoding="utf-8"))

    # Task with start date but no due date
    t1 = Task(
        title="Start Only",
        id="s1",
        start_date=datetime.now(),
        creation_date=datetime.now(),
    )

    # Task with due date
    t2 = Task(
        title="Due Only", id="d1", due_date=datetime.now(), creation_date=datetime.now()
    )

    render_calendar([t1, t2], console)


def test_handle_view_legacy_minimal_task(capsys: Any) -> None:
    """Test legacy view with a task that has minimal fields set."""
    user = User(username=DEFAULT_USERNAME)
    task = Task(title="Minimal", id="min", creation_date=datetime.now())
    user.tasks = [task]

    args = create_mock_args(id="min")
    mock_manager = MagicMock(spec=DataManager)

    with patch("motido.cli.main.calculate_score", return_value=None):
        handle_view(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "Minimal" in captured.out
    assert "Not set" in captured.out


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


def test_render_dependency_graph_cycle_recursion() -> None:
    """Test render_dependency_graph with a cycle to hit recursion check."""
    console = Console(file=open("/dev/null", "w", encoding="utf-8"))
    # A -> B -> A
    t1 = Task(title="A", id="a", dependencies=["b"], creation_date=datetime.now())
    t2 = Task(title="B", id="b", dependencies=["a"], creation_date=datetime.now())

    # This will call _add_children for 'a' then 'b' then 'a' again.
    # The second 'a' should hit 'if task_id in processed: return'
    # But wait, render_dependency_graph iterates roots.
    # If there are no roots (cycle), it prints warning and returns.
    # So we need a root that points to a cycle?
    # Root -> A -> B -> A

    root = Task(title="Root", id="root", creation_date=datetime.now())
    t1 = Task(
        title="A", id="a", dependencies=["root", "b"], creation_date=datetime.now()
    )
    t2 = Task(title="B", id="b", dependencies=["a"], creation_date=datetime.now())

    # Root is a root because it has no dependencies.
    # A depends on Root (and B).
    # B depends on A.

    render_dependency_graph([root, t1, t2], console)


def test_handle_view_legacy_coverage(capsys: Any) -> None:
    """Test handle_view legacy mode coverage for due dates and tags."""
    user = User(username=DEFAULT_USERNAME)
    today = datetime.now()

    # Task overdue
    t1 = Task(
        title="Overdue",
        id="over",
        due_date=today - timedelta(days=1),
        creation_date=today,
    )

    # Task due soon
    t2 = Task(
        title="Soon", id="soon", due_date=today + timedelta(days=1), creation_date=today
    )

    # Task due later
    t3 = Task(
        title="Later",
        id="later",
        due_date=today + timedelta(days=10),
        creation_date=today,
    )

    # Task with tags and project
    t4 = Task(
        title="Full", id="full", tags=["tag1"], project="proj1", creation_date=today
    )

    user.tasks = [t1, t2, t3, t4]
    mock_manager = MagicMock(spec=DataManager)

    with patch("motido.cli.main.calculate_score", return_value=None):
        # View overdue
        args = create_mock_args(id="over")
        handle_view(args, mock_manager, user)

        # View soon
        args = create_mock_args(id="soon")
        handle_view(args, mock_manager, user)

        # View later
        args = create_mock_args(id="later")
        handle_view(args, mock_manager, user)

        # View full
        args = create_mock_args(id="full")
        handle_view(args, mock_manager, user)


def test_handle_view_legacy_start_date(capsys: Any) -> None:
    """Test handle_view legacy mode coverage for start date."""
    user = User(username=DEFAULT_USERNAME)
    today = datetime.now()

    # Task with start date
    t1 = Task(title="Start", id="start", start_date=today, creation_date=today)

    user.tasks = [t1]
    mock_manager = MagicMock(spec=DataManager)

    with patch("motido.cli.main.calculate_score", return_value=None):
        args = create_mock_args(id="start")
        handle_view(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "Start Date:" in captured.out
    # Should verify the date is printed
    assert today.strftime("%Y-%m-%d") in captured.out


# --- View Filtering Tests ---


@pytest.fixture
def user_with_filtered_tasks() -> User:
    """Create a user with tasks for filter testing."""
    user = User(username=DEFAULT_USERNAME)

    today = datetime.now()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)

    # Active task (not complete, started)
    task1 = Task(
        id="active-1",
        title="Active Task",
        creation_date=yesterday,
        start_date=yesterday,
        is_complete=False,
        project="Project A",
        tags=["urgent", "work"],
    )
    # Completed task
    task2 = Task(
        id="completed-1",
        title="Completed Task",
        creation_date=yesterday,
        is_complete=True,
        project="Project B",
        tags=["done"],
    )
    # Future task (start date in future)
    task3 = Task(
        id="future-1",
        title="Future Task",
        creation_date=today,
        start_date=tomorrow,
        is_complete=False,
        project="Project A",
        tags=["planning"],
    )
    # Active task without project
    task4 = Task(
        id="active-2",
        title="No Project Task",
        creation_date=yesterday,
        is_complete=False,
        tags=["urgent"],
    )

    user.add_task(task1)
    user.add_task(task2)
    user.add_task(task3)
    user.add_task(task4)

    return user


def test_filter_by_status_active(user_with_filtered_tasks: User, capsys: Any) -> None:
    """Test filtering view by active status."""
    mock_manager = MagicMock(spec=DataManager)
    args = create_mock_args(view_mode="calendar", status="active")

    handle_view(args, mock_manager, user_with_filtered_tasks)

    captured = capsys.readouterr()
    assert "Active Task" in captured.out
    assert "No Project Task" in captured.out
    assert "Completed Task" not in captured.out
    assert "Future Task" not in captured.out


def test_filter_by_status_completed(
    user_with_filtered_tasks: User, capsys: Any
) -> None:
    """Test filtering view by completed status."""
    mock_manager = MagicMock(spec=DataManager)
    args = create_mock_args(view_mode="calendar", status="completed")

    handle_view(args, mock_manager, user_with_filtered_tasks)

    captured = capsys.readouterr()
    assert "Completed Task" in captured.out
    assert "Active Task" not in captured.out
    assert "Future Task" not in captured.out


def test_filter_by_status_future(user_with_filtered_tasks: User, capsys: Any) -> None:
    """Test filtering view by future status."""
    mock_manager = MagicMock(spec=DataManager)
    args = create_mock_args(view_mode="calendar", status="future")

    handle_view(args, mock_manager, user_with_filtered_tasks)

    captured = capsys.readouterr()
    assert "Future Task" in captured.out
    assert "Active Task" not in captured.out
    assert "Completed Task" not in captured.out


def test_filter_by_project(user_with_filtered_tasks: User, capsys: Any) -> None:
    """Test filtering view by project name."""
    mock_manager = MagicMock(spec=DataManager)
    args = create_mock_args(view_mode="calendar", project="Project A")

    handle_view(args, mock_manager, user_with_filtered_tasks)

    captured = capsys.readouterr()
    assert "Active Task" in captured.out
    assert "Future Task" in captured.out
    assert "Completed Task" not in captured.out
    assert "No Project Task" not in captured.out


def test_filter_by_project_case_insensitive(
    user_with_filtered_tasks: User, capsys: Any
) -> None:
    """Test filtering by project is case-insensitive."""
    mock_manager = MagicMock(spec=DataManager)
    args = create_mock_args(view_mode="calendar", project="project a")

    handle_view(args, mock_manager, user_with_filtered_tasks)

    captured = capsys.readouterr()
    assert "Active Task" in captured.out
    assert "Future Task" in captured.out


def test_filter_by_tag(user_with_filtered_tasks: User, capsys: Any) -> None:
    """Test filtering view by tag name."""
    mock_manager = MagicMock(spec=DataManager)
    args = create_mock_args(view_mode="calendar", tag="urgent")

    handle_view(args, mock_manager, user_with_filtered_tasks)

    captured = capsys.readouterr()
    assert "Active Task" in captured.out
    assert "No Project Task" in captured.out
    assert "Completed Task" not in captured.out
    assert "Future Task" not in captured.out


def test_filter_by_tag_case_insensitive(
    user_with_filtered_tasks: User, capsys: Any
) -> None:
    """Test filtering by tag is case-insensitive."""
    mock_manager = MagicMock(spec=DataManager)
    args = create_mock_args(view_mode="calendar", tag="URGENT")

    handle_view(args, mock_manager, user_with_filtered_tasks)

    captured = capsys.readouterr()
    assert "Active Task" in captured.out
    assert "No Project Task" in captured.out


def test_filter_combined_status_and_project(
    user_with_filtered_tasks: User, capsys: Any
) -> None:
    """Test combining status and project filters."""
    mock_manager = MagicMock(spec=DataManager)
    args = create_mock_args(view_mode="calendar", status="active", project="Project A")

    handle_view(args, mock_manager, user_with_filtered_tasks)

    captured = capsys.readouterr()
    assert "Active Task" in captured.out
    assert "Future Task" not in captured.out  # Future, not active
    assert "Completed Task" not in captured.out
    assert "No Project Task" not in captured.out  # No project


def test_filter_combined_all(user_with_filtered_tasks: User, capsys: Any) -> None:
    """Test combining all three filters."""
    mock_manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        view_mode="calendar", status="active", project="Project A", tag="work"
    )

    handle_view(args, mock_manager, user_with_filtered_tasks)

    captured = capsys.readouterr()
    assert "Active Task" in captured.out
    assert "Future Task" not in captured.out
    assert "No Project Task" not in captured.out


def test_filter_graph_view(user_with_filtered_tasks: User, capsys: Any) -> None:
    """Test that filtering works with graph view too."""
    mock_manager = MagicMock(spec=DataManager)
    args = create_mock_args(view_mode="graph", status="completed")

    handle_view(args, mock_manager, user_with_filtered_tasks)

    captured = capsys.readouterr()
    # Graph should only show completed task
    assert "Completed Task" in captured.out


def test_filter_no_matches(user_with_filtered_tasks: User, capsys: Any) -> None:
    """Test filtering that results in no matches."""
    mock_manager = MagicMock(spec=DataManager)
    args = create_mock_args(view_mode="calendar", project="Nonexistent Project")

    handle_view(args, mock_manager, user_with_filtered_tasks)

    captured = capsys.readouterr()
    # Should still render calendar but with no tasks
    assert "Calendar" in captured.out
    assert "Active Task" not in captured.out
