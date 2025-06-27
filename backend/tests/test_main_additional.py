import os


# Set testing environment variable before importing main
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth import get_password_hash
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
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword"),
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
    response = client.post(
        "/login", data={"username": "test@example.com", "password": "testpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestRootAndHealth:
    def test_read_root(self):
        """Test the root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "StatusWise API Running"}

    def test_health_check(self):
        """Test the health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["message"] == "StatusWise API is running"


class TestConfigEndpoint:
    def test_config_endpoint_default_disabled(self):
        """Test config endpoint returns disabled features by default"""
        response = client.get("/config")
        assert response.status_code == 200

        data = response.json()
        assert data["billing_enabled"] is False
        assert data["admin_enabled"] is False
        assert data["features"]["subscription_management"] is False
        assert data["features"]["admin_dashboard"] is False


class TestSignupDefaultBehavior:
    def test_signup_billing_disabled_default(self):
        """Test signup when billing disabled (default) - no customer creation"""
        response = client.post(
            "/signup", json={"email": "newuser@example.com", "password": "newpassword"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@example.com"


class TestSubscriptionEndpointsDisabled:
    def test_get_subscription_status_billing_disabled_default(
        self, test_user, auth_headers
    ):
        """Test getting subscription status when billing is disabled (default)"""
        response = client.get("/subscription/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        # When billing is disabled, users get unlimited "pro" tier
        assert data["tier"] == "pro"
        assert data["status"] == "active"
        assert data["limits"]["max_projects"] == 999999
        assert data["limits"]["max_incidents_per_project"] == 999999
        assert data["usage"]["projects"] == 0
        assert data["usage"]["max_projects"] == 999999

    def test_get_subscription_status_unauthorized(self):
        """Test getting subscription status without authentication"""
        response = client.get("/subscription/status")
        assert response.status_code == 401

    def test_create_checkout_session_billing_disabled_default(
        self, test_user, auth_headers
    ):
        """Test checkout session creation when billing disabled (default)"""
        response = client.post("/subscription/create-checkout", headers=auth_headers)
        assert response.status_code == 503
        assert "Billing functionality is disabled" in response.json()["detail"]

    def test_create_checkout_session_unauthorized(self):
        """Test checkout session creation without authentication"""
        response = client.post("/subscription/create-checkout")
        assert response.status_code == 401


class TestWebhookEndpointsDisabled:
    def test_webhook_billing_disabled_default(self):
        """Test webhook when billing disabled (default)"""
        response = client.post("/webhooks/lemonsqueezy", json={"test": "data"})
        assert response.status_code == 503
        assert "Billing webhooks are disabled" in response.json()["detail"]


class TestAdminEndpointsDisabled:
    def test_admin_stats_disabled_default(self, test_user, auth_headers):
        """Test admin stats when admin disabled (default)"""
        response = client.get("/admin/stats", headers=auth_headers)
        assert response.status_code == 503
        assert "Admin functionality is disabled" in response.json()["detail"]

    def test_admin_users_disabled_default(self, test_user, auth_headers):
        """Test admin users when admin disabled (default)"""
        response = client.get("/admin/users", headers=auth_headers)
        assert response.status_code == 503
        assert "Admin functionality is disabled" in response.json()["detail"]


class TestUnlimitedUsageWhenDisabled:
    def test_create_multiple_projects_when_billing_disabled(
        self, test_user, auth_headers
    ):
        """Test project creation has no limits when billing disabled (default)"""
        # Should be able to create multiple projects when billing is disabled
        for i in range(3):  # Create more than the free tier limit
            response = client.post(
                "/projects/", json={"name": f"Test Project {i}"}, headers=auth_headers
            )
            assert response.status_code == 200

    def test_create_multiple_incidents_when_billing_disabled(
        self, test_user, auth_headers
    ):
        """Test incident creation has no limits when billing disabled (default)"""
        # Create a project first
        db = TestingSessionLocal()
        project = Project(name="Test Project", owner_id=test_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        db.close()

        # Should be able to create multiple incidents when billing is disabled
        for i in range(10):  # Create more than the free tier limit
            response = client.post(
                "/incidents/",
                json={
                    "project_id": project.id,
                    "title": f"Test Incident {i}",
                    "description": "Test description",
                },
                headers=auth_headers,
            )
            assert response.status_code == 200


class TestCoreProjectAccess:
    """Test that core project access functionality works regardless of feature toggles."""

    def test_list_project_incidents_success(self, test_user, auth_headers):
        """Test listing incidents for a specific project"""
        # Create a project and incident
        db = TestingSessionLocal()
        project = Project(name="Test Project", owner_id=test_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        project_id = project.id  # Store ID before closing session

        incident = Incident(
            title="Test Incident", description="Test description", project_id=project.id
        )
        db.add(incident)
        db.commit()
        db.close()

        response = client.get(f"/projects/{project_id}/incidents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Test Incident"

    def test_list_project_incidents_unauthorized(self):
        """Test listing project incidents without authentication"""
        response = client.get("/projects/1/incidents")
        assert response.status_code == 401

    def test_list_project_incidents_not_owner(self, test_user, auth_headers):
        """Test listing incidents for project not owned by user"""
        # Create another user and their project
        db = TestingSessionLocal()
        other_user = User(email="other@example.com", hashed_password="password")
        db.add(other_user)
        db.commit()
        db.refresh(other_user)

        project = Project(name="Other Project", owner_id=other_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        project_id = project.id
        db.close()

        # API now properly returns 403 with access control
        response = client.get(f"/projects/{project_id}/incidents", headers=auth_headers)
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]

    def test_list_project_incidents_nonexistent_project(self, test_user, auth_headers):
        """Test listing incidents for nonexistent project"""
        response = client.get("/projects/999/incidents", headers=auth_headers)
        # API now properly returns 404 with project validation
        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]


class TestCoreIncidentAccess:
    """Test that core incident access functionality works regardless of feature toggles."""

    def test_resolve_incident_not_owner(self, test_user, auth_headers):
        """Test resolving incident for project not owned by user"""
        # Create another user and their project/incident
        db = TestingSessionLocal()
        other_user = User(email="other@example.com", hashed_password="password")
        db.add(other_user)
        db.commit()
        db.refresh(other_user)

        project = Project(name="Other Project", owner_id=other_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)

        incident = Incident(
            title="Other Incident",
            description="Test description",
            project_id=project.id,
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        incident_id = incident.id
        db.close()

        # API now properly returns 403 with access control
        response = client.post(
            f"/incidents/{incident_id}/resolve", headers=auth_headers
        )
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]

    def test_list_incidents_for_nonexistent_project(self, test_user, auth_headers):
        """Test listing incidents for nonexistent project"""
        response = client.get("/incidents/999", headers=auth_headers)
        # API now properly returns 404 with project validation
        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]

    def test_list_incidents_not_owner(self, test_user, auth_headers):
        """Test listing incidents for project not owned by user"""
        # Create another user and their project
        db = TestingSessionLocal()
        other_user = User(email="other@example.com", hashed_password="password")
        db.add(other_user)
        db.commit()
        db.refresh(other_user)

        project = Project(name="Other Project", owner_id=other_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        db.close()

        response = client.get(f"/incidents/{project.id}", headers=auth_headers)
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]


class TestCoreErrorHandling:
    """Test core error handling functionality."""

    def test_create_incident_invalid_project(self, test_user, auth_headers):
        """Test creating incident for nonexistent project"""
        response = client.post(
            "/incidents/",
            json={
                "project_id": 999,
                "title": "Test Incident",
                "description": "Test description",
            },
            headers=auth_headers,
        )
        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]

    def test_create_incident_project_not_owned(self, test_user, auth_headers):
        """Test creating incident for project not owned by user"""
        # Create another user and their project
        db = TestingSessionLocal()
        other_user = User(email="other@example.com", hashed_password="password")
        db.add(other_user)
        db.commit()
        db.refresh(other_user)

        project = Project(name="Other Project", owner_id=other_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        project_id = project.id
        db.close()

        response = client.post(
            "/incidents/",
            json={
                "project_id": project_id,
                "title": "Test Incident",
                "description": "Test description",
            },
            headers=auth_headers,
        )
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]
