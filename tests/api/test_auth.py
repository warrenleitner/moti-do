"""
Tests for authentication endpoints.
"""

# pylint: disable=redefined-outer-name,unused-argument,import-outside-toplevel

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from motido.api.deps import get_current_user, get_manager
from motido.api.main import app
from motido.core.models import User
from motido.data.abstraction import DEFAULT_USERNAME

from .conftest import MockDataManager


@pytest.fixture
def auth_manager() -> MockDataManager:
    """Create a mock data manager for auth tests."""
    return MockDataManager()


@pytest.fixture
def client(auth_manager: MockDataManager) -> Generator[TestClient, None, None]:
    """Create test client for auth tests."""

    def override_get_manager() -> MockDataManager:
        return auth_manager

    app.dependency_overrides[get_manager] = override_get_manager
    # Remove auth requirement for these tests
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]

    yield TestClient(app)

    app.dependency_overrides.clear()


@pytest.fixture
def test_user(auth_manager: MockDataManager) -> User:
    """Create test user with password."""
    from motido.api.deps import hash_password

    user = User(username=DEFAULT_USERNAME)
    user.password_hash = hash_password("testpass123")
    auth_manager.set_user(user)
    return user


@pytest.fixture
def authenticated_client(
    auth_manager: MockDataManager, test_user: User
) -> Generator[TestClient, None, None]:
    """Create test client with auth properly configured."""

    def override_get_manager() -> MockDataManager:
        return auth_manager

    def override_get_current_user() -> User:
        return test_user

    app.dependency_overrides[get_manager] = override_get_manager
    app.dependency_overrides[get_current_user] = override_get_current_user

    yield TestClient(app)

    app.dependency_overrides.clear()


class TestRegister:
    """Tests for /api/auth/register endpoint."""

    def test_register_success(
        self, client: TestClient, auth_manager: MockDataManager
    ) -> None:
        """Test successful registration."""
        response = client.post(
            "/api/auth/register",
            json={"username": DEFAULT_USERNAME, "password": "testpass123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

        # Verify user was created with password hash
        user = auth_manager.load_user(DEFAULT_USERNAME)
        assert user is not None
        assert user.password_hash is not None

    def test_register_wrong_username(self, client: TestClient) -> None:
        """Test registration with non-default username."""
        response = client.post(
            "/api/auth/register",
            json={"username": "wrong_user", "password": "testpass123"},
        )

        assert response.status_code == 400
        assert "Only username 'default_user' is allowed" in response.json()["detail"]

    def test_register_already_registered(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test registration when user already has password."""
        response = client.post(
            "/api/auth/register",
            json={"username": DEFAULT_USERNAME, "password": "newpass123"},
        )

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_register_weak_password(self, client: TestClient) -> None:
        """Test registration with password too short."""
        response = client.post(
            "/api/auth/register",
            json={"username": DEFAULT_USERNAME, "password": "short"},
        )

        assert response.status_code == 422  # Pydantic validation error

    def test_register_empty_password(self, client: TestClient) -> None:
        """Test registration with empty password."""
        response = client.post(
            "/api/auth/register",
            json={"username": DEFAULT_USERNAME, "password": ""},
        )

        assert response.status_code == 422  # Pydantic validation error


class TestLogin:
    """Tests for /api/auth/login endpoint."""

    def test_login_success(self, client: TestClient, test_user: User) -> None:
        """Test successful login."""
        response = client.post(
            "/api/auth/login",
            data={"username": DEFAULT_USERNAME, "password": "testpass123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client: TestClient, test_user: User) -> None:
        """Test login with incorrect password."""
        response = client.post(
            "/api/auth/login",
            data={"username": DEFAULT_USERNAME, "password": "wrongpass"},
        )

        assert response.status_code == 401
        assert "Invalid username or password" in response.json()["detail"]

    def test_login_user_not_found(self, client: TestClient) -> None:
        """Test login with non-existent user."""
        response = client.post(
            "/api/auth/login",
            data={"username": "nonexistent", "password": "testpass123"},
        )

        assert response.status_code == 401
        assert "Invalid username or password" in response.json()["detail"]

    def test_login_user_not_registered(
        self, client: TestClient, auth_manager: MockDataManager
    ) -> None:
        """Test login with user that has no password set."""
        # Create user without password
        user = User(username=DEFAULT_USERNAME)
        auth_manager.set_user(user)

        response = client.post(
            "/api/auth/login",
            data={"username": DEFAULT_USERNAME, "password": "testpass123"},
        )

        assert response.status_code == 401
        assert "not registered" in response.json()["detail"]

    def test_login_empty_password(self, client: TestClient, test_user: User) -> None:
        """Test login with empty password."""
        response = client.post(
            "/api/auth/login",
            data={"username": DEFAULT_USERNAME, "password": ""},
        )

        assert response.status_code == 422  # Pydantic validation error

    def test_login_rate_limit(self, client: TestClient, test_user: User) -> None:
        """Test rate limiting on login endpoint."""
        # Make 5 failed login attempts (max allowed)
        for _ in range(5):
            client.post(
                "/api/auth/login",
                data={"username": DEFAULT_USERNAME, "password": "wrongpassword"},
            )

        # 6th attempt should be rate limited
        response = client.post(
            "/api/auth/login",
            data={"username": DEFAULT_USERNAME, "password": "wrongpassword"},
        )

        assert response.status_code == 429
        assert "Too many login attempts" in response.json()["detail"]


class TestChangePassword:
    """Tests for /api/auth/change-password endpoint."""

    def test_change_password_success(
        self,
        authenticated_client: TestClient,
        test_user: User,
        auth_manager: MockDataManager,
    ) -> None:
        """Test successful password change."""
        # Change password (auth is already set up via authenticated_client)
        response = authenticated_client.post(
            "/api/auth/change-password",
            json={"current_password": "testpass123", "new_password": "newpass456"},
        )

        assert response.status_code == 200
        assert "successfully" in response.json()["message"]

        # Verify password was updated in manager
        from motido.api.deps import verify_password

        updated_user = auth_manager.load_user(DEFAULT_USERNAME)
        assert updated_user is not None
        assert verify_password("newpass456", updated_user.password_hash or "")
        assert not verify_password("testpass123", updated_user.password_hash or "")

    def test_change_password_wrong_current(
        self, authenticated_client: TestClient, test_user: User
    ) -> None:
        """Test password change with wrong current password."""
        response = authenticated_client.post(
            "/api/auth/change-password",
            json={"current_password": "wrongpass", "new_password": "newpass456"},
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"]

    def test_change_password_weak_new(
        self, authenticated_client: TestClient, test_user: User
    ) -> None:
        """Test password change with weak new password."""
        response = authenticated_client.post(
            "/api/auth/change-password",
            json={"current_password": "testpass123", "new_password": "short"},
        )

        assert response.status_code == 422  # Pydantic validation error

    def test_change_password_no_auth(self, client: TestClient) -> None:
        """Test password change without authentication."""
        response = client.post(
            "/api/auth/change-password",
            json={"current_password": "testpass123", "new_password": "newpass456"},
        )

        assert response.status_code == 401

    def test_change_password_invalid_token(self, client: TestClient) -> None:
        """Test password change with invalid token."""
        response = client.post(
            "/api/auth/change-password",
            json={"current_password": "testpass123", "new_password": "newpass456"},
            headers={"Authorization": "Bearer invalid_token"},
        )

        assert response.status_code == 401
