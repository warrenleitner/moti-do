"""Tests for coverage of view commands."""

from datetime import datetime
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from rich.console import Console

from motido.cli.main import handle_view
from motido.cli.views import render_dependency_graph
from motido.core.models import User, Task
from motido.data.abstraction import DEFAULT_USERNAME, DataManager
from motido.cli.main import Namespace

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
    t2 = Task(title="Child", id="child", dependencies=["root"], is_complete=True, creation_date=datetime.now())
    
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
    assert "Due Date:     Not set" in captured.out or "Due Date:     Not set" in captured.out.replace("\t", "    ")
    # Actually rich table formatting might add spaces.
    assert "Not set" in captured.out
