import hashlib
import hmac
import os
from datetime import datetime
from typing import Any, Dict, Optional

import requests
from sqlalchemy.orm import Session

from models import Subscription, SubscriptionStatus, SubscriptionTier, User

# Lemon Squeezy API configuration
LEMONSQUEEZY_API_URL = "https://api.lemonsqueezy.com/v1"
LEMONSQUEEZY_API_KEY = os.getenv("LEMONSQUEEZY_API_KEY")
LEMONSQUEEZY_STORE_ID = os.getenv("LEMONSQUEEZY_STORE_ID")

# Subscription limits
SUBSCRIPTION_LIMITS = {
    SubscriptionTier.FREE: {
        "max_projects": 1,
        "max_incidents_per_project": 5,
        "features": ["basic_status_page", "email_notifications"],
    },
    SubscriptionTier.PRO: {
        "max_projects": 10,
        "max_incidents_per_project": 100,
        "features": [
            "basic_status_page",
            "email_notifications",
            "custom_domain",
            "advanced_analytics",
            "webhook_notifications",
        ],
    },
}


class LemonSqueezyService:
    @staticmethod
    def _get_headers():
        """Get headers for Lemon Squeezy API requests"""
        return {
            "Authorization": f"Bearer {LEMONSQUEEZY_API_KEY}",
            "Content-Type": "application/vnd.api+json",
            "Accept": "application/vnd.api+json",
        }

    @staticmethod
    def create_customer(email: str, name: str = "") -> Optional[str]:
        """Create a Lemon Squeezy customer and return customer ID"""
        try:
            data = {
                "data": {
                    "type": "customers",
                    "attributes": {
                        "name": name or email.split("@")[0],
                        "email": email,
                        "store_id": int(LEMONSQUEEZY_STORE_ID),
                    },
                }
            }

            response = requests.post(
                f"{LEMONSQUEEZY_API_URL}/customers",
                json=data,
                headers=LemonSqueezyService._get_headers(),
            )

            if response.status_code == 201:
                return str(response.json()["data"]["id"])
            else:
                print(f"Failed to create customer: {response.text}")
                return None
        except Exception as e:
            print(f"Error creating customer: {str(e)}")
            return None

    @staticmethod
    def create_checkout_url(
        variant_id: str, customer_email: str, success_url: str, user_id: int
    ) -> Optional[str]:
        """Create a Lemon Squeezy checkout URL"""
        try:
            data = {
                "data": {
                    "type": "checkouts",
                    "attributes": {
                        "checkout_options": {
                            "embed": False,
                            "media": False,
                            "logo": True,
                        },
                        "checkout_data": {
                            "email": customer_email,
                            "custom": {"user_id": str(user_id)},
                        },
                        "expires_at": None,
                    },
                    "relationships": {
                        "store": {
                            "data": {"type": "stores", "id": LEMONSQUEEZY_STORE_ID}
                        },
                        "variant": {"data": {"type": "variants", "id": variant_id}},
                    },
                }
            }

            response = requests.post(
                f"{LEMONSQUEEZY_API_URL}/checkouts",
                json=data,
                headers=LemonSqueezyService._get_headers(),
            )

            if response.status_code == 201:
                return response.json()["data"]["attributes"]["url"]
            else:
                print(f"Failed to create checkout: {response.text}")
                return None
        except Exception as e:
            print(f"Error creating checkout: {str(e)}")
            return None

    @staticmethod
    def verify_webhook_signature(payload: bytes, signature: str) -> bool:
        """Verify Lemon Squeezy webhook signature"""
        try:
            webhook_secret = os.getenv("LEMONSQUEEZY_WEBHOOK_SECRET")
            if not webhook_secret:
                return False

            expected_signature = hmac.new(
                webhook_secret.encode(), payload, hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(signature, expected_signature)
        except Exception:
            return False

    @staticmethod
    def handle_webhook(event_data: Dict[str, Any], db: Session) -> bool:
        """Handle webhook events from Lemon Squeezy"""
        try:
            event_name = event_data.get("meta", {}).get("event_name")
            data = event_data.get("data", {})

            if not data or not event_name:
                return False

            # Extract user ID from custom data
            custom_data = data.get("attributes", {}).get("custom_data", {})
            user_id = custom_data.get("user_id")

            if not user_id:
                # Try to find user by email
                user_email = data.get("attributes", {}).get("user_email")
                if user_email:
                    user = db.query(User).filter(User.email == user_email).first()
                    if user:
                        user_id = str(user.id)

                if not user_id:
                    return False

            user = db.query(User).filter(User.id == int(user_id)).first()
            if not user:
                return False

            if event_name == "order_created":
                return LemonSqueezyService._handle_order_created(user, data, db)
            elif event_name == "subscription_created":
                return LemonSqueezyService._handle_subscription_created(user, data, db)
            elif event_name == "subscription_updated":
                return LemonSqueezyService._handle_subscription_updated(user, data, db)
            elif event_name == "subscription_cancelled":
                return LemonSqueezyService._handle_subscription_cancelled(
                    user, data, db
                )
            elif event_name == "subscription_resumed":
                return LemonSqueezyService._handle_subscription_resumed(user, data, db)
            elif event_name == "subscription_expired":
                return LemonSqueezyService._handle_subscription_expired(user, data, db)

            return True
        except Exception as e:
            print(f"Webhook handling error: {str(e)}")
            return False

    @staticmethod
    def _handle_order_created(user: User, data: Dict, db: Session) -> bool:
        """Handle order creation (one-time purchase)"""
        try:
            # For now, we're focusing on subscriptions
            # One-time purchases could be handled here in the future
            return True
        except Exception as e:
            print(f"Error handling order creation: {str(e)}")
            return False

    @staticmethod
    def _handle_subscription_created(user: User, data: Dict, db: Session) -> bool:
        """Handle subscription creation"""
        try:
            attributes = data.get("attributes", {})

            # Determine tier from variant ID
            variant_id = str(attributes.get("variant_id"))
            tier = (
                SubscriptionTier.PRO
                if variant_id == os.getenv("LEMONSQUEEZY_PRO_VARIANT_ID")
                else SubscriptionTier.FREE
            )

            # Create subscription record
            subscription = Subscription(
                user_id=user.id,
                lemonsqueezy_subscription_id=str(data["id"]),
                lemonsqueezy_customer_id=str(attributes.get("customer_id")),
                lemonsqueezy_variant_id=variant_id,
                lemonsqueezy_order_id=str(attributes.get("order_id")),
                tier=tier,
                status=SubscriptionStatus(attributes.get("status", "active")),
                trial_ends_at=LemonSqueezyService._parse_datetime(
                    attributes.get("trial_ends_at")
                ),
                billing_anchor=LemonSqueezyService._parse_datetime(
                    attributes.get("billing_anchor")
                ),
            )

            # Update user
            user.lemonsqueezy_customer_id = str(attributes.get("customer_id"))
            user.subscription_tier = tier
            user.subscription_status = SubscriptionStatus(
                attributes.get("status", "active")
            )

            # Set expiration based on trial or billing cycle
            trial_ends = LemonSqueezyService._parse_datetime(
                attributes.get("trial_ends_at")
            )
            billing_anchor = LemonSqueezyService._parse_datetime(
                attributes.get("billing_anchor")
            )
            user.subscription_expires_at = trial_ends or billing_anchor

            db.add(subscription)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error creating subscription: {str(e)}")
            return False

    @staticmethod
    def _handle_subscription_updated(user: User, data: Dict, db: Session) -> bool:
        """Handle subscription updates"""
        try:
            attributes = data.get("attributes", {})
            subscription = (
                db.query(Subscription)
                .filter(Subscription.lemonsqueezy_subscription_id == str(data["id"]))
                .first()
            )

            if subscription:
                new_status = SubscriptionStatus(attributes.get("status", "active"))
                subscription.status = new_status
                subscription.trial_ends_at = LemonSqueezyService._parse_datetime(
                    attributes.get("trial_ends_at")
                )
                subscription.billing_anchor = LemonSqueezyService._parse_datetime(
                    attributes.get("billing_anchor")
                )

                user.subscription_status = new_status
                trial_ends = LemonSqueezyService._parse_datetime(
                    attributes.get("trial_ends_at")
                )
                billing_anchor = LemonSqueezyService._parse_datetime(
                    attributes.get("billing_anchor")
                )
                user.subscription_expires_at = trial_ends or billing_anchor

                db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error updating subscription: {str(e)}")
            return False

    @staticmethod
    def _handle_subscription_cancelled(user: User, data: Dict, db: Session) -> bool:
        """Handle subscription cancellation"""
        try:
            # Update user to free tier
            user.subscription_tier = SubscriptionTier.FREE
            user.subscription_status = SubscriptionStatus.CANCELED

            # Update subscription record
            subscription = (
                db.query(Subscription)
                .filter(Subscription.lemonsqueezy_subscription_id == str(data["id"]))
                .first()
            )

            if subscription:
                subscription.status = SubscriptionStatus.CANCELED

            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error handling subscription cancellation: {str(e)}")
            return False

    @staticmethod
    def _handle_subscription_resumed(user: User, data: Dict, db: Session) -> bool:
        """Handle subscription resumption"""
        try:
            # Restore Pro tier
            user.subscription_tier = SubscriptionTier.PRO
            user.subscription_status = SubscriptionStatus.ACTIVE

            subscription = (
                db.query(Subscription)
                .filter(Subscription.lemonsqueezy_subscription_id == str(data["id"]))
                .first()
            )

            if subscription:
                subscription.status = SubscriptionStatus.ACTIVE
                subscription.tier = SubscriptionTier.PRO

            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error handling subscription resumption: {str(e)}")
            return False

    @staticmethod
    def _handle_subscription_expired(user: User, data: Dict, db: Session) -> bool:
        """Handle subscription expiration"""
        try:
            # Update user to free tier
            user.subscription_tier = SubscriptionTier.FREE
            user.subscription_status = SubscriptionStatus.EXPIRED
            user.subscription_expires_at = None

            subscription = (
                db.query(Subscription)
                .filter(Subscription.lemonsqueezy_subscription_id == str(data["id"]))
                .first()
            )

            if subscription:
                subscription.status = SubscriptionStatus.EXPIRED

            db.commit()
            return True
        except Exception as e:
            db.rollback()
            print(f"Error handling subscription expiration: {str(e)}")
            return False

    @staticmethod
    def _parse_datetime(date_string: Optional[str]) -> Optional[datetime]:
        """Parse ISO datetime string to datetime object"""
        if not date_string:
            return None
        try:
            return datetime.fromisoformat(date_string.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None

    @staticmethod
    def get_subscription_limits(tier: SubscriptionTier) -> Dict[str, Any]:
        """Get subscription limits for a given tier"""
        return SUBSCRIPTION_LIMITS.get(tier, SUBSCRIPTION_LIMITS[SubscriptionTier.FREE])

    @staticmethod
    def can_create_project(user: User, db: Session) -> bool:
        """Check if user can create another project"""
        from sqlalchemy import func

        from models import Project

        limits = LemonSqueezyService.get_subscription_limits(user.subscription_tier)
        project_count = (
            db.query(func.count(Project.id))
            .filter(Project.owner_id == user.id)
            .scalar()
        )

        return project_count < limits["max_projects"]

    @staticmethod
    def can_create_incident(user: User, project_id: int, db: Session) -> bool:
        """Check if user can create another incident for a project"""
        from sqlalchemy import func

        from models import Incident, Project

        # Check if user owns the project
        project = (
            db.query(Project)
            .filter(Project.id == project_id, Project.owner_id == user.id)
            .first()
        )
        if not project:
            return False

        limits = LemonSqueezyService.get_subscription_limits(user.subscription_tier)
        incident_count = (
            db.query(func.count(Incident.id))
            .filter(Incident.project_id == project_id)
            .scalar()
        )

        return incident_count < limits["max_incidents_per_project"]
