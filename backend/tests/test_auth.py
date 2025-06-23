import pytest
from fastapi import HTTPException
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
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
def test_user(test_db):
    db = TestingSessionLocal()
    user = User(
        email="test@example.com", hashed_password=get_password_hash("testpassword")
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


class TestPasswordHashing:
    def test_password_hashing_and_verification(self):
        password = "testpassword123"
        hashed = get_password_hash(password)

        # Verify the password matches
        assert verify_password(password, hashed) is True

        # Verify wrong password doesn't match
        assert verify_password("wrongpassword", hashed) is False

        # Verify empty password doesn't match
        assert verify_password("", hashed) is False

    def test_different_passwords_produce_different_hashes(self):
        password1 = "password1"
        password2 = "password2"

        hash1 = get_password_hash(password1)
        hash2 = get_password_hash(password2)

        assert hash1 != hash2

    def test_same_password_produces_different_hashes(self):
        password = "samepassword"

        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        # Bcrypt should produce different hashes for the same password
        assert hash1 != hash2


class TestTokenCreation:
    def test_create_access_token(self):
        data = {"sub": "test@example.com"}
        token = create_access_token(data)

        # Verify token can be decoded
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == "test@example.com"

    def test_token_contains_correct_data(self):
        email = "user@example.com"
        data = {"sub": email}
        token = create_access_token(data)

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == email


class TestUserValidation:
    def test_get_current_user_success(self, test_user):
        # Create a valid token
        token = create_access_token({"sub": test_user.email})

        # Mock the dependencies
        from unittest.mock import Mock

        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = test_user

        # Test the function
        user = get_current_user(token=token, db=mock_db)
        assert user.email == test_user.email

    def test_get_current_user_invalid_token(self, test_db):
        # Test with invalid token
        from unittest.mock import Mock

        mock_db = Mock()

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token="invalid_token", db=mock_db)

        assert exc_info.value.status_code == 401

    def test_get_current_user_nonexistent_user(self, test_db):
        # Create token for non-existent user
        token = create_access_token({"sub": "nonexistent@example.com"})

        from unittest.mock import Mock

        mock_db = Mock()
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token=token, db=mock_db)

        assert exc_info.value.status_code == 401

    def test_get_current_user_missing_subject(self, test_db):
        # Create token without subject
        token = create_access_token({})

        from unittest.mock import Mock

        mock_db = Mock()

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(token=token, db=mock_db)

        assert exc_info.value.status_code == 401


class TestSecurity:
    def test_password_hash_is_secure(self):
        password = "simplepassword"
        hashed = get_password_hash(password)

        # Hash should be different from original password
        assert hashed != password

        # Hash should be longer than original password
        assert len(hashed) > len(password)

        # Hash should start with bcrypt identifier
        assert hashed.startswith("$2b$")

    def test_token_security(self):
        data = {"sub": "test@example.com"}
        token = create_access_token(data)

        # Token should not contain plain text password
        assert "password" not in token

        # Token should be a reasonable length
        assert len(token) > 50


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
