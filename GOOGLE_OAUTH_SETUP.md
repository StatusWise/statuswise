# Google OAuth Setup Guide

StatusWise uses Google OAuth for secure, password-free authentication. This guide will walk you through setting up Google OAuth for your StatusWise instance.

## 🔧 Prerequisites

- Google account
- StatusWise repository cloned locally
- Basic understanding of environment variables

## 📋 Step-by-Step Setup

### 1. Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create or Select Project**
   - Click the project dropdown at the top
   - Click "New Project" or select an existing project
   - Give your project a name (e.g., "StatusWise OAuth")
   - Click "Create"

### 2. Enable Required APIs

1. **Navigate to APIs & Services**
   - In the Google Cloud Console, go to "APIs & Services" > "Library"
   
2. **Enable Google Identity Services**
   - Search for "Google Identity"
   - Click "Google Identity Toolkit API" or "Google+ API"
   - Click "Enable"

### 3. Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**
   - Navigate to "APIs & Services" > "OAuth consent screen"
   
2. **Choose User Type**
   - Select "External" for public applications
   - Select "Internal" if you're using Google Workspace and want to restrict to your organization
   - Click "Create"

3. **Fill Required Information**
   - **App name**: StatusWise (or your custom name)
   - **User support email**: Your email address
   - **Developer contact email**: Your email address
   - **App domain** (optional): Your domain if you have one
   - **App logo** (optional): Upload a logo if desired
   - Click "Save and Continue"

4. **Scopes** (Next Screen)
   - The default scopes are sufficient for StatusWise
   - Click "Save and Continue"

5. **Test Users** (if External)
   - Add email addresses of users who can test your app
   - **Important**: Include your admin email address here
   - Click "Save and Continue"

### 4. Create OAuth Credentials

1. **Go to Credentials**
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"

2. **Configure OAuth Client**
   - **Application type**: Web application
   - **Name**: StatusWise Web Client
   
3. **Set Authorized Origins**
   For development:
   ```
   http://localhost:3000
   ```
   
   For production:
   ```
   https://yourdomain.com
   ```

4. **Set Authorized Redirect URIs**
   For development:
   ```
   http://localhost:3000/login
   ```
   
   For production:
   ```
   https://yourdomain.com/login
   ```

5. **Create and Download**
   - Click "Create"
   - **Copy the Client ID** (you'll need this)
   - **Copy the Client Secret** (you'll need this)
   - You can also download the JSON file for backup

## 🔐 Configure StatusWise

### 1. Backend Configuration

Edit `backend/.env`:

```bash
# Required: Google OAuth
GOOGLE_CLIENT_ID=your-client-id-from-google-console
GOOGLE_CLIENT_SECRET=your-client-secret-from-google-console

# Admin user (automatically becomes admin on first login)
ADMIN_EMAIL=your-admin-email@example.com

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/statuswise

# Security (generate secure random strings)
SECRET_KEY=your-secure-secret-key-here
JWT_SECRET=your-secure-jwt-secret-here

# Feature toggles
ENABLE_BILLING=false
ENABLE_ADMIN=true
```

### 2. Frontend Configuration

Edit `frontend/.env`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-from-google-console
```

**⚠️ Important**: The `NEXT_PUBLIC_GOOGLE_CLIENT_ID` should be the same as the `GOOGLE_CLIENT_ID` in your backend configuration.

### 3. Admin User Setup

**Important**: Set your `ADMIN_EMAIL` to the email address you want to use as the admin:

- This email address will automatically receive admin privileges when they first sign in
- Make sure this email is added to the "Test Users" list in your OAuth consent screen
- The user with this email can then access the admin dashboard to manage other users

## 🚀 Testing Your Setup

1. **Start StatusWise**
   ```bash
   make dev
   # or
   docker-compose up --build
   ```

2. **Access the Application**
   - Open [http://localhost:3000](http://localhost:3000)
   - You should see a "Sign in with Google" button

3. **Test Admin Authentication**
   - Click "Sign in with Google"
   - Sign in with the Google account matching your `ADMIN_EMAIL`
   - You should be redirected to the dashboard
   - You should see admin-specific options and can access `/admin`

4. **Test Regular User Authentication**
   - Sign out and sign in with a different Google account
   - This user should have regular (non-admin) access

## 🔧 Troubleshooting

### Common Issues

**"Error 400: redirect_uri_mismatch"**
- Check that your redirect URIs in Google Cloud Console exactly match your application URL
- Ensure no trailing slashes or extra characters

**"Error 403: access_blocked"**
- Your OAuth consent screen might need verification for external users
- Add test users in the OAuth consent screen for testing
- Make sure your admin email is in the test users list

**"Invalid Google token"**
- Check that your `GOOGLE_CLIENT_ID` is correctly set in both backend and frontend
- Ensure the client ID matches between your Google Cloud Console and environment files

**"Network error"**
- Verify your backend is running on the correct port (8000)
- Check that `NEXT_PUBLIC_API_URL` points to the correct backend URL

**Admin privileges not working**
- Check that `ENABLE_ADMIN=true` in your backend environment
- Verify that `ADMIN_EMAIL` matches exactly with your Google account email
- Check the backend logs for admin privilege grant messages

### Development vs Production

**Development Setup:**
- Use `http://localhost:3000` for origins and redirects
- You can use "External" user type for testing
- Add all test user emails to the OAuth consent screen

**Production Setup:**
- Use your actual domain (e.g., `https://status.yourdomain.com`)
- Consider using "Internal" if you have Google Workspace
- Ensure HTTPS is enabled for production
- Update `ADMIN_EMAIL` to your production admin email

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Identity Services](https://developers.google.com/identity/gsi/web)
- [OAuth Consent Screen Setup](https://support.google.com/cloud/answer/10311615)

## 🆘 Need Help?

If you encounter issues:

1. Check the browser console for error messages
2. Verify your environment variables are correctly set
3. Ensure your Google Cloud Console configuration matches your StatusWise setup
4. Review the StatusWise logs for authentication errors
5. Check that your admin email is properly configured

For additional support, please open an issue on the StatusWise GitHub repository with:
- Your error message
- Browser console logs
- StatusWise server logs (remove sensitive information) 