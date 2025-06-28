"""
Unit tests for GroupService functionality.
"""

import datetime
import os

# Set testing environment variable before importing
os.environ["TESTING"] = "1"

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from test_helpers import create_test_user

import models
import schemas
from database import Base, override_engine
from group_service import GroupService

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


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create tables once for the entire test session"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def clean_database():
    """Clean all data before each test"""
    db = TestingSessionLocal()
    try:
        # Delete all data in reverse dependency order
        db.query(models.GroupInvitation).delete()
        db.query(models.GroupMember).delete()
        db.query(models.Group).delete()
        db.query(models.Incident).delete()
        db.query(models.Project).delete()
        db.query(models.User).delete()
        db.commit()
    finally:
        db.close()
    yield


class TestGroupService:
    """Test cases for GroupService operations."""

    def test_create_group_success(self):
        """Test successful group creation."""
        db = TestingSessionLocal()
        try:
            user = create_test_user(email="owner@example.com")
            db.add(user)
            db.commit()
            db.refresh(user)

            group_data = schemas.GroupCreate(
                name="Test Group", description="A test group"
            )

            group = GroupService.create_group(group_data, user, db)

            assert group.name == "Test Group"
            assert group.description == "A test group"
            assert group.owner_id == user.id
            assert group.is_active is True

            # Check that owner is automatically added as a member
            membership = (
                db.query(models.GroupMember)
                .filter_by(group_id=group.id, user_id=user.id)
                .first()
            )
            assert membership is not None
            assert membership.role == models.GroupRole.OWNER
        finally:
            db.close()

    def test_create_group_duplicate_name(self):
        """Test creating group with duplicate name fails."""
        db = TestingSessionLocal()
        try:
            user = create_test_user(email="owner@example.com")
            db.add(user)
            db.commit()
            db.refresh(user)

            # Create first group
            group_data = schemas.GroupCreate(name="Test Group")
            GroupService.create_group(group_data, user, db)

            # Try to create second group with same name
            with pytest.raises(HTTPException) as exc_info:
                GroupService.create_group(group_data, user, db)

            assert exc_info.value.status_code == 400
            assert "already exists" in str(exc_info.value.detail)
        finally:
            db.close()

    def test_get_user_groups(self):
        """Test getting user's groups."""
        db = TestingSessionLocal()
        try:
            owner = create_test_user(email="owner@example.com")
            member = create_test_user(
                email="member@example.com", google_id="member_123"
            )
            db.add_all([owner, member])
            db.commit()
            db.refresh(owner)
            db.refresh(member)

            # Create group
            group_data = schemas.GroupCreate(name="Test Group")
            group = GroupService.create_group(group_data, owner, db)

            # Add member
            membership = models.GroupMember(
                group_id=group.id, user_id=member.id, role=models.GroupRole.MEMBER
            )
            db.add(membership)
            db.commit()

            # Get groups for member
            groups = GroupService.get_user_groups(member, db)

            assert len(groups) == 1
            assert groups[0].id == group.id
            assert groups[0].user_role == models.GroupRole.MEMBER
        finally:
            db.close()

    def test_invite_user_success(self):
        """Test successful user invitation."""
        db = TestingSessionLocal()
        try:
            owner = create_test_user(email="owner@example.com")
            db.add(owner)
            db.commit()
            db.refresh(owner)

            # Create group
            group_data = schemas.GroupCreate(name="Test Group")
            group = GroupService.create_group(group_data, owner, db)

            # Send invitation
            invitation_data = schemas.GroupInvitationCreate(
                group_id=group.id,
                invited_email="invitee@example.com",
                role=models.GroupRole.MEMBER,
                message="Join our group!",
            )

            invitation = GroupService.invite_user(invitation_data, owner, db)

            assert invitation.group_id == group.id
            assert invitation.invited_email == "invitee@example.com"
            assert invitation.role == models.GroupRole.MEMBER
            assert invitation.message == "Join our group!"
            assert invitation.status == models.InvitationStatus.PENDING
            assert invitation.expires_at is not None
        finally:
            db.close()

    def test_invite_user_insufficient_permissions(self):
        """Test invitation fails without proper permissions."""
        db = TestingSessionLocal()
        try:
            owner = create_test_user(email="owner@example.com")
            member = create_test_user(
                email="member@example.com", google_id="member_123"
            )
            db.add_all([owner, member])
            db.commit()
            db.refresh(owner)
            db.refresh(member)

            # Create group
            group_data = schemas.GroupCreate(name="Test Group")
            group = GroupService.create_group(group_data, owner, db)

            # Add member without admin rights
            membership = models.GroupMember(
                group_id=group.id, user_id=member.id, role=models.GroupRole.MEMBER
            )
            db.add(membership)
            db.commit()

            # Try to send invitation as regular member
            invitation_data = schemas.GroupInvitationCreate(
                group_id=group.id,
                invited_email="invitee@example.com",
                role=models.GroupRole.MEMBER,
            )

            with pytest.raises(HTTPException) as exc_info:
                GroupService.invite_user(invitation_data, member, db)

            assert exc_info.value.status_code == 403
            assert "Insufficient permissions" in str(exc_info.value.detail)
        finally:
            db.close()

    def test_invite_existing_member_fails(self):
        """Test that inviting existing member fails."""
        db = TestingSessionLocal()
        try:
            owner = create_test_user(email="owner@example.com")
            member = create_test_user(
                email="member@example.com", google_id="member_123"
            )
            db.add_all([owner, member])
            db.commit()
            db.refresh(owner)
            db.refresh(member)

            # Create group
            group_data = schemas.GroupCreate(name="Test Group")
            group = GroupService.create_group(group_data, owner, db)

            # Add member
            membership = models.GroupMember(
                group_id=group.id, user_id=member.id, role=models.GroupRole.MEMBER
            )
            db.add(membership)
            db.commit()

            # Try to invite existing member
            invitation_data = schemas.GroupInvitationCreate(
                group_id=group.id,
                invited_user_id=member.id,
                role=models.GroupRole.MEMBER,
            )

            with pytest.raises(HTTPException) as exc_info:
                GroupService.invite_user(invitation_data, owner, db)

            assert exc_info.value.status_code == 400
            assert "already a member" in str(exc_info.value.detail)
        finally:
            db.close()

    def test_respond_to_invitation_accept(self):
        """Test accepting an invitation."""
        db = TestingSessionLocal()
        try:
            owner = create_test_user(email="owner@example.com")
            invitee = create_test_user(
                email="invitee@example.com", google_id="invitee_123"
            )
            db.add_all([owner, invitee])
            db.commit()
            db.refresh(owner)
            db.refresh(invitee)

            # Create group
            group_data = schemas.GroupCreate(name="Test Group")
            group = GroupService.create_group(group_data, owner, db)

            # Create invitation
            invitation = models.GroupInvitation(
                group_id=group.id,
                invited_user_id=invitee.id,
                invited_email=invitee.email,
                invited_by_id=owner.id,
                role=models.GroupRole.MEMBER,
                expires_at=datetime.datetime.now(datetime.timezone.utc)
                + datetime.timedelta(days=7),
            )
            db.add(invitation)
            db.commit()
            db.refresh(invitation)

            # Accept invitation
            response_data = schemas.GroupInvitationUpdate(
                status=models.InvitationStatus.ACCEPTED
            )

            updated_invitation = GroupService.respond_to_invitation(
                invitation.id, response_data, invitee, db
            )

            assert updated_invitation.status == models.InvitationStatus.ACCEPTED
            assert updated_invitation.responded_at is not None

            # Check membership was created
            membership = (
                db.query(models.GroupMember)
                .filter_by(group_id=group.id, user_id=invitee.id)
                .first()
            )
            assert membership is not None
            assert membership.role == models.GroupRole.MEMBER
        finally:
            db.close()

    def test_respond_to_invitation_decline(self):
        """Test declining an invitation."""
        db = TestingSessionLocal()
        try:
            owner = create_test_user(email="owner@example.com")
            invitee = create_test_user(
                email="invitee@example.com", google_id="invitee_123"
            )
            db.add_all([owner, invitee])
            db.commit()
            db.refresh(owner)
            db.refresh(invitee)

            # Create group
            group_data = schemas.GroupCreate(name="Test Group")
            group = GroupService.create_group(group_data, owner, db)

            # Create invitation
            invitation = models.GroupInvitation(
                group_id=group.id,
                invited_user_id=invitee.id,
                invited_email=invitee.email,
                invited_by_id=owner.id,
                role=models.GroupRole.MEMBER,
                expires_at=datetime.datetime.now(datetime.timezone.utc)
                + datetime.timedelta(days=7),
            )
            db.add(invitation)
            db.commit()
            db.refresh(invitation)

            # Decline invitation
            response_data = schemas.GroupInvitationUpdate(
                status=models.InvitationStatus.DECLINED
            )

            updated_invitation = GroupService.respond_to_invitation(
                invitation.id, response_data, invitee, db
            )

            assert updated_invitation.status == models.InvitationStatus.DECLINED
            assert updated_invitation.responded_at is not None

            # Check no membership was created
            membership = (
                db.query(models.GroupMember)
                .filter_by(group_id=group.id, user_id=invitee.id)
                .first()
            )
            assert membership is None
        finally:
            db.close()

    def test_respond_to_expired_invitation_fails(self):
        """Test that responding to expired invitation fails."""
        db = TestingSessionLocal()
        try:
            owner = create_test_user(email="owner@example.com")
            invitee = create_test_user(
                email="invitee@example.com", google_id="invitee_123"
            )
            db.add_all([owner, invitee])
            db.commit()
            db.refresh(owner)
            db.refresh(invitee)

            # Create group
            group_data = schemas.GroupCreate(name="Test Group")
            group = GroupService.create_group(group_data, owner, db)

            # Create expired invitation
            invitation = models.GroupInvitation(
                group_id=group.id,
                invited_user_id=invitee.id,
                invited_email=invitee.email,
                invited_by_id=owner.id,
                role=models.GroupRole.MEMBER,
                expires_at=datetime.datetime.now(datetime.timezone.utc)
                - datetime.timedelta(days=1),
            )
            db.add(invitation)
            db.commit()
            db.refresh(invitation)

            # Try to accept expired invitation
            response_data = schemas.GroupInvitationUpdate(
                status=models.InvitationStatus.ACCEPTED
            )

            with pytest.raises(HTTPException) as exc_info:
                GroupService.respond_to_invitation(
                    invitation.id, response_data, invitee, db
                )

            assert exc_info.value.status_code == 400
            assert "expired" in str(exc_info.value.detail)
        finally:
            db.close()

    def test_update_member_role_success(self):
        """Test successful member role update."""
        db = TestingSessionLocal()
        try:
            owner = create_test_user(email="owner@example.com")
            member = create_test_user(
                email="member@example.com", google_id="member_123"
            )
            db.add_all([owner, member])
            db.commit()
            db.refresh(owner)
            db.refresh(member)

            # Create group
            group_data = schemas.GroupCreate(name="Test Group")
            group = GroupService.create_group(group_data, owner, db)

            # Add member
            membership = models.GroupMember(
                group_id=group.id, user_id=member.id, role=models.GroupRole.MEMBER
            )
            db.add(membership)
            db.commit()
            db.refresh(membership)

            # Update role
            role_update = schemas.GroupMemberUpdate(role=models.GroupRole.ADMIN)
            updated_member = GroupService.update_member_role(
                group.id, membership.id, role_update, owner, db
            )

            assert updated_member.role == models.GroupRole.ADMIN
        finally:
            db.close()

    def test_get_group_stats(self):
        """Test getting group statistics."""
        db = TestingSessionLocal()
        try:
            owner1 = create_test_user(email="owner1@example.com")
            owner2 = create_test_user(
                email="owner2@example.com", google_id="owner2_123"
            )
            db.add_all([owner1, owner2])
            db.commit()
            db.refresh(owner1)
            db.refresh(owner2)

            # Create groups
            group1_data = schemas.GroupCreate(name="Group 1")
            group2_data = schemas.GroupCreate(name="Group 2")
            group1 = GroupService.create_group(group1_data, owner1, db)
            GroupService.create_group(group2_data, owner2, db)

            # Create invitation
            invitation = models.GroupInvitation(
                group_id=group1.id,
                invited_email="invitee@example.com",
                invited_by_id=owner1.id,
                role=models.GroupRole.MEMBER,
                expires_at=datetime.datetime.now(datetime.timezone.utc)
                + datetime.timedelta(days=7),
            )
            db.add(invitation)
            db.commit()

            # Get stats
            stats = GroupService.get_group_stats(db)

            assert stats.total_groups == 2
            assert stats.active_groups == 2
            assert stats.total_members == 2  # Each owner is a member
            assert stats.pending_invitations == 1
        finally:
            db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
