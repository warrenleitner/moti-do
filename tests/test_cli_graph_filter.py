"""Tests for dependency graph filtering functionality."""

from argparse import Namespace
from datetime import datetime
from io import StringIO
from typing import Any

from pytest_mock import MockerFixture
from rich.console import Console

from motido.cli import main as cli_main
from motido.cli.views import _find_related_tasks, render_dependency_graph
from motido.core.models import Task, User


class TestFindRelatedTasks:
    """Tests for the _find_related_tasks helper function."""

    def test_find_all_related(self) -> None:
        """Test finding all related tasks (both directions)."""
        # Create a chain: A -> B -> C
        task_a = Task(
            id="task_a_id",
            title="Task A",
            creation_date=datetime.now(),
            dependencies=[],
        )
        task_b = Task(
            id="task_b_id",
            title="Task B",
            creation_date=datetime.now(),
            dependencies=["task_a_id"],
        )
        task_c = Task(
            id="task_c_id",
            title="Task C",
            creation_date=datetime.now(),
            dependencies=["task_b_id"],
        )

        task_map = {t.id: t for t in [task_a, task_b, task_c]}
        dependents = {
            "task_a_id": ["task_b_id"],
            "task_b_id": ["task_c_id"],
            "task_c_id": [],
        }

        # From B, should find A (upstream), B (self), C (downstream)
        related = _find_related_tasks("task_b_id", task_map, dependents, "all")

        assert "task_a_id" in related
        assert "task_b_id" in related
        assert "task_c_id" in related

    def test_find_upstream_only(self) -> None:
        """Test finding only upstream (prerequisite) tasks."""
        task_a = Task(
            id="task_a_id",
            title="Task A",
            creation_date=datetime.now(),
            dependencies=[],
        )
        task_b = Task(
            id="task_b_id",
            title="Task B",
            creation_date=datetime.now(),
            dependencies=["task_a_id"],
        )
        task_c = Task(
            id="task_c_id",
            title="Task C",
            creation_date=datetime.now(),
            dependencies=["task_b_id"],
        )

        task_map = {t.id: t for t in [task_a, task_b, task_c]}
        dependents = {
            "task_a_id": ["task_b_id"],
            "task_b_id": ["task_c_id"],
            "task_c_id": [],
        }

        # From B, should find A (upstream) and B (self), NOT C
        related = _find_related_tasks("task_b_id", task_map, dependents, "upstream")

        assert "task_a_id" in related
        assert "task_b_id" in related
        assert "task_c_id" not in related

    def test_find_downstream_only(self) -> None:
        """Test finding only downstream (dependent) tasks."""
        task_a = Task(
            id="task_a_id",
            title="Task A",
            creation_date=datetime.now(),
            dependencies=[],
        )
        task_b = Task(
            id="task_b_id",
            title="Task B",
            creation_date=datetime.now(),
            dependencies=["task_a_id"],
        )
        task_c = Task(
            id="task_c_id",
            title="Task C",
            creation_date=datetime.now(),
            dependencies=["task_b_id"],
        )

        task_map = {t.id: t for t in [task_a, task_b, task_c]}
        dependents = {
            "task_a_id": ["task_b_id"],
            "task_b_id": ["task_c_id"],
            "task_c_id": [],
        }

        # From B, should find B (self) and C (downstream), NOT A
        related = _find_related_tasks("task_b_id", task_map, dependents, "downstream")

        assert "task_a_id" not in related
        assert "task_b_id" in related
        assert "task_c_id" in related

    def test_find_related_with_cycle(self) -> None:
        """Test finding related tasks handles cycles correctly."""
        # Create a cycle: A -> B -> C -> A
        task_a = Task(
            id="task_a_id",
            title="Task A",
            creation_date=datetime.now(),
            dependencies=["task_c_id"],  # A depends on C (creates cycle)
        )
        task_b = Task(
            id="task_b_id",
            title="Task B",
            creation_date=datetime.now(),
            dependencies=["task_a_id"],
        )
        task_c = Task(
            id="task_c_id",
            title="Task C",
            creation_date=datetime.now(),
            dependencies=["task_b_id"],
        )

        task_map = {t.id: t for t in [task_a, task_b, task_c]}
        # Dependents: who depends on this task
        dependents = {
            "task_a_id": ["task_b_id"],  # B depends on A
            "task_b_id": ["task_c_id"],  # C depends on B
            "task_c_id": ["task_a_id"],  # A depends on C (cycle)
        }

        # From B, should find all three in either direction (cycle connects them)
        related = _find_related_tasks("task_b_id", task_map, dependents, "all")

        assert "task_a_id" in related
        assert "task_b_id" in related
        assert "task_c_id" in related


