import datetime
import os
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import auth
import models
import schemas
from authorization import require_incident_access, require_project_access, require_admin_access
from database import SessionLocal, engine
from lemonsqueezy_service import LemonSqueezyService

models.Base.metadata.create_all(bind=engine)

# Enhanced FastAPI app configuration with OpenAPI/Swagger metadata
app = FastAPI(
    title="StatusWise API",
    description="""
    StatusWise is a comprehensive incident management and status page platform.
    
    ## Features
    
    * **User Management**: User registration, authentication, and subscription management
    * **Project Management**: Create and manage multiple status page projects
    * **Incident Management**: Create, track, and resolve incidents
    * **Public Status Pages**: Public-facing status pages for each project
    * **Subscription Management**: Integration with Lemon Squeezy for subscription billing
    
    ## Authentication
    
    This API uses OAuth2 with Bearer tokens. To authenticate:
    1. Register a new account via `/signup`
    2. Login via `/login` to get an access token
    3. Include the token in the Authorization header: `Bearer {token}`
    
    ## Subscription Tiers
    
    - **Free**: Limited projects and features
    - **Pro**: Unlimited projects and premium features
    """,
    version="1.0.0",
    terms_of_service="https://statuswise.io/terms",
    contact={
        "name": "StatusWise Support",
        "url": "https://statuswise.io/support",
        "email": "support@statuswise.io",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=[
        {
            "name": "authentication",
            "description": "User registration and authentication operations",
        },
        {
            "name": "health",
            "description": "System health and status endpoints",
        },
        {
            "name": "subscription",
            "description": "Subscription management and billing operations",
        },
        {
            "name": "projects",
            "description": "Project management operations",
        },
        {
            "name": "incidents",
            "description": "Incident management operations",
        },
        {
            "name": "public",
            "description": "Public-facing endpoints (no authentication required)",
        },
        {
            "name": "webhooks",
            "description": "Webhook endpoints for external services",
        },
        {
            "name": "admin",
            "description": "Admin-only endpoints for managing users, subscriptions, and system stats",
        },
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/signup", response_model=schemas.UserOut, tags=["authentication"])
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account.

    Creates a new user with the provided email and password.
    Optionally creates a Lemon Squeezy customer record for billing.

    - **email**: Must be a valid email address
    - **password**: User's password (will be hashed before storage)

    Returns the created user information including subscription details.
    """
    # Check if user already exists
    existing_user = (
        db.query(models.User).filter(models.User.email == user.email).first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)

    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        # Create Lemon Squeezy customer for new user (optional)
        try:
            customer_id = LemonSqueezyService.create_customer(user.email)
            if customer_id:
                db_user.lemonsqueezy_customer_id = customer_id
                db.commit()
        except Exception as e:
            print(f"Failed to create Lemon Squeezy customer: {str(e)}")
            # Don't fail signup if customer creation fails

        return db_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )


@app.post("/login", tags=["authentication"])
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """
    Authenticate user and return access token.

    Use this endpoint to authenticate with email and password.
    Returns a Bearer token that should be included in subsequent requests.

    - **username**: User's email address
    - **password**: User's password

    Returns an access token and token type.
    """
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    token = auth.create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/", tags=["health"])
def read_root():
    """
    Root endpoint - API status check.

    Simple endpoint to verify the API is running.
    """
    return {"message": "StatusWise API Running"}


@app.get("/health", tags=["health"])
def health_check():
    """
    Health check endpoint.

    Returns the current health status of the API with timestamp.
    Useful for monitoring and load balancer health checks.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.now(datetime.timezone.utc),
    }


# Subscription endpoints
@app.get(
    "/subscription/status",
    response_model=schemas.SubscriptionStatusResponse,
    tags=["subscription"],
)
def get_subscription_status(
    user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)
):
    """
    Get current user's subscription status and limits.

    Returns detailed information about the user's subscription including:
    - Current subscription tier (free/pro)
    - Subscription status and expiry
    - Usage limits and current usage

    Requires authentication.
    """
    limits = LemonSqueezyService.get_subscription_limits(user.subscription_tier)

    # Get current usage
    from sqlalchemy import func

    project_count = (
        db.query(func.count(models.Project.id))
        .filter(models.Project.owner_id == user.id)
        .scalar()
    )

    return {
        "tier": user.subscription_tier,
        "status": user.subscription_status,
        "expires_at": user.subscription_expires_at,
        "limits": limits,
        "usage": {"projects": project_count, "max_projects": limits["max_projects"]},
    }


@app.post(
    "/subscription/create-checkout",
    response_model=schemas.CheckoutSessionResponse,
    tags=["subscription"],
)
def create_checkout_session(
    user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)
):
    """
    Create Lemon Squeezy checkout URL for Pro subscription.

    Generates a secure checkout URL for upgrading to Pro subscription.
    The user will be redirected to Lemon Squeezy's hosted checkout page.

    Requires authentication.

    Returns a checkout URL that the client should redirect the user to.
    """
    try:
        variant_id = os.getenv("LEMONSQUEEZY_PRO_VARIANT_ID")
        if not variant_id:
            raise HTTPException(
                status_code=500, detail="Lemon Squeezy configuration missing"
            )

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        checkout_url = LemonSqueezyService.create_checkout_url(
            variant_id=variant_id,
            customer_email=user.email,
            success_url=f"{frontend_url}/dashboard?subscription=success",
            user_id=user.id,
        )

        if not checkout_url:
            raise HTTPException(
                status_code=500, detail="Failed to create checkout session"
            )

        return {"checkout_url": checkout_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhooks/lemonsqueezy", tags=["webhooks"])
async def lemonsqueezy_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle Lemon Squeezy webhooks.

    Processes webhook events from Lemon Squeezy for subscription updates.
    This endpoint is called automatically by Lemon Squeezy when subscription
    events occur (payments, cancellations, etc.).

    Verifies webhook signature for security.

    **Note**: This endpoint is for webhook processing only, not for direct client use.
    """
    payload = await request.body()
    signature = request.headers.get("x-signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    # Verify webhook signature
    if not LemonSqueezyService.verify_webhook_signature(payload, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        import json

        event_data = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Handle the event
    success = LemonSqueezyService.handle_webhook(event_data, db)

    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=400, detail="Webhook processing failed")


@app.post("/projects/", response_model=schemas.ProjectOut, tags=["projects"])
def create_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    """
    Create a new status page project.

    Creates a new project for incident tracking and status page management.
    Project creation is subject to subscription limits.

    - **name**: Project name (1-200 characters, cannot be blank)

    Requires authentication.

    Returns the created project information.
    """
    # Check subscription limits
    if not LemonSqueezyService.can_create_project(user, db):
        limits = LemonSqueezyService.get_subscription_limits(user.subscription_tier)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Project limit reached. {user.subscription_tier.value} tier "
                f"allows {limits['max_projects']} projects. "
                f"Upgrade to Pro for more projects."
            ),
        )

    db_project = models.Project(name=project.name, owner_id=user.id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@app.get("/projects/", response_model=list[schemas.ProjectOut], tags=["projects"])
def list_projects(
    db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)
):
    """
    List all projects owned by the current user.

    Returns a list of all projects that belong to the authenticated user.

    Requires authentication.
    """
    return db.query(models.Project).filter(models.Project.owner_id == user.id).all()


@app.post("/incidents/", response_model=schemas.IncidentOut, tags=["incidents"])
def create_incident(
    incident: schemas.IncidentCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    """
    Create a new incident for a project.

    Creates a new incident report for the specified project.
    User must have access to the project to create incidents.

    - **project_id**: ID of the project to create the incident for
    - **title**: Incident title (1-200 characters)
    - **description**: Detailed incident description (1-5000 characters)
    - **scheduled_start**: Optional scheduled start time for maintenance incidents

    Requires authentication and project access.

    Returns the created incident information.
    """
    # Check if user has access to the project
    require_project_access(user, incident.project_id, "write", db)

    # Check subscription limits
    if not LemonSqueezyService.can_create_incident(user, incident.project_id, db):
        limits = LemonSqueezyService.get_subscription_limits(user.subscription_tier)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Incident limit reached. {user.subscription_tier.value} tier "
                f"allows {limits['max_incidents_per_project']} incidents per "
                f"project. Upgrade to Pro for more incidents."
            ),
        )

    db_incident = models.Incident(**incident.model_dump())
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return db_incident


@app.get(
    "/incidents/{project_id}",
    response_model=list[schemas.IncidentOut],
    tags=["incidents"],
)
def list_incidents(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    """
    List all incidents for a specific project.

    Returns a list of all incidents (resolved and unresolved) for the specified project.
    User must have access to the project.

    - **project_id**: ID of the project to list incidents for

    Requires authentication and project access.
    """
    # Check if user has access to the project
    require_project_access(user, project_id, "read", db)

    return (
        db.query(models.Incident).filter(models.Incident.project_id == project_id).all()
    )


@app.post(
    "/incidents/{incident_id}/resolve",
    response_model=schemas.IncidentOut,
    tags=["incidents"],
)
def resolve_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    """
    Mark an incident as resolved.

    Marks the specified incident as resolved and sets the resolution timestamp.
    User must have access to the incident's project.

    - **incident_id**: ID of the incident to resolve

    Requires authentication and incident access.

    Returns the updated incident information.
    """
    # Check if user has access to the incident
    require_incident_access(user, incident_id, "write", db)

    incident = (
        db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    incident.resolved = True
    incident.resolved_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(incident)
    return incident


@app.get(
    "/public/{project_id}", response_model=list[schemas.IncidentOut], tags=["public"]
)
def public_incidents(project_id: int, db: Session = Depends(get_db)):
    """
    Get public incidents for a project status page.

    Returns all incidents for the specified project that are visible on the public status page.
    This endpoint does not require authentication and is used for public status pages.

    - **project_id**: ID of the project to get public incidents for

    **No authentication required** - this is a public endpoint.
    """
    # Validate that the project exists
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return (
        db.query(models.Incident).filter(models.Incident.project_id == project_id).all()
    )


@app.get(
    "/projects/{project_id}/incidents",
    response_model=list[schemas.IncidentOut],
    tags=["incidents"],
)
def list_project_incidents(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    """
    List incidents for a specific project (alternative endpoint).

    Alternative endpoint for listing project incidents.
    Returns all incidents for the specified project.
    User must have access to the project.

    - **project_id**: ID of the project to list incidents for

    Requires authentication and project access.
    """
    # Check if user has access to the project
    require_project_access(user, project_id, "read", db)

    return (
        db.query(models.Incident).filter(models.Incident.project_id == project_id).all()
    )


# Admin endpoints
@app.get("/admin/stats", response_model=schemas.AdminStatsOut, tags=["admin"])
def get_admin_stats(
    user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)
):
    """
    Get system-wide statistics for admin dashboard.

    Returns comprehensive statistics including user counts, subscription metrics,
    project and incident counts, and revenue data.

    Requires admin privileges.
    """
    require_admin_access(user)
    
    from sqlalchemy import func
    
    # User statistics
    total_users = db.query(func.count(models.User.id)).scalar()
    active_users = db.query(func.count(models.User.id)).filter(models.User.is_active == True).scalar()
    pro_subscribers = db.query(func.count(models.User.id)).filter(
        models.User.subscription_tier == models.SubscriptionTier.PRO
    ).scalar()
    free_users = total_users - pro_subscribers
    
    # Project and incident statistics
    total_projects = db.query(func.count(models.Project.id)).scalar()
    total_incidents = db.query(func.count(models.Incident.id)).scalar()
    unresolved_incidents = db.query(func.count(models.Incident.id)).filter(
        models.Incident.resolved == False
    ).scalar()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "pro_subscribers": pro_subscribers,
        "free_users": free_users,
        "total_projects": total_projects,
        "total_incidents": total_incidents,
        "unresolved_incidents": unresolved_incidents,
        "monthly_revenue": None,  # Could be calculated from LemonSqueezy data
    }


@app.get("/admin/users", response_model=list[schemas.AdminUserOut], tags=["admin"])
def get_admin_users(
    skip: int = 0,
    limit: int = 100,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all users for admin management.

    Returns a paginated list of all users with detailed information including
    subscription status, creation dates, and admin flags.

    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return (max 100)

    Requires admin privileges.
    """
    require_admin_access(user)
    
    return (
        db.query(models.User)
        .order_by(models.User.created_at.desc())
        .offset(skip)
        .limit(min(limit, 100))
        .all()
    )


@app.get("/admin/subscriptions", response_model=list[schemas.AdminSubscriptionOut], tags=["admin"])
def get_admin_subscriptions(
    skip: int = 0,
    limit: int = 100,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all subscriptions for admin management.

    Returns a paginated list of all subscriptions with detailed billing information
    and associated user data.

    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return (max 100)

    Requires admin privileges.
    """
    require_admin_access(user)
    
    subscriptions = (
        db.query(models.Subscription)
        .join(models.User)
        .order_by(models.Subscription.created_at.desc())
        .offset(skip)
        .limit(min(limit, 100))
        .all()
    )
    
    # Add user email to subscription data
    result = []
    for sub in subscriptions:
        sub_dict = schemas.AdminSubscriptionOut.model_validate(sub).model_dump()
        sub_dict["user_email"] = sub.user.email
        result.append(schemas.AdminSubscriptionOut(**sub_dict))
    
    return result


@app.get("/admin/projects", response_model=list[schemas.AdminProjectOut], tags=["admin"])
def get_admin_projects(
    skip: int = 0,
    limit: int = 100,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all projects for admin management.

    Returns a paginated list of all projects with owner information and
    incident counts.

    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return (max 100)

    Requires admin privileges.
    """
    require_admin_access(user)
    
    from sqlalchemy import func
    
    projects = (
        db.query(
            models.Project,
            models.User.email.label("owner_email"),
            func.count(models.Incident.id).label("incidents_count"),
            func.count(
                models.Incident.id.filter(models.Incident.resolved == False)
            ).label("unresolved_incidents_count"),
        )
        .join(models.User, models.Project.owner_id == models.User.id)
        .outerjoin(models.Incident, models.Project.id == models.Incident.project_id)
        .group_by(models.Project.id, models.User.email)
        .order_by(models.Project.id.desc())
        .offset(skip)
        .limit(min(limit, 100))
        .all()
    )
    
    result = []
    for project, owner_email, incidents_count, unresolved_count in projects:
        project_dict = {
            "id": project.id,
            "name": project.name,
            "owner_id": project.owner_id,
            "owner_email": owner_email,
            "incidents_count": incidents_count,
            "unresolved_incidents_count": unresolved_count,
        }
        result.append(schemas.AdminProjectOut(**project_dict))
    
    return result


@app.get("/admin/users/{user_id}", response_model=schemas.AdminUserOut, tags=["admin"])
def get_admin_user(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific user.

    Returns comprehensive user information including subscription details,
    activity status, and administrative flags.

    - **user_id**: ID of the user to retrieve

    Requires admin privileges.
    """
    require_admin_access(current_user)
    
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return target_user


@app.patch("/admin/users/{user_id}", response_model=schemas.AdminUserOut, tags=["admin"])
def update_admin_user(
    user_id: int,
    is_active: Optional[bool] = None,
    is_admin: Optional[bool] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update user status and permissions.

    Allows admin to modify user active status and admin privileges.

    - **user_id**: ID of the user to update
    - **is_active**: Set user active status
    - **is_admin**: Set user admin privileges

    Requires admin privileges.
    """
    require_admin_access(current_user)
    
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent self-demotion from admin
    if user_id == current_user.id and is_admin is False:
        raise HTTPException(
            status_code=400, detail="Cannot remove admin privileges from yourself"
        )
    
    if is_active is not None:
        target_user.is_active = is_active
    
    if is_admin is not None:
        target_user.is_admin = is_admin
    
    target_user.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(target_user)
    
    return target_user


@app.get("/admin/incidents", response_model=list[schemas.IncidentOut], tags=["admin"])
def get_admin_incidents(
    skip: int = 0,
    limit: int = 100,
    resolved: Optional[bool] = None,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all incidents across all projects for admin management.

    Returns a paginated list of incidents with optional filtering by resolution status.

    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return (max 100)
    - **resolved**: Filter by resolution status (true/false/null for all)

    Requires admin privileges.
    """
    require_admin_access(user)
    
    query = db.query(models.Incident)
    
    if resolved is not None:
        query = query.filter(models.Incident.resolved == resolved)
    
    return (
        query.order_by(models.Incident.created_at.desc())
        .offset(skip)
        .limit(min(limit, 100))
        .all()
    )
