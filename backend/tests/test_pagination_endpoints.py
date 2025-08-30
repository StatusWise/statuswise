import os

os.environ["TESTING"] = "1"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth import create_access_token
from database import Base, override_engine
from main import app, get_db
from models import Incident, Project, User


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


def seed_projects_and_incidents(db, user_id: int, count: int = 5):
    projects = []
    for i in range(count):
        p = Project(name=f"P{i}", owner_id=user_id, is_public=True)
        db.add(p)
        db.flush()
        for j in range(3):
            inc = Incident(project_id=p.id, title=f"I{i}-{j}", description="d")
            db.add(inc)
        projects.append(p)
    db.commit()
    return projects


class TestPagination:
    def setup_method(self):
        db = TestingSessionLocal()
        db.query(Incident).delete()
        db.query(Project).delete()
        db.query(User).delete()
        db.commit()
        db.close()

    def test_projects_pagination(self):
        db = TestingSessionLocal()
        user = User(email="pg@example.com", is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)
        seed_projects_and_incidents(db, user.id, count=7)

        token = create_access_token({"sub": user.email})
        r1 = client.get("/projects/?skip=0&limit=3", headers={"Authorization": f"Bearer {token}"})
        assert r1.status_code == 200
        assert len(r1.json()) == 3

        r2 = client.get("/projects/?skip=3&limit=3", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200
        assert len(r2.json()) == 3

        db.close()

    def test_public_incidents_pagination_and_filter(self):
        db = TestingSessionLocal()
        user = User(email="pub@example.com", is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)

        projects = seed_projects_and_incidents(db, user.id, count=1)
        project_id = projects[0].id

        r1 = client.get(f"/public/{project_id}?skip=0&limit=2")
        assert r1.status_code == 200
        assert len(r1.json()) == 2

        r2 = client.get(f"/public/{project_id}?only_unresolved=true")
        assert r2.status_code == 200
        assert len(r2.json()) >= 1

        db.close()

