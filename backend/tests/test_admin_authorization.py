import os

# Set testing environment variable before importing main
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, override_engine
from main import app, get_db
from models import User
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


class TestBasicAdminAuth:
    """Basic admin authorization tests with Google OAuth."""

    def setup_method(self):
        """Set up test database for each test."""
        # Clear any existing data
        db = TestingSessionLocal()
        db.query(User).delete()
        db.commit()
        db.close()

    def test_admin_user_creation(self):
        """Test that admin users can be created with Google OAuth."""
        db = TestingSessionLocal()
        
        # Create admin user
        admin_user = create_test_user(
            email="admin@example.com",
            is_admin=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # Verify admin status
        assert bool(admin_user.is_admin) is True
        assert admin_user.email == "admin@example.com"
        
        db.close()

    def test_regular_user_creation(self):
        """Test that regular users can be created with Google OAuth."""
        db = TestingSessionLocal()
        
        # Create regular user
        regular_user = create_test_user(
            email="user@example.com",
            is_admin=False
        )
        db.add(regular_user)
        db.commit()
        db.refresh(regular_user)
        
        # Verify regular user status
        assert bool(regular_user.is_admin) is False
        assert regular_user.email == "user@example.com"
        
        db.close()

    def test_auth_token_creation(self):
        """Test that JWT tokens can be created for users."""
        db = TestingSessionLocal()
        
        # Create user
        user = create_test_user(email="test@example.com")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create token
        token = create_access_token({"sub": user.email})
        assert token is not None
        assert len(token) > 0
        
        db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
