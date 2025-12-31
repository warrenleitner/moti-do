"""
Tests for data import/export endpoints.
"""

# pylint: disable=redefined-outer-name,unused-argument,import-outside-toplevel

import json
from collections.abc import Generator
from datetime import datetime
from io import BytesIO

import pytest
from fastapi.testclient import TestClient

from motido.api.deps import get_current_user, get_manager
from motido.api.main import app
from motido.core.models import (
    Badge,
    Difficulty,
    Duration,
    Priority,
    Project,
    Tag,
    Task,
    User,
)
from motido.data.abstraction import DEFAULT_USERNAME

from .conftest import MockDataManager


@pytest.fixture
def auth_manager() -> MockDataManager:
    """Create a mock data manager for import/export tests."""
    return MockDataManager()


@pytest.fixture
def client(auth_manager: MockDataManager) -> Generator[TestClient, None, None]:
    """Create test client for import/export tests."""

    def override_get_manager() -> MockDataManager:
        return auth_manager

    app.dependency_overrides[get_manager] = override_get_manager
    # Remove auth requirement for setup, but tests will use Bearer tokens
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]

    yield TestClient(app)

    app.dependency_overrides.clear()


@pytest.fixture
def test_user_with_data(auth_manager: MockDataManager) -> User:
    """Create test user with password and data."""
    from motido.api.deps import hash_password

    user = User(username=DEFAULT_USERNAME)
    user.password_hash = hash_password("testpass123")
    user.total_xp = 500

    # Add a task
    task = Task(
        id="task-1",
        title="Test Task",
        text_description="Task description",
        creation_date=datetime(2024, 1, 1, 12, 0, 0),
        priority=Priority.MEDIUM,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.SHORT,
        tags=["test"],
        project="test-project",
    )
    user.tasks.append(task)

    # Add a badge
    badge = Badge(
        id="badge-1",
        name="Test Badge",
        description="Test description",
        glyph="🏆",
        earned_date=datetime(2024, 1, 1, 12, 0, 0),
    )
    user.badges.append(badge)

    # Add tag and project definitions
    user.defined_tags.append(Tag(id="tag-1", name="test", color="#FF0000"))
    user.defined_projects.append(
        Project(id="proj-1", name="test-project", color="#00FF00")
    )

    auth_manager.set_user(user)
    return user


@pytest.fixture
def authenticated_client(
    auth_manager: MockDataManager, test_user_with_data: User
) -> Generator[TestClient, None, None]:
    """Create test client with authenticated user."""

    def override_get_manager() -> MockDataManager:
        return auth_manager

    def override_get_current_user() -> User:
        return test_user_with_data

    app.dependency_overrides[get_manager] = override_get_manager
    app.dependency_overrides[get_current_user] = override_get_current_user

    yield TestClient(app)

    app.dependency_overrides.clear()


