# tests/api/test_views.py
"""
Tests for the view API endpoints (calendar, heatmap, kanban, habits).
"""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from motido.core.models import Difficulty, Duration, Priority, Task


class TestCalendarEndpoint:
    """Tests for GET /api/views/calendar endpoint."""

    def test_get_calendar_empty(self, empty_client: TestClient) -> None:
        """Test getting calendar for user with no tasks."""
        response = empty_client.get("/api/views/calendar")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_calendar_returns_tasks_with_due_dates(
        self, client: TestClient, test_user
    ) -> None:
        """Test that calendar returns tasks with due dates."""
        # Add a task with due date
        task = Task(
            title="Task with due date",
            creation_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=7),
            priority=Priority.HIGH,
        )
        test_user.tasks.append(task)

        response = client.get("/api/views/calendar")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(e["title"] == "Task with due date" for e in data)

    def test_get_calendar_date_filter(self, client: TestClient, test_user) -> None:
        """Test filtering calendar by date range."""
        # Add tasks with different due dates
        past_task = Task(
            title="Past task",
            creation_date=datetime.now(),
            due_date=datetime.now() - timedelta(days=60),
            priority=Priority.LOW,
        )
        future_task = Task(
            title="Future task",
            creation_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=30),
            priority=Priority.MEDIUM,
        )
        test_user.tasks.extend([past_task, future_task])

        # Request only future events
        start = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        end = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        response = client.get(
            "/api/views/calendar", params={"start_date": start, "end_date": end}
        )
        assert response.status_code == 200
        data = response.json()
        # Should only contain future task
        assert any(e["title"] == "Future task" for e in data)
        assert not any(e["title"] == "Past task" for e in data)

    def test_calendar_event_has_color(self, client: TestClient, test_user) -> None:
        """Test that calendar events have color based on priority."""
        task = Task(
            title="High priority",
            creation_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=7),
            priority=Priority.HIGH,
        )
        test_user.tasks.append(task)

        response = client.get("/api/views/calendar")
        data = response.json()
        event = next((e for e in data if e["title"] == "High priority"), None)
        assert event is not None
        assert "color" in event

    def test_calendar_completed_task_gray(self, client: TestClient, test_user) -> None:
        """Test that completed tasks show as gray."""
        task = Task(
            title="Completed task",
            creation_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=7),
            priority=Priority.HIGH,
            is_complete=True,
        )
        test_user.tasks.append(task)

        response = client.get("/api/views/calendar")
        data = response.json()
        event = next((e for e in data if e["title"] == "Completed task"), None)
        assert event is not None
        assert event["color"] == "#9e9e9e"  # Gray


class TestHeatmapEndpoint:
    """Tests for GET /api/views/heatmap endpoint."""

    def test_get_heatmap_empty(self, empty_client: TestClient) -> None:
        """Test getting heatmap for user with no tasks."""
        response = empty_client.get("/api/views/heatmap")
        assert response.status_code == 200
        data = response.json()
        # Should still return days, just with zero counts
        assert isinstance(data, list)

    def test_get_heatmap_default_weeks(self, client: TestClient) -> None:
        """Test default heatmap returns 12 weeks of data."""
        response = client.get("/api/views/heatmap")
        assert response.status_code == 200
        data = response.json()
        # Should have roughly 12 weeks * 7 days
        assert len(data) >= 80  # Allow some variance

    def test_get_heatmap_custom_weeks(self, client: TestClient) -> None:
        """Test heatmap with custom weeks parameter."""
        response = client.get("/api/views/heatmap", params={"weeks": 4})
        assert response.status_code == 200
        data = response.json()
        # Should have roughly 4 weeks * 7 days
        assert len(data) <= 35

    def test_heatmap_day_structure(self, client: TestClient) -> None:
        """Test that heatmap day has correct structure."""
        response = client.get("/api/views/heatmap")
        data = response.json()
        if len(data) > 0:
            day = data[0]
            assert "date" in day
            assert "completed_count" in day
            assert "total_count" in day

    def test_heatmap_counts_completions(self, client: TestClient, test_user) -> None:
        """Test that heatmap counts task completions correctly."""
        today = datetime.now()
        task = Task(
            title="Today's task",
            creation_date=today,
            due_date=today,
            priority=Priority.MEDIUM,
            is_complete=True,
        )
        test_user.tasks.append(task)

        response = client.get("/api/views/heatmap")
        data = response.json()
        today_str = today.strftime("%Y-%m-%d")
        today_data = next((d for d in data if d["date"] == today_str), None)
        if today_data:
            assert today_data["completed_count"] >= 1

    def test_heatmap_filter_by_habit(self, client: TestClient, test_user) -> None:
        """Test filtering heatmap by specific habit."""
        habit = next(t for t in test_user.tasks if t.is_habit)
        response = client.get("/api/views/heatmap", params={"habit_id": habit.id})
        assert response.status_code == 200


