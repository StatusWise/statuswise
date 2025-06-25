#!/usr/bin/env python3
"""
PostgreSQL Admin Migration for StatusWise.
This script adds admin functionality to your PostgreSQL database.
"""

import os
import sys
import getpass
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError, ProgrammingError

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from database import DATABASE_URL
    from models import User
    from auth import get_password_hash
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
        # Check if migration is needed
        with engine.begin() as conn:
            # Check if users table exists
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users'
            """)).fetchone()
            
            if not result:
                print("✗ Error: Users table not found. Please run the application first to create tables.")
                sys.exit(1)
            
            print("✓ Users table found")
            
            # Check which columns exist
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND table_schema = 'public'
            """)).fetchall()
            
            existing_columns = [row[0] for row in result]
            print(f"Existing columns: {', '.join(existing_columns)}")
            
            # Add missing columns
            columns_to_add = []
            
            if 'is_admin' not in existing_columns:
                try:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"))
                    columns_to_add.append('is_admin')
                    print("  ✓ Added is_admin column")
                except ProgrammingError as e:
                    if "already exists" in str(e).lower():
                        print("  ✓ is_admin column already exists")
                    else:
                        print(f"  ✗ Error adding is_admin: {e}")
            
            if 'created_at' not in existing_columns:
                try:
                    conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                    columns_to_add.append('created_at')
                    print("  ✓ Added created_at column")
                except ProgrammingError as e:
                    if "already exists" in str(e).lower():
                        print("  ✓ created_at column already exists")
                    else:
                        print(f"  ✗ Error adding created_at: {e}")
            
            if 'updated_at' not in existing_columns:
                try:
                    conn.execute(text("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                    columns_to_add.append('updated_at')
                    print("  ✓ Added updated_at column")
                except ProgrammingError as e:
                    if "already exists" in str(e).lower():
                        print("  ✓ updated_at column already exists")
                    else:
                        print(f"  ✗ Error adding updated_at: {e}")
            
            if columns_to_add:
                print(f"✓ Successfully added columns: {', '.join(columns_to_add)}")
            else:
                print("✓ All admin columns already exist")
        
        # Create admin user
        create_admin = input("\nWould you like to create an admin user? (y/n): ").lower().strip()
        
        if create_admin == 'y':
            db = SessionLocal()
            try:
                email = input("Enter admin email: ").strip()
                
                if not email:
                    print("✗ Email cannot be empty")
                    return
                
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
                    
                    if not password:
                        print("✗ Password cannot be empty")
                        return
                    
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
                
                # Show current admin users
                admin_users = db.query(User).filter(User.is_admin == True).all()
                if admin_users:
                    print(f"\nCurrent admin users:")
                    for user in admin_users:
                        print(f"  - {user.email} (ID: {user.id})")
                        
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