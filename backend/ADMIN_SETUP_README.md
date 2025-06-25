# Admin Setup Files

This directory contains the files needed to set up admin functionality for StatusWise.

## 📁 Current Files

### Migration Script
- **`postgres_admin_migration.py`** - PostgreSQL migration script to add admin functionality
  - Adds `is_admin`, `created_at`, `updated_at` columns to users table
  - Creates admin users
  - Handles existing installations

### Documentation
- **`POSTGRES_ADMIN_SETUP.md`** - PostgreSQL-specific setup instructions
- **`../docs/ADMIN_DASHBOARD.md`** - Complete admin dashboard documentation

## 🚀 Quick Setup

```bash
cd backend
source venv/bin/activate
python postgres_admin_migration.py
```

Then restart your backend server and login as an admin user to see the "Admin Dashboard" button.

## 🧹 Cleanup Notes

The following files were removed after successful PostgreSQL migration:
- `add_admin_migration.py` - Original universal migration script
- `simple_admin_migration.sql` - SQLite-specific SQL migration  
- `create_admin_user.py` - SQLite-specific user creation script
- `setup_admin.py` - SQLite-specific setup script
- `MANUAL_ADMIN_SETUP.md` - Manual setup guide (SQLite-focused)

## 📋 Admin Features

- ✅ System overview with real-time statistics
- ✅ User management (activate/deactivate, admin privileges)
- ✅ Subscription management with LemonSqueezy integration
- ✅ Project oversight across all users
- ✅ Global incident monitoring and management