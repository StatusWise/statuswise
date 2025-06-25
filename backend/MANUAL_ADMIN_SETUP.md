# Manual Admin Setup Guide

If the migration scripts are giving you trouble, here are simple manual steps:

## Option 1: Direct Database Commands (Easiest)

1. **Add admin columns to your database:**
```bash
cd backend
sqlite3 statuswise.db
```

2. **Run these SQL commands one by one:**
```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

3. **Make an existing user admin:**
```sql
UPDATE users SET is_admin = 1 WHERE email = 'your-email@domain.com';
```

4. **Verify it worked:**
```sql
SELECT id, email, is_admin FROM users WHERE is_admin = 1;
```

5. **Exit sqlite:**
```sql
.quit
```

## Option 2: Simple Python Setup (No Dependencies)

Run this simple script:

```bash
python setup_admin.py
```

## Option 3: Manual Steps if Columns Already Exist

If you've already added the columns, just make a user admin:

```bash
cd backend
sqlite3 statuswise.db
```

```sql
UPDATE users SET is_admin = 1 WHERE email = 'your-email@domain.com';
SELECT email FROM users WHERE is_admin = 1;
.quit
```

## Option 4: Quick Check Your Database

See what's in your users table:

```bash
cd backend
sqlite3 statuswise.db
```

```sql
.schema users
SELECT * FROM users LIMIT 3;
.quit
```

## After Setup

1. **Restart your backend server:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. **Login with your admin account** in the frontend

3. **Look for the purple "Admin Dashboard" button** in your regular dashboard

## Troubleshooting

**If the Admin Dashboard button doesn't appear:**
- Check if the user is marked as admin: `SELECT email, is_admin FROM users WHERE email = 'your-email@domain.com';`
- Make sure you restarted the backend server
- Check browser console for any JavaScript errors

**If you get 403 errors:**
- Verify the backend has the new admin endpoints
- Check that your token is valid (try logging out and back in)

**If columns already exist error:**
- That's fine! It means the migration worked partially
- Just focus on making a user admin: `UPDATE users SET is_admin = 1 WHERE email = 'your-email@domain.com';`