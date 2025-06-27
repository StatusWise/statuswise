import os
import time

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
from models import Project, User

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


class TestPerformance:
    """Basic performance tests with Google OAuth."""

    def setup_method(self):
        """Set up test database for each test."""
        # Clear any existing data
        db = TestingSessionLocal()
        db.query(User).delete()
        db.query(Project).delete()
        db.commit()
        db.close()

    def test_auth_endpoint_performance(self):
        """Test Google OAuth endpoint response time."""
        start_time = time.time()

        # Test invalid token (should be fast even on failure)
        response = client.post("/auth/google", json={"token": "invalid"})

        end_time = time.time()
        response_time = end_time - start_time

        # Should respond within 1 second even for invalid requests
        assert response_time < 1.0
        assert response.status_code in [400, 401]

    def test_projects_endpoint_performance(self):
        """Test projects endpoint performance with authentication."""
        db = TestingSessionLocal()

        # Create user
        user = create_test_user(email="perf@example.com")
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create token
        token = create_access_token({"sub": user.email})

        start_time = time.time()

        # Test projects endpoint
        response = client.get(
            "/projects/", headers={"Authorization": f"Bearer {token}"}
        )

        end_time = time.time()
        response_time = end_time - start_time

        # Should respond within 1 second
        assert response_time < 1.0
        assert response.status_code == 200

        db.close()

    def test_token_creation_performance(self):
        """Test JWT token creation performance."""
        start_time = time.time()

        # Create multiple tokens
        for i in range(10):
            token = create_access_token({"sub": f"user{i}@example.com"})
            assert token is not None

        end_time = time.time()
        total_time = end_time - start_time
        avg_time = total_time / 10

        # Each token creation should be very fast
        assert avg_time < 0.1  # Less than 100ms per token


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
