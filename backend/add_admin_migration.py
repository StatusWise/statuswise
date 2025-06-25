#!/usr/bin/env python3
"""
Migration script to add admin functionality to existing StatusWise installation.
This script adds the necessary columns and optionally creates an initial admin user.
"""

import os
import sys
import getpass
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import DATABASE_URL
from models import User
from auth import get_password_hash

def run_migration():
    """Run the admin migration."""
    print("StatusWise Admin Migration Script")
    print("=" * 40)
    
    # Create engine
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    try:
        # Check if migration is needed
        with engine.begin() as conn:
            # Check if is_admin column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'is_admin'
            """)).fetchone()
            
            if result:
                print("✓ Admin column already exists in users table")
            else:
                print("Adding admin columns to users table...")
                # Add the new columns
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"))
                conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                conn.execute(text("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                print("✓ Admin columns added successfully")
        
        # Ask if user wants to create an admin user
        create_admin = input("\nWould you like to create an admin user? (y/n): ").lower().strip()
        
        if create_admin == 'y':
            db = SessionLocal()
            try:
                email = input("Enter admin email: ").strip()
                
                # Check if user already exists
                existing_user = db.query(User).filter(User.email == email).first()
                
                if existing_user:
                    make_admin = input(f"User {email} already exists. Make them admin? (y/n): ").lower().strip()
                    if make_admin == 'y':
                        existing_user.is_admin = True
                        db.commit()
                        print(f"✓ {email} is now an admin")
                    else:
                        print("Skipping admin creation")
                else:
                    password = getpass.getpass("Enter admin password: ")
                    
                    # Create admin user
                    admin_user = User(
                        email=email,
                        hashed_password=get_password_hash(password),
                        is_admin=True,
                        is_active=True
                    )
                    
                    db.add(admin_user)
                    db.commit()
                    print(f"✓ Admin user {email} created successfully")
                    
            except IntegrityError:
                db.rollback()
                print(f"✗ Error: User {email} already exists")
            except Exception as e:
                db.rollback()
                print(f"✗ Error creating admin user: {e}")
            finally:
                db.close()
        
        print("\n" + "=" * 40)
        print("Migration completed successfully!")
        print("\nNext steps:")
        print("1. Restart your backend server")
        print("2. Admin users can now access /admin dashboard")
        print("3. Admin users will see 'Admin Dashboard' button in regular dashboard")
        
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()