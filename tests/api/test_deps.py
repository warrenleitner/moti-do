"""Tests for the FastAPI dependencies module (deps.py).

This module contains tests for authentication, JWT token handling,
password hashing, and user management dependencies.
"""

from datetime import timedelta
from typing import Any
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi import HTTPException

from motido.api.deps import (
    create_access_token,
    get_current_user,
    get_current_user_optional,
    get_manager,
    get_user,
    hash_password,
    save_user,
    verify_password,
    verify_token,
)
from motido.core.models import User
from motido.data.abstraction import DEFAULT_USERNAME


def test_get_manager() -> None:
    """Test that get_manager returns and initializes a DataManager."""
    with patch("motido.api.deps.get_data_manager") as mock_get_dm:
        mock_manager = MagicMock()
        mock_get_dm.return_value = mock_manager

        result = get_manager()

        mock_get_dm.assert_called_once()
        mock_manager.initialize.assert_called_once()
        assert result == mock_manager


def test_get_user_existing() -> None:
    """Test get_user when user exists."""
    mock_manager = MagicMock()
    mock_user = User(username=DEFAULT_USERNAME)
    mock_manager.load_user.return_value = mock_user

    result = get_user(mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_manager.save_user.assert_not_called()
    assert result == mock_user


def test_get_user_creates_new() -> None:
    """Test get_user creates a new user when none exists."""
    mock_manager = MagicMock()
    mock_manager.load_user.return_value = None

    result = get_user(mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_manager.save_user.assert_called_once()
    saved_user = mock_manager.save_user.call_args[0][0]
    assert saved_user.username == DEFAULT_USERNAME
    assert result.username == DEFAULT_USERNAME


def test_save_user() -> None:
    """Test save_user saves the user data."""
    mock_manager = MagicMock()
    mock_user = User(username="testuser")

    save_user(mock_user, mock_manager)

    mock_manager.save_user.assert_called_once_with(mock_user)


def test_create_access_token_with_expiry() -> None:
    """Test create_access_token with custom expiry."""
    data = {"sub": "testuser"}
    expires_delta = timedelta(minutes=30)

    token = create_access_token(data, expires_delta)

    # Decode without verification to check structure
    decoded = jwt.decode(token, options={"verify_signature": False})
    assert decoded["sub"] == "testuser"
    assert "exp" in decoded


def test_create_access_token_default_expiry() -> None:
    """Test create_access_token with default expiry."""
    data = {"sub": "testuser"}

    token = create_access_token(data)

    # Decode without verification to check structure
    decoded = jwt.decode(token, options={"verify_signature": False})
    assert decoded["sub"] == "testuser"
    assert "exp" in decoded


def test_verify_token_valid() -> None:
    """Test verify_token with a valid token."""
    data = {"sub": "testuser"}
    token = create_access_token(data)

    payload = verify_token(token)

    assert payload is not None
    assert payload["sub"] == "testuser"


def test_verify_token_invalid() -> None:
    """Test verify_token with an invalid token."""
    invalid_token = "invalid.token.string"

    payload = verify_token(invalid_token)

    assert payload is None


@pytest.mark.asyncio
async def test_get_current_user_optional_with_token() -> None:
    """Test get_current_user_optional with a valid token."""
    mock_manager = MagicMock()
    mock_user = User(username="testuser")
    mock_manager.load_user.return_value = mock_user

    data = {"sub": "testuser"}
    token = create_access_token(data)

    result = await get_current_user_optional(token, mock_manager)

    assert result == mock_user
    mock_manager.load_user.assert_called_once_with("testuser")


@pytest.mark.asyncio
async def test_get_current_user_optional_no_token() -> None:
    """Test get_current_user_optional without a token."""
    mock_manager = MagicMock()

    result = await get_current_user_optional(None, mock_manager)

    assert result is None
    mock_manager.load_user.assert_not_called()


@pytest.mark.asyncio
async def test_get_current_user_optional_invalid_token() -> None:
    """Test get_current_user_optional with an invalid token."""
    mock_manager = MagicMock()

    result = await get_current_user_optional("invalid.token", mock_manager)

    assert result is None
    mock_manager.load_user.assert_not_called()


@pytest.mark.asyncio
async def test_get_current_user_dev_mode_existing_user() -> None:
    """Test get_current_user in dev mode with existing user."""
    with patch.dict("os.environ", {"MOTIDO_DEV_MODE": "true"}):
        mock_manager = MagicMock()
        mock_user = User(username=DEFAULT_USERNAME)
        mock_manager.load_user.return_value = mock_user

        result = await get_current_user(None, mock_manager)

        assert result == mock_user
        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)


@pytest.mark.asyncio
async def test_get_current_user_dev_mode_new_user() -> None:
    """Test get_current_user in dev mode creating new user."""
    with patch.dict("os.environ", {"MOTIDO_DEV_MODE": "true"}):
        mock_manager = MagicMock()
        mock_manager.load_user.return_value = None

        result = await get_current_user(None, mock_manager)

        assert result.username == DEFAULT_USERNAME
        mock_manager.save_user.assert_called_once()


@pytest.mark.asyncio
async def test_get_current_user_prod_mode_no_token() -> None:
    """Test get_current_user in production mode without token raises 401."""
    with patch.dict("os.environ", {"MOTIDO_DEV_MODE": "false"}):
        mock_manager = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(None, mock_manager)

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Not authenticated"


@pytest.mark.asyncio
async def test_get_current_user_prod_mode_invalid_token() -> None:
    """Test get_current_user in production mode with invalid token raises 401."""
    with patch.dict("os.environ", {"MOTIDO_DEV_MODE": "false"}):
        mock_manager = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user("invalid.token", mock_manager)

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid token"


@pytest.mark.asyncio
async def test_get_current_user_prod_mode_user_not_found() -> None:
    """Test get_current_user in production mode when user doesn't exist raises 404."""
    with patch.dict("os.environ", {"MOTIDO_DEV_MODE": "false"}):
        mock_manager = MagicMock()
        mock_manager.load_user.return_value = None

        data = {"sub": "nonexistent"}
        token = create_access_token(data)

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token, mock_manager)

        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "User not found"


@pytest.mark.asyncio
async def test_get_current_user_prod_mode_success() -> None:
    """Test get_current_user in production mode with valid token and user."""
    with patch.dict("os.environ", {"MOTIDO_DEV_MODE": "false"}):
        mock_manager = MagicMock()
        mock_user = User(username="testuser")
        mock_manager.load_user.return_value = mock_user

        data = {"sub": "testuser"}
        token = create_access_token(data)

        result = await get_current_user(token, mock_manager)

        assert result == mock_user
        mock_manager.load_user.assert_called_once_with("testuser")


@patch("motido.api.deps.pwd_context")
def test_verify_password(mock_pwd_context: Any) -> None:
    """Test password verification."""
    mock_pwd_context.verify.return_value = True

    result = verify_password("plain", "hashed")

    assert result is True
    mock_pwd_context.verify.assert_called_once_with("plain", "hashed")


@patch("motido.api.deps.pwd_context")
def test_hash_password(mock_pwd_context: Any) -> None:
    """Test password hashing."""
    mock_pwd_context.hash.return_value = "$2b$12$hashedpassword"

    result = hash_password("testpassword123")

    assert result == "$2b$12$hashedpassword"
    mock_pwd_context.hash.assert_called_once_with("testpassword123")
