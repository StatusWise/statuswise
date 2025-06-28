import datetime
from enum import Enum

from sqlalchemy import Boolean, Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from database import Base


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


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)  # User's full name from Google
    google_id = Column(String, unique=True, index=True)  # Google user ID
    avatar_url = Column(String, nullable=True)  # Google profile picture
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    # Lemon Squeezy fields
    lemonsqueezy_customer_id = Column(String, nullable=True, unique=True)
    subscription_tier = Column(SQLEnum(SubscriptionTier), default=SubscriptionTier.FREE)
    subscription_status = Column(SQLEnum(SubscriptionStatus), nullable=True)
    subscription_expires_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(
        DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )

    # Relationships
    subscription = relationship("Subscription", back_populates="user", uselist=False)
    owned_groups = relationship(
        "Group", back_populates="owner", cascade="all, delete-orphan"
    )
    group_memberships = relationship(
        "GroupMember", back_populates="user", cascade="all, delete-orphan"
    )
    sent_invitations = relationship(
        "GroupInvitation",
        foreign_keys="GroupInvitation.invited_by_id",
        back_populates="invited_by",
    )
    received_invitations = relationship(
        "GroupInvitation",
        foreign_keys="GroupInvitation.invited_user_id",
        back_populates="invited_user",
    )


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)

    # Lemon Squeezy fields
    lemonsqueezy_subscription_id = Column(String, unique=True, nullable=False)
    lemonsqueezy_customer_id = Column(String, nullable=False)
    lemonsqueezy_variant_id = Column(String, nullable=False)
    lemonsqueezy_order_id = Column(String, nullable=True)

    # Subscription details
    tier = Column(SQLEnum(SubscriptionTier), nullable=False)
    status = Column(SQLEnum(SubscriptionStatus), nullable=False)
    trial_ends_at = Column(DateTime, nullable=True)
    billing_anchor = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(
        DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )

    # Relationships
    user = relationship("User", back_populates="subscription")


class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(
        DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )

    # Relationships
    owner = relationship("User", back_populates="owned_groups")
    members = relationship(
        "GroupMember", back_populates="group", cascade="all, delete-orphan"
    )
    projects = relationship("Project", back_populates="group")
    invitations = relationship(
        "GroupInvitation", back_populates="group", cascade="all, delete-orphan"
    )


class GroupMember(Base):
    __tablename__ = "group_members"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(SQLEnum(GroupRole), nullable=False, default=GroupRole.MEMBER)
    is_active = Column(Boolean, default=True)

    # Timestamps
    joined_at = Column(
        DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )

    # Relationships
    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="group_memberships")

    # Ensure unique group-user combinations
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="_group_user_uc"),)


class GroupInvitation(Base):
    __tablename__ = "group_invitations"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    invited_user_id = Column(
        Integer, ForeignKey("users.id"), nullable=True
    )  # Null for email invitations
    invited_email = Column(String, nullable=True)  # For inviting non-users
    invited_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(SQLEnum(GroupRole), nullable=False, default=GroupRole.MEMBER)
    status = Column(
        SQLEnum(InvitationStatus), nullable=False, default=InvitationStatus.PENDING
    )
    message = Column(Text, nullable=True)
    invitation_token = Column(
        String, nullable=True, unique=True
    )  # For email-based invitations
    expires_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(
        DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )
    responded_at = Column(DateTime, nullable=True)

    # Relationships
    group = relationship("Group", back_populates="invitations")
    invited_user = relationship(
        "User", foreign_keys=[invited_user_id], back_populates="received_invitations"
    )
    invited_by = relationship(
        "User", foreign_keys=[invited_by_id], back_populates="sent_invitations"
    )


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    group_id = Column(
        Integer, ForeignKey("groups.id"), nullable=True
    )  # Optional group association
    is_public = Column(Boolean, default=False)  # Private by default for security
    owner = relationship("User")
    group = relationship("Group", back_populates="projects")


class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String)
    description = Column(Text)
    created_at = Column(
        DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    scheduled_start = Column(DateTime, nullable=True)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    project = relationship("Project")
