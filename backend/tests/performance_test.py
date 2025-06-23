import random

from locust import HttpUser, between, task


def initialize_test_data():
    """Initialize test data for performance testing"""
    from auth import get_password_hash
    from database import SessionLocal, engine
    from models import Base, Incident, Project, User

    # Create tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Create a test user if none exists
        test_user = db.query(User).filter(User.email == "perf_test@example.com").first()
        if not test_user:
            test_user = User(
                email="perf_test@example.com",
                hashed_password=get_password_hash("testpass123"),
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)

        # Create a test project if none exists
        test_project = (
            db.query(Project).filter(Project.owner_id == test_user.id).first()
        )
        if not test_project:
            test_project = Project(
                name="Performance Test Project", owner_id=test_user.id
            )
            db.add(test_project)
            db.commit()
            db.refresh(test_project)

        # Create some test incidents
        existing_incidents = (
            db.query(Incident).filter(Incident.project_id == test_project.id).count()
        )
        if existing_incidents == 0:
            for i in range(5):
                incident = Incident(
                    project_id=test_project.id,
                    title=f"Test Incident {i+1}",
                    description=f"Performance test incident {i+1}",
                    resolved=False,
                )
                db.add(incident)
            db.commit()

        print(
            f"Test data initialized: User ID {test_user.id}, "
            f"Project ID {test_project.id}"
        )

    except Exception as e:
        print(f"Error initializing test data: {e}")
        import traceback

        traceback.print_exc()
    finally:
        db.close()


class StatusWiseUser(HttpUser):
    wait_time = between(1, 3)  # Wait 1-3 seconds between requests

    def on_start(self):
        """Set up user session - create a test user and get token"""
        # Create a test user
        test_email = f"testuser{random.randint(1000, 9999)}@example.com"
        test_password = "testpass123"

        try:
            # Sign up
            self.client.post(
                "/signup", json={"email": test_email, "password": test_password}
            )

            # Login to get token
            login_response = self.client.post(
                "/login", data={"username": test_email, "password": test_password}
            )

            if login_response.status_code == 200:
                self.token = login_response.json().get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
            else:
                self.token = None
                self.headers = {}

        except Exception as e:
            print(f"Failed to set up user session: {e}")
            self.token = None
            self.headers = {}

    @task(3)
    def get_root(self):
        """Test the root endpoint"""
        self.client.get("/")

    @task(2)
    def get_health(self):
        """Test the health endpoint"""
        self.client.get("/health")

    @task(1)
    def create_project(self):
        """Test creating a project"""
        if self.token:
            project_name = f"Test Project {random.randint(1000, 9999)}"
            self.client.post(
                "/projects/", json={"name": project_name}, headers=self.headers
            )

    @task(2)
    def get_projects(self):
        """Test getting projects list"""
        if self.token:
            self.client.get("/projects/", headers=self.headers)

    @task(1)
    def create_incident(self):
        """Test creating an incident"""
        if self.token:
            # First get projects to use a valid project ID
            projects_response = self.client.get("/projects/", headers=self.headers)
            if projects_response.status_code == 200:
                projects = projects_response.json()
                if projects:
                    project_id = projects[0]["id"]
                    incident_data = {
                        "project_id": project_id,
                        "title": f"Test Incident {random.randint(1000, 9999)}",
                        "description": "Performance test incident",
                    }
                    self.client.post(
                        "/incidents/", json=incident_data, headers=self.headers
                    )

    @task(2)
    def get_incidents(self):
        """Test getting incidents for a project"""
        if self.token:
            # First get projects to use a valid project ID
            projects_response = self.client.get("/projects/", headers=self.headers)
            if projects_response.status_code == 200:
                projects = projects_response.json()
                if projects:
                    project_id = projects[0]["id"]
                    self.client.get(f"/incidents/{project_id}", headers=self.headers)

    @task(1)
    def get_public_incidents(self):
        """Test getting public incidents"""
        if self.token:
            # First get projects to use a valid project ID
            projects_response = self.client.get("/projects/", headers=self.headers)
            if projects_response.status_code == 200:
                projects = projects_response.json()
                if projects:
                    project_id = projects[0]["id"]
                    self.client.get(f"/public/{project_id}")

    @task(1)
    def resolve_incident(self):
        """Test resolving an incident"""
        if self.token:
            # First get projects and incidents
            projects_response = self.client.get("/projects/", headers=self.headers)
            if projects_response.status_code == 200:
                projects = projects_response.json()
                if projects:
                    project_id = projects[0]["id"]
                    incidents_response = self.client.get(
                        f"/incidents/{project_id}", headers=self.headers
                    )
                    if incidents_response.status_code == 200:
                        incidents = incidents_response.json()
                        # Find an unresolved incident
                        for incident in incidents:
                            if not incident.get("resolved", False):
                                self.client.post(
                                    f"/incidents/{incident['id']}/resolve",
                                    headers=self.headers,
                                )
                                break


class AnonymousUser(HttpUser):
    wait_time = between(2, 5)
    weight = 2  # 2/3 of users will be anonymous

    @task(3)
    def get_root(self):
        """Test the root endpoint"""
        self.client.get("/")

    @task(2)
    def get_health(self):
        """Test the health endpoint"""
        self.client.get("/health")

    @task(1)
    def get_public_incidents(self):
        """Test getting public incidents with a dummy project ID"""
        # Try a few different project IDs since we don't know what exists
        for project_id in [1, 2, 3]:
            try:
                response = self.client.get(f"/public/{project_id}")
                if response.status_code == 200:
                    break  # Found a valid project
            except Exception:
                continue  # Try next project ID