class TestRenderDependencyGraphWithFilter:
    """Tests for render_dependency_graph with filtering."""

    def test_graph_with_task_id_filter(self) -> None:
        """Test graph renders only related tasks when task_id specified."""
        task_a = Task(
            id="task_a_id",
            title="Task A",
            creation_date=datetime.now(),
            dependencies=[],
        )
        task_b = Task(
            id="task_b_id",
            title="Task B",
            creation_date=datetime.now(),
            dependencies=["task_a_id"],
        )
        task_unrelated = Task(
            id="task_x_id",
            title="Unrelated Task",
            creation_date=datetime.now(),
            dependencies=[],
        )

        tasks = [task_a, task_b, task_unrelated]
        output = StringIO()
        console = Console(file=output, force_terminal=True, width=200)

        render_dependency_graph(tasks, console, task_id="task_b", direction="all")

        result = output.getvalue()
        assert "Task A" in result
        assert "Task B" in result
        assert "Unrelated Task" not in result

    def test_graph_with_upstream_direction(self) -> None:
        """Test graph shows only prerequisites when direction is upstream."""
        task_a = Task(
            id="task_a_id",
            title="Task A",
            creation_date=datetime.now(),
            dependencies=[],
        )
        task_b = Task(
            id="task_b_id",
            title="Task B",
            creation_date=datetime.now(),
            dependencies=["task_a_id"],
        )
        task_c = Task(
            id="task_c_id",
            title="Task C",
            creation_date=datetime.now(),
            dependencies=["task_b_id"],
        )

        tasks = [task_a, task_b, task_c]
        output = StringIO()
        console = Console(file=output, force_terminal=True, width=200)

        render_dependency_graph(tasks, console, task_id="task_b", direction="upstream")

        result = output.getvalue()
        assert "Prerequisites of" in result
        assert "Task A" in result
        assert "Task B" in result
        assert "Task C" not in result

    def test_graph_with_downstream_direction(self) -> None:
        """Test graph shows only dependents when direction is downstream."""
        task_a = Task(
            id="task_a_id",
            title="Task A",
            creation_date=datetime.now(),
            dependencies=[],
        )
        task_b = Task(
            id="task_b_id",
            title="Task B",
            creation_date=datetime.now(),
            dependencies=["task_a_id"],
        )
        task_c = Task(
            id="task_c_id",
            title="Task C",
            creation_date=datetime.now(),
            dependencies=["task_b_id"],
        )

        tasks = [task_a, task_b, task_c]
        output = StringIO()
        console = Console(file=output, force_terminal=True, width=200)

        render_dependency_graph(
            tasks, console, task_id="task_b", direction="downstream"
        )

        result = output.getvalue()
        assert "Dependents of" in result
        # Task B becomes the root (A filtered out)
        assert "Task B" in result
        assert "Task C" in result
        # Task A should not appear since it's upstream only
        assert "Task A" not in result

    def test_graph_task_id_not_found(self) -> None:
        """Test error message when task_id doesn't match any task."""
        task = Task(
            id="task_a_id",
            title="Task A",
            creation_date=datetime.now(),
            dependencies=[],
        )

        output = StringIO()
        console = Console(file=output, force_terminal=True, width=200)

        render_dependency_graph([task], console, task_id="nonexistent")

        result = output.getvalue()
        assert "No task found with ID prefix: nonexistent" in result

    def test_graph_multiple_matches_warning(self) -> None:
        """Test warning when task_id prefix matches multiple tasks."""
        task_a = Task(
            id="task_abc123",
            title="Task A",
            creation_date=datetime.now(),
            dependencies=[],
        )
        task_b = Task(
            id="task_abc456",
            title="Task B",
            creation_date=datetime.now(),
            dependencies=[],
        )

        output = StringIO()
        console = Console(file=output, force_terminal=True, width=200)

        render_dependency_graph([task_a, task_b], console, task_id="task_abc")

        result = output.getvalue()
        assert "Multiple tasks match prefix" in result

    def test_graph_without_filter(self) -> None:
        """Test graph shows all tasks when no filter specified."""
        task_a = Task(
            id="task_a_id",
            title="Task A",
            creation_date=datetime.now(),
            dependencies=[],
        )
        task_b = Task(
            id="task_b_id",
            title="Task B",
            creation_date=datetime.now(),
            dependencies=[],
        )

        output = StringIO()
        console = Console(file=output, force_terminal=True, width=200)

        render_dependency_graph([task_a, task_b], console)

        result = output.getvalue()
        assert "Task A" in result
        assert "Task B" in result
        assert "Dependency Graph (Flow: Prerequisite -> Dependent)" in result


