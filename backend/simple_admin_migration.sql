-- Simple Admin Migration for StatusWise (SQLite)
-- Run this if the Python migration script has issues

-- Add admin columns to users table
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Verify the changes
SELECT sql FROM sqlite_master WHERE type='table' AND name='users';

-- Show current users (optional)
SELECT id, email, is_admin, created_at FROM users;