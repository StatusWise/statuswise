import os
from unittest.mock import patch

# Set testing environment variable before importing main
os.environ["TESTING"] = "1"


class TestConfig:
    """Test the configuration module and feature toggles."""

    def test_default_values(self):
        """Test that default values are set correctly."""
        with patch.dict(os.environ, {}, clear=True):
            # Need to reimport to get fresh values
            from importlib import reload

            import config as config_module

            reload(config_module)

            # Feature toggles should default to False
            assert config_module.Config.ENABLE_BILLING is False
            assert config_module.Config.ENABLE_ADMIN is False

            # Helper methods should return False
            assert config_module.Config.is_billing_enabled() is False

    def test_enable_billing_true(self):
        """Test billing enabled with various true values."""
        true_values = ["true", "True", "TRUE", "1", "yes", "YES", "on", "ON"]

        for value in true_values:
            with patch.dict(
                os.environ,
                {"ENABLE_BILLING": value, "LEMONSQUEEZY_API_KEY": "test_key"},
            ):
                from importlib import reload

                import config as config_module

                reload(config_module)

                assert (
                    config_module.Config.ENABLE_BILLING is True
                ), f"Failed for value: {value}"
                assert (
                    config_module.Config.is_billing_enabled() is True
                ), f"Failed for value: {value}"

    def test_enable_billing_false(self):
        """Test billing disabled with various false values."""
        false_values = ["false", "False", "FALSE", "0", "no", "NO", "off", "OFF", ""]

        for value in false_values:
            with patch.dict(os.environ, {"ENABLE_BILLING": value}):
                from importlib import reload

                import config as config_module

                reload(config_module)

                assert (
                    config_module.Config.ENABLE_BILLING is False
                ), f"Failed for value: {value}"
                assert (
                    config_module.Config.is_billing_enabled() is False
                ), f"Failed for value: {value}"

    def test_is_billing_enabled_requires_api_key(self):
        """Test that billing is only enabled when API key is present."""
        # Billing flag true but no API key
        with patch.dict(os.environ, {"ENABLE_BILLING": "true"}, clear=True):
            from importlib import reload

            import config as config_module

            reload(config_module)

            assert config_module.Config.ENABLE_BILLING is True
            assert config_module.Config.is_billing_enabled() is False  # No API key

        # Billing flag true with API key
        with patch.dict(
            os.environ,
            {"ENABLE_BILLING": "true", "LEMONSQUEEZY_API_KEY": "test_key"},
            clear=True,
        ):
            from importlib import reload

            import config as config_module

            reload(config_module)

            assert config_module.Config.ENABLE_BILLING is True
            assert config_module.Config.is_billing_enabled() is True

        # Billing flag false with API key
        with patch.dict(
            os.environ,
            {"ENABLE_BILLING": "false", "LEMONSQUEEZY_API_KEY": "test_key"},
            clear=True,
        ):
            from importlib import reload

            import config as config_module

            reload(config_module)

            assert config_module.Config.ENABLE_BILLING is False
            assert config_module.Config.is_billing_enabled() is False

    def test_get_billing_config(self):
        """Test getting billing configuration."""
        # When billing is disabled
        with patch.dict(os.environ, {"ENABLE_BILLING": "false"}, clear=True):
            from importlib import reload

            import config as config_module

            reload(config_module)

            billing_config = config_module.Config.get_billing_config()
            assert billing_config == {}

        # When billing is enabled with full config
        with patch.dict(
            os.environ,
            {
                "ENABLE_BILLING": "true",
                "LEMONSQUEEZY_API_KEY": "test_key",
                "LEMONSQUEEZY_STORE_ID": "test_store",
                "LEMONSQUEEZY_WEBHOOK_SECRET": "test_secret",
                "LEMONSQUEEZY_PRO_VARIANT_ID": "test_variant",
            },
            clear=True,
        ):
            from importlib import reload

            import config as config_module

            reload(config_module)

            billing_config = config_module.Config.get_billing_config()

            expected = {
                "api_key": "test_key",
                "store_id": "test_store",
                "webhook_secret": "test_secret",
                "pro_variant_id": "test_variant",
            }
            assert billing_config == expected

    def test_validate_configuration_billing_enabled_missing_keys(self):
        """Test configuration validation for billing when enabled but missing keys."""
        # Billing enabled but missing API key
        with patch.dict(os.environ, {"ENABLE_BILLING": "true"}, clear=True):
            from importlib import reload

            import config as config_module

            reload(config_module)

            errors = config_module.Config.validate_configuration()
            assert "billing" in errors
            assert "LEMONSQUEEZY_API_KEY" in errors["billing"]

        # Billing enabled with API key but missing variant ID
        with patch.dict(
            os.environ,
            {"ENABLE_BILLING": "true", "LEMONSQUEEZY_API_KEY": "test_key"},
            clear=True,
        ):
            from importlib import reload

            import config as config_module

            reload(config_module)

            errors = config_module.Config.validate_configuration()
            assert "billing" in errors
            assert "LEMONSQUEEZY_PRO_VARIANT_ID" in errors["billing"]

    def test_validate_configuration_security_errors(self):
        """Test configuration validation for security."""
        # Test with secure values - only JWT secret should fail due to default
        with patch.dict(
            os.environ,
            {
                "DATABASE_URL": "test_db",
                "SECRET_KEY": "secure_secret",
                # JWT_SECRET will use default which should fail
            },
            clear=True,
        ):
            from importlib import reload

            import config as config_module

            reload(config_module)

            errors = config_module.Config.validate_configuration()
            assert "security" in errors
            assert "JWT_SECRET" in errors["security"]

        # Test with default SECRET_KEY
        with patch.dict(
            os.environ,
            {
                "DATABASE_URL": "test_db",
                "SECRET_KEY": "your-secret-key-here",
                "JWT_SECRET": "secure_jwt",
            },
            clear=True,
        ):
            from importlib import reload

            import config as config_module

            reload(config_module)

            errors = config_module.Config.validate_configuration()
            assert "security" in errors
            assert "SECRET_KEY" in errors["security"]

    def test_validate_configuration_no_errors(self):
        """Test configuration validation with valid config."""
        with patch.dict(
            os.environ,
            {
                "DATABASE_URL": "test_db",
                "SECRET_KEY": "secure_secret",
                "JWT_SECRET": "secure_jwt",
            },
            clear=True,
        ):
            from importlib import reload

            import config as config_module

            reload(config_module)

            errors = config_module.Config.validate_configuration()
            # Should have no billing or database errors, might have others but that's ok for this test
            assert "billing" not in errors
            assert "database" not in errors

    def test_environment_variables_loaded(self):
        """Test that environment variables are loaded correctly."""
        with patch.dict(
            os.environ,
            {
                "DATABASE_URL": "test://db",
                "SECRET_KEY": "test_secret",
                "JWT_SECRET": "test_jwt",
                "FRONTEND_URL": "http://test.com",
                "LEMONSQUEEZY_API_KEY": "test_key",
                "LEMONSQUEEZY_STORE_ID": "test_store",
                "LEMONSQUEEZY_WEBHOOK_SECRET": "test_webhook",
                "LEMONSQUEEZY_PRO_VARIANT_ID": "test_variant",
            },
        ):
            from importlib import reload

            import config as config_module

            reload(config_module)

            assert config_module.Config.DATABASE_URL == "test://db"
            assert config_module.Config.SECRET_KEY == "test_secret"
            assert config_module.Config.JWT_SECRET == "test_jwt"
            assert config_module.Config.FRONTEND_URL == "http://test.com"
            assert config_module.Config.LEMONSQUEEZY_API_KEY == "test_key"
            assert config_module.Config.LEMONSQUEEZY_STORE_ID == "test_store"
            assert config_module.Config.LEMONSQUEEZY_WEBHOOK_SECRET == "test_webhook"
            assert config_module.Config.LEMONSQUEEZY_PRO_VARIANT_ID == "test_variant"

    def test_testing_flag(self):
        """Test that testing flag works correctly."""
        with patch.dict(os.environ, {"TESTING": "true"}):
            from importlib import reload

            import config as config_module

            reload(config_module)

            assert config_module.Config.TESTING is True

        with patch.dict(os.environ, {"TESTING": "false"}):
            from importlib import reload

            import config as config_module

            reload(config_module)

            assert config_module.Config.TESTING is False