class TestHandleViewGraphFilter:
    """Tests for handle_view with graph filtering options."""

    def test_handle_view_graph_with_task_id(  # pylint: disable=unused-argument
        self, mocker: MockerFixture, capsys: Any
    ) -> None:
        """Test handle_view passes task_id to render_dependency_graph."""
        mock_manager = mocker.MagicMock()
        mock_render = mocker.patch("motido.cli.views.render_dependency_graph")

        task = Task(
            id="task123abc",
            title="Test Task",
            creation_date=datetime.now(),
        )
        user = User(username="testuser")
        user.tasks = [task]

        args = Namespace(
            view_mode="graph",
            status="all",
            project=None,
            tag=None,
            graph_task_id="task123",
            graph_direction="all",
        )

        cli_main.handle_view(args, mock_manager, user)

        mock_render.assert_called_once()
        call_args = mock_render.call_args
        assert call_args[0][2] == "task123"  # task_id
        assert call_args[0][3] == "all"  # direction

    def test_handle_view_graph_with_direction(self, mocker: MockerFixture) -> None:
        """Test handle_view passes direction to render_dependency_graph."""
        mock_manager = mocker.MagicMock()
        mock_render = mocker.patch("motido.cli.views.render_dependency_graph")

        task = Task(
            id="task123abc",
            title="Test Task",
            creation_date=datetime.now(),
        )
        user = User(username="testuser")
        user.tasks = [task]

        args = Namespace(
            view_mode="graph",
            status="all",
            project=None,
            tag=None,
            graph_task_id="task123",
            graph_direction="upstream",
        )

        cli_main.handle_view(args, mock_manager, user)

        mock_render.assert_called_once()
        call_args = mock_render.call_args
        assert call_args[0][3] == "upstream"

    def test_handle_view_graph_defaults(self, mocker: MockerFixture) -> None:
        """Test handle_view uses defaults when options not specified."""
        mock_manager = mocker.MagicMock()
        mock_render = mocker.patch("motido.cli.views.render_dependency_graph")

        task = Task(
            id="task123abc",
            title="Test Task",
            creation_date=datetime.now(),
        )
        user = User(username="testuser")
        user.tasks = [task]

        # Namespace without graph_task_id and graph_direction
        args = Namespace(
            view_mode="graph",
            status="all",
            project=None,
            tag=None,
        )

        cli_main.handle_view(args, mock_manager, user)

        mock_render.assert_called_once()
        call_args = mock_render.call_args
        assert call_args[0][2] is None  # task_id defaults to None
        assert call_args[0][3] == "all"  # direction defaults to "all"
