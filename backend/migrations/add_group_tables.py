"""
Database migration to add group management tables.

This migration adds the following tables:
- groups: Store group information
- group_members: Store group membership information
- group_invitations: Store group invitations
- Updates projects table to include group_id

Run with: python migrations/add_group_tables.py
"""

import datetime
import os
import sys

from sqlalchemy import text

# Add the parent directory to sys.path to import our modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine


def run_migration():
    """Execute the migration to add group tables."""
    db = SessionLocal()

    try:
        # Create groups table
        groups_sql = """
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY,
            name VARCHAR NOT NULL,
            description TEXT,
            owner_id INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES users (id)
        );
        """

        # Create group_members table
        group_members_sql = """
        CREATE TABLE IF NOT EXISTS group_members (
            id INTEGER PRIMARY KEY,
            group_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role VARCHAR NOT NULL DEFAULT 'member',
            is_active BOOLEAN DEFAULT TRUE,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES groups (id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(group_id, user_id)
        );
        """

        # Create group_invitations table
        group_invitations_sql = """
        CREATE TABLE IF NOT EXISTS group_invitations (
            id INTEGER PRIMARY KEY,
            group_id INTEGER NOT NULL,
            invited_user_id INTEGER,
            invited_email VARCHAR,
            invited_by_id INTEGER NOT NULL,
            role VARCHAR NOT NULL DEFAULT 'member',
            status VARCHAR NOT NULL DEFAULT 'pending',
            message TEXT,
            invitation_token VARCHAR UNIQUE,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            responded_at DATETIME,
            FOREIGN KEY (group_id) REFERENCES groups (id),
            FOREIGN KEY (invited_user_id) REFERENCES users (id),
            FOREIGN KEY (invited_by_id) REFERENCES users (id)
        );
        """

        # Add group_id column to projects table
        add_group_id_sql = """
        ALTER TABLE projects ADD COLUMN group_id INTEGER REFERENCES groups(id);
        """

        # Create indexes for better performance
        indexes_sql = [
            "CREATE INDEX IF NOT EXISTS idx_groups_owner_id ON groups(owner_id);",
            "CREATE INDEX IF NOT EXISTS idx_groups_is_active ON groups(is_active);",
            "CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);",
            "CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);",
            "CREATE INDEX IF NOT EXISTS idx_group_members_is_active ON group_members(is_active);",
            "CREATE INDEX IF NOT EXISTS idx_group_invitations_group_id ON group_invitations(group_id);",
            "CREATE INDEX IF NOT EXISTS idx_group_invitations_invited_user_id ON group_invitations(invited_user_id);",
            "CREATE INDEX IF NOT EXISTS idx_group_invitations_invited_email ON group_invitations(invited_email);",
            "CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON group_invitations(status);",
            "CREATE INDEX IF NOT EXISTS idx_group_invitations_expires_at ON group_invitations(expires_at);",
            "CREATE INDEX IF NOT EXISTS idx_projects_group_id ON projects(group_id);",
        ]

        print("Starting group tables migration...")

        # Execute table creation
        print("Creating groups table...")
        db.execute(text(groups_sql))

        print("Creating group_members table...")
        db.execute(text(group_members_sql))

        print("Creating group_invitations table...")
        db.execute(text(group_invitations_sql))

        # Check if group_id column already exists in projects table
        try:
            print("Adding group_id column to projects table...")
            db.execute(text(add_group_id_sql))
        except Exception as e:
            if (
                "duplicate column name" in str(e).lower()
                or "already exists" in str(e).lower()
            ):
                print("group_id column already exists in projects table, skipping...")
            else:
                raise e

        # Create indexes
        print("Creating indexes...")
        for index_sql in indexes_sql:
            try:
                db.execute(text(index_sql))
            except Exception as e:
                print(f"Index creation warning: {e}")
                continue

        db.commit()
        print("✅ Group tables migration completed successfully!")

        # Print summary
        print("\nMigration Summary:")
        print("- Added 'groups' table for group information")
        print("- Added 'group_members' table for membership management")
        print("- Added 'group_invitations' table for invitation handling")
        print("- Added 'group_id' column to projects table")
        print("- Created performance indexes")
        print("\nNext steps:")
        print("1. Restart your application to use the new models")
        print("2. Test group creation and invitation functionality")
        print("3. Consider running the test suite to verify functionality")

    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {str(e)}")
        raise e
    finally:
        db.close()


def rollback_migration():
    """Rollback the migration (drop group tables)."""
    db = SessionLocal()

    try:
        rollback_sql = [
            "DROP INDEX IF EXISTS idx_projects_group_id;",
            "DROP INDEX IF EXISTS idx_group_invitations_expires_at;",
            "DROP INDEX IF EXISTS idx_group_invitations_status;",
            "DROP INDEX IF EXISTS idx_group_invitations_invited_email;",
            "DROP INDEX IF EXISTS idx_group_invitations_invited_user_id;",
            "DROP INDEX IF EXISTS idx_group_invitations_group_id;",
            "DROP INDEX IF EXISTS idx_group_members_is_active;",
            "DROP INDEX IF EXISTS idx_group_members_role;",
            "DROP INDEX IF EXISTS idx_group_members_user_id;",
            "DROP INDEX IF EXISTS idx_group_members_group_id;",
            "DROP INDEX IF EXISTS idx_groups_is_active;",
            "DROP INDEX IF EXISTS idx_groups_owner_id;",
            "ALTER TABLE projects DROP COLUMN group_id;",
            "DROP TABLE IF EXISTS group_invitations;",
            "DROP TABLE IF EXISTS group_members;",
            "DROP TABLE IF EXISTS groups;",
        ]

        print("Starting migration rollback...")

        for sql in rollback_sql:
            try:
                db.execute(text(sql))
            except Exception as e:
                print(f"Rollback warning: {e}")
                continue

        db.commit()
        print("✅ Migration rollback completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Rollback failed: {str(e)}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Group tables migration")
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Rollback the migration (drop group tables)",
    )

    args = parser.parse_args()

    if args.rollback:
        rollback_migration()
    else:
        run_migration()
