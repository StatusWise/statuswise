# PostgreSQL Admin Setup for StatusWise

## Option 1: Direct PostgreSQL Commands (Easiest)

1. **Connect to your PostgreSQL database:**
```bash
# If you have psql and know your connection details:
psql -h localhost -U your_username -d statuswise

# Or if you have your DATABASE_URL:
psql $DATABASE_URL
```

2. **Add the admin columns:**
```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

3. **Make an existing user admin:**
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'your-email@domain.com';
```

4. **Verify it worked:**
```sql
SELECT id, email, is_admin FROM users WHERE is_admin = TRUE;
```

## Option 2: Python Migration Script

```bash
cd backend
source venv/bin/activate  # or however you activate your virtual environment
python postgres_admin_migration.py
```

## Option 3: If Columns Already Exist

If you've already added the columns, just make a user admin:

```sql
UPDATE users SET is_admin = TRUE WHERE email = 'your-email@domain.com';
SELECT email FROM users WHERE is_admin = TRUE;
```

## Option 4: Check Your Current Database

See what's in your users table:

```sql
\d users;  -- Show table structure
SELECT id, email, is_admin FROM users LIMIT 5;
```

## After Setup

1. **Restart your backend server:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. **Login with your admin account** in the frontend

3. **Look for the purple "Admin Dashboard" button** in your regular dashboard

## Troubleshooting

**If you can't connect to PostgreSQL:**
- Check your DATABASE_URL environment variable
- Make sure PostgreSQL is running
- Verify your connection credentials

**If columns already exist:**
- That's fine! You'll get an error like "column already exists" which you can ignore
- Just focus on making a user admin

**If the Admin Dashboard button doesn't appear:**
- Check if the user is marked as admin: `SELECT email, is_admin FROM users WHERE email = 'your-email@domain.com';`
- Make sure you restarted the backend server
- Check browser console for JavaScript errors

## Environment Variables

Make sure you have your DATABASE_URL set:
```bash
export DATABASE_URL="postgresql://username:password@localhost/statuswise"
```

Or in your `.env` file:
```
DATABASE_URL=postgresql://username:password@localhost/statuswise
```