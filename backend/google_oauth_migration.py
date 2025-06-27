"""
Migration script to transition from password-based authentication to Google OAuth.

This script handles the database schema changes needed for Google OAuth:
1. Removes hashed_password column
2. Adds google_id, name, and avatar_url columns
3. Handles existing user data gracefully

Run this script after updating the models.py file but before starting the app.
"""

import os
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError


def get_database_url():
    """Get database URL from environment variables"""
    return os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/statuswise"
    )


def migrate_to_google_oauth():
    """Migrate database schema from password auth to Google OAuth"""
    engine = create_engine(get_database_url())

    print("🔄 Starting Google OAuth migration...")

    try:
        with engine.connect() as connection:
            # Check if users table exists
            result = connection.execute(
                text(
                    """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'users'
                );
            """
                )
            )

            table_exists = result.fetchone()
            if not table_exists or not table_exists[0]:
                print("✅ Users table doesn't exist yet. Migration not needed.")
                return

            # Check if hashed_password column exists
            result = connection.execute(
                text(
                    """
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'hashed_password'
                );
            """
                )
            )

            password_column_result = result.fetchone()
            has_hashed_password = password_column_result and password_column_result[0]

            if not has_hashed_password:
                print(
                    "✅ Migration already completed. No hashed_password column found."
                )
                return

            print("🗄️  Found existing users table with password authentication.")

            # Check if there are existing users
            result = connection.execute(text("SELECT COUNT(*) FROM users;"))
            count_result = result.fetchone()
            user_count = count_result[0] if count_result else 0

            if user_count > 0:
                print(f"⚠️  Found {user_count} existing users.")
                print(
                    "📝 Note: Existing users will need to sign in with Google using the same email address."
                )
                print(
                    "   Their accounts will be automatically linked when they first sign in with Google."
                )

            # Start transaction for schema changes
            trans = connection.begin()

            try:
                # Add new Google OAuth columns
                print("➕ Adding Google OAuth columns...")

                connection.execute(
                    text(
                        """
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS name VARCHAR,
                    ADD COLUMN IF NOT EXISTS google_id VARCHAR,
                    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR;
                """
                    )
                )

                # Create unique index on google_id (allowing nulls)
                connection.execute(
                    text(
                        """
                    CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_key 
                    ON users (google_id) 
                    WHERE google_id IS NOT NULL;
                """
                    )
                )

                # Remove hashed_password column
                print("🗑️  Removing hashed_password column...")
                connection.execute(
                    text(
                        """
                    ALTER TABLE users DROP COLUMN IF EXISTS hashed_password;
                """
                    )
                )

                # Commit the transaction
                trans.commit()
                print("✅ Database schema migration completed successfully!")

                if user_count > 0:
                    print("\n📋 Migration Summary:")
                    print(f"   • {user_count} existing users preserved")
                    print(
                        "   • Users can sign in with Google using their existing email"
                    )
                    print(
                        "   • Accounts will be automatically linked on first Google sign-in"
                    )
                    print("\n🚨 Important: Update your environment variables:")
                    print("   • Set GOOGLE_CLIENT_ID")
                    print("   • Set GOOGLE_CLIENT_SECRET")

            except Exception as e:
                trans.rollback()
                raise e

    except OperationalError as e:
        if "does not exist" in str(e):
            print("✅ Database/table doesn't exist yet. Migration not needed.")
        else:
            raise e


def verify_migration():
    """Verify that the migration completed successfully"""
    engine = create_engine(get_database_url())

    try:
        with engine.connect() as connection:
            # Check new columns exist
            result = connection.execute(
                text(
                    """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('name', 'google_id', 'avatar_url');
            """
                )
            )

            new_columns = [row[0] for row in result.fetchall()]
            expected_columns = {"name", "google_id", "avatar_url"}

            if set(new_columns) == expected_columns:
                print("✅ Migration verification passed!")
                return True
            else:
                missing = expected_columns - set(new_columns)
                print(f"❌ Migration verification failed! Missing columns: {missing}")
                return False

    except Exception as e:
        print(f"❌ Migration verification failed: {e}")
        return False


if __name__ == "__main__":
    try:
        migrate_to_google_oauth()
        if verify_migration():
            print("\n🎉 Google OAuth migration completed successfully!")
            print(
                "You can now start your application with Google OAuth authentication."
            )
        else:
            print(
                "\n❌ Migration verification failed. Please check the database manually."
            )
            sys.exit(1)

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print("\nPlease check:")
        print("1. Database connection settings")
        print("2. Database permissions")
        print("3. PostgreSQL is running")
        sys.exit(1)
