"""Tests for the tags and projects CLI commands."""

from argparse import Namespace
from typing import Any
from unittest.mock import MagicMock

import pytest

from motido.cli.main import handle_projects, handle_tags
from motido.core.models import Project, Tag, User
from motido.data.abstraction import DataManager

# pylint: disable=redefined-outer-name


@pytest.fixture
def mock_manager() -> MagicMock:
    """Provides a mocked DataManager."""
    return MagicMock(spec=DataManager)


@pytest.fixture
def user_with_tags() -> User:
    """Provides a User with some defined tags."""
    user = User(username="testuser")
    user.defined_tags = [
        Tag(name="urgent", color="#FF0000", id="tag-1"),
        Tag(name="work", color="#0000FF", id="tag-2"),
    ]
    return user


@pytest.fixture
def user_with_projects() -> User:
    """Provides a User with some defined projects."""
    user = User(username="testuser")
    user.defined_projects = [
        Project(name="Career", color="#6C5CE7", id="proj-1"),
        Project(name="Health", color="#00CEC9", id="proj-2"),
    ]
    return user


# --- Tags Command Tests ---


def test_handle_tags_list(mock_manager: MagicMock, user_with_tags: User) -> None:
    """Test listing defined tags."""
    args = Namespace(tags_command="list", verbose=False)

    handle_tags(args, mock_manager, user_with_tags)

    # No save should be called for list
    mock_manager.save_user.assert_not_called()


