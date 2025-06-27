import os

# Set testing environment variable before importing main
os.environ["TESTING"] = "1"
os.environ["ENABLE_ADMIN"] = "true"  # Enable admin functionality for admin tests

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, override_engine
from main import app, get_db
from models import User, SubscriptionTier, SubscriptionStatus
from test_helpers import create_test_user
from auth import create_access_token

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
        db.query(User).delete()
        db.commit()
    finally:
        db.close()
    yield


@pytest.fixture
def admin_user():
    db = TestingSessionLocal()
    user = create_test_user(
        email="admin@example.com",
        name="Admin User",
        google_id="admin_google_123",
        is_admin=True,
        subscription_tier=SubscriptionTier.FREE,
        subscription_status=SubscriptionStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def admin_auth_headers(admin_user):
    token = create_access_token({"sub": admin_user.email})
    return {"Authorization": f"Bearer {token}"}


class TestAdminEnabledEndpoints:
    """Test admin endpoints when admin functionality is enabled."""

    def test_admin_stats_success(self, admin_user, admin_auth_headers):
        """Test admin stats endpoint when admin is enabled"""
        response = client.get("/admin/stats", headers=admin_auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert "total_users" in data
        assert "active_users" in data
        assert "pro_subscribers" in data
        assert "free_users" in data
        assert "total_projects" in data
        assert "total_incidents" in data
        assert "unresolved_incidents" in data

    def test_admin_users_list(self, admin_user, admin_auth_headers):
        """Test admin users list endpoint when admin is enabled"""
        response = client.get("/admin/users", headers=admin_auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least the admin user should be there

    def test_admin_user_detail(self, admin_user, admin_auth_headers):
        """Test admin user detail endpoint when admin is enabled"""
        response = client.get(
            f"/admin/users/{admin_user.id}", headers=admin_auth_headers
        )
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == admin_user.id
        assert data["email"] == admin_user.email
        assert data["is_admin"] is True

    def test_admin_user_update(self, admin_user, admin_auth_headers):
        """Test admin user update endpoint when admin is enabled"""
        # Create a regular user to update
        db = TestingSessionLocal()
        regular_user = create_test_user(
            email="regular@example.com",
            name="Regular User",
            google_id="regular_google_123",
            subscription_tier=SubscriptionTier.FREE,
            subscription_status=SubscriptionStatus.ACTIVE,
            is_active=True,
        )
        db.add(regular_user)
        db.commit()
        db.refresh(regular_user)
        user_id = regular_user.id
        db.close()

        response = client.patch(
            f"/admin/users/{user_id}",
            headers=admin_auth_headers,
            params={"is_active": False},
        )
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == user_id
        assert data["is_active"] is False

    def test_admin_projects_list(self, admin_user, admin_auth_headers):
        """Test admin projects list endpoint when admin is enabled"""
        response = client.get("/admin/projects", headers=admin_auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

    def test_admin_incidents_list(self, admin_user, admin_auth_headers):
        """Test admin incidents list endpoint when admin is enabled"""
        response = client.get("/admin/incidents", headers=admin_auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

    def test_admin_subscriptions_list(self, admin_user, admin_auth_headers):
        """Test admin subscriptions list endpoint when admin is enabled"""
        response = client.get("/admin/subscriptions", headers=admin_auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

    def test_non_admin_access_denied(self, admin_auth_headers):
        """Test that non-admin users cannot access admin endpoints"""
        # Create a regular user
        db = TestingSessionLocal()
        regular_user = create_test_user(
            email="regular@example.com",
            name="Regular User",
            google_id="regular_google_456",
            subscription_tier=SubscriptionTier.FREE,
            subscription_status=SubscriptionStatus.ACTIVE,
            is_admin=False,
        )
        db.add(regular_user)
        db.commit()
        # Store email before closing session
        user_email = regular_user.email
        db.close()

        # Create auth token for regular user
        token = create_access_token({"sub": user_email})
        regular_headers = {"Authorization": f"Bearer {token}"}

        # Try to access admin endpoint
        response = client.get("/admin/stats", headers=regular_headers)
        assert response.status_code == 403
        assert "Admin access required" in response.json()["detail"]
