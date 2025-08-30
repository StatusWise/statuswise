import os

# Set testing environment variable before importing main
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from test_helpers import create_test_user

from auth import create_access_token
from database import Base, override_engine
from main import app, get_db
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


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestAdditionalEndpoints:
    """Test additional endpoint functionality with Google OAuth."""

    def setup_method(self):
        """Set up test database for each test."""
        # Clear any existing data
        db = TestingSessionLocal()
        db.query(User).delete()
        db.commit()
        db.close()

    def test_root_endpoint(self):
        """Test the root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        assert "message" in response.json()

    def test_google_auth_endpoint_exists(self):
        """Test that the Google OAuth endpoint is available."""
        # Test without token (should fail)
        response = client.post("/auth/google", json={"token": "invalid"})
        # Should return error for invalid token, but endpoint should exist
        assert response.status_code in [
            400,
            401,
            422,
        ]  # Invalid token, but endpoint exists

    def test_admin_endpoints_return_404_when_disabled(self):
        """Admin endpoints should be hidden (404) when admin is disabled."""
        # Ensure admin disabled for this test process
        os.environ["ENABLE_ADMIN"] = "false"

        # Even with a valid admin token, route should be 404 when disabled
        db = TestingSessionLocal()
        user = create_test_user(email="admin@example.com", is_admin=True)
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token({"sub": user.email})

        response = client.get("/admin/stats", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 404

        db.close()

    def test_protected_endpoint_requires_auth(self):
        """Test that protected endpoints require authentication."""
        response = client.get("/projects/")
        assert response.status_code == 401

    def test_protected_endpoint_with_valid_auth(self):
        """Test protected endpoint with valid authentication."""
        db = TestingSessionLocal()

        # Create user
        user = create_test_user(email="test@example.com")
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create token
        token = create_access_token({"sub": user.email})

        # Test protected endpoint
        response = client.get(
            "/projects/", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200

        db.close()

    def test_me_endpoint_returns_current_user(self):
        """Test that /me returns the authenticated user's profile."""
        db = TestingSessionLocal()

        # Create user
        user = create_test_user(email="me@example.com")
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create token
        token = create_access_token({"sub": user.email})

        # Call /me
        response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "me@example.com"
        assert "id" in data

        db.close()

    def test_expired_token_returns_unauthorized(self):
        """Test that an expired token yields 401 on protected endpoints."""
        db = TestingSessionLocal()

        # Create user
        user = create_test_user(email="expired@example.com")
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create already expired token
        token = create_access_token({"sub": user.email}, expires_in_seconds=-5)

        # Call a protected route
        response = client.get("/projects/", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401

        db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
