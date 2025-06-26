"""
Configuration module for StatusWise feature toggles and environment variables.

This module centralizes all configuration options and feature toggles to provide
a single source of truth for application settings.
"""

import os
from typing import Any, Dict


class Config:
    """Configuration class for StatusWise application settings."""

    # Database configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///:memory:")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "test-secret-key-for-development-only")

    # Frontend configuration
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Feature toggles
    ENABLE_BILLING: bool = os.getenv("ENABLE_BILLING", "false").lower() in (
        "true",
        "1",
        "yes",
        "on",
    )
    ENABLE_ADMIN: bool = os.getenv("ENABLE_ADMIN", "false").lower() in (
        "true",
        "1",
        "yes",
        "on",
    )

    # Lemon Squeezy configuration (only if billing is enabled)
    LEMONSQUEEZY_API_KEY: str = os.getenv("LEMONSQUEEZY_API_KEY", "")
    LEMONSQUEEZY_STORE_ID: str = os.getenv("LEMONSQUEEZY_STORE_ID", "")
    LEMONSQUEEZY_WEBHOOK_SECRET: str = os.getenv("LEMONSQUEEZY_WEBHOOK_SECRET", "")
    LEMONSQUEEZY_PRO_VARIANT_ID: str = os.getenv("LEMONSQUEEZY_PRO_VARIANT_ID", "")

    # Testing environment flag
    TESTING: bool = os.getenv("TESTING", "false").lower() in ("true", "1", "yes", "on")

    @classmethod
    def is_billing_enabled(cls) -> bool:
        """Check if billing functionality is enabled."""
        return cls.ENABLE_BILLING and bool(cls.LEMONSQUEEZY_API_KEY)

    @classmethod
    def is_admin_enabled(cls) -> bool:
        """Check if admin functionality is enabled."""
        return cls.ENABLE_ADMIN

    @classmethod
    def get_billing_config(cls) -> Dict[str, Any]:
        """Get billing configuration if enabled."""
        if not cls.is_billing_enabled():
            return {}

        return {
            "api_key": cls.LEMONSQUEEZY_API_KEY,
            "store_id": cls.LEMONSQUEEZY_STORE_ID,
            "webhook_secret": cls.LEMONSQUEEZY_WEBHOOK_SECRET,
            "pro_variant_id": cls.LEMONSQUEEZY_PRO_VARIANT_ID,
        }

    @classmethod
    def validate_configuration(cls) -> Dict[str, str]:
        """Validate configuration and return any errors."""
        errors = {}

        if cls.ENABLE_BILLING:
            billing_errors = []
            if not cls.LEMONSQUEEZY_API_KEY:
                billing_errors.append(
                    "LEMONSQUEEZY_API_KEY is required when billing is enabled"
                )
            if not cls.LEMONSQUEEZY_PRO_VARIANT_ID:
                billing_errors.append(
                    "LEMONSQUEEZY_PRO_VARIANT_ID is required when billing is enabled"
                )
            if billing_errors:
                errors["billing"] = ", ".join(billing_errors)

        if not cls.DATABASE_URL:
            errors["database"] = "DATABASE_URL is required"

        if not cls.SECRET_KEY or cls.SECRET_KEY == "your-secret-key-here":
            errors["security"] = "SECRET_KEY must be set to a secure value"

        if (
            not cls.JWT_SECRET
            or cls.JWT_SECRET == "test-secret-key-for-development-only"
        ):
            errors["security"] = "JWT_SECRET must be set to a secure value"

        return errors


# Global configuration instance
config = Config()
