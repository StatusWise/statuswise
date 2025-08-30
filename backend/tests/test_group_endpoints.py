import os

# Ensure testing mode
os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth import create_access_token
from database import Base, override_engine
from main import app, get_db
from models import Group, GroupMember, GroupRole, User


# In-memory SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
override_engine(engine)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestGroupEndpoints:
    def setup_method(self):
        db = TestingSessionLocal()
        db.query(GroupMember).delete()
        db.query(Group).delete()
        db.query(User).delete()
        db.commit()
        db.close()

    def test_leave_group_success_and_owner_forbidden(self):
        # Ensure engine override points to this test's engine
        override_engine(engine)
        db = TestingSessionLocal()
        # Create owner and member
        owner = User(email="owner@example.com", is_admin=False, is_active=True)
        member = User(email="member@example.com", is_admin=False, is_active=True)
        db.add_all([owner, member])
        db.commit()
        db.refresh(owner)
        db.refresh(member)

        # Create group and memberships
        group = Group(name="Test Group", owner_id=owner.id)
        db.add(group)
        db.commit()
        db.refresh(group)

        owner_membership = GroupMember(group_id=group.id, user_id=owner.id, role=GroupRole.OWNER)
        member_membership = GroupMember(group_id=group.id, user_id=member.id, role=GroupRole.MEMBER)
        db.add_all([owner_membership, member_membership])
        db.commit()

        # Member leaves successfully
        token_member = create_access_token({"sub": member.email})
        resp = client.delete(
            f"/groups/{group.id}/members/me",
            headers={"Authorization": f"Bearer {token_member}"},
        )
        assert resp.status_code == 200
        # Verify membership inactive
        refreshed_member = db.query(GroupMember).filter(GroupMember.id == member_membership.id).first()
        assert refreshed_member is not None and refreshed_member.is_active is False

        # Owner cannot leave
        token_owner = create_access_token({"sub": owner.email})
        resp2 = client.delete(
            f"/groups/{group.id}/members/me",
            headers={"Authorization": f"Bearer {token_owner}"},
        )
        assert resp2.status_code == 400
        db.close()

    def test_invitation_token_accept_and_decline(self):
        # Ensure engine override points to this test's engine
        override_engine(engine)
        db = TestingSessionLocal()
        # Create owner
        owner = User(email="owner2@example.com", is_admin=False, is_active=True)
        db.add(owner)
        db.commit()
        db.refresh(owner)

        # Create group
        group = Group(name="Invite Group", owner_id=owner.id)
        db.add(group)
        db.commit()
        db.refresh(group)

        # Create owner membership so the inviter has permission
        owner_membership = GroupMember(group_id=group.id, user_id=owner.id, role=GroupRole.OWNER)
        db.add(owner_membership)
        db.commit()

        # Create invitation by API (email-based) to generate token
        token_owner = create_access_token({"sub": owner.email})
        resp = client.post(
            "/groups/invitations/",
            headers={"Authorization": f"Bearer {token_owner}"},
            json={"group_id": group.id, "invited_email": "invitee@example.com"},
        )
        assert resp.status_code == 200

        # Fetch invitation and token
        invitation = (
            db.query(GroupMember).first()
        )
        # The above was wrong: fetch GroupInvitation instead
        from models import GroupInvitation

        inv = db.query(GroupInvitation).filter(GroupInvitation.group_id == group.id).first()
        assert inv is not None and inv.invitation_token
        token = inv.invitation_token

        # Accept invitation via token
        resp2 = client.post("/invitations/accept", json={"token": token})
        assert resp2.status_code == 200

        # Membership should exist for invitee
        invitee = db.query(User).filter(User.email == "invitee@example.com").first()
        assert invitee is not None
        gm = (
            db.query(GroupMember)
            .filter(GroupMember.group_id == group.id, GroupMember.user_id == invitee.id, GroupMember.is_active)
            .first()
        )
        assert gm is not None

        # Create another invitation to decline
        resp3 = client.post(
            "/groups/invitations/",
            headers={"Authorization": f"Bearer {token_owner}"},
            json={"group_id": group.id, "invited_email": "declinee@example.com"},
        )
        assert resp3.status_code == 200
        inv2 = db.query(GroupInvitation).filter(GroupInvitation.invited_email == "declinee@example.com").first()
        assert inv2 is not None and inv2.invitation_token

        resp4 = client.post("/invitations/decline", json={"token": inv2.invitation_token})
        assert resp4.status_code == 200

        # No membership created for declinee
        declinee = db.query(User).filter(User.email == "declinee@example.com").first()
        if declinee:
            gm2 = (
                db.query(GroupMember)
                .filter(GroupMember.group_id == group.id, GroupMember.user_id == declinee.id, GroupMember.is_active)
                .first()
            )
            assert gm2 is None
        db.close()

