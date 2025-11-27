"""Tests for the Vacation CLI commands."""

import argparse
from typing import Any
from unittest.mock import MagicMock

import pytest

from motido.cli.main import handle_vacation
from motido.core.models import User
from motido.data.abstraction import DEFAULT_USERNAME, DataManager


def create_mock_args(**kwargs: Any) -> argparse.Namespace:
    """Create a mock argparse Namespace."""
    return argparse.Namespace(**kwargs)


def test_handle_vacation_on(capsys: Any) -> None:
    """Test enabling vacation mode."""
    args = create_mock_args(status="on")
    mock_manager = MagicMock(spec=DataManager)
    user = User(username=DEFAULT_USERNAME, vacation_mode=False)

    handle_vacation(args, mock_manager, user)

    assert user.vacation_mode is True
    mock_manager.save_user.assert_called_once_with(user)

    captured = capsys.readouterr()
    assert "Vacation mode enabled" in captured.out


def test_handle_vacation_off(capsys: Any) -> None:
    """Test disabling vacation mode."""
    args = create_mock_args(status="off")
    mock_manager = MagicMock(spec=DataManager)
    user = User(username=DEFAULT_USERNAME, vacation_mode=True)

    handle_vacation(args, mock_manager, user)

    assert user.vacation_mode is False
    mock_manager.save_user.assert_called_once_with(user)

    captured = capsys.readouterr()
    assert "Vacation mode disabled" in captured.out


def test_handle_vacation_status_on(capsys: Any) -> None:
    """Test checking vacation status when on."""
    args = create_mock_args(status="status")
    mock_manager = MagicMock(spec=DataManager)
    user = User(username=DEFAULT_USERNAME, vacation_mode=True)

    handle_vacation(args, mock_manager, user)

    mock_manager.save_user.assert_not_called()

    captured = capsys.readouterr()
    assert "Vacation mode is currently ON" in captured.out


def test_handle_vacation_status_off(capsys: Any) -> None:
    """Test checking vacation status when off."""
    args = create_mock_args(status="status")
    mock_manager = MagicMock(spec=DataManager)
    user = User(username=DEFAULT_USERNAME, vacation_mode=False)

    handle_vacation(args, mock_manager, user)

    mock_manager.save_user.assert_not_called()

    captured = capsys.readouterr()
    assert "Vacation mode is currently OFF" in captured.out


def test_handle_vacation_no_user(capsys: Any) -> None:
    """Test vacation command with no user."""
    args = create_mock_args(status="on")
    mock_manager = MagicMock(spec=DataManager)

    with pytest.raises(SystemExit) as excinfo:
        handle_vacation(args, mock_manager, None)

    assert excinfo.value.code == 1
    captured = capsys.readouterr()
    assert "Error: User not found" in captured.out
