# tests/api/conftest.py
# pylint: disable=redefined-outer-name
"""
Pytest fixtures for API testing.
"""

from collections.abc import Generator
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from motido.api.deps import get_current_user, get_manager
from motido.api.main import app
from motido.core.models import Difficulty, Duration, Priority, Project, Tag, Task, User
from motido.data.abstraction import DataManager


class MockDataManager(DataManager):
    """Mock data manager for testing."""

    def __init__(self) -> None:
        self._user: User | None = None

    def initialize(self) -> None:
        pass

    def load_user(self, username: str = "default_user") -> User | None:
        return self._user

    def save_user(self, user: User) -> None:
        self._user = user

    def backend_type(self) -> str:
        return "mock"

    def set_user(self, user: User) -> None:
        """Set the user for testing."""
        self._user = user


@pytest.fixture
def mock_manager() -> MockDataManager:
    """Create a mock data manager."""
    return MockDataManager()


@pytest.fixture
def test_user() -> User:
    """Create a test user with sample data."""
    user = User(username="test_user", total_xp=500)

    # Add some tags
    user.defined_tags.append(Tag(name="work", color="#FF0000"))
    user.defined_tags.append(Tag(name="personal", color="#00FF00"))

    # Add a project
    user.defined_projects.append(Project(name="Test Project", color="#0000FF"))

    # Add some tasks
    task1 = Task(
        title="Test Task 1",
        creation_date=datetime.now(),
        priority=Priority.HIGH,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.SHORT,
        tags=["work"],
        project="Test Project",
    )
    task2 = Task(
        title="Test Task 2",
        creation_date=datetime.now(),
        priority=Priority.LOW,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINISCULE,
        is_complete=True,
    )
    task3 = Task(
        title="Test Habit",
        creation_date=datetime.now(),
        priority=Priority.MEDIUM,
        difficulty=Difficulty.LOW,
        duration=Duration.SHORT,
        is_habit=True,
        recurrence_rule="daily",
        streak_current=5,
        streak_best=10,
    )

    user.tasks = [task1, task2, task3]
    return user


@pytest.fixture
def client(
    mock_manager: MockDataManager, test_user: User
) -> Generator[TestClient, None, None]:
    """Create a test client with mocked dependencies."""
    mock_manager.set_user(test_user)

    def override_get_manager() -> MockDataManager:
        return mock_manager

    def override_get_current_user() -> User:
        return test_user

    app.dependency_overrides[get_manager] = override_get_manager
    app.dependency_overrides[get_current_user] = override_get_current_user

    yield TestClient(app)

    # Clean up
    app.dependency_overrides.clear()


@pytest.fixture
def empty_client(mock_manager: MockDataManager) -> Generator[TestClient, None, None]:
    """Create a test client with an empty user."""
    empty_user = User(username="empty_user")
    mock_manager.set_user(empty_user)

    def override_get_manager() -> MockDataManager:
        return mock_manager

    def override_get_current_user() -> User:
        return empty_user

    app.dependency_overrides[get_manager] = override_get_manager
    app.dependency_overrides[get_current_user] = override_get_current_user

    yield TestClient(app)

    app.dependency_overrides.clear()
