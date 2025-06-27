import os
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from google.auth.transport import requests
from google.oauth2 import id_token
from jose import JWTError, jwt
from sqlalchemy.orm import Session

import models
from database import SessionLocal

# Use a default secret key for testing if JWT_SECRET is not set
SECRET_KEY = os.getenv("JWT_SECRET", "test-secret-key-for-development-only")
ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/google")


def verify_google_token(token: str) -> Optional[dict]:
    """Verify Google OAuth token and return user info"""
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), GOOGLE_CLIENT_ID
        )
        
        # Check if the token is for our app
        if idinfo.get('aud') != GOOGLE_CLIENT_ID:
            return None
            
        return {
            'google_id': idinfo.get('sub'),
            'email': idinfo.get('email'),
            'name': idinfo.get('name'),
            'avatar_url': idinfo.get('picture'),
            'email_verified': idinfo.get('email_verified', False)
        }
    except ValueError:
        # Invalid token
        return None


def create_access_token(data: dict) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


def create_user_from_google(google_user_info: dict, db: Session) -> models.User:
    """Create a new user from Google OAuth data"""
    db_user = models.User(
        email=google_user_info['email'],
        name=google_user_info['name'],
        google_id=google_user_info['google_id'],
        avatar_url=google_user_info['avatar_url'],
        is_active=True
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_or_create_user_from_google(google_user_info: dict, db: Session) -> models.User:
    """Get existing user or create new one from Google OAuth data"""
    # First try to find by Google ID
    user = db.query(models.User).filter(models.User.google_id == google_user_info['google_id']).first()
    
    if user:
        # Update user info in case it changed
        user.name = google_user_info['name']
        user.avatar_url = google_user_info['avatar_url']
        db.commit()
        return user
    
    # If not found by Google ID, try by email
    user = db.query(models.User).filter(models.User.email == google_user_info['email']).first()
    
    if user:
        # Update existing user with Google info
        user.google_id = google_user_info['google_id']
        user.name = google_user_info['name']
        user.avatar_url = google_user_info['avatar_url']
        db.commit()
        return user
    
    # Create new user
    return create_user_from_google(google_user_info, db)
