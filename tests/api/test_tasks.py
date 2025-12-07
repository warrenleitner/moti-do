# tests/api/test_tasks.py
"""
Tests for the task API endpoints.
"""

import pytest
from fastapi.testclient import TestClient


class TestTaskList:
    """Tests for GET /api/tasks endpoint."""

    def test_list_tasks_returns_all_tasks(self, client: TestClient) -> None:
        """Test that listing tasks returns all tasks."""
        response = client.get("/api/tasks")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    def test_list_tasks_filter_by_status_pending(self, client: TestClient) -> None:
        """Test filtering tasks by pending status."""
        response = client.get("/api/tasks", params={"status_filter": "pending"})
        assert response.status_code == 200
        data = response.json()
        assert all(not task["is_complete"] for task in data)

    def test_list_tasks_filter_by_status_completed(self, client: TestClient) -> None:
        """Test filtering tasks by completed status."""
        response = client.get("/api/tasks", params={"status_filter": "completed"})
        assert response.status_code == 200
        data = response.json()
        assert all(task["is_complete"] for task in data)

    def test_list_tasks_filter_by_tag(self, client: TestClient) -> None:
        """Test filtering tasks by tag."""
        response = client.get("/api/tasks", params={"tag": "work"})
        assert response.status_code == 200
        data = response.json()
        assert all("work" in task["tags"] for task in data)

    def test_list_tasks_filter_by_project(self, client: TestClient) -> None:
        """Test filtering tasks by project."""
        response = client.get("/api/tasks", params={"project": "Test Project"})
        assert response.status_code == 200
        data = response.json()
        assert all(task["project"] == "Test Project" for task in data)

    def test_list_tasks_filter_by_is_habit(self, client: TestClient) -> None:
        """Test filtering tasks by habit status."""
        response = client.get("/api/tasks", params={"is_habit": True})
        assert response.status_code == 200
        data = response.json()
        assert all(task["is_habit"] for task in data)

    def test_list_tasks_empty_user(self, empty_client: TestClient) -> None:
        """Test listing tasks for user with no tasks."""
        response = empty_client.get("/api/tasks")
        assert response.status_code == 200
        assert response.json() == []


class TestTaskCreate:
    """Tests for POST /api/tasks endpoint."""

    def test_create_task_minimal(self, client: TestClient) -> None:
        """Test creating a task with minimal fields."""
        response = client.post("/api/tasks", json={"title": "New Task"})
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Task"
        assert data["is_complete"] is False
        assert "id" in data

    def test_create_task_full(self, client: TestClient) -> None:
        """Test creating a task with all fields."""
        task_data = {
            "title": "Full Task",
            "text_description": "A detailed description",
            "priority": "High",
            "difficulty": "High",  # Valid values: Trivial, Low, Medium, High, Herculean
            "duration": "Long",
            "tags": ["work", "urgent"],
            "project": "Test Project",
            "due_date": "2025-12-31T23:59:59",
        }
        response = client.post("/api/tasks", json=task_data)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Full Task"
        assert data["text_description"] == "A detailed description"
        assert data["priority"] == "High"
        assert data["difficulty"] == "High"
        assert "work" in data["tags"]

    def test_create_habit(self, client: TestClient) -> None:
        """Test creating a habit."""
        habit_data = {
            "title": "Daily Exercise",
            "is_habit": True,
            "recurrence_rule": "daily",
        }
        response = client.post("/api/tasks", json=habit_data)
        assert response.status_code == 201
        data = response.json()
        assert data["is_habit"] is True
        assert data["recurrence_rule"] == "daily"

    def test_create_task_with_subtasks(self, client: TestClient) -> None:
        """Test creating a task with subtasks."""
        task_data = {
            "title": "Task with Subtasks",
            "subtasks": [{"text": "Step 1"}, {"text": "Step 2"}],
        }
        response = client.post("/api/tasks", json=task_data)
        assert response.status_code == 201
        data = response.json()
        assert len(data["subtasks"]) == 2
        assert data["subtasks"][0]["text"] == "Step 1"
        assert data["subtasks"][0]["complete"] is False