class TestExport:
    """Tests for /api/user/export endpoint."""

    def test_export_success(
        self, authenticated_client: TestClient, test_user_with_data: User
    ) -> None:
        """Test successful data export."""
        response = authenticated_client.get("/api/user/export")

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        assert "attachment" in response.headers["content-disposition"]
        assert "motido-backup-" in response.headers["content-disposition"]
        assert ".json" in response.headers["content-disposition"]

        # Parse exported data - new format is user data directly (no username wrapper)
        user_data = response.json()

        # Verify username and password_hash are NOT included
        assert "username" not in user_data
        assert "password_hash" not in user_data

        # Verify user data
        assert user_data["total_xp"] == 500

        # Verify tasks
        assert len(user_data["tasks"]) == 1
        task = user_data["tasks"][0]
        assert task["id"] == "task-1"
        assert task["title"] == "Test Task"
        assert task["priority"] == "Medium"  # Enum values are capitalized

        # Verify badges
        assert len(user_data["badges"]) == 1
        badge = user_data["badges"][0]
        assert badge["name"] == "Test Badge"

        # Verify tags and projects
        assert len(user_data["defined_tags"]) == 1
        assert len(user_data["defined_projects"]) == 1

    def test_export_no_auth(self, client: TestClient) -> None:
        """Test export without authentication."""
        response = client.get("/api/user/export")
        assert response.status_code == 401

    def test_export_invalid_token(self, client: TestClient) -> None:
        """Test export with invalid token."""
        response = client.get(
            "/api/user/export",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 401

    def test_export_empty_user(self, auth_manager: MockDataManager) -> None:
        """Test export with user having no data."""
        from motido.api.deps import hash_password

        # Create minimal user
        user = User(username=DEFAULT_USERNAME)
        user.password_hash = hash_password("testpass123")
        auth_manager.set_user(user)

        # Create client with auth for this empty user
        def override_get_manager() -> MockDataManager:
            return auth_manager

        def override_get_current_user() -> User:
            return user

        app.dependency_overrides[get_manager] = override_get_manager
        app.dependency_overrides[get_current_user] = override_get_current_user

        client = TestClient(app)

        response = client.get("/api/user/export")
        app.dependency_overrides.clear()

        assert response.status_code == 200
        user_data = response.json()

        # Verify username and password_hash are NOT included
        assert "username" not in user_data
        assert "password_hash" not in user_data

        # Verify empty collections
        assert user_data["tasks"] == []
        assert user_data["xp_transactions"] == []
        assert user_data["badges"] == []
        assert user_data["defined_tags"] == []
        assert user_data["defined_projects"] == []


class TestImport:
    """Tests for /api/user/import endpoint."""

    def test_import_success_new_format(
        self,
        authenticated_client: TestClient,
        test_user_with_data: User,
        auth_manager: MockDataManager,
    ) -> None:
        """Test successful data import with new format (no username wrapper)."""
        # Create import data - new format without username wrapper
        import_data = {
            "total_xp": 1000,
            "tasks": [
                {
                    "id": "imported-task",
                    "title": "Imported Task",
                    "text_description": None,
                    "priority": "high",
                    "difficulty": "hard",
                    "duration": "long",
                    "is_complete": False,
                    "creation_date": "2024-02-01 12:00:00",
                    "due_date": None,
                    "start_date": None,
                    "icon": None,
                    "tags": [],
                    "project": None,
                    "subtasks": [],
                    "dependencies": [],
                    "history": [],
                    "is_habit": False,
                    "recurrence_rule": None,
                    "recurrence_type": None,
                    "streak_current": 0,
                    "streak_best": 0,
                    "parent_habit_id": None,
                }
            ],
            "last_processed_date": "2024-02-01",
            "vacation_mode": False,
            "xp_transactions": [],
            "badges": [],
            "defined_tags": [],
            "defined_projects": [],
        }

        # Create file
        file_content = json.dumps(import_data).encode()
        files = {"file": ("backup.json", BytesIO(file_content), "application/json")}

        response = authenticated_client.post(
            "/api/user/import",
            files=files,
        )

        assert response.status_code == 200
        data = response.json()
        assert "successfully" in data["message"]
        assert data["summary"]["tasks_count"] == 1
        assert data["summary"]["total_xp"] == 1000

        # Verify data was imported
        imported_user = auth_manager.load_user(DEFAULT_USERNAME)
        assert imported_user is not None
        assert imported_user.total_xp == 1000
        assert len(imported_user.tasks) == 1
        assert imported_user.tasks[0].title == "Imported Task"

        # Verify password was preserved
        assert imported_user.password_hash == test_user_with_data.password_hash

    def test_import_success_legacy_format(
        self,
        authenticated_client: TestClient,
        test_user_with_data: User,
        auth_manager: MockDataManager,
    ) -> None:
        """Test successful data import with legacy format (username wrapper)."""
        # Create import data - legacy format with username wrapper
        import_data = {
            DEFAULT_USERNAME: {
                "username": DEFAULT_USERNAME,
                "total_xp": 1000,
                "password_hash": None,  # Should preserve current password
                "tasks": [
                    {
                        "id": "imported-task",
                        "title": "Imported Task",
                        "text_description": None,
                        "priority": "high",
                        "difficulty": "hard",
                        "duration": "long",
                        "is_complete": False,
                        "creation_date": "2024-02-01 12:00:00",
                        "due_date": None,
                        "start_date": None,
                        "icon": None,
                        "tags": [],
                        "project": None,
                        "subtasks": [],
                        "dependencies": [],
                        "history": [],
                        "is_habit": False,
                        "recurrence_rule": None,
                        "recurrence_type": None,
                        "streak_current": 0,
                        "streak_best": 0,
                        "parent_habit_id": None,
                    }
                ],
                "last_processed_date": "2024-02-01",
                "vacation_mode": False,
                "xp_transactions": [],
                "badges": [],
                "defined_tags": [],
                "defined_projects": [],
            }
        }

        # Create file
        file_content = json.dumps(import_data).encode()
        files = {"file": ("backup.json", BytesIO(file_content), "application/json")}

        response = authenticated_client.post(
            "/api/user/import",
            files=files,
        )

        assert response.status_code == 200
        data = response.json()
        assert "successfully" in data["message"]
        assert data["summary"]["tasks_count"] == 1
        assert data["summary"]["total_xp"] == 1000

        # Verify data was imported
        imported_user = auth_manager.load_user(DEFAULT_USERNAME)
        assert imported_user is not None
        assert imported_user.total_xp == 1000
        assert len(imported_user.tasks) == 1
        assert imported_user.tasks[0].title == "Imported Task"

        # Verify password was preserved
        assert imported_user.password_hash == test_user_with_data.password_hash

    def test_import_non_json_file(
        self,
        client: TestClient,
        authenticated_client: TestClient,
        test_user_with_data: User,
    ) -> None:
        """Test import with non-JSON file."""
        # Auth is set up via authenticated_client fixture

        files = {"file": ("data.txt", BytesIO(b"not json"), "text/plain")}

        response = client.post(
            "/api/user/import",
            files=files,
        )

        assert response.status_code == 400
        assert "JSON file" in response.json()["detail"]

    def test_import_invalid_json(
        self,
        client: TestClient,
        authenticated_client: TestClient,
        test_user_with_data: User,
    ) -> None:
        """Test import with invalid JSON content."""
        # Auth is set up via authenticated_client fixture

        files = {"file": ("bad.json", BytesIO(b"not valid json"), "application/json")}

        response = client.post(
            "/api/user/import",
            files=files,
        )

        assert response.status_code == 400
        assert "Invalid JSON" in response.json()["detail"]

    def test_import_wrong_structure(
        self,
        client: TestClient,
        authenticated_client: TestClient,
        test_user_with_data: User,
    ) -> None:
        """Test import with wrong data structure."""
        # Auth is set up via authenticated_client fixture

        # Send array instead of dict
        wrong_data: list[dict] = []
        file_content = json.dumps(wrong_data).encode()
        files = {"file": ("bad.json", BytesIO(file_content), "application/json")}

        response = client.post(
            "/api/user/import",
            files=files,
        )

        assert response.status_code == 400
        assert "Invalid file structure" in response.json()["detail"]

    def test_import_missing_user_data(
        self, authenticated_client: TestClient, test_user_with_data: User
    ) -> None:
        """Test import with no data for current user (multiple users in file)."""
        # Data for multiple different users (not default_user)
        # With multiple users, fallback doesn't apply
        import_data = {
            "user1": {"username": "user1", "tasks": []},
            "user2": {"username": "user2", "tasks": []},
        }
        file_content = json.dumps(import_data).encode()
        files = {"file": ("backup.json", BytesIO(file_content), "application/json")}

        response = authenticated_client.post(
            "/api/user/import",
            files=files,
        )

        assert response.status_code == 400
        assert "No data found" in response.json()["detail"]

    def test_import_single_user_fallback(
        self,
        client: TestClient,
        authenticated_client: TestClient,
        test_user_with_data: User,
        auth_manager: MockDataManager,
    ) -> None:
        """Test import with single user data (uses fallback)."""
        # Auth is set up via authenticated_client fixture

        # Data with different username but only one user
        import_data = {
            "some_user": {
                "username": "some_user",
                "total_xp": 250,
                "password_hash": None,
                "tasks": [],
                "last_processed_date": "2024-01-01",
                "vacation_mode": False,
                "xp_transactions": [],
                "badges": [],
                "defined_tags": [],
                "defined_projects": [],
            }
        }
        file_content = json.dumps(import_data).encode()
        files = {"file": ("backup.json", BytesIO(file_content), "application/json")}

        response = client.post(
            "/api/user/import",
            files=files,
        )

        # Should succeed using fallback
        assert response.status_code == 200
        assert response.json()["summary"]["total_xp"] == 250

    def test_import_corrupted_data(
        self,
        client: TestClient,
        authenticated_client: TestClient,
        test_user_with_data: User,
    ) -> None:
        """Test import with corrupted task data."""
        # Auth is set up via authenticated_client fixture

        import_data = {
            DEFAULT_USERNAME: {
                "username": DEFAULT_USERNAME,
                "tasks": [{"title": "No ID"}],  # Missing required 'id' field
            }
        }
        file_content = json.dumps(import_data).encode()
        files = {"file": ("bad.json", BytesIO(file_content), "application/json")}

        response = client.post(
            "/api/user/import",
            files=files,
        )

        assert response.status_code == 400
        assert "Invalid user data format" in response.json()["detail"]

    def test_import_no_auth(self, client: TestClient) -> None:
        """Test import without authentication."""
        import_data = {DEFAULT_USERNAME: {"username": DEFAULT_USERNAME, "tasks": []}}
        file_content = json.dumps(import_data).encode()
        files = {"file": ("backup.json", BytesIO(file_content), "application/json")}

        response = client.post("/api/user/import", files=files)
        assert response.status_code == 401

    def test_import_preserves_password(
        self,
        authenticated_client: TestClient,
        test_user_with_data: User,
        auth_manager: MockDataManager,
    ) -> None:
        """Test that import preserves password_hash when not in import."""
        original_password_hash = test_user_with_data.password_hash

        # Import data without password_hash
        import_data = {
            DEFAULT_USERNAME: {
                "username": DEFAULT_USERNAME,
                "total_xp": 999,
                "tasks": [],
                "last_processed_date": "2024-01-01",
                "vacation_mode": False,
                "xp_transactions": [],
                "badges": [],
                "defined_tags": [],
                "defined_projects": [],
            }
        }
        file_content = json.dumps(import_data).encode()
        files = {"file": ("backup.json", BytesIO(file_content), "application/json")}

        response = authenticated_client.post(
            "/api/user/import",
            files=files,
        )

        assert response.status_code == 200

        # Verify password was preserved
        imported_user = auth_manager.load_user(DEFAULT_USERNAME)
        assert imported_user is not None
        assert imported_user.password_hash == original_password_hash
