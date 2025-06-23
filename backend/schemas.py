import datetime
import re
from typing import Optional

import bleach
from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserCreate(BaseModel):
    email: str = Field(..., max_length=320)
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if not re.match(r"[^@]+@[^@]+\.[^@]+", v):
            raise ValueError("Invalid email format")
        return v


class UserOut(BaseModel):
    id: int
    email: str

    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v):
        if not v.strip():
            raise ValueError("Project name must not be blank or whitespace only")
        return v


class ProjectOut(ProjectCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class IncidentCreate(BaseModel):
    project_id: int
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=5000)
    scheduled_start: Optional[datetime.datetime] = None

    @field_validator("title", "description")
    @classmethod
    def sanitize_html(cls, v):
        return bleach.clean(v)


class IncidentOut(IncidentCreate):
    id: int
    resolved: bool
    created_at: datetime.datetime
    resolved_at: Optional[datetime.datetime]

    model_config = ConfigDict(from_attributes=True)
