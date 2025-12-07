"""Tests for the XP CLI commands."""

import argparse
from typing import Any
from unittest.mock import MagicMock

import pytest

from motido.cli.main import handle_xp
from motido.core.models import User
from motido.data.abstraction import DEFAULT_USERNAME, DataManager


def create_mock_args(**kwargs: Any) -> argparse.Namespace:
    """Create a mock argparse Namespace."""
    return argparse.Namespace(**kwargs)


def test_handle_xp_withdraw_success(capsys: Any) -> None:
    """Test successful XP withdrawal via CLI."""
    args = create_mock_args(xp_command="withdraw", amount=50)
    mock_manager = MagicMock(spec=DataManager)
    user = User(username=DEFAULT_USERNAME, total_xp=100)

    handle_xp(args, mock_manager, user)

    assert user.total_xp == 50
    mock_manager.save_user.assert_called_once_with(user)

    captured = capsys.readouterr()
    assert "Withdrew 50 XP points" in captured.out


def test_handle_xp_withdraw_insufficient_funds(capsys: Any) -> None:
    """Test XP withdrawal with insufficient funds via CLI."""
    args = create_mock_args(xp_command="withdraw", amount=150)
    mock_manager = MagicMock(spec=DataManager)
    user = User(username=DEFAULT_USERNAME, total_xp=100)

    handle_xp(args, mock_manager, user)

    assert user.total_xp == 100
    mock_manager.save_user.assert_not_called()

    captured = capsys.readouterr()
    assert "Insufficient XP" in captured.out


def test_handle_xp_withdraw_invalid_amount(capsys: Any) -> None:
    """Test XP withdrawal with invalid amount via CLI."""
    args = create_mock_args(xp_command="withdraw", amount=-10)
    mock_manager = MagicMock(spec=DataManager)
    user = User(username=DEFAULT_USERNAME, total_xp=100)

    with pytest.raises(SystemExit) as excinfo:
        handle_xp(args, mock_manager, user)

    assert excinfo.value.code == 1
    captured = capsys.readouterr()
    assert "Error: Withdrawal amount must be positive" in captured.out


def test_handle_xp_unknown_command(capsys: Any) -> None:
    """Test unknown XP command."""
    args = create_mock_args(xp_command="unknown")
    mock_manager = MagicMock(spec=DataManager)
    user = User(username=DEFAULT_USERNAME, total_xp=100)

    with pytest.raises(SystemExit) as excinfo:
        handle_xp(args, mock_manager, user)

    assert excinfo.value.code == 1
    captured = capsys.readouterr()
    assert "Error: Unknown xp command 'unknown'" in captured.out


def test_handle_xp_no_user(capsys: Any) -> None:
    """Test XP command with no user."""
    args = create_mock_args(xp_command="withdraw", amount=50)
    mock_manager = MagicMock(spec=DataManager)

    with pytest.raises(SystemExit) as excinfo:
        handle_xp(args, mock_manager, None)

    assert excinfo.value.code == 1
    captured = capsys.readouterr()
    assert "Error: User not found" in captured.out
