#!/usr/bin/env python3
"""
Simple and direct admin setup for StatusWise.
This script manually handles the database setup without complex migration logic.
"""

import os
import sqlite3
import getpass
import sys

def setup_admin():
    """Set up admin functionality in the most direct way possible."""
    print("StatusWise Admin Setup")
    print("=" * 25)
    
    # Find database file
    db_files = ["statuswise.db", "./statuswise.db", "../statuswise.db"]
    db_path = None
    
    for path in db_files:
        if os.path.exists(path):
            db_path = path
            break
    
    if not db_path:
        print("❌ Database file not found. Please run the backend server first to create the database.")
        print("Run: uvicorn main:app --reload")
        return False
    
    print(f"✅ Found database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("❌ Users table not found. Please run the backend server first.")
            return False
        
        print("✅ Users table found")
        
        # Check current table structure
        cursor.execute("PRAGMA table_info(users)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}
        print(f"Current columns: {list(columns.keys())}")
        
        # Add missing columns one by one
        changes_made = []
        
        if 'is_admin' not in columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0")
                changes_made.append("is_admin")
                print("✅ Added is_admin column")
            except sqlite3.Error as e:
                print(f"⚠️  Could not add is_admin column: {e}")
        
        if 'created_at' not in columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                changes_made.append("created_at")
                print("✅ Added created_at column")
            except sqlite3.Error as e:
                print(f"⚠️  Could not add created_at column: {e}")
        
        if 'updated_at' not in columns:
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                changes_made.append("updated_at")
                print("✅ Added updated_at column")
            except sqlite3.Error as e:
                print(f"⚠️  Could not add updated_at column: {e}")
        
        if changes_made:
            conn.commit()
            print(f"✅ Database updated with columns: {', '.join(changes_made)}")
        else:
            print("✅ All required columns already exist")
        
        # Create admin user
        create_admin = input("\nCreate an admin user? (y/n): ").lower().strip()
        if create_admin == 'y':
            email = input("Admin email: ").strip()
            if not email:
                print("❌ Email required")
                return False
            
            # Check if user exists
            cursor.execute("SELECT id, is_admin FROM users WHERE email = ?", (email,))
            existing = cursor.fetchone()
            
            if existing:
                user_id, is_admin = existing
                if is_admin:
                    print(f"✅ {email} is already an admin")
                else:
                    cursor.execute("UPDATE users SET is_admin = 1 WHERE id = ?", (user_id,))
                    conn.commit()
                    print(f"✅ Made {email} an admin")
            else:
                password = getpass.getpass("Admin password: ")
                if not password:
                    print("❌ Password required")
                    return False
                
                # Try to use proper password hashing
                try:
                    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
                    from auth import get_password_hash
                    hashed = get_password_hash(password)
                except ImportError:
                    print("⚠️  Cannot import auth module. Using simple hash.")
                    print("   You may need to reset the password later.")
                    import hashlib
                    hashed = hashlib.sha256(password.encode()).hexdigest()
                
                cursor.execute("""
                    INSERT INTO users (email, hashed_password, is_active, is_admin, created_at, updated_at)
                    VALUES (?, ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (email, hashed))
                conn.commit()
                print(f"✅ Created admin user: {email}")
        
        # Show admin users
        cursor.execute("SELECT email FROM users WHERE is_admin = 1")
        admins = [row[0] for row in cursor.fetchall()]
        if admins:
            print(f"\n🔑 Admin users: {', '.join(admins)}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = setup_admin()
    if success:
        print("\n🎉 Setup complete!")
        print("Next steps:")
        print("1. Restart your backend server")
        print("2. Login with your admin account")
        print("3. Look for 'Admin Dashboard' button")
    else:
        print("\n❌ Setup failed. Try the manual steps below.")