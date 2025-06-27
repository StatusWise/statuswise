import os
from unittest.mock import patch

# Set testing environment variable before importing main
os.environ["TESTING"] = "1"


from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth import get_password_hash
from database import Base, override_engine
from models import User

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


class TestFeatureToggles:
    """Test feature toggle functionality."""

    def setup_method(self):
        """Set up test database for each test."""
        # Clear any existing data
        db = TestingSessionLocal()
        db.query(User).delete()
        db.commit()
        db.close()

    @patch("main.config")
    def test_config_endpoint_billing_disabled(self, mock_config):
        """Test config endpoint when billing is disabled."""
        # Mock the config
        mock_config.is_billing_enabled.return_value = False
        mock_config.is_admin_enabled.return_value = False

        # Import and set up the app after mocking
        from main import app, get_db

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)

        response = client.get("/config")
        assert response.status_code == 200

        data = response.json()
        assert data["billing_enabled"] is False
        assert data["admin_enabled"] is False
        assert data["features"]["subscription_management"] is False
        assert data["features"]["admin_dashboard"] is False

    @patch("main.config")
    def test_config_endpoint_features_enabled(self, mock_config):
        """Test config endpoint when features are enabled."""
        # Mock the config
        mock_config.is_billing_enabled.return_value = True
        mock_config.is_admin_enabled.return_value = True

        # Import and set up the app after mocking
        from main import app, get_db

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)

        response = client.get("/config")
        assert response.status_code == 200

        data = response.json()
        assert data["billing_enabled"] is True
        assert data["admin_enabled"] is True
        assert data["features"]["subscription_management"] is True
        assert data["features"]["admin_dashboard"] is True

    @patch("main.config")
    def test_subscription_status_billing_disabled(self, mock_config):
        """Test subscription status when billing is disabled."""
        # Mock the config
        mock_config.is_billing_enabled.return_value = False

        # Import and set up the app after mocking
        from main import app, get_db

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)

        # Create a test user
        db = TestingSessionLocal()
        test_user = User(
            email="test@example.com", hashed_password=get_password_hash("testpass")
        )
        db.add(test_user)
        db.commit()

        # Login to get token
        login_response = client.post(
            "/login", data={"username": "test@example.com", "password": "testpass"}
        )
        token = login_response.json()["access_token"]

        response = client.get(
            "/subscription/status", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200

        data = response.json()
        assert (
            data["tier"] == "pro"
        )  # Use "pro" as unlimited tier when billing disabled
        assert data["status"] == "active"
        assert data["limits"]["max_projects"] == 999999
        assert data["usage"]["max_projects"] == 999999

        db.close()

    @patch("main.config")
    def test_subscription_checkout_billing_disabled(self, mock_config):
        """Test subscription checkout when billing is disabled."""
        # Mock the config
        mock_config.is_billing_enabled.return_value = False

        # Import and set up the app after mocking
        from main import app, get_db

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)

        # Create a test user
        db = TestingSessionLocal()
        test_user = User(
            email="test@example.com", hashed_password=get_password_hash("testpass")
        )
        db.add(test_user)
        db.commit()

        # Login to get token
        login_response = client.post(
            "/login", data={"username": "test@example.com", "password": "testpass"}
        )
        token = login_response.json()["access_token"]

        response = client.post(
            "/subscription/create-checkout",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 503
        assert "Billing functionality is disabled" in response.json()["detail"]

        db.close()

    @patch("main.config")
    def test_webhook_billing_disabled(self, mock_config):
        """Test webhook endpoint when billing is disabled."""
        # Mock the config
        mock_config.is_billing_enabled.return_value = False

        # Import and set up the app after mocking
        from main import app, get_db

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)

        response = client.post("/webhooks/lemonsqueezy", json={"test": "data"})
        assert response.status_code == 503
        assert "Billing webhooks are disabled" in response.json()["detail"]

    @patch("main.config")
    def test_admin_stats_admin_disabled(self, mock_config):
        """Test admin stats when admin is disabled."""
        # Mock the config
        mock_config.is_admin_enabled.return_value = False

        # Import and set up the app after mocking
        from main import app, get_db

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)

        # Create an admin user
        db = TestingSessionLocal()
        admin_user = User(
            email="admin@example.com",
            hashed_password=get_password_hash("adminpass"),
            is_admin=True,
        )
        db.add(admin_user)
        db.commit()

        # Login to get token
        login_response = client.post(
            "/login", data={"username": "admin@example.com", "password": "adminpass"}
        )
        token = login_response.json()["access_token"]

        response = client.get(
            "/admin/stats", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 503
        assert "Admin functionality is disabled" in response.json()["detail"]

        db.close()

    @patch("main.config")
    def test_core_functionality_still_works(self, mock_config):
        """Test that core functionality still works when features are disabled."""
        # Mock the config
        mock_config.is_billing_enabled.return_value = False
        mock_config.is_admin_enabled.return_value = False

        # Import and set up the app after mocking
        from main import app, get_db

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)

        # Create a test user
        db = TestingSessionLocal()
        test_user = User(
            email="test@example.com", hashed_password=get_password_hash("testpass")
        )
        db.add(test_user)
        db.commit()

        # Login to get token
        login_response = client.post(
            "/login", data={"username": "test@example.com", "password": "testpass"}
        )
        token = login_response.json()["access_token"]

        # Health check should still work
        response = client.get("/health")
        assert response.status_code == 200

        # Root endpoint should still work
        response = client.get("/")
        assert response.status_code == 200

        # Projects should still work
        response = client.get(
            "/projects/", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200

        # Can create projects without limits
        response = client.post(
            "/projects/",
            json={"name": "Test Project"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200

        db.close()
