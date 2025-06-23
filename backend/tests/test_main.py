import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth import get_password_hash
from database import Base, override_engine
from main import app, get_db
from models import Incident, Project, User

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
    user = User(
        email="test@example.com", hashed_password=get_password_hash("testpassword")
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def auth_headers(test_user):
    response = client.post(
        "/login", data={"username": "test@example.com", "password": "testpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestAuthentication:
    def test_signup_success(self):
        response = client.post(
            "/signup", json={"email": "newuser@example.com", "password": "newpassword"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@example.com"

    def test_signup_duplicate_user(self, test_user):
        response = client.post(
            "/signup", json={"email": "test@example.com", "password": "anotherpassword"}
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_signup_invalid_email(self):
        response = client.post(
            "/signup", json={"email": "invalid-email", "password": "password"}
        )
        assert response.status_code == 422

    def test_login_success(self, test_user):
        response = client.post(
            "/login", data={"username": "test@example.com", "password": "testpassword"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_credentials(self, test_user):
        response = client.post(
            "/login", data={"username": "test@example.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self):
        response = client.post(
            "/login",
            data={"username": "nonexistent@example.com", "password": "password"},
        )
        assert response.status_code == 401


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
        # Create a project and incident
        db = TestingSessionLocal()
        project = Project(name="Test Project", owner_id=test_user.id)
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
        # Create a project with no incidents
        db = TestingSessionLocal()
        project = Project(name="Empty Project", owner_id=test_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        project_id = project.id  # Store the ID before closing session
        db.close()

        response = client.get(f"/public/{project_id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0


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
