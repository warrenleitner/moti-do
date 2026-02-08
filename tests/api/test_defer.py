# tests/api/test_defer.py
# pylint: disable=redefined-outer-name, protected-access
"""
Tests for the task defer/delay feature.
"""

from datetime import date, datetime, timedelta
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from motido.core.models import Task, User
from motido.core.utils import process_day
from motido.data.json_manager import JsonDataManager


class TestDeferEndpoint:
    """Tests for POST /api/tasks/{task_id}/defer endpoint."""

    def test_defer_task_with_explicit_date(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test deferring a task to an explicit date."""
        task = test_user.tasks[0]
        defer_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")

        response = client.post(
            f"/api/tasks/{task.id}/defer",
            json={"defer_until": defer_date},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["deferred_until"] is not None
        assert data["task"]["defer_until"] is not None

    def test_defer_task_to_next_recurrence(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test deferring a recurring task to its next recurrence."""
        # task3 is a daily habit with due_date
        habit = test_user.tasks[2]
        habit.due_date = datetime.now()

        response = client.post(
            f"/api/tasks/{habit.id}/defer",
            json={"defer_to_next_recurrence": True},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["deferred_until"] is not None
        assert data["task"]["defer_until"] is not None

    def test_defer_non_recurring_to_next_recurrence_fails(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test that deferring a non-recurring task to next recurrence returns 400."""
        task = test_user.tasks[0]  # Not a habit

        response = client.post(
            f"/api/tasks/{task.id}/defer",
            json={"defer_to_next_recurrence": True},
        )
        assert response.status_code == 400
        assert "not a recurring habit" in response.json()["detail"]

    def test_defer_to_next_recurrence_invalid_rule(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test deferring when recurrence rule can't produce a next date."""
        habit = test_user.tasks[2]
        habit.recurrence_rule = "INVALID_RULE_THAT_WONT_PARSE"
        habit.due_date = None  # No due date to fall back on

        response = client.post(
            f"/api/tasks/{habit.id}/defer",
            json={"defer_to_next_recurrence": True},
        )
        assert response.status_code == 400
        assert "Could not calculate" in response.json()["detail"]

    def test_defer_with_no_params_fails(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test that deferring without params returns 400."""
        task = test_user.tasks[0]

        response = client.post(
            f"/api/tasks/{task.id}/defer",
            json={},
        )
        assert response.status_code == 400
        assert "Must provide" in response.json()["detail"]

    def test_defer_nonexistent_task(self, client: TestClient) -> None:
        """Test deferring a nonexistent task returns 404."""
        response = client.post(
            "/api/tasks/nonexistent-id/defer",
            json={"defer_until": "2030-01-01 00:00:00"},
        )
        assert response.status_code == 404

    def test_defer_records_history(self, client: TestClient, test_user: User) -> None:
        """Test that deferring records history for undo."""
        task = test_user.tasks[0]
        assert len(task.history) == 0

        defer_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
        client.post(
            f"/api/tasks/{task.id}/defer",
            json={"defer_until": defer_date},
        )

        assert len(task.history) == 1
        assert task.history[0]["field"] == "defer_until"

    def test_defer_undo(self, client: TestClient, test_user: User) -> None:
        """Test that undoing a defer restores the previous value."""
        task = test_user.tasks[0]
        assert task.defer_until is None

        defer_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
        client.post(
            f"/api/tasks/{task.id}/defer",
            json={"defer_until": defer_date},
        )
        assert task.defer_until is not None

        # Undo
        response = client.post(f"/api/tasks/{task.id}/undo")
        assert response.status_code == 200
        assert task.defer_until is None

    def test_defer_until_in_task_response(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test that defer_until appears in task list responses."""
        task = test_user.tasks[0]
        task.defer_until = datetime.now() + timedelta(days=7)

        response = client.get("/api/tasks")
        assert response.status_code == 200
        tasks = response.json()
        deferred_task = next(t for t in tasks if t["id"] == task.id)
        assert deferred_task["defer_until"] is not None

    def test_defer_via_update(self, client: TestClient, test_user: User) -> None:
        """Test that defer_until can be set via the PUT update endpoint."""
        task = test_user.tasks[0]
        defer_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S")

        response = client.put(
            f"/api/tasks/{task.id}",
            json={"defer_until": defer_date},
        )
        assert response.status_code == 200
        assert response.json()["defer_until"] is not None


class TestDeferProcessDay:
    """Tests for defer_until auto-clear during process_day."""

    def test_process_day_clears_expired_deferrals(self) -> None:
        """Test that process_day clears defer_until when the date has passed."""
        user = User(username="test", last_processed_date=date.today())
        task = Task(
            title="Deferred Task",
            creation_date=datetime.now(),
            defer_until=datetime.now() - timedelta(days=1),  # Past date
        )
        user.tasks = [task]

        mock_manager = MagicMock()
        process_day(user, mock_manager, date.today(), {}, persist=False)

        assert task.defer_until is None

    def test_process_day_keeps_future_deferrals(self) -> None:
        """Test that process_day does not clear future defer_until dates."""
        user = User(username="test", last_processed_date=date.today())
        future_date = datetime.now() + timedelta(days=7)
        task = Task(
            title="Deferred Task",
            creation_date=datetime.now(),
            defer_until=future_date,
        )
        user.tasks = [task]

        mock_manager = MagicMock()
        process_day(user, mock_manager, date.today(), {}, persist=False)

        assert task.defer_until == future_date


class TestDeferSerialization:
    """Tests for defer_until serialization."""

    def test_deserialize_task_with_defer_until(self) -> None:
        """Test that _deserialize_task parses defer_until correctly."""
        manager = JsonDataManager()
        task_dict = {
            "id": "test-id",
            "title": "Test Task",
            "creation_date": "2025-01-01 00:00:00",
            "defer_until": "2030-06-15 00:00:00",
        }
        task = manager._deserialize_task(task_dict)

        assert task.defer_until is not None
        assert task.defer_until.year == 2030
        assert task.defer_until.month == 6
        assert task.defer_until.day == 15

    def test_deserialize_task_without_defer_until(self) -> None:
        """Test that _deserialize_task handles missing defer_until."""
        manager = JsonDataManager()
        task_dict = {
            "id": "test-id",
            "title": "Test Task",
            "creation_date": "2025-01-01 00:00:00",
        }
        task = manager._deserialize_task(task_dict)
        assert task.defer_until is None

    def test_task_model_defer_until_default(self) -> None:
        """Test that Task model defaults defer_until to None."""
        task = Task(title="Test", creation_date=datetime.now())
        assert task.defer_until is None

    def test_task_model_defer_until_set(self) -> None:
        """Test that Task model accepts defer_until."""
        defer_date = datetime(2030, 6, 15, 0, 0, 0)
        task = Task(title="Test", creation_date=datetime.now(), defer_until=defer_date)
        assert task.defer_until == defer_date
