import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

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


class GroupRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
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
    is_public: bool

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
    is_public: bool = False  # Default to private for security

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v):
        if not v.strip():
            raise ValueError("Project name must not be blank or whitespace only")
        return v


class ProjectOut(ProjectCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    is_public: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Project name must not be blank or whitespace only")
        return v


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


# Group Management Schemas


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v):
        if not v.strip():
            raise ValueError("Group name must not be blank or whitespace only")
        return v.strip()

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, v):
        if v:
            return bleach.clean(v.strip())
        return v


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Group name must not be blank or whitespace only")
        return v.strip() if v else v

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, v):
        if v:
            return bleach.clean(v.strip())
        return v


class GroupMemberOut(BaseModel):
    id: int
    user_id: int
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    user_avatar_url: Optional[str] = None
    role: GroupRole
    is_active: bool
    joined_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class GroupOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    owner_id: int
    owner_email: Optional[str] = None
    owner_name: Optional[str] = None
    is_active: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime
    members_count: Optional[int] = None
    projects_count: Optional[int] = None
    members: Optional[List[GroupMemberOut]] = None

    model_config = ConfigDict(from_attributes=True)


class GroupSummaryOut(BaseModel):
    """Lightweight group summary for lists"""

    id: int
    name: str
    description: Optional[str] = None
    owner_id: int
    is_active: bool
    members_count: int
    projects_count: int
    user_role: Optional[GroupRole] = None  # Current user's role in the group

    model_config = ConfigDict(from_attributes=True)


class GroupInvitationCreate(BaseModel):
    group_id: int
    invited_email: Optional[str] = None
    invited_user_id: Optional[int] = None
    role: GroupRole = GroupRole.MEMBER
    message: Optional[str] = Field(None, max_length=500)

    @field_validator("message")
    @classmethod
    def sanitize_message(cls, v):
        if v:
            return bleach.clean(v.strip())
        return v

    def model_post_init(self, __context):
        # Ensure either email or user_id is provided, but not both
        if not self.invited_email and not self.invited_user_id:
            raise ValueError("Either invited_email or invited_user_id must be provided")
        if self.invited_email and self.invited_user_id:
            raise ValueError("Cannot provide both invited_email and invited_user_id")


class GroupInvitationUpdate(BaseModel):
    status: InvitationStatus
    message: Optional[str] = Field(None, max_length=500)

    @field_validator("message")
    @classmethod
    def sanitize_message(cls, v):
        if v:
            return bleach.clean(v.strip())
        return v


class GroupInvitationOut(BaseModel):
    id: int
    group_id: int
    group_name: Optional[str] = None
    invited_user_id: Optional[int] = None
    invited_email: Optional[str] = None
    invited_by_id: int
    invited_by_email: Optional[str] = None
    invited_by_name: Optional[str] = None
    role: GroupRole
    status: InvitationStatus
    message: Optional[str] = None
    expires_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    responded_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)


class GroupMemberUpdate(BaseModel):
    role: Optional[GroupRole] = None
    is_active: Optional[bool] = None


class GroupStatsOut(BaseModel):
    total_groups: int
    active_groups: int
    total_members: int
    pending_invitations: int