class TestTaskGet:
    """Tests for GET /api/tasks/{task_id} endpoint."""

    def test_get_task_by_id(self, client: TestClient, test_user) -> None:
        """Test getting a task by ID."""
        task_id = test_user.tasks[0].id
        response = client.get(f"/api/tasks/{task_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == task_id
        assert data["title"] == "Test Task 1"

    def test_get_task_by_partial_id(self, client: TestClient, test_user) -> None:
        """Test getting a task by partial ID."""
        task_id = test_user.tasks[0].id[:8]
        response = client.get(f"/api/tasks/{task_id}")
        assert response.status_code == 200

    def test_get_task_not_found(self, client: TestClient) -> None:
        """Test getting a non-existent task."""
        response = client.get("/api/tasks/nonexistent-id")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestTaskUpdate:
    """Tests for PUT /api/tasks/{task_id} endpoint."""

    def test_update_task_title(self, client: TestClient, test_user) -> None:
        """Test updating a task's title."""
        task_id = test_user.tasks[0].id
        response = client.put(f"/api/tasks/{task_id}", json={"title": "Updated Title"})
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"

    def test_update_task_priority(self, client: TestClient, test_user) -> None:
        """Test updating a task's priority."""
        task_id = test_user.tasks[0].id
        response = client.put(f"/api/tasks/{task_id}", json={"priority": "Defcon One"})
        assert response.status_code == 200
        data = response.json()
        assert data["priority"] == "Defcon One"

    def test_update_task_tags(self, client: TestClient, test_user) -> None:
        """Test updating a task's tags."""
        task_id = test_user.tasks[0].id
        response = client.put(f"/api/tasks/{task_id}", json={"tags": ["new-tag"]})
        assert response.status_code == 200
        data = response.json()
        assert "new-tag" in data["tags"]

    def test_update_task_not_found(self, client: TestClient) -> None:
        """Test updating a non-existent task."""
        response = client.put("/api/tasks/nonexistent-id", json={"title": "New"})
        assert response.status_code == 404


class TestTaskDelete:
    """Tests for DELETE /api/tasks/{task_id} endpoint."""

    def test_delete_task(self, client: TestClient, test_user) -> None:
        """Test deleting a task."""
        task_id = test_user.tasks[0].id
        response = client.delete(f"/api/tasks/{task_id}")
        assert response.status_code == 204

        # Verify it's gone
        response = client.get(f"/api/tasks/{task_id}")
        assert response.status_code == 404

    def test_delete_task_not_found(self, client: TestClient) -> None:
        """Test deleting a non-existent task."""
        response = client.delete("/api/tasks/nonexistent-id")
        assert response.status_code == 404


class TestTaskComplete:
    """Tests for POST /api/tasks/{task_id}/complete endpoint."""

    def test_complete_task(self, client: TestClient, test_user) -> None:
        """Test completing a task."""
        task_id = test_user.tasks[0].id  # This is incomplete
        response = client.post(f"/api/tasks/{task_id}/complete")
        assert response.status_code == 200
        data = response.json()
        assert data["is_complete"] is True

    def test_complete_already_complete_task(self, client: TestClient, test_user) -> None:
        """Test completing an already complete task."""
        task_id = test_user.tasks[1].id  # This is already complete
        response = client.post(f"/api/tasks/{task_id}/complete")
        assert response.status_code == 400
        assert "already complete" in response.json()["detail"].lower()

    def test_complete_habit_updates_streak(self, client: TestClient, test_user) -> None:
        """Test that completing a habit updates the streak."""
        habit = next(t for t in test_user.tasks if t.is_habit)
        original_streak = habit.streak_current
        response = client.post(f"/api/tasks/{habit.id}/complete")
        assert response.status_code == 200
        data = response.json()
        assert data["streak_current"] == original_streak + 1

    def test_complete_task_not_found(self, client: TestClient) -> None:
        """Test completing a non-existent task."""
        response = client.post("/api/tasks/nonexistent-id/complete")
        assert response.status_code == 404


class TestTaskUncomplete:
    """Tests for POST /api/tasks/{task_id}/uncomplete endpoint."""

    def test_uncomplete_task(self, client: TestClient, test_user) -> None:
        """Test uncompleting a task."""
        task_id = test_user.tasks[1].id  # This is complete
        response = client.post(f"/api/tasks/{task_id}/uncomplete")
        assert response.status_code == 200
        data = response.json()
        assert data["is_complete"] is False

    def test_uncomplete_incomplete_task(self, client: TestClient, test_user) -> None:
        """Test uncompleting an incomplete task."""
        task_id = test_user.tasks[0].id  # This is incomplete
        response = client.post(f"/api/tasks/{task_id}/uncomplete")
        assert response.status_code == 400


class TestSubtasks:
    """Tests for subtask endpoints."""

    def test_add_subtask(self, client: TestClient, test_user) -> None:
        """Test adding a subtask."""
        task_id = test_user.tasks[0].id
        response = client.post(
            f"/api/tasks/{task_id}/subtasks", json={"text": "New Subtask"}
        )
        assert response.status_code == 200
        data = response.json()
        assert any(s["text"] == "New Subtask" for s in data["subtasks"])

    def test_update_subtask(self, client: TestClient, test_user) -> None:
        """Test updating a subtask."""
        # First add a subtask
        task_id = test_user.tasks[0].id
        client.post(f"/api/tasks/{task_id}/subtasks", json={"text": "Subtask"})

        # Then update it
        response = client.put(
            f"/api/tasks/{task_id}/subtasks/0",
            json={"text": "Updated Subtask", "complete": True},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["subtasks"][0]["text"] == "Updated Subtask"
        assert data["subtasks"][0]["complete"] is True

    def test_delete_subtask(self, client: TestClient, test_user) -> None:
        """Test deleting a subtask."""
        # First add a subtask
        task_id = test_user.tasks[0].id
        client.post(f"/api/tasks/{task_id}/subtasks", json={"text": "To Delete"})

        # Then delete it
        response = client.delete(f"/api/tasks/{task_id}/subtasks/0")
        assert response.status_code == 200

    def test_subtask_index_out_of_range(self, client: TestClient, test_user) -> None:
        """Test accessing subtask with invalid index."""
        task_id = test_user.tasks[0].id
        response = client.put(
            f"/api/tasks/{task_id}/subtasks/999",
            json={"text": "Invalid", "complete": False},
        )
        assert response.status_code == 404


class TestDependencies:
    """Tests for dependency endpoints."""

    def test_add_dependency(self, client: TestClient, test_user) -> None:
        """Test adding a dependency."""
        task_id = test_user.tasks[0].id
        dep_id = test_user.tasks[1].id
        response = client.post(f"/api/tasks/{task_id}/dependencies/{dep_id}")
        assert response.status_code == 200
        data = response.json()
        assert dep_id in data["dependencies"]

    def test_remove_dependency(self, client: TestClient, test_user) -> None:
        """Test removing a dependency."""
        # First add a dependency
        task_id = test_user.tasks[0].id
        dep_id = test_user.tasks[1].id
        client.post(f"/api/tasks/{task_id}/dependencies/{dep_id}")

        # Then remove it
        response = client.delete(f"/api/tasks/{task_id}/dependencies/{dep_id}")
        assert response.status_code == 200
        data = response.json()
        assert dep_id not in data["dependencies"]

    def test_add_dependency_task_not_found(self, client: TestClient, test_user) -> None:
        """Test adding dependency when task not found."""
        response = client.post("/api/tasks/nonexistent/dependencies/also-nonexistent")
        assert response.status_code == 404

    def test_add_dependency_dep_not_found(self, client: TestClient, test_user) -> None:
        """Test adding dependency when dependency task not found."""
        task_id = test_user.tasks[0].id
        response = client.post(f"/api/tasks/{task_id}/dependencies/nonexistent")
        assert response.status_code == 404
