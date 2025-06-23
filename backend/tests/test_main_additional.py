import json
import os
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth import get_password_hash
from database import Base, override_engine
from main import app, get_db
from models import Incident, Project, User, SubscriptionTier, SubscriptionStatus

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


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


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
        db.query(Incident).delete()
        db.query(Project).delete()
        db.query(User).delete()
        db.commit()
    finally:
        db.close()
    yield


@pytest.fixture
def test_user():
    db = TestingSessionLocal()
    user = User(
        email="test@example.com", 
        hashed_password=get_password_hash("testpassword"),
        subscription_tier=SubscriptionTier.FREE,
        subscription_status=SubscriptionStatus.ACTIVE
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def pro_user():
    db = TestingSessionLocal()
    user = User(
        email="prouser@example.com", 
        hashed_password=get_password_hash("testpassword"),
        subscription_tier=SubscriptionTier.PRO,
        subscription_status=SubscriptionStatus.ACTIVE
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture
def auth_headers(test_user):
    response = client.post(
        "/login", data={"username": "test@example.com", "password": "testpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def pro_auth_headers(pro_user):
    response = client.post(
        "/login", data={"username": "prouser@example.com", "password": "testpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestRootAndHealth:
    def test_read_root(self):
        """Test the root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "StatusWise API Running"}
    
    def test_health_check(self):
        """Test the health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data


class TestSignupAdditional:
    @patch('lemonsqueezy_service.LemonSqueezyService.create_customer')
    def test_signup_success_with_customer_creation(self, mock_create_customer):
        """Test signup with successful Lemon Squeezy customer creation"""
        mock_create_customer.return_value = "customer_123"
        
        response = client.post(
            "/signup", json={"email": "newuser@example.com", "password": "newpassword"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@example.com"
        mock_create_customer.assert_called_once_with("newuser@example.com")
    
    @patch('lemonsqueezy_service.LemonSqueezyService.create_customer')
    def test_signup_customer_creation_fails(self, mock_create_customer):
        """Test signup when customer creation fails but signup still succeeds"""
        mock_create_customer.side_effect = Exception("API Error")
        
        response = client.post(
            "/signup", json={"email": "newuser@example.com", "password": "newpassword"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@example.com"


class TestSubscriptionEndpoints:
    def test_get_subscription_status_free_tier(self, test_user, auth_headers):
        """Test getting subscription status for free tier user"""
        response = client.get("/subscription/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["tier"] == "free"
        assert data["status"] == "active"
        assert data["limits"]["max_projects"] == 1
        assert data["limits"]["max_incidents_per_project"] == 5
        assert data["usage"]["projects"] == 0
        assert data["usage"]["max_projects"] == 1
    
    def test_get_subscription_status_pro_tier(self, pro_user, pro_auth_headers):
        """Test getting subscription status for pro tier user"""
        response = client.get("/subscription/status", headers=pro_auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["tier"] == "pro"
        assert data["status"] == "active"
        assert data["limits"]["max_projects"] == 10
        assert data["limits"]["max_incidents_per_project"] == 100
    
    def test_get_subscription_status_unauthorized(self):
        """Test getting subscription status without authentication"""
        response = client.get("/subscription/status")
        assert response.status_code == 401
    
    @patch.dict(os.environ, {"LEMONSQUEEZY_PRO_VARIANT_ID": "variant_123", "FRONTEND_URL": "http://localhost:3000"})
    @patch('lemonsqueezy_service.LemonSqueezyService.create_checkout_url')
    def test_create_checkout_session_success(self, mock_create_checkout, test_user, auth_headers):
        """Test successful checkout session creation"""
        mock_create_checkout.return_value = "https://checkout.lemonsqueezy.com/test"
        
        response = client.post("/subscription/create-checkout", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["checkout_url"] == "https://checkout.lemonsqueezy.com/test"
        mock_create_checkout.assert_called_once()
    
    def test_create_checkout_session_missing_variant(self, test_user, auth_headers):
        """Test checkout session creation without variant ID configured"""
        with patch.dict(os.environ, {}, clear=True):
            response = client.post("/subscription/create-checkout", headers=auth_headers)
            assert response.status_code == 500
            assert "configuration missing" in response.json()["detail"]
    
    @patch.dict(os.environ, {"LEMONSQUEEZY_PRO_VARIANT_ID": "variant_123"})
    @patch('lemonsqueezy_service.LemonSqueezyService.create_checkout_url')
    def test_create_checkout_session_failure(self, mock_create_checkout, test_user, auth_headers):
        """Test checkout session creation failure"""
        mock_create_checkout.return_value = None
        
        response = client.post("/subscription/create-checkout", headers=auth_headers)
        assert response.status_code == 500
        assert "Failed to create checkout session" in response.json()["detail"]
    
    @patch.dict(os.environ, {"LEMONSQUEEZY_PRO_VARIANT_ID": "variant_123"})
    @patch('lemonsqueezy_service.LemonSqueezyService.create_checkout_url')
    def test_create_checkout_session_exception(self, mock_create_checkout, test_user, auth_headers):
        """Test checkout session creation with exception"""
        mock_create_checkout.side_effect = Exception("Network error")
        
        response = client.post("/subscription/create-checkout", headers=auth_headers)
        assert response.status_code == 500
        assert "Network error" in response.json()["detail"]
    
    def test_create_checkout_session_unauthorized(self):
        """Test checkout session creation without authentication"""
        response = client.post("/subscription/create-checkout")
        assert response.status_code == 401


class TestWebhookEndpoints:
    @patch('lemonsqueezy_service.LemonSqueezyService.verify_webhook_signature')
    @patch('lemonsqueezy_service.LemonSqueezyService.handle_webhook')
    def test_webhook_success(self, mock_handle_webhook, mock_verify_signature):
        """Test successful webhook processing"""
        mock_verify_signature.return_value = True
        mock_handle_webhook.return_value = True
        
        payload = {"test": "data"}
        response = client.post(
            "/webhooks/lemonsqueezy",
            json=payload,
            headers={"x-signature": "valid_signature"}
        )
        assert response.status_code == 200
        assert response.json() == {"status": "success"}
    
    def test_webhook_missing_signature(self):
        """Test webhook without signature header"""
        response = client.post("/webhooks/lemonsqueezy", json={"test": "data"})
        assert response.status_code == 400
        assert "Missing signature" in response.json()["detail"]
    
    @patch('lemonsqueezy_service.LemonSqueezyService.verify_webhook_signature')
    def test_webhook_invalid_signature(self, mock_verify_signature):
        """Test webhook with invalid signature"""
        mock_verify_signature.return_value = False
        
        response = client.post(
            "/webhooks/lemonsqueezy",
            json={"test": "data"},
            headers={"x-signature": "invalid_signature"}
        )
        assert response.status_code == 400
        assert "Invalid signature" in response.json()["detail"]
    
    @patch('lemonsqueezy_service.LemonSqueezyService.verify_webhook_signature')
    def test_webhook_invalid_json(self, mock_verify_signature):
        """Test webhook with invalid JSON payload"""
        mock_verify_signature.return_value = True
        
        response = client.post(
            "/webhooks/lemonsqueezy",
            data="invalid json",
            headers={"x-signature": "valid_signature", "content-type": "application/json"}
        )
        assert response.status_code == 400
        assert "Invalid JSON payload" in response.json()["detail"]
    
    @patch('lemonsqueezy_service.LemonSqueezyService.verify_webhook_signature')
    @patch('lemonsqueezy_service.LemonSqueezyService.handle_webhook')
    def test_webhook_processing_failure(self, mock_handle_webhook, mock_verify_signature):
        """Test webhook processing failure"""
        mock_verify_signature.return_value = True
        mock_handle_webhook.return_value = False
        
        response = client.post(
            "/webhooks/lemonsqueezy",
            json={"test": "data"},
            headers={"x-signature": "valid_signature"}
        )
        assert response.status_code == 400
        assert "Webhook processing failed" in response.json()["detail"]


class TestProjectLimits:
    @patch('lemonsqueezy_service.LemonSqueezyService.can_create_project')
    def test_create_project_limit_exceeded(self, mock_can_create, test_user, auth_headers):
        """Test project creation when limit is exceeded"""
        mock_can_create.return_value = False
        
        response = client.post(
            "/projects/", json={"name": "Test Project"}, headers=auth_headers
        )
        assert response.status_code == 403
        assert "Project limit reached" in response.json()["detail"]
        assert "free tier allows 1 projects" in response.json()["detail"]


class TestIncidentLimits:
    @patch('lemonsqueezy_service.LemonSqueezyService.can_create_incident')
    def test_create_incident_limit_exceeded(self, mock_can_create, test_user, auth_headers):
        """Test incident creation when limit is exceeded"""
        mock_can_create.return_value = False
        
        # Create a project first
        db = TestingSessionLocal()
        project = Project(name="Test Project", owner_id=test_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        db.close()
        
        response = client.post(
            "/incidents/",
            json={
                "project_id": project.id,
                "title": "Test Incident",
                "description": "Test description",
            },
            headers=auth_headers,
        )
        assert response.status_code == 403
        assert "Incident limit reached" in response.json()["detail"]


class TestProjectAccess:
    def test_list_project_incidents_success(self, test_user, auth_headers):
        """Test listing incidents for a specific project"""
        # Create a project and incident
        db = TestingSessionLocal()
        project = Project(name="Test Project", owner_id=test_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        project_id = project.id  # Store ID before closing session
        
        incident = Incident(
            title="Test Incident",
            description="Test description",
            project_id=project.id
        )
        db.add(incident)
        db.commit()
        db.close()
        
        response = client.get(f"/projects/{project_id}/incidents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Test Incident"
    
    def test_list_project_incidents_unauthorized(self):
        """Test listing project incidents without authentication"""
        response = client.get("/projects/1/incidents")
        assert response.status_code == 401
    
    def test_list_project_incidents_not_owner(self, test_user, auth_headers):
        """Test listing incidents for project not owned by user"""
        # Create another user and their project
        db = TestingSessionLocal()
        other_user = User(
            email="other@example.com",
            hashed_password="password"
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        
        project = Project(name="Other Project", owner_id=other_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        project_id = project.id
        db.close()
        
        # API now properly returns 403 with access control
        response = client.get(f"/projects/{project_id}/incidents", headers=auth_headers)
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]
    
    def test_list_project_incidents_nonexistent_project(self, test_user, auth_headers):
        """Test listing incidents for nonexistent project"""
        response = client.get("/projects/999/incidents", headers=auth_headers)
        # API now properly returns 404 with project validation
        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]


class TestIncidentAccess:
    def test_resolve_incident_not_owner(self, test_user, auth_headers):
        """Test resolving incident for project not owned by user"""
        # Create another user and their project/incident
        db = TestingSessionLocal()
        other_user = User(
            email="other@example.com",
            hashed_password="password"
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        
        project = Project(name="Other Project", owner_id=other_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        
        incident = Incident(
            title="Other Incident",
            description="Test description",
            project_id=project.id
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        incident_id = incident.id
        db.close()
        
        # API now properly returns 403 with access control
        response = client.post(f"/incidents/{incident_id}/resolve", headers=auth_headers)
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]
    
    def test_list_incidents_for_nonexistent_project(self, test_user, auth_headers):
        """Test listing incidents for nonexistent project"""
        response = client.get("/incidents/999", headers=auth_headers)
        # API now properly returns 404 with project validation
        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]
    
    def test_list_incidents_not_owner(self, test_user, auth_headers):
        """Test listing incidents for project not owned by user"""
        # Create another user and their project
        db = TestingSessionLocal()
        other_user = User(
            email="other@example.com",
            hashed_password="password"
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        
        project = Project(name="Other Project", owner_id=other_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        db.close()
        
        response = client.get(f"/incidents/{project.id}", headers=auth_headers)
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]


class TestErrorHandling:
    def test_create_incident_invalid_project(self, test_user, auth_headers):
        """Test creating incident for nonexistent project"""
        response = client.post(
            "/incidents/",
            json={
                "project_id": 999,
                "title": "Test Incident",
                "description": "Test description",
            },
            headers=auth_headers,
        )
        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]
    
    def test_create_incident_project_not_owned(self, test_user, auth_headers):
        """Test creating incident for project not owned by user"""
        # Create another user's project
        db = TestingSessionLocal()
        other_user = User(
            email="other@example.com",
            hashed_password="password"
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        
        project = Project(name="Other Project", owner_id=other_user.id)
        db.add(project)
        db.commit()
        db.refresh(project)
        db.close()
        
        response = client.post(
            "/incidents/",
            json={
                "project_id": project.id,
                "title": "Test Incident",
                "description": "Test description",
            },
            headers=auth_headers,
        )
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"] 