# tests/api/test_system.py
"""
Tests for the system API endpoints (health, status, advance, vacation).
"""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Tests for GET /api/health endpoint."""

    def test_health_check(self, client: TestClient) -> None:
        """Test health check returns healthy status."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data

    def test_health_check_no_auth(self, empty_client: TestClient) -> None:
        """Test health check works without authentication."""
        response = empty_client.get("/api/health")
        assert response.status_code == 200


class TestSystemStatusEndpoint:
    """Tests for GET /api/system/status endpoint."""

    def test_get_system_status(self, client: TestClient) -> None:
        """Test getting system status."""
        response = client.get("/api/system/status")
        assert response.status_code == 200
        data = response.json()
        assert "last_processed_date" in data
        assert "current_date" in data
        assert "vacation_mode" in data
        assert "pending_days" in data

    def test_system_status_date_formats(self, client: TestClient) -> None:
        """Test that dates are in correct format."""
        response = client.get("/api/system/status")
        data = response.json()
        # Dates should be ISO format strings
        assert isinstance(data["last_processed_date"], str)
        assert isinstance(data["current_date"], str)
        # Should be parseable
        date.fromisoformat(data["last_processed_date"])
        date.fromisoformat(data["current_date"])

    def test_system_status_pending_days_calculation(
        self, client: TestClient, test_user
    ) -> None:
        """Test that pending days is calculated correctly."""
        # Set last processed to 3 days ago
        test_user.last_processed_date = date.today() - timedelta(days=3)

        response = client.get("/api/system/status")
        data = response.json()
        assert data["pending_days"] == 3


class TestAdvanceDateEndpoint:
    """Tests for POST /api/system/advance endpoint."""

    def test_advance_to_today(self, client: TestClient, test_user) -> None:
        """Test advancing to today's date."""
        test_user.last_processed_date = date.today() - timedelta(days=2)

        response = client.post("/api/system/advance", json={})
        assert response.status_code == 200
        data = response.json()
        assert data["last_processed_date"] == str(date.today())
        assert data["pending_days"] == 0

    def test_advance_by_days(self, client: TestClient, test_user) -> None:
        """Test advancing by specific number of days."""
        start_date = date.today() - timedelta(days=5)
        test_user.last_processed_date = start_date

        response = client.post("/api/system/advance", json={"days": 2})
        assert response.status_code == 200
        data = response.json()
        expected_date = start_date + timedelta(days=2)
        assert data["last_processed_date"] == str(expected_date)

    def test_advance_to_specific_date(self, client: TestClient, test_user) -> None:
        """Test advancing to a specific date."""
        test_user.last_processed_date = date.today() - timedelta(days=5)
        target = date.today() - timedelta(days=2)

        response = client.post("/api/system/advance", json={"to_date": str(target)})
        assert response.status_code == 200
        data = response.json()
        assert data["last_processed_date"] == str(target)

    def test_advance_cannot_go_past_today(self, client: TestClient, test_user) -> None:
        """Test that advance cannot go past today."""
        test_user.last_processed_date = date.today() - timedelta(days=1)
        future = date.today() + timedelta(days=5)

        response = client.post("/api/system/advance", json={"to_date": str(future)})
        assert response.status_code == 200
        data = response.json()
        # Should be capped at today
        assert data["last_processed_date"] == str(date.today())

    def test_advance_with_vacation_mode(self, client: TestClient, test_user) -> None:
        """Test that vacation mode is included in response."""
        test_user.vacation_mode = True
        test_user.last_processed_date = date.today() - timedelta(days=1)

        response = client.post("/api/system/advance", json={})
        assert response.status_code == 200
        data = response.json()
        assert data["vacation_mode"] is True


class TestVacationModeEndpoint:
    """Tests for POST /api/system/vacation endpoint."""

    def test_enable_vacation_mode(self, client: TestClient, test_user) -> None:
        """Test enabling vacation mode."""
        test_user.vacation_mode = False

        response = client.post("/api/system/vacation", params={"enable": True})
        assert response.status_code == 200
        data = response.json()
        assert data["vacation_mode"] is True

    def test_disable_vacation_mode(self, client: TestClient, test_user) -> None:
        """Test disabling vacation mode."""
        test_user.vacation_mode = True

        response = client.post("/api/system/vacation", params={"enable": False})
        assert response.status_code == 200
        data = response.json()
        assert data["vacation_mode"] is False

    def test_vacation_mode_persists(self, client: TestClient, test_user) -> None:
        """Test that vacation mode change persists."""
        response = client.post("/api/system/vacation", params={"enable": True})
        assert response.status_code == 200

        # Check status endpoint reflects the change
        status_response = client.get("/api/system/status")
        assert status_response.json()["vacation_mode"] is True


class TestOpenAPIEndpoint:
    """Tests for OpenAPI documentation endpoints."""

    def test_openapi_json(self, client: TestClient) -> None:
        """Test OpenAPI JSON endpoint."""
        response = client.get("/api/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert data["info"]["title"] == "Moti-Do API"

    def test_docs_endpoint(self, client: TestClient) -> None:
        """Test Swagger docs endpoint."""
        response = client.get("/api/docs")
        assert response.status_code == 200

    def test_redoc_endpoint(self, client: TestClient) -> None:
        """Test ReDoc endpoint."""
        response = client.get("/api/redoc")
        assert response.status_code == 200
