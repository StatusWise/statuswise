import os

# Set testing environment variables before importing main
os.environ["TESTING"] = "1"
os.environ["ENABLE_BILLING"] = "true"  # Enable billing for these tests
# Set required LemonSqueezy config for billing to be fully enabled
os.environ["LEMONSQUEEZY_API_KEY"] = "test-api-key"
os.environ["LEMONSQUEEZY_STORE_ID"] = "test-store-id"
os.environ["LEMONSQUEEZY_WEBHOOK_SECRET"] = "test-webhook-secret"
os.environ["LEMONSQUEEZY_PRO_VARIANT_ID"] = "test-variant-id"

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


class TestBillingEnabledEndpoints:
    """Test endpoints when billing is enabled."""

    def setup_method(self):
        """Set up test database for each test."""
        # Clear any existing data
        db = TestingSessionLocal()
        db.query(User).delete()
        db.commit()
        db.close()

    def test_config_endpoint_billing_enabled(self):
        """Test config endpoint when billing is enabled."""
        response = client.get("/config")
        assert response.status_code == 200

        data = response.json()
        assert data["billing_enabled"] is True
        assert data["features"]["subscription_management"] is True

    def test_subscription_status_with_user(self):
        """Test subscription status with authenticated user."""
        db = TestingSessionLocal()
        
        # Create user
        user = create_test_user(email="test@example.com")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create token
        token = create_access_token({"sub": user.email})
        
        # Test subscription status
        response = client.get("/subscription/status", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        
        data = response.json()
        assert "tier" in data
        assert "status" in data
        
        db.close()

    def test_checkout_requires_auth(self):
        """Test that checkout endpoints require authentication."""
        response = client.post("/subscription/create-checkout")
        assert response.status_code == 401

    def test_webhook_endpoint_exists(self):
        """Test that webhook endpoint exists when billing is enabled."""
        # Test with empty data (should fail validation but endpoint exists)
        response = client.post("/webhooks/lemonsqueezy", json={})
        # Should return validation error but not 503 (service unavailable)
        assert response.status_code != 503


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
