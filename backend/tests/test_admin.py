import datetime
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
from models import (
    Incident,
    Project,
    Subscription,
    SubscriptionStatus,
    SubscriptionTier,
    User,
)

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
        db.query(Subscription).delete()
        db.query(Incident).delete()
        db.query(Project).delete()
        db.query(User).delete()
        db.commit()
    finally:
        db.close()
    yield


@pytest.fixture
def admin_user():
    """Create an admin user for testing"""
    db = TestingSessionLocal()
    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("adminpassword"),
        is_admin=True,
        is_active=True,
        subscription_tier=SubscriptionTier.PRO,
        subscription_status=SubscriptionStatus.ACTIVE,
        created_at=datetime.datetime.now(datetime.timezone.utc),
        updated_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def regular_user():
    """Create a regular non-admin user for testing"""
    db = TestingSessionLocal()
    user = User(
        email="user@example.com",
        hashed_password=get_password_hash("userpassword"),
        is_admin=False,
        is_active=True,
        subscription_tier=SubscriptionTier.FREE,
        subscription_status=SubscriptionStatus.ACTIVE,
        created_at=datetime.datetime.now(datetime.timezone.utc),
        updated_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def admin_auth_headers(admin_user):
    """Get auth headers for admin user"""
    response = client.post(
        "/login", data={"username": "admin@example.com", "password": "adminpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_auth_headers(regular_user):
    """Get auth headers for regular user"""
    response = client.post(
        "/login", data={"username": "user@example.com", "password": "userpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_data(admin_user, regular_user):
    """Create sample data for testing"""
    db = TestingSessionLocal()

    # Create additional users
    user2 = User(
        email="user2@example.com",
        hashed_password=get_password_hash("password"),
        is_admin=False,
        is_active=False,  # Inactive user
        subscription_tier=SubscriptionTier.FREE,
        created_at=datetime.datetime.now(datetime.timezone.utc),
        updated_at=datetime.datetime.now(datetime.timezone.utc),
    )

    user3 = User(
        email="pro@example.com",
        hashed_password=get_password_hash("password"),
        is_admin=False,
        is_active=True,
        subscription_tier=SubscriptionTier.PRO,
        subscription_status=SubscriptionStatus.ACTIVE,
        created_at=datetime.datetime.now(datetime.timezone.utc),
        updated_at=datetime.datetime.now(datetime.timezone.utc),
    )

    db.add_all([user2, user3])
    db.commit()
    db.refresh(user2)
    db.refresh(user3)

    # Create subscriptions
    subscription = Subscription(
        user_id=user3.id,
        lemonsqueezy_subscription_id="sub_123",
        lemonsqueezy_customer_id="cus_123",
        lemonsqueezy_variant_id="var_123",
        tier=SubscriptionTier.PRO,
        status=SubscriptionStatus.ACTIVE,
        created_at=datetime.datetime.now(datetime.timezone.utc),
        updated_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(subscription)
    db.commit()

    # Create projects
    project1 = Project(name="Admin Project", owner_id=admin_user.id)
    project2 = Project(name="User Project", owner_id=regular_user.id)
    project3 = Project(name="Pro Project", owner_id=user3.id)

    db.add_all([project1, project2, project3])
    db.commit()
    db.refresh(project1)
    db.refresh(project2)
    db.refresh(project3)

    # Create incidents
    incident1 = Incident(
        project_id=project1.id,
        title="Admin Incident",
        description="An incident in admin project",
        resolved=False,
        created_at=datetime.datetime.now(datetime.timezone.utc),
    )

    incident2 = Incident(
        project_id=project2.id,
        title="User Incident",
        description="An incident in user project",
        resolved=True,
        resolved_at=datetime.datetime.now(datetime.timezone.utc),
        created_at=datetime.datetime.now(datetime.timezone.utc),
    )

    db.add_all([incident1, incident2])
    db.commit()

    db.close()
    return {
        "users": [admin_user, regular_user, user2, user3],
        "projects": [project1, project2, project3],
        "incidents": [incident1, incident2],
        "subscriptions": [subscription],
    }


class TestAdminAuthorization:
    """Test admin access control"""

    def test_admin_stats_requires_admin_access(self, user_auth_headers):
        """Regular users should not access admin stats"""
        response = client.get("/admin/stats", headers=user_auth_headers)
        assert response.status_code == 403
        assert "Admin access required" in response.json()["detail"]

    def test_admin_stats_requires_authentication(self):
        """Unauthenticated users should not access admin stats"""
        response = client.get("/admin/stats")
        assert response.status_code == 401

    def test_admin_stats_success_for_admin(self, admin_auth_headers):
        """Admin users should access admin stats"""
        response = client.get("/admin/stats", headers=admin_auth_headers)
        assert response.status_code == 200

    def test_admin_users_requires_admin_access(self, user_auth_headers):
        """Regular users should not access admin users endpoint"""
        response = client.get("/admin/users", headers=user_auth_headers)
        assert response.status_code == 403

    def test_admin_projects_requires_admin_access(self, user_auth_headers):
        """Regular users should not access admin projects endpoint"""
        response = client.get("/admin/projects", headers=user_auth_headers)
        assert response.status_code == 403


class TestAdminStats:
    """Test admin statistics endpoint"""

    def test_admin_stats_empty_system(self, admin_auth_headers):
        """Test stats with no data"""
        response = client.get("/admin/stats", headers=admin_auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert data["total_users"] == 1  # Only admin user
        assert data["active_users"] == 1
        assert data["pro_subscribers"] == 1  # Admin is pro
        assert data["free_users"] == 0
        assert data["total_projects"] == 0
        assert data["total_incidents"] == 0
        assert data["unresolved_incidents"] == 0

    def test_admin_stats_with_data(self, admin_auth_headers, sample_data):
        """Test stats with sample data"""
        response = client.get("/admin/stats", headers=admin_auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert data["total_users"] == 4  # admin + regular + inactive + pro
        assert data["active_users"] == 3  # admin + regular + pro (inactive excluded)
        assert data["pro_subscribers"] == 2  # admin + pro user
        assert data["free_users"] == 2  # regular + inactive
        assert data["total_projects"] == 3
        assert data["total_incidents"] == 2
        assert data["unresolved_incidents"] == 1


class TestAdminUsers:
    """Test admin user management endpoints"""

    def test_get_admin_users_success(self, admin_auth_headers, sample_data):
        """Test getting all users"""
        response = client.get("/admin/users", headers=admin_auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 4

        # Check that admin data is included
        admin_data = next((u for u in data if u["email"] == "admin@example.com"), None)
        assert admin_data is not None
        assert admin_data["is_admin"] is True
        assert admin_data["is_active"] is True
        assert admin_data["subscription_tier"] == "pro"

    def test_get_admin_users_pagination(self, admin_auth_headers, sample_data):
        """Test user pagination"""
        response = client.get("/admin/users?skip=1&limit=2", headers=admin_auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) <= 2  # Should respect limit

    def test_get_admin_user_by_id(self, admin_auth_headers, regular_user):
        """Test getting specific user by ID"""
        response = client.get(
            f"/admin/users/{regular_user.id}", headers=admin_auth_headers
        )
        assert response.status_code == 200

        data = response.json()
        assert data["email"] == "user@example.com"
        assert data["is_admin"] is False
        assert data["is_active"] is True

    def test_get_admin_user_not_found(self, admin_auth_headers):
        """Test getting non-existent user"""
        response = client.get("/admin/users/999", headers=admin_auth_headers)
        assert response.status_code == 404

    def test_update_user_status(self, admin_auth_headers, regular_user):
        """Test updating user active status"""
        response = client.patch(
            f"/admin/users/{regular_user.id}",
            params={"is_active": False},
            headers=admin_auth_headers,
        )
        assert response.status_code == 200

        data = response.json()
        assert data["is_active"] is False

    def test_update_user_admin_privileges(self, admin_auth_headers, regular_user):
        """Test granting admin privileges"""
        response = client.patch(
            f"/admin/users/{regular_user.id}",
            params={"is_admin": True},
            headers=admin_auth_headers,
        )
        assert response.status_code == 200

        data = response.json()
        assert data["is_admin"] is True

    def test_admin_cannot_remove_own_admin_privileges(
        self, admin_auth_headers, admin_user
    ):
        """Test that admin cannot remove their own admin privileges"""
        response = client.patch(
            f"/admin/users/{admin_user.id}",
            params={"is_admin": False},
            headers=admin_auth_headers,
        )
        assert response.status_code == 400
        assert (
            "Cannot remove admin privileges from yourself" in response.json()["detail"]
        )


class TestAdminSubscriptions:
    """Test admin subscription management endpoints"""

    def test_get_admin_subscriptions(self, admin_auth_headers, sample_data):
        """Test getting all subscriptions"""
        response = client.get("/admin/subscriptions", headers=admin_auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 1  # Only one subscription in sample data

        subscription = data[0]
        assert subscription["user_email"] == "pro@example.com"
        assert subscription["tier"] == "pro"
        assert subscription["status"] == "active"
        assert subscription["lemonsqueezy_subscription_id"] == "sub_123"

    def test_get_admin_subscriptions_pagination(self, admin_auth_headers, sample_data):
        """Test subscription pagination"""
        response = client.get(
            "/admin/subscriptions?skip=0&limit=1", headers=admin_auth_headers
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data) <= 1


class TestAdminProjects:
    """Test admin project management endpoints"""

    def test_get_admin_projects(self, admin_auth_headers, sample_data):
        """Test getting all projects"""
        response = client.get("/admin/projects", headers=admin_auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 3

        # Check project data structure
        project = data[0]
        assert "id" in project
        assert "name" in project
        assert "owner_email" in project
        assert "incidents_count" in project
        assert "unresolved_incidents_count" in project

    def test_get_admin_projects_pagination(self, admin_auth_headers, sample_data):
        """Test project pagination"""
        response = client.get(
            "/admin/projects?skip=1&limit=1", headers=admin_auth_headers
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data) <= 1


class TestAdminIncidents:
    """Test admin incident management endpoints"""

    def test_get_admin_incidents(self, admin_auth_headers, sample_data):
        """Test getting all incidents"""
        response = client.get("/admin/incidents", headers=admin_auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 2

    def test_get_admin_incidents_filter_resolved(self, admin_auth_headers, sample_data):
        """Test filtering incidents by resolution status"""
        # Get only unresolved incidents
        response = client.get(
            "/admin/incidents?resolved=false", headers=admin_auth_headers
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 1
        assert data[0]["resolved"] is False

        # Get only resolved incidents
        response = client.get(
            "/admin/incidents?resolved=true", headers=admin_auth_headers
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 1
        assert data[0]["resolved"] is True

    def test_get_admin_incidents_pagination(self, admin_auth_headers, sample_data):
        """Test incident pagination"""
        response = client.get(
            "/admin/incidents?skip=0&limit=1", headers=admin_auth_headers
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data) <= 1


class TestAdminEdgeCases:
    """Test edge cases and error conditions"""

    def test_admin_endpoints_with_invalid_params(self, admin_auth_headers):
        """Test admin endpoints with invalid parameters"""
        # Negative skip
        response = client.get("/admin/users?skip=-1", headers=admin_auth_headers)
        assert response.status_code == 422

        # Excessive limit
        response = client.get("/admin/users?limit=1000", headers=admin_auth_headers)
        assert response.status_code == 200
        # Should be capped at 100

        # Invalid user ID
        response = client.get("/admin/users/abc", headers=admin_auth_headers)
        assert response.status_code == 422

    def test_update_nonexistent_user(self, admin_auth_headers):
        """Test updating non-existent user"""
        response = client.patch(
            "/admin/users/999", params={"is_active": False}, headers=admin_auth_headers
        )
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
