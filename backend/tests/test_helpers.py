"""
Test helper functions for creating Google OAuth users and other test utilities.
"""

from typing import Optional
from models import User, SubscriptionTier, SubscriptionStatus


def create_test_user(
    email: str = "test@example.com",
    name: str = "Test User",
    google_id: str = "test_google_id_123",
    avatar_url: str = "https://example.com/avatar.jpg",
    is_admin: bool = False,
    is_active: bool = True,
    subscription_tier: SubscriptionTier = SubscriptionTier.FREE,
    subscription_status: Optional[SubscriptionStatus] = None,
):
    """Create a test user with Google OAuth fields instead of password."""
    return User(
        email=email,
        name=name,
        google_id=google_id,
        avatar_url=avatar_url,
        is_admin=is_admin,
        is_active=is_active,
        subscription_tier=subscription_tier,
        subscription_status=subscription_status,
    )


def create_test_admin(
    email: str = "admin@example.com",
    name: str = "Admin User",
    google_id: str = "admin_google_id_123",
):
    """Create a test admin user."""
    return create_test_user(
        email=email,
        name=name,
        google_id=google_id,
        is_admin=True,
    ) 