def test_handle_tags_list_empty(mock_manager: MagicMock, capsys: Any) -> None:
    """Test listing tags when none defined."""
    user = User(username="testuser")
    args = Namespace(tags_command="list", verbose=False)

    handle_tags(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "No tags defined yet" in captured.out


def test_handle_tags_define_new(mock_manager: MagicMock, capsys: Any) -> None:
    """Test defining a new tag."""
    user = User(username="testuser")
    args = Namespace(tags_command="define", name="urgent", color=None, verbose=False)

    handle_tags(args, mock_manager, user)

    mock_manager.save_user.assert_called_once()
    captured = capsys.readouterr()
    assert "Defined tag 'urgent'" in captured.out


def test_handle_tags_define_with_color(mock_manager: MagicMock, capsys: Any) -> None:
    """Test defining a new tag with custom color."""
    user = User(username="testuser")
    args = Namespace(
        tags_command="define", name="urgent", color="#FF0000", verbose=False
    )

    handle_tags(args, mock_manager, user)

    mock_manager.save_user.assert_called_once()
    captured = capsys.readouterr()
    assert "Defined tag 'urgent'" in captured.out
    assert "#FF0000" in captured.out


def test_handle_tags_define_existing(
    mock_manager: MagicMock, user_with_tags: User, capsys: Any
) -> None:
    """Test defining a tag that already exists."""
    args = Namespace(tags_command="define", name="urgent", color=None, verbose=False)

    handle_tags(args, mock_manager, user_with_tags)

    mock_manager.save_user.assert_not_called()
    captured = capsys.readouterr()
    assert "already exists" in captured.out


def test_handle_tags_color(
    mock_manager: MagicMock, user_with_tags: User, capsys: Any
) -> None:
    """Test changing a tag color."""
    args = Namespace(
        tags_command="color", name="urgent", new_color="#00FF00", verbose=False
    )

    handle_tags(args, mock_manager, user_with_tags)

    mock_manager.save_user.assert_called_once()
    captured = capsys.readouterr()
    assert "Changed color" in captured.out
    assert "#FF0000" in captured.out  # Old color
    assert "#00FF00" in captured.out  # New color


def test_handle_tags_color_not_found(mock_manager: MagicMock, capsys: Any) -> None:
    """Test changing color for a tag that doesn't exist."""
    user = User(username="testuser")
    args = Namespace(
        tags_command="color", name="nonexistent", new_color="#00FF00", verbose=False
    )

    with pytest.raises(SystemExit):
        handle_tags(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "not found" in captured.out


def test_handle_tags_remove(
    mock_manager: MagicMock, user_with_tags: User, capsys: Any
) -> None:
    """Test removing a tag."""
    args = Namespace(tags_command="remove", name="urgent", verbose=False)

    handle_tags(args, mock_manager, user_with_tags)

    mock_manager.save_user.assert_called_once()
    assert len(user_with_tags.defined_tags) == 1
    assert user_with_tags.defined_tags[0].name == "work"
    captured = capsys.readouterr()
    assert "Removed tag 'urgent'" in captured.out


def test_handle_tags_remove_not_found(mock_manager: MagicMock, capsys: Any) -> None:
    """Test removing a tag that doesn't exist."""
    user = User(username="testuser")
    args = Namespace(tags_command="remove", name="nonexistent", verbose=False)

    with pytest.raises(SystemExit):
        handle_tags(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "not found" in captured.out


def test_handle_tags_no_user(mock_manager: MagicMock, capsys: Any) -> None:
    """Test tags command with no user."""
    args = Namespace(tags_command="list", verbose=False)

    with pytest.raises(SystemExit):
        handle_tags(args, mock_manager, None)

    captured = capsys.readouterr()
    assert "not found" in captured.out


# --- Projects Command Tests ---


def test_handle_projects_list(
    mock_manager: MagicMock, user_with_projects: User
) -> None:
    """Test listing defined projects."""
    args = Namespace(projects_command="list", verbose=False)

    handle_projects(args, mock_manager, user_with_projects)

    # No save should be called for list
    mock_manager.save_user.assert_not_called()


def test_handle_projects_list_empty(mock_manager: MagicMock, capsys: Any) -> None:
    """Test listing projects when none defined."""
    user = User(username="testuser")
    args = Namespace(projects_command="list", verbose=False)

    handle_projects(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "No projects defined yet" in captured.out


def test_handle_projects_define_new(mock_manager: MagicMock, capsys: Any) -> None:
    """Test defining a new project."""
    user = User(username="testuser")
    args = Namespace(
        projects_command="define", name="Career", color=None, verbose=False
    )

    handle_projects(args, mock_manager, user)

    mock_manager.save_user.assert_called_once()
    captured = capsys.readouterr()
    assert "Defined project 'Career'" in captured.out


def test_handle_projects_define_with_color(
    mock_manager: MagicMock, capsys: Any
) -> None:
    """Test defining a new project with custom color."""
    user = User(username="testuser")
    args = Namespace(
        projects_command="define", name="Career", color="#FF0000", verbose=False
    )

    handle_projects(args, mock_manager, user)

    mock_manager.save_user.assert_called_once()
    captured = capsys.readouterr()
    assert "Defined project 'Career'" in captured.out
    assert "#FF0000" in captured.out


def test_handle_projects_define_existing(
    mock_manager: MagicMock, user_with_projects: User, capsys: Any
) -> None:
    """Test defining a project that already exists."""
    args = Namespace(
        projects_command="define", name="Career", color=None, verbose=False
    )

    handle_projects(args, mock_manager, user_with_projects)

    mock_manager.save_user.assert_not_called()
    captured = capsys.readouterr()
    assert "already exists" in captured.out


def test_handle_projects_color(
    mock_manager: MagicMock, user_with_projects: User, capsys: Any
) -> None:
    """Test changing a project color."""
    args = Namespace(
        projects_command="color", name="Career", new_color="#00FF00", verbose=False
    )

    handle_projects(args, mock_manager, user_with_projects)

    mock_manager.save_user.assert_called_once()
    captured = capsys.readouterr()
    assert "Changed color" in captured.out
    assert "#6C5CE7" in captured.out  # Old color
    assert "#00FF00" in captured.out  # New color


def test_handle_projects_color_not_found(mock_manager: MagicMock, capsys: Any) -> None:
    """Test changing color for a project that doesn't exist."""
    user = User(username="testuser")
    args = Namespace(
        projects_command="color", name="nonexistent", new_color="#00FF00", verbose=False
    )

    with pytest.raises(SystemExit):
        handle_projects(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "not found" in captured.out


def test_handle_projects_remove(
    mock_manager: MagicMock, user_with_projects: User, capsys: Any
) -> None:
    """Test removing a project."""
    args = Namespace(projects_command="remove", name="Career", verbose=False)

    handle_projects(args, mock_manager, user_with_projects)

    mock_manager.save_user.assert_called_once()
    assert len(user_with_projects.defined_projects) == 1
    assert user_with_projects.defined_projects[0].name == "Health"
    captured = capsys.readouterr()
    assert "Removed project 'Career'" in captured.out


def test_handle_projects_remove_not_found(mock_manager: MagicMock, capsys: Any) -> None:
    """Test removing a project that doesn't exist."""
    user = User(username="testuser")
    args = Namespace(projects_command="remove", name="nonexistent", verbose=False)

    with pytest.raises(SystemExit):
        handle_projects(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "not found" in captured.out


def test_handle_projects_no_user(mock_manager: MagicMock, capsys: Any) -> None:
    """Test projects command with no user."""
    args = Namespace(projects_command="list", verbose=False)

    with pytest.raises(SystemExit):
        handle_projects(args, mock_manager, None)

    captured = capsys.readouterr()
    assert "not found" in captured.out


# --- IOError Tests ---


def test_handle_tags_ioerror(mock_manager: MagicMock, capsys: Any) -> None:
    """Test handle_tags IOError during save."""
    user = User(username="testuser")
    mock_manager.save_user.side_effect = IOError("Disk full")
    args = Namespace(tags_command="define", name="urgent", color=None, verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_tags(args, mock_manager, user)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Error saving data" in captured.out


def test_handle_projects_ioerror(mock_manager: MagicMock, capsys: Any) -> None:
    """Test handle_projects IOError during save."""
    user = User(username="testuser")
    mock_manager.save_user.side_effect = IOError("Disk full")
    args = Namespace(
        projects_command="define", name="Career", color=None, verbose=False
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_projects(args, mock_manager, user)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Error saving data" in captured.out
