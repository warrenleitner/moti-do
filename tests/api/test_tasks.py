# tests/api/test_tasks.py
"""
Tests for the task API endpoints.
"""

from fastapi.testclient import TestClient

from motido.core.models import User


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

    def test_get_task_by_id(self, client: TestClient, test_user: User) -> None:
        """Test getting a task by ID."""
        task_id = test_user.tasks[0].id
        response = client.get(f"/api/tasks/{task_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == task_id
        assert data["title"] == "Test Task 1"

    def test_get_task_by_partial_id(self, client: TestClient, test_user: User) -> None:
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

    def test_update_task_title(self, client: TestClient, test_user: User) -> None:
        """Test updating a task's title."""
        task_id = test_user.tasks[0].id
        response = client.put(f"/api/tasks/{task_id}", json={"title": "Updated Title"})
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"

    def test_update_task_priority(self, client: TestClient, test_user: User) -> None:
        """Test updating a task's priority."""
        task_id = test_user.tasks[0].id
        response = client.put(f"/api/tasks/{task_id}", json={"priority": "Defcon One"})
        assert response.status_code == 200
        data = response.json()
        assert data["priority"] == "Defcon One"

    def test_update_task_tags(self, client: TestClient, test_user: User) -> None:
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

    def test_delete_task(self, client: TestClient, test_user: User) -> None:
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

    def test_complete_task(self, client: TestClient, test_user: User) -> None:
        """Test completing a task."""
        task_id = test_user.tasks[0].id  # This is incomplete
        response = client.post(f"/api/tasks/{task_id}/complete")
        assert response.status_code == 200
        data = response.json()
        assert data["is_complete"] is True

    def test_complete_already_complete_task(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test completing an already complete task."""
        task_id = test_user.tasks[1].id  # This is already complete
        response = client.post(f"/api/tasks/{task_id}/complete")
        assert response.status_code == 400
        assert "already complete" in response.json()["detail"].lower()

    def test_complete_habit_updates_streak(
        self, client: TestClient, test_user: User
    ) -> None:
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

    def test_uncomplete_task(self, client: TestClient, test_user: User) -> None:
        """Test uncompleting a task."""
        task_id = test_user.tasks[1].id  # This is complete
        response = client.post(f"/api/tasks/{task_id}/uncomplete")
        assert response.status_code == 200
        data = response.json()
        assert data["is_complete"] is False

    def test_uncomplete_incomplete_task(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test uncompleting an incomplete task."""
        task_id = test_user.tasks[0].id  # This is incomplete
        response = client.post(f"/api/tasks/{task_id}/uncomplete")
        assert response.status_code == 400


class TestTaskUndo:
    """Tests for POST /api/tasks/{task_id}/undo endpoint."""

    def test_undo_title_change(self, client: TestClient, test_user: User) -> None:
        """Test undoing a title change."""
        task_id = test_user.tasks[0].id
        original_title = test_user.tasks[0].title

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"title": "Changed Title"})

        # Verify it changed
        response = client.get(f"/api/tasks/{task_id}")
        assert response.json()["title"] == "Changed Title"

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == original_title

    def test_undo_priority_change(self, client: TestClient, test_user: User) -> None:
        """Test undoing a priority change."""
        task_id = test_user.tasks[0].id
        original_priority = test_user.tasks[0].priority.value

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"priority": "Defcon One"})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        data = response.json()
        assert data["priority"] == original_priority

    def test_undo_tags_change(self, client: TestClient, test_user: User) -> None:
        """Test undoing a tags change."""
        task_id = test_user.tasks[0].id
        original_tags = list(test_user.tasks[0].tags)

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"tags": ["new-tag"]})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        data = response.json()
        assert data["tags"] == original_tags

    def test_undo_no_history(self, client: TestClient, test_user: User) -> None:
        """Test undoing when there's no history."""
        task_id = test_user.tasks[0].id

        # Try to undo with no history
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 400
        assert "no changes to undo" in response.json()["detail"].lower()

    def test_undo_task_not_found(self, client: TestClient) -> None:
        """Test undoing on non-existent task."""
        response = client.post("/api/tasks/nonexistent-id/undo")
        assert response.status_code == 404

    def test_undo_multiple_changes(self, client: TestClient, test_user: User) -> None:
        """Test undoing multiple changes one by one."""
        task_id = test_user.tasks[0].id
        original_title = test_user.tasks[0].title
        original_priority = test_user.tasks[0].priority.value

        # Make two changes
        client.put(f"/api/tasks/{task_id}", json={"title": "New Title"})
        client.put(f"/api/tasks/{task_id}", json={"priority": "Defcon One"})

        # Undo priority change first (last in, first out)
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["priority"] == original_priority
        assert response.json()["title"] == "New Title"

        # Undo title change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["title"] == original_title

    def test_history_returned_in_response(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test that history is included in task response."""
        task_id = test_user.tasks[0].id

        # Make a change
        response = client.put(f"/api/tasks/{task_id}", json={"title": "New Title"})
        assert response.status_code == 200
        data = response.json()

        # Verify history is returned
        assert "history" in data
        assert len(data["history"]) == 1
        assert data["history"][0]["field"] == "title"

    def test_undo_text_description_change(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test undoing a text_description change."""
        task_id = test_user.tasks[0].id
        original_desc = test_user.tasks[0].text_description

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"text_description": "New desc"})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["text_description"] == original_desc

    def test_undo_difficulty_change(self, client: TestClient, test_user: User) -> None:
        """Test undoing a difficulty change."""
        task_id = test_user.tasks[0].id
        original_difficulty = test_user.tasks[0].difficulty.value

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"difficulty": "Herculean"})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["difficulty"] == original_difficulty

    def test_undo_duration_change(self, client: TestClient, test_user: User) -> None:
        """Test undoing a duration change."""
        task_id = test_user.tasks[0].id
        original_duration = test_user.tasks[0].duration.value

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"duration": "Odysseyan"})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["duration"] == original_duration

    def test_undo_due_date_change(self, client: TestClient, test_user: User) -> None:
        """Test undoing a due_date change."""
        task_id = test_user.tasks[0].id
        original_due_date = test_user.tasks[0].due_date

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"due_date": "2025-12-31"})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["due_date"] == original_due_date

    def test_undo_start_date_change(self, client: TestClient, test_user: User) -> None:
        """Test undoing a start_date change."""
        task_id = test_user.tasks[0].id
        original_start_date = test_user.tasks[0].start_date

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"start_date": "2025-01-01"})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["start_date"] == original_start_date

    def test_undo_icon_change(self, client: TestClient, test_user: User) -> None:
        """Test undoing an icon change."""
        task_id = test_user.tasks[0].id
        original_icon = test_user.tasks[0].icon

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"icon": "🎯"})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["icon"] == original_icon

    def test_undo_project_change(self, client: TestClient, test_user: User) -> None:
        """Test undoing a project change."""
        task_id = test_user.tasks[0].id
        original_project = test_user.tasks[0].project

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"project": "new-project"})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["project"] == original_project

    def test_undo_is_habit_change(self, client: TestClient, test_user: User) -> None:
        """Test undoing an is_habit change."""
        task_id = test_user.tasks[0].id
        original_is_habit = test_user.tasks[0].is_habit

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"is_habit": True})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["is_habit"] == original_is_habit

    def test_undo_recurrence_rule_change(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test undoing a recurrence_rule change."""
        task_id = test_user.tasks[0].id
        original_rule = test_user.tasks[0].recurrence_rule

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"recurrence_rule": "FREQ=DAILY"})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["recurrence_rule"] == original_rule

    def test_undo_recurrence_type_change(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test undoing a recurrence_type change."""
        task_id = test_user.tasks[0].id
        original_type = (
            test_user.tasks[0].recurrence_type.value
            if test_user.tasks[0].recurrence_type
            else None
        )

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"recurrence_type": "From Completion"})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["recurrence_type"] == original_type

    def test_undo_habit_start_delta_change(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test undoing a habit_start_delta change."""
        task_id = test_user.tasks[0].id
        original_delta = test_user.tasks[0].habit_start_delta

        # Make a change
        client.put(f"/api/tasks/{task_id}", json={"habit_start_delta": 5})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["habit_start_delta"] == original_delta

    def test_undo_is_complete_change(self, client: TestClient, test_user: User) -> None:
        """Test undoing an is_complete change."""
        task_id = test_user.tasks[0].id
        original_is_complete = test_user.tasks[0].is_complete

        # Make a change via is_complete field
        client.put(f"/api/tasks/{task_id}", json={"is_complete": True})

        # Undo the change
        response = client.post(f"/api/tasks/{task_id}/undo")
        assert response.status_code == 200
        assert response.json()["is_complete"] == original_is_complete


class TestSubtasks:
    """Tests for subtask endpoints."""

    def test_add_subtask(self, client: TestClient, test_user: User) -> None:
        """Test adding a subtask."""
        task_id = test_user.tasks[0].id
        response = client.post(
            f"/api/tasks/{task_id}/subtasks", json={"text": "New Subtask"}
        )
        assert response.status_code == 200
        data = response.json()
        assert any(s["text"] == "New Subtask" for s in data["subtasks"])

    def test_update_subtask(self, client: TestClient, test_user: User) -> None:
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

    def test_delete_subtask(self, client: TestClient, test_user: User) -> None:
        """Test deleting a subtask."""
        # First add a subtask
        task_id = test_user.tasks[0].id
        client.post(f"/api/tasks/{task_id}/subtasks", json={"text": "To Delete"})

        # Then delete it
        response = client.delete(f"/api/tasks/{task_id}/subtasks/0")
        assert response.status_code == 200

    def test_subtask_index_out_of_range(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test accessing subtask with invalid index."""
        task_id = test_user.tasks[0].id
        response = client.put(
            f"/api/tasks/{task_id}/subtasks/999",
            json={"text": "Invalid", "complete": False},
        )
        assert response.status_code == 404


class TestDependencies:
    """Tests for dependency endpoints."""

    def test_add_dependency(self, client: TestClient, test_user: User) -> None:
        """Test adding a dependency."""
        task_id = test_user.tasks[0].id
        dep_id = test_user.tasks[1].id
        response = client.post(f"/api/tasks/{task_id}/dependencies/{dep_id}")
        assert response.status_code == 200
        data = response.json()
        assert dep_id in data["dependencies"]

    def test_remove_dependency(self, client: TestClient, test_user: User) -> None:
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

    def test_add_dependency_task_not_found(  # pylint: disable=unused-argument
        self, client: TestClient, test_user: User
    ) -> None:
        """Test adding dependency when task not found."""
        response = client.post("/api/tasks/nonexistent/dependencies/also-nonexistent")
        assert response.status_code == 404

    def test_add_dependency_dep_not_found(
        self, client: TestClient, test_user: User
    ) -> None:
        """Test adding dependency when dependency task not found."""
        task_id = test_user.tasks[0].id
        response = client.post(f"/api/tasks/{task_id}/dependencies/nonexistent")
        assert response.status_code == 404
