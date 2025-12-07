# tests/api/test_user.py
"""
Tests for the user API endpoints.
"""

import pytest
from fastapi.testclient import TestClient


class TestUserProfile:
    """Tests for GET /api/user/profile endpoint."""

    def test_get_profile(self, client: TestClient) -> None:
        """Test getting user profile."""
        response = client.get("/api/user/profile")
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "test_user"
        assert data["total_xp"] == 500
        assert "level" in data
        assert "last_processed_date" in data
        assert "vacation_mode" in data

    def test_profile_level_calculation(self, client: TestClient) -> None:
        """Test that level is calculated from XP."""
        response = client.get("/api/user/profile")
        data = response.json()
        # With 500 XP, should be at least level 1
        assert data["level"] >= 1


class TestUserStats:
    """Tests for GET /api/user/stats endpoint."""

    def test_get_stats(self, client: TestClient) -> None:
        """Test getting user statistics."""
        response = client.get("/api/user/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total_tasks"] == 3
        assert data["completed_tasks"] == 1
        assert data["pending_tasks"] == 2
        assert data["habits_count"] == 1
        assert data["total_xp"] == 500
        assert "level" in data
        assert "badges_earned" in data
        assert "current_streak" in data
        assert "best_streak" in data

    def test_stats_empty_user(self, empty_client: TestClient) -> None:
        """Test stats for user with no tasks."""
        response = empty_client.get("/api/user/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total_tasks"] == 0
        assert data["completed_tasks"] == 0
        assert data["habits_count"] == 0


class TestXPEndpoints:
    """Tests for XP-related endpoints."""

    def test_get_xp_log(self, client: TestClient) -> None:
        """Test getting XP transaction log."""
        response = client.get("/api/user/xp")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_xp_log_with_limit(self, client: TestClient) -> None:
        """Test XP log with limit parameter."""
        response = client.get("/api/user/xp", params={"limit": 10})
        assert response.status_code == 200

    def test_withdraw_xp_success(self, client: TestClient, test_user) -> None:
        """Test withdrawing XP successfully."""
        response = client.post(
            "/api/user/xp/withdraw",
            json={"amount": 100, "description": "Test reward"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == -100
        assert data["source"] == "withdrawal"
        assert "Test reward" in data["description"]

    def test_withdraw_xp_insufficient(self, client: TestClient) -> None:
        """Test withdrawing more XP than available."""
        response = client.post(
            "/api/user/xp/withdraw",
            json={"amount": 10000, "description": "Too much"},
        )
        assert response.status_code == 400
        assert "insufficient" in response.json()["detail"].lower()

    def test_withdraw_xp_negative_amount(self, client: TestClient) -> None:
        """Test withdrawing negative amount is rejected."""
        response = client.post(
            "/api/user/xp/withdraw",
            json={"amount": -50, "description": "Invalid"},
        )
        assert response.status_code == 422  # Validation error


class TestBadges:
    """Tests for badge endpoints."""

    def test_get_badges(self, client: TestClient) -> None:
        """Test getting badges."""
        response = client.get("/api/user/badges")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestTags:
    """Tests for tag endpoints."""

    def test_get_tags(self, client: TestClient) -> None:
        """Test getting all tags."""
        response = client.get("/api/user/tags")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert any(t["name"] == "work" for t in data)

    def test_create_tag(self, client: TestClient) -> None:
        """Test creating a new tag."""
        response = client.post(
            "/api/user/tags", json={"name": "urgent", "color": "#FF0000"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "urgent"
        assert data["color"] == "#FF0000"
        assert "id" in data

    def test_create_duplicate_tag(self, client: TestClient) -> None:
        """Test creating a duplicate tag fails."""
        response = client.post(
            "/api/user/tags", json={"name": "work", "color": "#000000"}
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    def test_update_tag(self, client: TestClient, test_user) -> None:
        """Test updating a tag."""
        tag_id = test_user.defined_tags[0].id
        response = client.put(
            f"/api/user/tags/{tag_id}",
            json={"name": "updated-work", "color": "#00FF00"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "updated-work"

    def test_update_tag_not_found(self, client: TestClient) -> None:
        """Test updating non-existent tag."""
        response = client.put(
            "/api/user/tags/nonexistent",
            json={"name": "test", "color": "#000000"},
        )
        assert response.status_code == 404

    def test_delete_tag(self, client: TestClient, test_user) -> None:
        """Test deleting a tag."""
        tag_id = test_user.defined_tags[0].id
        response = client.delete(f"/api/user/tags/{tag_id}")
        assert response.status_code == 204

    def test_delete_tag_not_found(self, client: TestClient) -> None:
        """Test deleting non-existent tag."""
        response = client.delete("/api/user/tags/nonexistent")
        assert response.status_code == 404


class TestProjects:
    """Tests for project endpoints."""

    def test_get_projects(self, client: TestClient) -> None:
        """Test getting all projects."""
        response = client.get("/api/user/projects")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Project"

    def test_create_project(self, client: TestClient) -> None:
        """Test creating a new project."""
        response = client.post(
            "/api/user/projects", json={"name": "New Project", "color": "#123456"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Project"
        assert "id" in data

    def test_create_duplicate_project(self, client: TestClient) -> None:
        """Test creating a duplicate project fails."""
        response = client.post(
            "/api/user/projects", json={"name": "Test Project", "color": "#000000"}
        )
        assert response.status_code == 400

    def test_update_project(self, client: TestClient, test_user) -> None:
        """Test updating a project."""
        project_id = test_user.defined_projects[0].id
        response = client.put(
            f"/api/user/projects/{project_id}",
            json={"name": "Updated Project", "color": "#ABCDEF"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Project"

    def test_delete_project(self, client: TestClient, test_user) -> None:
        """Test deleting a project."""
        project_id = test_user.defined_projects[0].id
        response = client.delete(f"/api/user/projects/{project_id}")
        assert response.status_code == 204

    def test_delete_project_not_found(self, client: TestClient) -> None:
        """Test deleting non-existent project."""
        response = client.delete("/api/user/projects/nonexistent")
        assert response.status_code == 404
