#!/usr/bin/env python3
"""
PostgreSQL Admin Migration for StatusWise.
This script adds admin functionality to your PostgreSQL database.
"""

import getpass
import os
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from auth import get_password_hash
    from database import DATABASE_URL
    from models import User
except ImportError as e:
    print(f"✗ Import error: {e}")
    print("Make sure you're running this script from the backend directory")
    print("and that all dependencies are installed in your virtual environment")
    sys.exit(1)


def run_migration():
    """Run the PostgreSQL admin migration."""
    print("StatusWise PostgreSQL Admin Migration")
    print("=" * 40)

    if not DATABASE_URL or DATABASE_URL.startswith("sqlite"):
        print("✗ Error: No PostgreSQL DATABASE_URL found")
        print("Set your DATABASE_URL environment variable:")
        print("export DATABASE_URL='postgresql://user:password@localhost/statuswise'")
        sys.exit(1)

    print(f"Using database: {DATABASE_URL}")

    # Create engine
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    try:
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✓ Connected to PostgreSQL: {version}")

        # Check if users table exists
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'users'
                )
            """
                )
            )
            table_exists = result.fetchone()[0]

        if not table_exists:
            print("✗ Error: users table does not exist")
            print("Please run the main application first to create tables")
            sys.exit(1)

        print("✓ Users table found")

        # Check if is_admin column exists
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    """
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'users' 
                    AND column_name = 'is_admin'
                )
            """
                )
            )
            column_exists = result.fetchone()[0]

        if column_exists:
            print("✓ is_admin column already exists")
        else:
            print("Adding is_admin column...")
            with engine.connect() as conn:
                conn.execute(
                    text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE")
                )
                conn.commit()
                print("✓ is_admin column added")

        # Check if created_at and updated_at columns exist
        with engine.connect() as conn:
            result = conn.execute(
                text(
                    """
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('created_at', 'updated_at')
            """
                )
            )
            existing_columns = [row[0] for row in result.fetchall()]

        if "created_at" not in existing_columns:
            print("Adding created_at column...")
            with engine.connect() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN created_at "
                        "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                    )
                )
                conn.commit()
                print("✓ created_at column added")

        if "updated_at" not in existing_columns:
            print("Adding updated_at column...")
            with engine.connect() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN updated_at "
                        "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                    )
                )
                conn.commit()
                print("✓ updated_at column added")

        # Create admin user interactively
        create_admin_user(SessionLocal)

        print("\n✅ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Restart your backend server")
        print("2. Login with your admin credentials")
        print("3. Access the admin dashboard")

    except Exception as e:
        print(f"✗ Migration failed: {e}")
        sys.exit(1)


def create_admin_user(SessionLocal):
    """Create an admin user interactively."""
    print("\n" + "=" * 40)
    print("Admin User Creation")
    print("=" * 40)

    db = SessionLocal()
    try:
        # Get admin email
        while True:
            admin_email = input("Enter admin email: ").strip()
            if admin_email and "@" in admin_email:
                break
            print("Please enter a valid email address")

        # Check if user already exists
        existing_user = db.query(User).filter(User.email == admin_email).first()

        if existing_user:
            if existing_user.is_admin:
                print(f"✓ User {admin_email} is already an admin")
                return
            else:
                # Promote existing user to admin
                response = input(
                    f"User {admin_email} exists. Promote to admin? (y/N): "
                ).lower()
                if response == "y":
                    existing_user.is_admin = True
                    db.commit()
                    print(f"✓ Promoted {admin_email} to admin")
                    return
                else:
                    print("Skipping admin creation")
                    return

        # Get admin password
        while True:
            password = getpass.getpass("Enter admin password: ")
            if len(password) >= 8:
                break
            print("Password must be at least 8 characters long")

        # Create new admin user
        hashed_password = get_password_hash(password)
        admin_user = User(
            email=admin_email,
            hashed_password=hashed_password,
            is_admin=True,
            is_active=True,
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print(f"✓ Created admin user: {admin_email}")

    except IntegrityError:
        db.rollback()
        print("✗ Error: User with this email already exists")
    except Exception as e:
        db.rollback()
        print(f"✗ Error creating admin user: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
