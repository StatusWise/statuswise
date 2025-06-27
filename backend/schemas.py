import datetime
import re
from enum import Enum
from typing import Any, Dict, Optional

import bleach
from pydantic import BaseModel, ConfigDict, Field, field_validator


class SubscriptionTier(str, Enum):
    FREE = "free"
    PRO = "pro"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    UNPAID = "unpaid"
    ON_TRIAL = "on_trial"
    PAUSED = "paused"
    EXPIRED = "expired"


class GoogleAuthRequest(BaseModel):
    """Request schema for Google OAuth authentication"""

    google_token: str = Field(..., description="Google OAuth ID token")


class UserOut(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    subscription_tier: SubscriptionTier
    subscription_status: Optional[SubscriptionStatus]
    subscription_expires_at: Optional[datetime.datetime]

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    """Response schema for authentication endpoints"""

    access_token: str
    token_type: str = "bearer"
    user: UserOut


class AdminUserOut(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    google_id: Optional[str] = None
    is_active: bool
    is_admin: bool
    subscription_tier: SubscriptionTier
    subscription_status: Optional[SubscriptionStatus]
    subscription_expires_at: Optional[datetime.datetime]
    lemonsqueezy_customer_id: Optional[str]
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class AdminSubscriptionOut(BaseModel):
    id: int
    user_id: int
    lemonsqueezy_subscription_id: str
    lemonsqueezy_customer_id: str
    lemonsqueezy_variant_id: str
    lemonsqueezy_order_id: Optional[str]
    tier: SubscriptionTier
    status: SubscriptionStatus
    trial_ends_at: Optional[datetime.datetime]
    billing_anchor: Optional[datetime.datetime]
    created_at: datetime.datetime
    updated_at: datetime.datetime

    # Related user info
    user_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminProjectOut(BaseModel):
    id: int
    name: str
    owner_id: int
    owner_email: Optional[str] = None
    incidents_count: Optional[int] = None
    unresolved_incidents_count: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class AdminStatsOut(BaseModel):
    total_users: int
    active_users: int
    pro_subscribers: int
    free_users: int
    total_projects: int
    total_incidents: int
    unresolved_incidents: int
    monthly_revenue: Optional[float] = None


class SubscriptionStatusResponse(BaseModel):
    tier: SubscriptionTier
    status: Optional[SubscriptionStatus]
    expires_at: Optional[datetime.datetime]
    limits: Dict[str, Any]
    usage: Dict[str, int]


class CheckoutSessionResponse(BaseModel):
    checkout_url: str


class PortalSessionResponse(BaseModel):
    portal_url: str


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v):
        if not v.strip():
            raise ValueError("Project name must not be blank or whitespace only")
        return v


class ProjectOut(ProjectCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class IncidentCreate(BaseModel):
    project_id: int
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=5000)
    scheduled_start: Optional[datetime.datetime] = None

    @field_validator("title", "description")
    @classmethod
    def sanitize_html(cls, v):
        return bleach.clean(v)


class IncidentOut(IncidentCreate):
    id: int
    resolved: bool
    created_at: datetime.datetime
    resolved_at: Optional[datetime.datetime]

    model_config = ConfigDict(from_attributes=True)


class ConfigResponse(BaseModel):
    """Configuration response for frontend feature toggles."""

    billing_enabled: bool
    admin_enabled: bool
    features: Dict[str, bool]

    model_config = ConfigDict(from_attributes=True)
