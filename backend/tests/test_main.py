import datetime
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
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == "test@example.com").first()
    if existing_user:
        db.close()
        return existing_user

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
def auth_headers(test_user):
    # Since we're using Google OAuth now, we need to create a JWT token directly
    from auth import create_access_token

    token = create_access_token({"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}


class TestConfiguration:
    def test_config_endpoint(self):
        """Test the configuration endpoint returns proper feature toggles"""
        response = client.get("/config")
        assert response.status_code == 200
        data = response.json()
        assert "billing_enabled" in data
        assert "features" in data


class TestHealthEndpoints:
    def test_root_endpoint(self):
        """Test the root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    def test_health_endpoint(self):
        """Test the health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestProjects:
    def test_create_project_success(self, test_user, auth_headers):
        response = client.post(
            "/projects/", json={"name": "Test Project"}, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Project"
        assert "id" in data

    def test_create_project_unauthorized(self):
        response = client.post("/projects/", json={"name": "Test Project"})
        assert response.status_code == 401

    def test_list_projects_success(self, test_user, auth_headers):
        # Create a project first
        db = TestingSessionLocal()
        project = Project(name="Test Project", owner_id=test_user.id)
        db.add(project)
        db.commit()
        db.close()

        response = client.get("/projects/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Project"

    def test_list_projects_unauthorized(self):
        response = client.get("/projects/")
        assert response.status_code == 401


class TestIncidents:
    def test_create_incident_success(self, test_user, auth_headers):
        # Create a project first
        db = TestingSessionLocal()
        project = Project(name="Test Project", owner_id=test_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        db.close()

        response = client.post(
            "/incidents/",
            json={
                "project_id": project.id,
                "title": "Test Incident",
                "description": "This is a test incident",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Incident"
        assert data["description"] == "This is a test incident"
        assert data["project_id"] == project.id
        assert data["resolved"] is False

    def test_create_scheduled_incident(self, test_user, auth_headers):
        # Create a project first
        db = TestingSessionLocal()
        project = Project(name="Test Project", owner_id=test_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        db.close()

        # Use a fixed datetime instead of relative to avoid timezone issues
        scheduled_start = datetime.datetime(
            2024, 1, 1, 12, 0, 0, tzinfo=datetime.timezone.utc
        )
        scheduled_start_iso = scheduled_start.isoformat()

        response = client.post(
            "/incidents/",
            json={
                "project_id": project.id,
                "title": "Scheduled Incident",
                "description": "This is a scheduled incident",
                "scheduled_start": scheduled_start_iso,
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Scheduled Incident"

        # The API strips timezone info, so compare the datetime part only
        expected_datetime = scheduled_start.replace(tzinfo=None)
        actual_datetime = datetime.datetime.fromisoformat(data["scheduled_start"])
        assert actual_datetime == expected_datetime

    def test_create_incident_unauthorized(self):
        response = client.post(
            "/incidents/",
            json={
                "project_id": 1,
                "title": "Test Incident",
                "description": "This is a test incident",
            },
        )
        assert response.status_code == 401

    def test_list_incidents_success(self, test_user, auth_headers):
        # Create a project and incident
        db = TestingSessionLocal()
        project = Project(name="Test Project", owner_id=test_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        project_id = project.id  # Store the ID before closing session

        incident = Incident(
            project_id=project.id,
            title="Test Incident",
            description="This is a test incident",
        )
        db.add(incident)
        db.commit()
        db.close()

        response = client.get(f"/projects/{project_id}/incidents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Test Incident"

    def test_resolve_incident_success(self, test_user, auth_headers):
        # Create a project and incident
        db = TestingSessionLocal()
        project = Project(name="Test Project", owner_id=test_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)

        incident = Incident(
            project_id=project.id,
            title="Test Incident",
            description="This is a test incident",
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        db.close()

        response = client.post(
            f"/incidents/{incident.id}/resolve", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["resolved"] is True

    def test_resolve_nonexistent_incident(self, test_user, auth_headers):
        response = client.post("/incidents/999/resolve", headers=auth_headers)
        assert response.status_code == 404


class TestPublicAPI:
    def test_public_incidents_success(self, test_user):
        # Create a public project and incident
        db = TestingSessionLocal()
        project = Project(name="Test Project", owner_id=test_user.id, is_public=True)
        db.add(project)
        db.commit()
        db.refresh(project)
        project_id = project.id  # Store the ID before closing session

        incident = Incident(
            project_id=project.id,
            title="Public Incident",
            description="This is a public incident",
        )
        db.add(incident)
        db.commit()
        db.close()

        response = client.get(f"/public/{project_id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Public Incident"

    def test_public_incidents_empty_project(self, test_user):
        # Create a public project with no incidents
        db = TestingSessionLocal()
        project = Project(name="Empty Project", owner_id=test_user.id, is_public=True)
        db.add(project)
        db.commit()
        db.refresh(project)
        project_id = project.id  # Store the ID before closing session
        db.close()

        response = client.get(f"/public/{project_id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0

    def test_public_incidents_nonexistent_project(self):
        # Test with a project ID that doesn't exist
        response = client.get("/public/999")
        assert response.status_code == 404
        data = response.json()
        assert data["detail"] == "Project not found"


class TestValidation:
    def test_project_name_validation(self, test_user, auth_headers):
        # Test empty project name
        response = client.post("/projects/", json={"name": ""}, headers=auth_headers)
        assert response.status_code == 422

        # Test very long project name
        long_name = "a" * 201
        response = client.post(
            "/projects/", json={"name": long_name}, headers=auth_headers
        )
        assert response.status_code == 422

    def test_incident_validation(self, test_user, auth_headers):
        # Create a project first
        db = TestingSessionLocal()
        project = Project(name="Test Project", owner_id=test_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        db.close()

        # Test empty title
        response = client.post(
            "/incidents/",
            json={
                "project_id": project.id,
                "title": "",
                "description": "Valid description",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

        # Test very long title
        long_title = "a" * 201
        response = client.post(
            "/incidents/",
            json={
                "project_id": project.id,
                "title": long_title,
                "description": "Valid description",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
