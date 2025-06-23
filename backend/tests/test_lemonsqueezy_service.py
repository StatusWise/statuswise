import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from lemonsqueezy_service import LemonSqueezyService
from models import Subscription, SubscriptionStatus, SubscriptionTier, User

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


@pytest.fixture
def db_session():
    """Create a database session for testing"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        # Clean up data after each test
        db.query(Subscription).delete()
        db.query(User).delete()
        db.commit()
        db.close()


@pytest.fixture
def test_user(db_session):
    """Create a test user"""
    user = User(
        email="test@example.com",
        hashed_password="hashed_password",
        subscription_tier=SubscriptionTier.FREE,
        subscription_status=SubscriptionStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


class TestLemonSqueezyService:
    def test_get_subscription_limits_free(self):
        """Test getting subscription limits for free tier"""
        limits = LemonSqueezyService.get_subscription_limits(SubscriptionTier.FREE)

        assert limits["max_projects"] == 1
        assert limits["max_incidents_per_project"] == 5
        assert "basic_status_page" in limits["features"]
        assert "email_notifications" in limits["features"]

    def test_get_subscription_limits_pro(self):
        """Test getting subscription limits for pro tier"""
        limits = LemonSqueezyService.get_subscription_limits(SubscriptionTier.PRO)

        assert limits["max_projects"] == 10
        assert limits["max_incidents_per_project"] == 100
        assert "basic_status_page" in limits["features"]
        assert "custom_domain" in limits["features"]
        assert "advanced_analytics" in limits["features"]

    def test_can_create_project_free_tier_no_projects(self, test_user, db_session):
        """Test that free tier user can create their first project"""
        result = LemonSqueezyService.can_create_project(test_user, db_session)
        assert result is True

    def test_can_create_project_free_tier_at_limit(self, test_user, db_session):
        """Test that free tier user cannot create project when at limit"""
        from models import Project

        # Create a project to reach the limit
        project = Project(name="Test Project", owner_id=test_user.id)
        db_session.add(project)
        db_session.commit()

        result = LemonSqueezyService.can_create_project(test_user, db_session)
        assert result is False

    def test_can_create_project_pro_tier(self, test_user, db_session):
        """Test that pro tier user can create projects under limit"""
        test_user.subscription_tier = SubscriptionTier.PRO
        db_session.commit()

        result = LemonSqueezyService.can_create_project(test_user, db_session)
        assert result is True

    def test_can_create_incident_free_tier_under_limit(self, test_user, db_session):
        """Test that free tier user can create incident under limit"""
        from models import Project

        # Create a project
        project = Project(name="Test Project", owner_id=test_user.id)
        db_session.add(project)
        db_session.commit()

        result = LemonSqueezyService.can_create_incident(
            test_user, project.id, db_session
        )
        assert result is True

    def test_can_create_incident_free_tier_at_limit(self, test_user, db_session):
        """Test that free tier user cannot create incident at limit"""
        from models import Incident, Project

        # Create a project
        project = Project(name="Test Project", owner_id=test_user.id)
        db_session.add(project)
        db_session.commit()

        # Create incidents up to the limit (5 for free tier)
        for i in range(5):
            incident = Incident(
                title=f"Test Incident {i}",
                description="Test description",
                project_id=project.id,
            )
            db_session.add(incident)
        db_session.commit()

        result = LemonSqueezyService.can_create_incident(
            test_user, project.id, db_session
        )
        assert result is False

    @patch("lemonsqueezy_service.requests.post")
    @patch("lemonsqueezy_service.LEMONSQUEEZY_API_KEY", "test_key")
    @patch("lemonsqueezy_service.LEMONSQUEEZY_STORE_ID", "1")
    def test_create_customer_success(self, mock_post):
        """Test successful customer creation"""
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"data": {"id": "123"}}
        mock_post.return_value = mock_response

        result = LemonSqueezyService.create_customer("test@example.com", "Test User")

        assert result == "123"
        mock_post.assert_called_once()

    @patch("lemonsqueezy_service.requests.post")
    @patch("lemonsqueezy_service.LEMONSQUEEZY_API_KEY", "test_key")
    @patch("lemonsqueezy_service.LEMONSQUEEZY_STORE_ID", "1")
    def test_create_customer_failure(self, mock_post):
        """Test customer creation failure"""
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Error"
        mock_post.return_value = mock_response

        result = LemonSqueezyService.create_customer("test@example.com")

        assert result is None

    @patch("lemonsqueezy_service.requests.post")
    @patch("lemonsqueezy_service.LEMONSQUEEZY_API_KEY", "test_key")
    @patch("lemonsqueezy_service.LEMONSQUEEZY_STORE_ID", "1")
    def test_create_customer_exception(self, mock_post):
        """Test customer creation with exception"""
        mock_post.side_effect = Exception("Network error")

        result = LemonSqueezyService.create_customer("test@example.com")

        assert result is None

    @patch("lemonsqueezy_service.requests.post")
    @patch("lemonsqueezy_service.LEMONSQUEEZY_API_KEY", "test_key")
    @patch("lemonsqueezy_service.LEMONSQUEEZY_STORE_ID", "1")
    def test_create_checkout_url_success(self, mock_post):
        """Test successful checkout URL creation"""
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "data": {"attributes": {"url": "https://checkout.lemonsqueezy.com/test"}}
        }
        mock_post.return_value = mock_response

        result = LemonSqueezyService.create_checkout_url(
            "variant_123", "test@example.com", "https://success.com", 1
        )

        assert result == "https://checkout.lemonsqueezy.com/test"

    @patch("lemonsqueezy_service.requests.post")
    @patch("lemonsqueezy_service.LEMONSQUEEZY_API_KEY", "test_key")
    @patch("lemonsqueezy_service.LEMONSQUEEZY_STORE_ID", "1")
    def test_create_checkout_url_failure(self, mock_post):
        """Test checkout URL creation failure"""
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Error"
        mock_post.return_value = mock_response

        result = LemonSqueezyService.create_checkout_url(
            "variant_123", "test@example.com", "https://success.com", 1
        )

        assert result is None

    def test_verify_webhook_signature_valid(self):
        """Test webhook signature verification with valid signature"""
        payload = b'{"test": "data"}'
        secret = "test_secret"
        signature = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()

        with patch.dict(os.environ, {"LEMONSQUEEZY_WEBHOOK_SECRET": secret}):
            result = LemonSqueezyService.verify_webhook_signature(payload, signature)
            assert result is True

    def test_verify_webhook_signature_invalid(self):
        """Test webhook signature verification with invalid signature"""
        payload = b'{"test": "data"}'
        secret = "test_secret"

        with patch.dict(os.environ, {"LEMONSQUEEZY_WEBHOOK_SECRET": secret}):
            result = LemonSqueezyService.verify_webhook_signature(
                payload, "invalid_signature"
            )
            assert result is False

    def test_verify_webhook_signature_no_secret(self):
        """Test webhook signature verification with no secret"""
        with patch.dict(os.environ, {}, clear=True):
            result = LemonSqueezyService.verify_webhook_signature(b"data", "signature")
            assert result is False

    def test_verify_webhook_signature_exception(self):
        """Test webhook signature verification with exception"""
        with patch.dict(os.environ, {"LEMONSQUEEZY_WEBHOOK_SECRET": "secret"}):
            result = LemonSqueezyService.verify_webhook_signature(None, "signature")
            assert result is False

    @patch.dict(os.environ, {"LEMONSQUEEZY_PRO_VARIANT_ID": "789"})
    def test_handle_webhook_subscription_created(self, test_user, db_session):
        """Test handling subscription_created webhook"""
        event_data = {
            "meta": {"event_name": "subscription_created"},
            "data": {
                "id": "123",
                "attributes": {
                    "custom_data": {"user_id": str(test_user.id)},
                    "customer_id": "456",
                    "variant_id": "789",
                    "order_id": "101112",
                    "status": "active",
                    "trial_ends_at": "2024-12-31T23:59:59Z",
                    "billing_anchor": "2024-12-31T23:59:59Z",
                },
            },
        }

        result = LemonSqueezyService.handle_webhook(event_data, db_session)
        assert result is True

        # Check that user subscription was updated
        db_session.refresh(test_user)
        assert test_user.subscription_tier == SubscriptionTier.PRO
        assert test_user.subscription_status == SubscriptionStatus.ACTIVE

    def test_handle_webhook_subscription_updated(self, test_user, db_session):
        """Test handling subscription_updated webhook"""
        # Set user to pro first
        test_user.subscription_tier = SubscriptionTier.PRO
        test_user.subscription_status = SubscriptionStatus.ACTIVE
        db_session.commit()

        event_data = {
            "meta": {"event_name": "subscription_updated"},
            "data": {
                "id": "123",
                "attributes": {
                    "custom_data": {"user_id": str(test_user.id)},
                    "status": "active",
                    "trial_ends_at": "2024-12-31T23:59:59Z",
                    "billing_anchor": "2024-12-31T23:59:59Z",
                },
            },
        }

        result = LemonSqueezyService.handle_webhook(event_data, db_session)
        assert result is True

    def test_handle_webhook_subscription_cancelled(self, test_user, db_session):
        """Test handling subscription_cancelled webhook"""
        test_user.subscription_tier = SubscriptionTier.PRO
        test_user.subscription_status = SubscriptionStatus.ACTIVE
        db_session.commit()

        event_data = {
            "meta": {"event_name": "subscription_cancelled"},
            "data": {
                "id": "123",
                "attributes": {
                    "custom_data": {"user_id": str(test_user.id)},
                    "status": "canceled",
                    "ends_at": "2024-12-31T23:59:59Z",
                },
            },
        }

        result = LemonSqueezyService.handle_webhook(event_data, db_session)
        assert result is True

        db_session.refresh(test_user)
        assert test_user.subscription_status == SubscriptionStatus.CANCELED

    def test_handle_webhook_subscription_expired(self, test_user, db_session):
        """Test handling subscription_expired webhook"""
        test_user.subscription_tier = SubscriptionTier.PRO
        test_user.subscription_status = SubscriptionStatus.CANCELED
        db_session.commit()

        event_data = {
            "meta": {"event_name": "subscription_expired"},
            "data": {
                "id": "123",
                "attributes": {"custom_data": {"user_id": str(test_user.id)}},
            },
        }

        result = LemonSqueezyService.handle_webhook(event_data, db_session)
        assert result is True

        db_session.refresh(test_user)
        assert test_user.subscription_tier == SubscriptionTier.FREE
        assert test_user.subscription_status == SubscriptionStatus.EXPIRED

    def test_handle_webhook_no_event_name(self, db_session):
        """Test handling webhook with no event name"""
        event_data = {"data": {}}

        result = LemonSqueezyService.handle_webhook(event_data, db_session)
        assert result is False

    def test_handle_webhook_no_data(self, db_session):
        """Test handling webhook with no data"""
        event_data = {"meta": {"event_name": "test"}}

        result = LemonSqueezyService.handle_webhook(event_data, db_session)
        assert result is False

    def test_handle_webhook_user_not_found(self, db_session):
        """Test handling webhook with non-existent user"""
        event_data = {
            "meta": {"event_name": "subscription_created"},
            "data": {
                "attributes": {"custom_data": {"user_id": "999"}, "status": "active"}
            },
        }

        result = LemonSqueezyService.handle_webhook(event_data, db_session)
        assert result is False

    def test_handle_webhook_find_user_by_email(self, test_user, db_session):
        """Test handling webhook that finds user by email"""
        event_data = {
            "meta": {"event_name": "subscription_created"},
            "data": {
                "id": "123",
                "attributes": {
                    "user_email": test_user.email,
                    "customer_id": "456",
                    "variant_id": "789",
                    "order_id": "101112",
                    "status": "active",
                    "trial_ends_at": "2024-12-31T23:59:59Z",
                    "billing_anchor": "2024-12-31T23:59:59Z",
                },
            },
        }

        result = LemonSqueezyService.handle_webhook(event_data, db_session)
        assert result is True

    def test_handle_webhook_unknown_event(self, test_user, db_session):
        """Test handling webhook with unknown event type"""
        event_data = {
            "meta": {"event_name": "unknown_event"},
            "data": {"attributes": {"custom_data": {"user_id": str(test_user.id)}}},
        }

        result = LemonSqueezyService.handle_webhook(event_data, db_session)
        assert result is True  # Should return True for unknown but valid events

    def test_handle_webhook_exception(self, db_session):
        """Test handling webhook with exception"""
        event_data = None  # This will cause an exception

        result = LemonSqueezyService.handle_webhook(event_data, db_session)
        assert result is False

    def test_parse_datetime_valid(self):
        """Test parsing valid datetime string"""
        date_string = "2024-12-31T23:59:59Z"
        result = LemonSqueezyService._parse_datetime(date_string)

        assert result is not None
        assert result.year == 2024
        assert result.month == 12
        assert result.day == 31

    def test_parse_datetime_none(self):
        """Test parsing None datetime"""
        result = LemonSqueezyService._parse_datetime(None)
        assert result is None

    def test_parse_datetime_invalid(self):
        """Test parsing invalid datetime string"""
        result = LemonSqueezyService._parse_datetime("invalid_date")
        assert result is None

    def test_handle_order_created(self, test_user, db_session):
        """Test handling order_created event"""
        result = LemonSqueezyService._handle_order_created(test_user, {}, db_session)
        assert result is True
