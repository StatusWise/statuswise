import os

# Set testing environment variables before importing main
os.environ["TESTING"] = "1"
os.environ["ENABLE_ADMIN"] = "true"  # Enable admin functionality for admin tests

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, override_engine
from main import app, get_db
from models import Project, User
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


class TestAdminEndpoints:
    """Test admin endpoints with Google OAuth."""

    def setup_method(self):
        """Set up test database for each test."""
        # Clear any existing data
        db = TestingSessionLocal()
        db.query(User).delete()
        db.query(Project).delete()
        db.commit()
        db.close()

    def test_admin_user_can_access_dashboard(self):
        """Test that admin users can access admin endpoints."""
        db = TestingSessionLocal()
        
        # Create admin user
        admin_user = create_test_user(
            email="admin@example.com",
            is_admin=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # Create token
        token = create_access_token({"sub": admin_user.email})
        
        # Test admin stats endpoint (which actually exists)
        response = client.get("/admin/stats", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        
        db.close()

    def test_regular_user_cannot_access_admin(self):
        """Test that regular users cannot access admin endpoints."""
        db = TestingSessionLocal()
        
        # Create regular user
        regular_user = create_test_user(
            email="user@example.com",
            is_admin=False
        )
        db.add(regular_user)
        db.commit()
        db.refresh(regular_user)
        
        # Create token
        token = create_access_token({"sub": regular_user.email})
        
        # Test admin stats endpoint should fail
        response = client.get("/admin/stats", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 403
        
        db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
