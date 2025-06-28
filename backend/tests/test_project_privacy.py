"""
Unit tests for project privacy functionality.

Tests the public/private toggle feature for projects including:
- Project creation with privacy settings
- Privacy toggle endpoint
- Public API privacy enforcement
- Authorization and validation
"""

import os

# Set testing environment variable before importing
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from test_helpers import create_test_user

from database import Base, override_engine
from main import app, get_db
from models import Incident, Project, SubscriptionStatus, SubscriptionTier, User

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
override_engine(engine)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables once at module level
Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create tables once for the entire test session"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def clean_database():
    """Clean all data before each test"""
    db = TestingSessionLocal()
    try:
        # Delete all data in reverse dependency order
        db.query(Incident).delete()
        db.query(Project).delete()
        db.query(User).delete()
        db.commit()
    finally:
        db.close()
    yield


@pytest.fixture
def test_user():
    db = TestingSessionLocal()
    user = create_test_user(
        email="test@example.com",
        name="Test User",
        google_id="test_google_123",
        subscription_tier=SubscriptionTier.FREE,
        subscription_status=SubscriptionStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def other_user():
    db = TestingSessionLocal()
    user = create_test_user(
        email="other@example.com",
        name="Other User",
        google_id="other_google_123",
        subscription_tier=SubscriptionTier.FREE,
        subscription_status=SubscriptionStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def auth_headers(test_user):
    from auth import create_access_token

    token = create_access_token({"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_auth_headers(other_user):
    from auth import create_access_token

    token = create_access_token({"sub": other_user.email})
    return {"Authorization": f"Bearer {token}"}


class TestProjectCreationWithPrivacy:
    """Test project creation with privacy settings."""

    def test_create_public_project_explicit(self, test_user, auth_headers):
        """Test creating a project with explicit public setting."""
        response = client.post(
            "/projects/",
            json={"name": "Public Project", "is_public": True},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Public Project"
        assert data["is_public"] is True
        assert "id" in data

    def test_create_private_project(self, test_user, auth_headers):
        """Test creating a project with private setting."""
        response = client.post(
            "/projects/",
            json={"name": "Private Project", "is_public": False},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Private Project"
        assert data["is_public"] is False

    def test_create_project_default_privacy(self, test_user, auth_headers):
        """Test that projects default to private when privacy not specified."""
        response = client.post(
            "/projects/", json={"name": "Default Project"}, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Default Project"
        assert data["is_public"] is False  # Should default to private for security

    def test_list_projects_includes_privacy(self, test_user, auth_headers):
        """Test that project listing includes privacy information."""
        # Create both public and private projects
        response1 = client.post(
            "/projects/",
            json={"name": "Public Privacy Test", "is_public": True},
            headers=auth_headers,
        )
        assert response1.status_code == 200

        response2 = client.post(
            "/projects/",
            json={"name": "Private Privacy Test", "is_public": False},
            headers=auth_headers,
        )
        assert response2.status_code == 200

        response = client.get("/projects/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        # Filter to only our test projects
        test_projects = [p for p in data if "Privacy Test" in p["name"]]
        assert len(test_projects) == 2

        # Check that privacy information is included
        projects_by_name = {p["name"]: p for p in test_projects}
        assert projects_by_name["Public Privacy Test"]["is_public"] is True
        assert projects_by_name["Private Privacy Test"]["is_public"] is False


class TestProjectPrivacyUpdate:
    """Test the project privacy update endpoint."""

    def test_update_project_privacy_to_private(self, test_user, auth_headers):
        """Test updating a public project to private."""
        # Create a public project
        create_response = client.post(
            "/projects/",
            json={"name": "Test Project", "is_public": True},
            headers=auth_headers,
        )
        project_id = create_response.json()["id"]

        # Update to private
        response = client.patch(
            f"/projects/{project_id}", json={"is_public": False}, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_public"] is False
        assert data["name"] == "Test Project"  # Name unchanged

    def test_update_project_privacy_to_public(self, test_user, auth_headers):
        """Test updating a private project to public."""
        # Create a private project
        create_response = client.post(
            "/projects/",
            json={"name": "Test Project", "is_public": False},
            headers=auth_headers,
        )
        project_id = create_response.json()["id"]

        # Update to public
        response = client.patch(
            f"/projects/{project_id}", json={"is_public": True}, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_public"] is True

    def test_update_project_name_and_privacy(self, test_user, auth_headers):
        """Test updating both name and privacy in single request."""
        # Create a project
        create_response = client.post(
            "/projects/",
            json={"name": "Old Name", "is_public": True},
            headers=auth_headers,
        )
        project_id = create_response.json()["id"]

        # Update both name and privacy
        response = client.patch(
            f"/projects/{project_id}",
            json={"name": "New Name", "is_public": False},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["is_public"] is False

    def test_update_project_unauthorized(
        self, test_user, other_user, auth_headers, other_auth_headers
    ):
        """Test that users cannot update projects they don't own."""
        # Create a project as test_user
        create_response = client.post(
            "/projects/",
            json={"name": "Test Project", "is_public": True},
            headers=auth_headers,
        )
        project_id = create_response.json()["id"]

        # Try to update as other_user
        response = client.patch(
            f"/projects/{project_id}",
            json={"is_public": False},
            headers=other_auth_headers,
        )
        assert response.status_code == 403

    def test_update_nonexistent_project(self, test_user, auth_headers):
        """Test updating a project that doesn't exist."""
        response = client.patch(
            "/projects/999", json={"is_public": False}, headers=auth_headers
        )
        assert response.status_code == 404

    def test_update_project_unauthenticated(self):
        """Test updating project without authentication."""
        response = client.patch("/projects/1", json={"is_public": False})
        assert response.status_code == 401


class TestPublicAPIPrivacyEnforcement:
    """Test that the public API respects privacy settings."""

    def test_public_project_accessible(self, test_user, auth_headers):
        """Test that public projects are accessible via public API."""
        # Create a public project using the API to ensure all fields are set correctly
        response = client.post(
            "/projects/",
            json={"name": "Public API Test Project", "is_public": True},
            headers=auth_headers,
        )
        assert response.status_code == 200
        project_data = response.json()
        project_id = project_data["id"]

        # Add an incident to the project
        response = client.post(
            "/incidents/",
            json={
                "project_id": project_id,
                "title": "Public API Test Incident",
                "description": "This is a public incident for API testing",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Access via public API
        response = client.get(f"/public/{project_id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Public API Test Incident"

    def test_private_project_not_accessible(self, test_user, auth_headers):
        """Test that private projects return 404 via public API."""
        # Create a private project using the API to ensure all fields are set correctly
        response = client.post(
            "/projects/",
            json={"name": "Private API Test Project", "is_public": False},
            headers=auth_headers,
        )
        assert response.status_code == 200
        project_data = response.json()
        project_id = project_data["id"]

        # Add an incident to the project
        response = client.post(
            "/incidents/",
            json={
                "project_id": project_id,
                "title": "Private API Test Incident",
                "description": "This is a private incident for API testing",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Try to access via public API
        response = client.get(f"/public/{project_id}")
        assert response.status_code == 404
        assert response.json()["detail"] == "Project not found"

    def test_privacy_toggle_affects_public_access(self, test_user, auth_headers):
        """Test that toggling privacy immediately affects public access."""
        # Create a public project
        create_response = client.post(
            "/projects/",
            json={"name": "Toggle Project", "is_public": True},
            headers=auth_headers,
        )
        project_id = create_response.json()["id"]

        # Verify it's publicly accessible
        response = client.get(f"/public/{project_id}")
        assert response.status_code == 200

        # Make it private
        client.patch(
            f"/projects/{project_id}", json={"is_public": False}, headers=auth_headers
        )

        # Verify it's no longer publicly accessible
        response = client.get(f"/public/{project_id}")
        assert response.status_code == 404

        # Make it public again
        client.patch(
            f"/projects/{project_id}", json={"is_public": True}, headers=auth_headers
        )

        # Verify it's publicly accessible again
        response = client.get(f"/public/{project_id}")
        assert response.status_code == 200

    def test_private_project_still_accessible_to_owner(self, test_user, auth_headers):
        """Test that private projects are still accessible to owners via authenticated endpoints."""
        # Create a private project with incident
        create_response = client.post(
            "/projects/",
            json={"name": "Private Project", "is_public": False},
            headers=auth_headers,
        )
        project_id = create_response.json()["id"]

        # Add an incident
        client.post(
            "/incidents/",
            json={
                "project_id": project_id,
                "title": "Private Incident",
                "description": "This should be accessible to owner",
            },
            headers=auth_headers,
        )

        # Owner should still be able to access via authenticated endpoint
        response = client.get(f"/projects/{project_id}/incidents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Private Incident"


class TestPrivacyValidation:
    """Test validation and edge cases for privacy settings."""

    def test_privacy_field_type_validation(self, test_user, auth_headers):
        """Test that privacy field only accepts boolean values."""
        # Test invalid privacy value during creation
        response = client.post(
            "/projects/",
            json={"name": "Test Project", "is_public": "not_a_boolean"},
            headers=auth_headers,
        )
        assert response.status_code == 422

        # Create a valid project first
        create_response = client.post(
            "/projects/",
            json={"name": "Test Project", "is_public": True},
            headers=auth_headers,
        )
        project_id = create_response.json()["id"]

        # Test invalid privacy value during update
        response = client.patch(
            f"/projects/{project_id}",
            json={"is_public": "invalid"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_partial_update_preserves_other_fields(self, test_user, auth_headers):
        """Test that partial updates don't affect other fields."""
        # Create a project
        create_response = client.post(
            "/projects/",
            json={"name": "Original Name", "is_public": True},
            headers=auth_headers,
        )
        project_id = create_response.json()["id"]

        # Update only privacy
        response = client.patch(
            f"/projects/{project_id}", json={"is_public": False}, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Original Name"  # Name preserved
        assert data["is_public"] is False

        # Update only name
        response = client.patch(
            f"/projects/{project_id}", json={"name": "New Name"}, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["is_public"] is False  # Privacy preserved

    def test_empty_update_request(self, test_user, auth_headers):
        """Test that empty update request is handled gracefully."""
        # Create a project
        create_response = client.post(
            "/projects/",
            json={"name": "Test Project", "is_public": True},
            headers=auth_headers,
        )
        project_id = create_response.json()["id"]

        # Send empty update
        response = client.patch(
            f"/projects/{project_id}", json={}, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Project"  # Unchanged
        assert data["is_public"] is True  # Unchanged


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
