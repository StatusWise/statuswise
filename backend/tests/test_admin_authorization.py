import os

# Set testing environment variables before importing main
os.environ["TESTING"] = "1"
os.environ["ENABLE_ADMIN"] = "true"  # Enable admin functionality for admin tests

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth import get_password_hash
from authorization import require_admin_access
from database import Base
from models import User

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def admin_user(test_db):
    """Create an admin user for testing"""
    db = TestingSessionLocal()
    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("adminpassword"),
        is_admin=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def regular_user(test_db):
    """Create a regular non-admin user for testing"""
    db = TestingSessionLocal()
    user = User(
        email="user@example.com",
        hashed_password=get_password_hash("userpassword"),
        is_admin=False,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def inactive_admin_user(test_db):
    """Create an inactive admin user for testing"""
    db = TestingSessionLocal()
    user = User(
        email="inactive@example.com",
        hashed_password=get_password_hash("password"),
        is_admin=True,
        is_active=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


class TestAdminAccessControl:
    """Test admin access control functionality"""

    def test_admin_user_has_access(self, admin_user):
        """Test that admin users have admin access"""
        # Should not raise an exception
        require_admin_access(admin_user)

    def test_regular_user_denied_access(self, regular_user):
        """Test that regular users are denied admin access"""
        with pytest.raises(HTTPException) as exc_info:
            require_admin_access(regular_user)

        assert exc_info.value.status_code == 403
        assert "Admin access required" in str(exc_info.value.detail)

    def test_inactive_admin_still_has_access(self, inactive_admin_user):
        """Test that inactive admin users still have admin access"""
        # Admin access is based on is_admin flag, not is_active
        require_admin_access(inactive_admin_user)

    def test_admin_access_with_none_user(self):
        """Test admin access with None user"""
        with pytest.raises(AttributeError):
            require_admin_access(None)

    def test_admin_access_preserves_user_object(self, admin_user):
        """Test that admin access check doesn't modify user object"""
        original_email = admin_user.email
        original_is_admin = admin_user.is_admin

        require_admin_access(admin_user)

        assert admin_user.email == original_email
        assert admin_user.is_admin == original_is_admin


class TestUserAdminFlag:
    """Test user admin flag functionality"""

    def test_user_created_as_non_admin_by_default(self, test_db):
        """Test that users are created as non-admin by default"""
        db = TestingSessionLocal()
        user = User(
            email="default@example.com",
            hashed_password=get_password_hash("password"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        assert user.is_admin is False
        db.close()

    def test_user_can_be_created_as_admin(self, test_db):
        """Test that users can be explicitly created as admin"""
        db = TestingSessionLocal()
        user = User(
            email="explicit@example.com",
            hashed_password=get_password_hash("password"),
            is_admin=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        assert user.is_admin is True
        db.close()

    def test_admin_flag_can_be_updated(self, regular_user):
        """Test that admin flag can be updated after user creation"""
        db = TestingSessionLocal()
        user = db.query(User).filter(User.id == regular_user.id).first()

        # Initially not admin
        assert user.is_admin is False

        # Make admin
        user.is_admin = True
        db.commit()
        db.refresh(user)

        assert user.is_admin is True

        # Remove admin
        user.is_admin = False
        db.commit()
        db.refresh(user)

        assert user.is_admin is False
        db.close()


class TestAdminAuthorizationEdgeCases:
    """Test edge cases in admin authorization"""

    def test_user_with_missing_is_admin_attribute(self):
        """Test behavior with user object missing is_admin attribute"""

        class MockUser:
            def __init__(self):
                self.email = "test@example.com"
                # Intentionally missing is_admin attribute

        mock_user = MockUser()

        with pytest.raises(AttributeError):
            require_admin_access(mock_user)

    def test_user_with_none_is_admin_attribute(self):
        """Test behavior with user having None as is_admin value"""

        class MockUser:
            def __init__(self):
                self.email = "test@example.com"
                self.is_admin = None

        mock_user = MockUser()

        with pytest.raises(HTTPException) as exc_info:
            require_admin_access(mock_user)

        assert exc_info.value.status_code == 403

    def test_user_with_string_is_admin_attribute(self):
        """Test behavior with user having string as is_admin value"""

        class MockUser:
            def __init__(self):
                self.email = "test@example.com"
                self.is_admin = "true"  # String instead of boolean

        mock_user = MockUser()

        # Should still work because "true" is truthy
        require_admin_access(mock_user)

    def test_user_with_false_string_is_admin_attribute(self):
        """Test behavior with user having falsy string as is_admin value"""

        class MockUser:
            def __init__(self):
                self.email = "test@example.com"
                self.is_admin = ""  # Empty string (falsy)

        mock_user = MockUser()

        with pytest.raises(HTTPException) as exc_info:
            require_admin_access(mock_user)

        assert exc_info.value.status_code == 403


class TestAdminAuthorizationIntegration:
    """Test admin authorization in more realistic scenarios"""

    def test_multiple_admin_users(self, test_db):
        """Test with multiple admin users"""
        db = TestingSessionLocal()

        # Create multiple admin users
        admin1 = User(
            email="admin1@example.com",
            hashed_password=get_password_hash("password"),
            is_admin=True,
        )
        admin2 = User(
            email="admin2@example.com",
            hashed_password=get_password_hash("password"),
            is_admin=True,
        )

        db.add_all([admin1, admin2])
        db.commit()
        db.refresh(admin1)
        db.refresh(admin2)

        # Both should have admin access
        require_admin_access(admin1)
        require_admin_access(admin2)

        db.close()

    def test_mixed_user_types(self, test_db):
        """Test with a mix of admin and regular users"""
        db = TestingSessionLocal()

        users = []
        for i in range(5):
            user = User(
                email=f"user{i}@example.com",
                hashed_password=get_password_hash("password"),
                is_admin=(i % 2 == 0),  # Every other user is admin
            )
            users.append(user)

        db.add_all(users)
        db.commit()

        for user in users:
            db.refresh(user)
            if user.is_admin:
                # Should have access
                require_admin_access(user)
            else:
                # Should be denied access
                with pytest.raises(HTTPException):
                    require_admin_access(user)

        db.close()

    def test_admin_demotion_and_promotion(self, admin_user):
        """Test demoting and promoting admin users"""
        db = TestingSessionLocal()
        user = db.query(User).filter(User.id == admin_user.id).first()

        # Initially admin
        require_admin_access(user)

        # Demote to regular user
        user.is_admin = False
        db.commit()
        db.refresh(user)

        with pytest.raises(HTTPException):
            require_admin_access(user)

        # Promote back to admin
        user.is_admin = True
        db.commit()
        db.refresh(user)

        require_admin_access(user)

        db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
