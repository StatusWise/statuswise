#!/usr/bin/env python3
"""
Simple script to create an admin user for StatusWise.
Use this after running the migration to create your first admin user.
"""

import os
import sys
import getpass
import sqlite3
from pathlib import Path

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from auth import get_password_hash
except ImportError:
    print("Error importing auth module. Make sure you're in the backend directory.")
    sys.exit(1)

def create_admin_user():
    """Create an admin user directly in the SQLite database."""
    print("StatusWise Admin User Creation")
    print("=" * 35)
    
    # Find the database file
    db_path = "statuswise.db"
    if not os.path.exists(db_path):
        # Try some common locations
        possible_paths = ["./statuswise.db", "../statuswise.db", "statuswise.db"]
        for path in possible_paths:
            if os.path.exists(path):
                db_path = path
                break
        else:
            print("✗ Could not find statuswise.db database file")
            print("Make sure the application has been run at least once to create the database")
            return
    
    print(f"Found database: {db_path}")
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if users table exists and has admin column
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'is_admin' not in columns:
            print("✗ Admin column not found. Please run the migration first:")
            print("python add_admin_migration.py")
            return
        
        # Get user input
        email = input("Enter admin email: ").strip()
        
        if not email:
            print("✗ Email cannot be empty")
            return
        
        # Check if user already exists
        cursor.execute("SELECT id, is_admin FROM users WHERE email = ?", (email,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            user_id, is_admin = existing_user
            if is_admin:
                print(f"✓ User {email} is already an admin")
                return
            else:
                make_admin = input(f"User {email} exists but is not admin. Make them admin? (y/n): ").lower()
                if make_admin == 'y':
                    cursor.execute("UPDATE users SET is_admin = TRUE WHERE id = ?", (user_id,))
                    conn.commit()
                    print(f"✓ {email} is now an admin")
                    return
                else:
                    print("Cancelled")
                    return
        
        # Create new admin user
        password = getpass.getpass("Enter admin password: ")
        if not password:
            print("✗ Password cannot be empty")
            return
        
        hashed_password = get_password_hash(password)
        
        # Insert new admin user
        cursor.execute("""
            INSERT INTO users (email, hashed_password, is_active, is_admin, created_at, updated_at)
            VALUES (?, ?, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (email, hashed_password))
        
        conn.commit()
        print(f"✓ Admin user {email} created successfully")
        
        # Show admin users
        cursor.execute("SELECT id, email, is_admin FROM users WHERE is_admin = TRUE")
        admin_users = cursor.fetchall()
        print(f"\nCurrent admin users:")
        for user_id, user_email, _ in admin_users:
            print(f"  - {user_email} (ID: {user_id})")
        
    except sqlite3.Error as e:
        print(f"✗ Database error: {e}")
    except Exception as e:
        print(f"✗ Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_admin_user()