class TestKanbanEndpoint:
    """Tests for GET /api/views/kanban endpoint."""

    def test_get_kanban_empty(self, empty_client: TestClient) -> None:
        """Test getting kanban for user with no tasks."""
        response = empty_client.get("/api/views/kanban")
        assert response.status_code == 200
        data = response.json()
        # Should return columns even if empty
        assert len(data) == 5  # backlog, todo, in_progress, blocked, done

    def test_kanban_column_structure(self, client: TestClient) -> None:
        """Test that kanban columns have correct structure."""
        response = client.get("/api/views/kanban")
        data = response.json()
        for column in data:
            assert "id" in column
            assert "title" in column
            assert "tasks" in column
            assert isinstance(column["tasks"], list)

    def test_kanban_column_names(self, client: TestClient) -> None:
        """Test that kanban has expected columns."""
        response = client.get("/api/views/kanban")
        data = response.json()
        column_ids = [c["id"] for c in data]
        assert "backlog" in column_ids
        assert "todo" in column_ids
        assert "in_progress" in column_ids
        assert "blocked" in column_ids
        assert "done" in column_ids

    def test_kanban_excludes_habits(self, client: TestClient, test_user) -> None:
        """Test that kanban excludes habit tasks."""
        response = client.get("/api/views/kanban")
        data = response.json()
        all_tasks = []
        for column in data:
            all_tasks.extend(column["tasks"])
        # No task should be a habit
        assert not any(t.get("is_habit") for t in all_tasks)

    def test_kanban_completed_in_done(self, client: TestClient, test_user) -> None:
        """Test that completed tasks are in done column."""
        response = client.get("/api/views/kanban")
        data = response.json()
        done_column = next(c for c in data if c["id"] == "done")
        # Task 2 is complete
        if len(done_column["tasks"]) > 0:
            assert all(t["is_complete"] for t in done_column["tasks"])

    def test_kanban_filter_by_project(self, client: TestClient) -> None:
        """Test filtering kanban by project."""
        response = client.get("/api/views/kanban", params={"project": "Test Project"})
        assert response.status_code == 200
        data = response.json()
        all_tasks = []
        for column in data:
            all_tasks.extend(column["tasks"])
        # All tasks should be from Test Project
        for task in all_tasks:
            assert task.get("project") == "Test Project"

    def test_kanban_filter_by_tag(self, client: TestClient) -> None:
        """Test filtering kanban by tag."""
        response = client.get("/api/views/kanban", params={"tag": "work"})
        assert response.status_code == 200
        data = response.json()
        all_tasks = []
        for column in data:
            all_tasks.extend(column["tasks"])
        # All tasks should have 'work' tag
        for task in all_tasks:
            assert "work" in task.get("tags", [])

    def test_kanban_blocked_tasks(self, client: TestClient, test_user) -> None:
        """Test that tasks with incomplete dependencies are in blocked column."""
        # Create a task that depends on an incomplete task
        task1 = test_user.tasks[0]  # This is incomplete
        blocking_task = Task(
            title="Blocked Task",
            creation_date=datetime.now(),
            priority=Priority.MEDIUM,
            dependencies=[task1.id],
        )
        test_user.tasks.append(blocking_task)

        response = client.get("/api/views/kanban")
        data = response.json()
        blocked_column = next(c for c in data if c["id"] == "blocked")
        assert any(t["title"] == "Blocked Task" for t in blocked_column["tasks"])


class TestHabitsEndpoint:
    """Tests for GET /api/views/habits endpoint."""

    def test_get_habits_empty(self, empty_client: TestClient) -> None:
        """Test getting habits for user with no habits."""
        response = empty_client.get("/api/views/habits")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_habits_returns_only_habits(self, client: TestClient) -> None:
        """Test that endpoint returns only habit tasks."""
        response = client.get("/api/views/habits")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        for task in data:
            assert task["is_habit"] is True

    def test_get_habits_excludes_instances_by_default(
        self, client: TestClient, test_user
    ) -> None:
        """Test that habit instances are excluded by default."""
        # Add a habit instance
        parent_habit = next(t for t in test_user.tasks if t.is_habit)
        instance = Task(
            title="Habit Instance",
            creation_date=datetime.now(),
            priority=Priority.MEDIUM,
            is_habit=True,
            parent_habit_id=parent_habit.id,
        )
        test_user.tasks.append(instance)

        response = client.get("/api/views/habits")
        data = response.json()
        # Should not include the instance
        assert not any(t["title"] == "Habit Instance" for t in data)

    def test_get_habits_include_instances(self, client: TestClient, test_user) -> None:
        """Test including habit instances."""
        parent_habit = next(t for t in test_user.tasks if t.is_habit)
        instance = Task(
            title="Habit Instance",
            creation_date=datetime.now(),
            priority=Priority.MEDIUM,
            is_habit=True,
            parent_habit_id=parent_habit.id,
        )
        test_user.tasks.append(instance)

        response = client.get("/api/views/habits", params={"include_instances": True})
        data = response.json()
        # Should include the instance
        assert any(t["title"] == "Habit Instance" for t in data)

    def test_habits_have_streak_info(self, client: TestClient) -> None:
        """Test that habits include streak information."""
        response = client.get("/api/views/habits")
        data = response.json()
        if len(data) > 0:
            habit = data[0]
            assert "streak_current" in habit
            assert "streak_best" in habit
