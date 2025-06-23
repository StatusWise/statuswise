"""
Authorization service using Casbin for access control.
"""
from typing import Optional

import casbin
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import Incident, Project, User


class AuthorizationService:
    def __init__(
        self, model_path: str = "rbac_model.conf", policy_path: str = "rbac_policy.csv"
    ):
        self.enforcer = casbin.Enforcer(model_path, policy_path)

    def check_project_access(
        self, user_id: int, project_id: int, action: str, db: Session
    ) -> bool:
        """Check if user has access to a specific project."""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return False

        # Users can only access their own projects
        if project.owner_id != user_id:
            return False

        # If they own the project, they have access (simplified authorization)
        return True

    def check_incident_access(
        self, user_id: int, incident_id: int, action: str, db: Session
    ) -> bool:
        """Check if user has access to a specific incident."""
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return False

        # Check if user owns the project that contains this incident
        project = db.query(Project).filter(Project.id == incident.project_id).first()
        if not project or project.owner_id != user_id:
            return False

        # If they own the project containing the incident, they have access
        return True

    def check_project_for_incident_creation(
        self, user_id: int, project_id: int, db: Session
    ) -> bool:
        """Check if user can create incidents in a specific project."""
        return self.check_project_access(user_id, project_id, "write", db)


def get_authorization_service() -> AuthorizationService:
    """Get the global authorization service instance."""
    return AuthorizationService()


def require_project_access(
    user: User,
    project_id: int,
    action: str,
    db: Session,
    auth_service: Optional[AuthorizationService] = None,
):
    """Require that the current user has access to the specified project."""
    if auth_service is None:
        auth_service = get_authorization_service()

    if not auth_service.check_project_access(user.id, project_id, action, db):
        # Check if project exists to provide appropriate error
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project",
            )


def require_incident_access(
    user: User,
    incident_id: int,
    action: str,
    db: Session,
    auth_service: Optional[AuthorizationService] = None,
):
    """Require that the current user has access to the specified incident."""
    if auth_service is None:
        auth_service = get_authorization_service()

    if not auth_service.check_incident_access(user.id, incident_id, action, db):
        # Check if incident exists to provide appropriate error
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this incident",
            )
