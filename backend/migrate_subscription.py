#!/usr/bin/env python3
"""
Migration script to add subscription fields to existing users.
Run this after updating the models to add Lemon Squeezy integration.
"""

import os
import sys

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()


def run_migration():
    """Run the subscription migration"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL not found in environment variables")
        sys.exit(1)

    engine = create_engine(database_url)
    # SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    try:
        with engine.connect() as connection:
            # Check if columns already exist
            result = connection.execute(
                text(
                    """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name IN (
                    'lemonsqueezy_customer_id',
                    'subscription_tier',
                    'subscription_status',
                    'subscription_expires_at'
                )
            """
                )
            )

            existing_columns = [row[0] for row in result]

            if len(existing_columns) == 4:
                print("Migration already completed - all subscription columns exist")
                return

            print("Adding subscription fields to users table...")

            # Add new columns if they don't exist
            if "lemonsqueezy_customer_id" not in existing_columns:
                connection.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN "
                        "lemonsqueezy_customer_id VARCHAR UNIQUE"
                    )
                )
                print("✓ Added lemonsqueezy_customer_id column")

            if "subscription_tier" not in existing_columns:
                connection.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN "
                        "subscription_tier VARCHAR DEFAULT 'free'"
                    )
                )
                print("✓ Added subscription_tier column")

            if "subscription_status" not in existing_columns:
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN subscription_status VARCHAR")
                )
                print("✓ Added subscription_status column")

            if "subscription_expires_at" not in existing_columns:
                connection.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN "
                        "subscription_expires_at TIMESTAMP"
                    )
                )
                print("✓ Added subscription_expires_at column")

            # Update existing users to have 'free' tier
            connection.execute(
                text(
                    "UPDATE users SET subscription_tier = 'free' "
                    "WHERE subscription_tier IS NULL"
                )
            )
            print("✓ Set all existing users to free tier")

            # Create subscriptions table if it doesn't exist
            connection.execute(
                text(
                    """
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE REFERENCES users(id),
                    lemonsqueezy_subscription_id VARCHAR UNIQUE NOT NULL,
                    lemonsqueezy_customer_id VARCHAR NOT NULL,
                    lemonsqueezy_variant_id VARCHAR NOT NULL,
                    lemonsqueezy_order_id VARCHAR,
                    tier VARCHAR NOT NULL,
                    status VARCHAR NOT NULL,
                    trial_ends_at TIMESTAMP,
                    billing_anchor TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
                )
            )
            print("✓ Created subscriptions table")

            connection.commit()
            print("\n🎉 Migration completed successfully!")
            print(
                "Users now have subscription fields and are set to "
                "'free' tier by default."
            )

    except Exception as e:
        print(f"Error running migration: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    run_migration()
