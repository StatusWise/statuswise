"""
Group management service with invitation and membership functionality.
"""

import datetime
import secrets
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, selectinload

import models
import schemas
from auth import get_user_by_email


class GroupService:
    """Service class for group management operations."""

    @staticmethod
    def create_group(
        group_data: schemas.GroupCreate, owner: models.User, db: Session
    ) -> models.Group:
        """Create a new group with the user as owner."""
        # Check if group name already exists for this user
        existing = (
            db.query(models.Group)
            .filter(
                and_(
                    models.Group.owner_id == owner.id,
                    models.Group.name == group_data.name,
                    models.Group.is_active,
                )
            )
            .first()
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A group with this name already exists",
            )

        # Create the group
        db_group = models.Group(
            name=group_data.name, description=group_data.description, owner_id=owner.id
        )
        db.add(db_group)
        db.flush()  # Get the ID

        # Add owner as a member with OWNER role
        owner_membership = models.GroupMember(
            group_id=db_group.id, user_id=owner.id, role=models.GroupRole.OWNER
        )
        db.add(owner_membership)
        db.commit()
        db.refresh(db_group)

        return db_group

    @staticmethod
    def get_user_groups(
        user: models.User, db: Session, include_inactive: bool = False
    ) -> List[schemas.GroupSummaryOut]:
        """Get all groups where the user is a member."""
        query = (
            db.query(
                models.Group,
                models.GroupMember.role,
                func.count(models.GroupMember.id).label("members_count"),
                func.count(models.Project.id).label("projects_count"),
            )
            .join(models.GroupMember, models.Group.id == models.GroupMember.group_id)
            .outerjoin(models.Project, models.Group.id == models.Project.group_id)
            .filter(
                and_(
                    models.GroupMember.user_id == user.id,
                    models.GroupMember.is_active,
                )
            )
            .group_by(models.Group.id, models.GroupMember.role)
        )

        if not include_inactive:
            query = query.filter(models.Group.is_active)

        results = query.all()

        return [
            schemas.GroupSummaryOut(
                id=group.id,
                name=group.name,
                description=group.description,
                owner_id=group.owner_id,
                is_active=group.is_active,
                members_count=members_count,
                projects_count=projects_count,
                user_role=user_role,
            )
            for group, user_role, members_count, projects_count in results
        ]

    @staticmethod
    def get_group_with_members(
        group_id: int, user: models.User, db: Session
    ) -> Optional[schemas.GroupOut]:
        """Get detailed group information including members."""
        # Check if user has access to this group
        membership = GroupService._get_user_group_membership(user.id, group_id, db)
        if not membership:
            return None

        group = (
            db.query(models.Group)
            .options(
                selectinload(models.Group.members).selectinload(
                    models.GroupMember.user
                ),
                selectinload(models.Group.owner),
            )
            .filter(models.Group.id == group_id)
            .first()
        )

        if not group:
            return None

        # Get member details
        members = []
        for member in group.members:
            if member.is_active:
                members.append(
                    schemas.GroupMemberOut(
                        id=member.id,
                        user_id=member.user_id,
                        user_email=member.user.email,
                        user_name=member.user.name,
                        user_avatar_url=member.user.avatar_url,
                        role=member.role,
                        is_active=member.is_active,
                        joined_at=member.joined_at,
                    )
                )

        # Get projects count
        projects_count = (
            db.query(func.count(models.Project.id))
            .filter(models.Project.group_id == group_id)
            .scalar()
        )

        return schemas.GroupOut(
            id=group.id,
            name=group.name,
            description=group.description,
            owner_id=group.owner_id,
            owner_email=group.owner.email,
            owner_name=group.owner.name,
            is_active=group.is_active,
            created_at=group.created_at,
            updated_at=group.updated_at,
            members_count=len(members),
            projects_count=projects_count,
            members=members,
        )

    @staticmethod
    def update_group(
        group_id: int, group_data: schemas.GroupUpdate, user: models.User, db: Session
    ) -> models.Group:
        """Update group information. Only owners and admins can update."""
        membership = GroupService._get_user_group_membership(user.id, group_id, db)
        if not membership or membership.role not in [
            models.GroupRole.OWNER,
            models.GroupRole.ADMIN,
        ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update group",
            )

        group = db.query(models.Group).filter(models.Group.id == group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Group not found"
            )

        # Update fields
        if group_data.name is not None:
            # Check for name conflicts
            existing = (
                db.query(models.Group)
                .filter(
                    and_(
                        models.Group.owner_id == group.owner_id,
                        models.Group.name == group_data.name,
                        models.Group.id != group_id,
                        models.Group.is_active,
                    )
                )
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A group with this name already exists",
                )
            group.name = group_data.name

        if group_data.description is not None:
            group.description = group_data.description

        if (
            group_data.is_active is not None
            and membership.role == models.GroupRole.OWNER
        ):
            group.is_active = group_data.is_active

        group.updated_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()
        db.refresh(group)

        return group

    @staticmethod
    def delete_group(group_id: int, user: models.User, db: Session) -> bool:
        """Delete a group. Only owners can delete."""
        group = db.query(models.Group).filter(models.Group.id == group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Group not found"
            )

        if group.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group owners can delete groups",
            )

        # Soft delete by marking as inactive
        group.is_active = False
        group.updated_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()

        return True

    @staticmethod
    def invite_user(
        invitation_data: schemas.GroupInvitationCreate,
        inviter: models.User,
        db: Session,
    ) -> models.GroupInvitation:
        """Send an invitation to join a group."""
        # Check if inviter has permission to invite (owner or admin)
        membership = GroupService._get_user_group_membership(
            inviter.id, invitation_data.group_id, db
        )
        if not membership or membership.role not in [
            models.GroupRole.OWNER,
            models.GroupRole.ADMIN,
        ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to send invitations",
            )

        group = (
            db.query(models.Group)
            .filter(models.Group.id == invitation_data.group_id)
            .first()
        )
        if not group or not group.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Group not found"
            )

        invited_user = None
        invited_email = invitation_data.invited_email

        # If inviting by user ID, get the user
        if invitation_data.invited_user_id:
            invited_user = (
                db.query(models.User)
                .filter(models.User.id == invitation_data.invited_user_id)
                .first()
            )
            if not invited_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
                )
            invited_email = invited_user.email

        # If inviting by email, check if user exists
        elif invitation_data.invited_email:
            invited_user = get_user_by_email(invitation_data.invited_email, db)
            if invited_user:
                invitation_data.invited_user_id = invited_user.id

        # Check if user is already a member
        if invited_user:
            existing_membership = (
                db.query(models.GroupMember)
                .filter(
                    and_(
                        models.GroupMember.group_id == invitation_data.group_id,
                        models.GroupMember.user_id == invited_user.id,
                        models.GroupMember.is_active,
                    )
                )
                .first()
            )
            if existing_membership:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User is already a member of this group",
                )

        # Check for existing pending invitation
        existing_invitation = (
            db.query(models.GroupInvitation)
            .filter(
                and_(
                    models.GroupInvitation.group_id == invitation_data.group_id,
                    or_(
                        models.GroupInvitation.invited_email == invited_email,
                        models.GroupInvitation.invited_user_id
                        == invitation_data.invited_user_id,
                    ),
                    models.GroupInvitation.status == models.InvitationStatus.PENDING,
                )
            )
            .first()
        )

        if existing_invitation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation already pending for this user",
            )

        # Create invitation
        expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            days=7
        )
        invitation_token = secrets.token_urlsafe(32) if not invited_user else None

        invitation = models.GroupInvitation(
            group_id=invitation_data.group_id,
            invited_user_id=invitation_data.invited_user_id,
            invited_email=invited_email,
            invited_by_id=inviter.id,
            role=invitation_data.role,
            message=invitation_data.message,
            invitation_token=invitation_token,
            expires_at=expires_at,
        )

        db.add(invitation)
        db.commit()
        db.refresh(invitation)

        # TODO: Send email notification here
        print(f"Group invitation sent to {invited_email} for group {group.name}")

        return invitation

    @staticmethod
    def respond_to_invitation(
        invitation_id: int,
        response: schemas.GroupInvitationUpdate,
        user: models.User,
        db: Session,
    ) -> models.GroupInvitation:
        """Respond to a group invitation (accept/decline)."""
        invitation = (
            db.query(models.GroupInvitation)
            .filter(
                and_(
                    models.GroupInvitation.id == invitation_id,
                    or_(
                        models.GroupInvitation.invited_user_id == user.id,
                        models.GroupInvitation.invited_email == user.email,
                    ),
                    models.GroupInvitation.status == models.InvitationStatus.PENDING,
                )
            )
            .first()
        )

        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found or already responded",
            )

        # Check if invitation is expired
        current_time = datetime.datetime.now(datetime.timezone.utc)
        # Make timezone-aware comparison
        expires_at = invitation.expires_at
        if expires_at and expires_at.tzinfo is None:
            # Convert to UTC if timezone-naive
            expires_at = expires_at.replace(tzinfo=datetime.timezone.utc)

        if expires_at and expires_at < current_time:
            invitation.status = models.InvitationStatus.EXPIRED
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation has expired"
            )

        # Update invitation status
        invitation.status = response.status
        invitation.responded_at = datetime.datetime.now(datetime.timezone.utc)
        if response.message:
            invitation.message = response.message

        # If accepted, create group membership
        if response.status == models.InvitationStatus.ACCEPTED:
            # Check if user is already a member (race condition protection)
            existing_membership = (
                db.query(models.GroupMember)
                .filter(
                    and_(
                        models.GroupMember.group_id == invitation.group_id,
                        models.GroupMember.user_id == user.id,
                        models.GroupMember.is_active,
                    )
                )
                .first()
            )

            if not existing_membership:
                membership = models.GroupMember(
                    group_id=invitation.group_id, user_id=user.id, role=invitation.role
                )
                db.add(membership)

        db.commit()
        db.refresh(invitation)

        return invitation

    @staticmethod
    def get_user_invitations(
        user: models.User,
        db: Session,
        status_filter: Optional[models.InvitationStatus] = None,
    ) -> List[schemas.GroupInvitationOut]:
        """Get invitations for a user."""
        query = (
            db.query(models.GroupInvitation)
            .join(models.Group, models.GroupInvitation.group_id == models.Group.id)
            .join(models.User, models.GroupInvitation.invited_by_id == models.User.id)
            .filter(
                or_(
                    models.GroupInvitation.invited_user_id == user.id,
                    models.GroupInvitation.invited_email == user.email,
                )
            )
        )

        if status_filter:
            query = query.filter(models.GroupInvitation.status == status_filter)

        invitations = query.all()

        result = []
        for invitation in invitations:
            group = invitation.group
            inviter = invitation.invited_by

            result.append(
                schemas.GroupInvitationOut(
                    id=invitation.id,
                    group_id=invitation.group_id,
                    group_name=group.name,
                    invited_user_id=invitation.invited_user_id,
                    invited_email=invitation.invited_email,
                    invited_by_id=invitation.invited_by_id,
                    invited_by_email=inviter.email,
                    invited_by_name=inviter.name,
                    role=invitation.role,
                    status=invitation.status,
                    message=invitation.message,
                    expires_at=invitation.expires_at,
                    created_at=invitation.created_at,
                    updated_at=invitation.updated_at,
                    responded_at=invitation.responded_at,
                )
            )

        return result

    @staticmethod
    def update_member_role(
        group_id: int,
        member_id: int,
        role_update: schemas.GroupMemberUpdate,
        user: models.User,
        db: Session,
    ) -> models.GroupMember:
        """Update a group member's role or status."""
        # Check if user has permission (owner or admin)
        user_membership = GroupService._get_user_group_membership(user.id, group_id, db)
        if not user_membership or user_membership.role not in [
            models.GroupRole.OWNER,
            models.GroupRole.ADMIN,
        ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update member",
            )

        # Get the member to update
        member = (
            db.query(models.GroupMember)
            .filter(
                and_(
                    models.GroupMember.id == member_id,
                    models.GroupMember.group_id == group_id,
                )
            )
            .first()
        )

        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
            )

        # Prevent owner from demoting themselves unless transferring ownership
        if member.user_id == user.id and member.role == models.GroupRole.OWNER:
            if role_update.role and role_update.role != models.GroupRole.OWNER:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Owner cannot demote themselves. Transfer ownership first.",
                )

        # Update fields
        if role_update.role is not None:
            # Only owners can promote to admin or owner
            if (
                role_update.role in [models.GroupRole.ADMIN, models.GroupRole.OWNER]
                and user_membership.role != models.GroupRole.OWNER
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only owners can promote members to admin or owner",
                )
            member.role = role_update.role

        if role_update.is_active is not None:
            member.is_active = role_update.is_active

        member.updated_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()
        db.refresh(member)

        return member

    @staticmethod
    def remove_member(
        group_id: int, member_id: int, user: models.User, db: Session
    ) -> bool:
        """Remove a member from the group."""
        # Check if user has permission (owner or admin)
        user_membership = GroupService._get_user_group_membership(user.id, group_id, db)
        if not user_membership or user_membership.role not in [
            models.GroupRole.OWNER,
            models.GroupRole.ADMIN,
        ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to remove member",
            )

        # Get the member to remove
        member = (
            db.query(models.GroupMember)
            .filter(
                and_(
                    models.GroupMember.id == member_id,
                    models.GroupMember.group_id == group_id,
                )
            )
            .first()
        )

        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
            )

        # Prevent owner from removing themselves
        if member.user_id == user.id and member.role == models.GroupRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Owner cannot remove themselves. Transfer ownership first.",
            )

        # Soft delete by marking as inactive
        member.is_active = False
        member.updated_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()

        return True

    @staticmethod
    def _get_user_group_membership(
        user_id: int, group_id: int, db: Session
    ) -> Optional[models.GroupMember]:
        """Get user's membership in a group."""
        return (
            db.query(models.GroupMember)
            .filter(
                and_(
                    models.GroupMember.user_id == user_id,
                    models.GroupMember.group_id == group_id,
                    models.GroupMember.is_active,
                )
            )
            .first()
        )

    @staticmethod
    def get_group_stats(db: Session) -> schemas.GroupStatsOut:
        """Get group statistics for admin dashboard."""
        total_groups = db.query(func.count(models.Group.id)).scalar()
        active_groups = (
            db.query(func.count(models.Group.id))
            .filter(models.Group.is_active)
            .scalar()
        )
        total_members = (
            db.query(func.count(models.GroupMember.id))
            .filter(models.GroupMember.is_active)
            .scalar()
        )
        pending_invitations = (
            db.query(func.count(models.GroupInvitation.id))
            .filter(models.GroupInvitation.status == models.InvitationStatus.PENDING)
            .scalar()
        )

        return schemas.GroupStatsOut(
            total_groups=total_groups,
            active_groups=active_groups,
            total_members=total_members,
            pending_invitations=pending_invitations,
        )
