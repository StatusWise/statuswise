"""
Unit tests for GroupService functionality.
"""

import datetime
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from group_service import GroupService
from tests.test_helpers import create_test_user


class TestGroupService:
    """Test cases for GroupService operations."""

    def test_create_group_success(self, db_session: Session):
        """Test successful group creation."""
        user = create_test_user(email="owner@example.com")
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        group_data = schemas.GroupCreate(name="Test Group", description="A test group")

        group = GroupService.create_group(group_data, user, db_session)

        assert group.name == "Test Group"
        assert group.description == "A test group"
        assert group.owner_id == user.id
        assert group.is_active is True

        # Check that owner is automatically added as a member
        membership = (
            db_session.query(models.GroupMember)
            .filter_by(group_id=group.id, user_id=user.id)
            .first()
        )
        assert membership is not None
        assert membership.role == models.GroupRole.OWNER

    def test_create_group_duplicate_name(self, db_session: Session):
        """Test creating group with duplicate name fails."""
        user = create_test_user(email="owner@example.com")
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Create first group
        group_data = schemas.GroupCreate(name="Test Group")
        GroupService.create_group(group_data, user, db_session)

        # Try to create second group with same name
        with pytest.raises(HTTPException) as exc_info:
            GroupService.create_group(group_data, user, db_session)

        assert exc_info.value.status_code == 400
        assert "already exists" in str(exc_info.value.detail)

    def test_get_user_groups(self, db_session: Session):
        """Test getting user's groups."""
        owner = create_test_user(email="owner@example.com")
        member = create_test_user(email="member@example.com", google_id="member_123")
        db_session.add_all([owner, member])
        db_session.commit()
        db_session.refresh(owner)
        db_session.refresh(member)

        # Create group
        group_data = schemas.GroupCreate(name="Test Group")
        group = GroupService.create_group(group_data, owner, db_session)

        # Add member
        membership = models.GroupMember(
            group_id=group.id, user_id=member.id, role=models.GroupRole.MEMBER
        )
        db_session.add(membership)
        db_session.commit()

        # Get groups for member
        groups = GroupService.get_user_groups(member, db_session)

        assert len(groups) == 1
        assert groups[0].id == group.id
        assert groups[0].user_role == models.GroupRole.MEMBER

    def test_invite_user_success(self, db_session: Session):
        """Test successful user invitation."""
        owner = create_test_user(email="owner@example.com")
        db_session.add(owner)
        db_session.commit()
        db_session.refresh(owner)

        # Create group
        group_data = schemas.GroupCreate(name="Test Group")
        group = GroupService.create_group(group_data, owner, db_session)

        # Send invitation
        invitation_data = schemas.GroupInvitationCreate(
            group_id=group.id,
            invited_email="invitee@example.com",
            role=models.GroupRole.MEMBER,
            message="Join our group!",
        )

        invitation = GroupService.invite_user(invitation_data, owner, db_session)

        assert invitation.group_id == group.id
        assert invitation.invited_email == "invitee@example.com"
        assert invitation.role == models.GroupRole.MEMBER
        assert invitation.message == "Join our group!"
        assert invitation.status == models.InvitationStatus.PENDING
        assert invitation.expires_at is not None

    def test_invite_user_insufficient_permissions(self, db_session: Session):
        """Test invitation fails without proper permissions."""
        owner = create_test_user(email="owner@example.com")
        member = create_test_user(email="member@example.com", google_id="member_123")
        db_session.add_all([owner, member])
        db_session.commit()
        db_session.refresh(owner)
        db_session.refresh(member)

        # Create group
        group_data = schemas.GroupCreate(name="Test Group")
        group = GroupService.create_group(group_data, owner, db_session)

        # Add member without admin rights
        membership = models.GroupMember(
            group_id=group.id, user_id=member.id, role=models.GroupRole.MEMBER
        )
        db_session.add(membership)
        db_session.commit()

        # Try to send invitation as regular member
        invitation_data = schemas.GroupInvitationCreate(
            group_id=group.id,
            invited_email="invitee@example.com",
            role=models.GroupRole.MEMBER,
        )

        with pytest.raises(HTTPException) as exc_info:
            GroupService.invite_user(invitation_data, member, db_session)

        assert exc_info.value.status_code == 403
        assert "Insufficient permissions" in str(exc_info.value.detail)

    def test_invite_existing_member_fails(self, db_session: Session):
        """Test that inviting existing member fails."""
        owner = create_test_user(email="owner@example.com")
        member = create_test_user(email="member@example.com", google_id="member_123")
        db_session.add_all([owner, member])
        db_session.commit()
        db_session.refresh(owner)
        db_session.refresh(member)

        # Create group
        group_data = schemas.GroupCreate(name="Test Group")
        group = GroupService.create_group(group_data, owner, db_session)

        # Add member
        membership = models.GroupMember(
            group_id=group.id, user_id=member.id, role=models.GroupRole.MEMBER
        )
        db_session.add(membership)
        db_session.commit()

        # Try to invite existing member
        invitation_data = schemas.GroupInvitationCreate(
            group_id=group.id, invited_user_id=member.id, role=models.GroupRole.MEMBER
        )

        with pytest.raises(HTTPException) as exc_info:
            GroupService.invite_user(invitation_data, owner, db_session)

        assert exc_info.value.status_code == 400
        assert "already a member" in str(exc_info.value.detail)

    def test_respond_to_invitation_accept(self, db_session: Session):
        """Test accepting an invitation."""
        owner = create_test_user(email="owner@example.com")
        invitee = create_test_user(email="invitee@example.com", google_id="invitee_123")
        db_session.add_all([owner, invitee])
        db_session.commit()
        db_session.refresh(owner)
        db_session.refresh(invitee)

        # Create group
        group_data = schemas.GroupCreate(name="Test Group")
        group = GroupService.create_group(group_data, owner, db_session)

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
        db_session.add(invitation)
        db_session.commit()
        db_session.refresh(invitation)

        # Accept invitation
        response_data = schemas.GroupInvitationUpdate(
            status=models.InvitationStatus.ACCEPTED
        )

        updated_invitation = GroupService.respond_to_invitation(
            invitation.id, response_data, invitee, db_session
        )

        assert updated_invitation.status == models.InvitationStatus.ACCEPTED
        assert updated_invitation.responded_at is not None

        # Check membership was created
        membership = (
            db_session.query(models.GroupMember)
            .filter_by(group_id=group.id, user_id=invitee.id)
            .first()
        )
        assert membership is not None
        assert membership.role == models.GroupRole.MEMBER

    def test_respond_to_invitation_decline(self, db_session: Session):
        """Test declining an invitation."""
        owner = create_test_user(email="owner@example.com")
        invitee = create_test_user(email="invitee@example.com", google_id="invitee_123")
        db_session.add_all([owner, invitee])
        db_session.commit()
        db_session.refresh(owner)
        db_session.refresh(invitee)

        # Create group
        group_data = schemas.GroupCreate(name="Test Group")
        group = GroupService.create_group(group_data, owner, db_session)

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
        db_session.add(invitation)
        db_session.commit()
        db_session.refresh(invitation)

        # Decline invitation
        response_data = schemas.GroupInvitationUpdate(
            status=models.InvitationStatus.DECLINED
        )

        updated_invitation = GroupService.respond_to_invitation(
            invitation.id, response_data, invitee, db_session
        )

        assert updated_invitation.status == models.InvitationStatus.DECLINED
        assert updated_invitation.responded_at is not None

        # Check no membership was created
        membership = (
            db_session.query(models.GroupMember)
            .filter_by(group_id=group.id, user_id=invitee.id)
            .first()
        )
        assert membership is None

    def test_respond_to_expired_invitation_fails(self, db_session: Session):
        """Test that responding to expired invitation fails."""
        owner = create_test_user(email="owner@example.com")
        invitee = create_test_user(email="invitee@example.com", google_id="invitee_123")
        db_session.add_all([owner, invitee])
        db_session.commit()
        db_session.refresh(owner)
        db_session.refresh(invitee)

        # Create group
        group_data = schemas.GroupCreate(name="Test Group")
        group = GroupService.create_group(group_data, owner, db_session)

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
        db_session.add(invitation)
        db_session.commit()
        db_session.refresh(invitation)

        # Try to accept expired invitation
        response_data = schemas.GroupInvitationUpdate(
            status=models.InvitationStatus.ACCEPTED
        )

        with pytest.raises(HTTPException) as exc_info:
            GroupService.respond_to_invitation(
                invitation.id, response_data, invitee, db_session
            )

        assert exc_info.value.status_code == 400
        assert "expired" in str(exc_info.value.detail)

    def test_update_member_role_success(self, db_session: Session):
        """Test successful member role update."""
        owner = create_test_user(email="owner@example.com")
        member = create_test_user(email="member@example.com", google_id="member_123")
        db_session.add_all([owner, member])
        db_session.commit()
        db_session.refresh(owner)
        db_session.refresh(member)

        # Create group
        group_data = schemas.GroupCreate(name="Test Group")
        group = GroupService.create_group(group_data, owner, db_session)

        # Add member
        membership = models.GroupMember(
            group_id=group.id, user_id=member.id, role=models.GroupRole.MEMBER
        )
        db_session.add(membership)
        db_session.commit()
        db_session.refresh(membership)

        # Update role
        role_update = schemas.GroupMemberUpdate(role=models.GroupRole.ADMIN)
        updated_member = GroupService.update_member_role(
            group.id, membership.id, role_update, owner, db_session
        )

        assert updated_member.role == models.GroupRole.ADMIN

    def test_update_member_role_insufficient_permissions(self, db_session: Session):
        """Test member role update fails without permissions."""
        owner = create_test_user(email="owner@example.com")
        member1 = create_test_user(email="member1@example.com", google_id="member1_123")
        member2 = create_test_user(email="member2@example.com", google_id="member2_123")
        db_session.add_all([owner, member1, member2])
        db_session.commit()
        db_session.refresh(owner)
        db_session.refresh(member1)
        db_session.refresh(member2)

        # Create group
        group_data = schemas.GroupCreate(name="Test Group")
        group = GroupService.create_group(group_data, owner, db_session)

        # Add members
        membership1 = models.GroupMember(
            group_id=group.id, user_id=member1.id, role=models.GroupRole.MEMBER
        )
        membership2 = models.GroupMember(
            group_id=group.id, user_id=member2.id, role=models.GroupRole.MEMBER
        )
        db_session.add_all([membership1, membership2])
        db_session.commit()
        db_session.refresh(membership2)

        # Try to update role as regular member
        role_update = schemas.GroupMemberUpdate(role=models.GroupRole.ADMIN)

        with pytest.raises(HTTPException) as exc_info:
            GroupService.update_member_role(
                group.id, membership2.id, role_update, member1, db_session
            )

        assert exc_info.value.status_code == 403
        assert "Insufficient permissions" in str(exc_info.value.detail)

    def test_remove_member_success(self, db_session: Session):
        """Test successful member removal."""
        owner = create_test_user(email="owner@example.com")
        member = create_test_user(email="member@example.com", google_id="member_123")
        db_session.add_all([owner, member])
        db_session.commit()
        db_session.refresh(owner)
        db_session.refresh(member)

        # Create group
        group_data = schemas.GroupCreate(name="Test Group")
        group = GroupService.create_group(group_data, owner, db_session)

        # Add member
        membership = models.GroupMember(
            group_id=group.id, user_id=member.id, role=models.GroupRole.MEMBER
        )
        db_session.add(membership)
        db_session.commit()
        db_session.refresh(membership)

        # Remove member
        result = GroupService.remove_member(group.id, membership.id, owner, db_session)
        assert result is True

        # Check member is marked inactive
        db_session.refresh(membership)
        assert membership.is_active is False

    def test_owner_cannot_remove_themselves(self, db_session: Session):
        """Test that owner cannot remove themselves."""
        owner = create_test_user(email="owner@example.com")
        db_session.add(owner)
        db_session.commit()
        db_session.refresh(owner)

        # Create group
        group_data = schemas.GroupCreate(name="Test Group")
        group = GroupService.create_group(group_data, owner, db_session)

        # Get owner membership
        owner_membership = (
            db_session.query(models.GroupMember)
            .filter_by(group_id=group.id, user_id=owner.id)
            .first()
        )

        # Try to remove themselves
        with pytest.raises(HTTPException) as exc_info:
            GroupService.remove_member(group.id, owner_membership.id, owner, db_session)

        assert exc_info.value.status_code == 400
        assert "cannot remove themselves" in str(exc_info.value.detail)

    def test_delete_group_success(self, db_session: Session):
        """Test successful group deletion."""
        owner = create_test_user(email="owner@example.com")
        db_session.add(owner)
        db_session.commit()
        db_session.refresh(owner)

        # Create group
        group_data = schemas.GroupCreate(name="Test Group")
        group = GroupService.create_group(group_data, owner, db_session)

        # Delete group
        result = GroupService.delete_group(group.id, owner, db_session)
        assert result is True

        # Check group is marked inactive
        db_session.refresh(group)
        assert group.is_active is False

    def test_delete_group_non_owner_fails(self, db_session: Session):
        """Test that non-owner cannot delete group."""
        owner = create_test_user(email="owner@example.com")
        member = create_test_user(email="member@example.com", google_id="member_123")
        db_session.add_all([owner, member])
        db_session.commit()
        db_session.refresh(owner)
        db_session.refresh(member)

        # Create group
        group_data = schemas.GroupCreate(name="Test Group")
        group = GroupService.create_group(group_data, owner, db_session)

        # Add member
        membership = models.GroupMember(
            group_id=group.id,
            user_id=member.id,
            role=models.GroupRole.ADMIN,  # Even admin can't delete
        )
        db_session.add(membership)
        db_session.commit()

        # Try to delete as non-owner
        with pytest.raises(HTTPException) as exc_info:
            GroupService.delete_group(group.id, member, db_session)

        assert exc_info.value.status_code == 403
        assert "Only group owners" in str(exc_info.value.detail)

    def test_get_group_stats(self, db_session: Session):
        """Test getting group statistics."""
        owner1 = create_test_user(email="owner1@example.com")
        owner2 = create_test_user(email="owner2@example.com", google_id="owner2_123")
        db_session.add_all([owner1, owner2])
        db_session.commit()
        db_session.refresh(owner1)
        db_session.refresh(owner2)

        # Create groups
        group1_data = schemas.GroupCreate(name="Group 1")
        group2_data = schemas.GroupCreate(name="Group 2")
        group1 = GroupService.create_group(group1_data, owner1, db_session)
        group2 = GroupService.create_group(group2_data, owner2, db_session)

        # Create invitation
        invitation = models.GroupInvitation(
            group_id=group1.id,
            invited_email="invitee@example.com",
            invited_by_id=owner1.id,
            role=models.GroupRole.MEMBER,
            expires_at=datetime.datetime.now(datetime.timezone.utc)
            + datetime.timedelta(days=7),
        )
        db_session.add(invitation)
        db_session.commit()

        # Get stats
        stats = GroupService.get_group_stats(db_session)

        assert stats.total_groups == 2
        assert stats.active_groups == 2
        assert stats.total_members == 2  # Each owner is a member
        assert stats.pending_invitations == 1
