# Admin Dashboard

The StatusWise Admin Dashboard provides comprehensive administrative controls for managing users, subscriptions, projects, and incidents across the entire platform.

## Features

### 🔍 System Overview
- **Real-time Statistics**: User counts, subscription metrics, project and incident totals
- **Health Monitoring**: User activation rates, conversion rates, incident resolution rates
- **Performance Metrics**: System-wide KPIs and trends

### 👥 User Management
- **User Listing**: View all users with pagination support
- **User Details**: Email, subscription tier, status, creation date, admin flags
- **User Actions**: 
  - Activate/Deactivate users
  - Grant/Revoke admin privileges
  - View user subscription history

### 💳 Subscription Management  
- **Billing Overview**: All active subscriptions and billing details
- **LemonSqueezy Integration**: Customer IDs, subscription IDs, billing cycles
- **Status Tracking**: Active, trial, cancelled, expired subscriptions
- **Revenue Insights**: Subscription tiers and billing information

### 📁 Project Management
- **Project Overview**: All projects across all users
- **Owner Information**: Project owners and contact details
- **Incident Metrics**: Total and unresolved incident counts per project
- **Health Status**: Project health indicators

### 🚨 Incident Management
- **Global Incident View**: All incidents across all projects
- **Filtering Options**: Filter by resolution status
- **Timeline Tracking**: Creation dates and resolution times
- **Status Monitoring**: Open vs resolved incident tracking

## Setup & Installation

### 1. Database Migration

Run the migration script to add admin functionality to existing installations:

```bash
cd backend
python add_admin_migration.py
```

This will:
- Add `is_admin`, `created_at`, and `updated_at` columns to the users table
- Optionally create an initial admin user

### 2. Admin User Creation

During migration, you can create an admin user or promote an existing user:

```bash
# During migration
Would you like to create an admin user? (y/n): y
Enter admin email: admin@yourdomain.com
Enter admin password: [secure_password]
```

### 3. Backend Restart

After migration, restart your backend server:

```bash
# Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Access & Navigation

### Accessing the Admin Dashboard

1. **Login** as an admin user
2. **Navigate** to your regular dashboard
3. **Click** the "Admin Dashboard" button (only visible to admin users)
4. **Alternative**: Direct access via `/admin` URL

### Dashboard Navigation

The admin dashboard features a tabbed interface:

- **Overview**: System statistics and health metrics
- **Users**: User management and administration
- **Subscriptions**: Billing and subscription management  
- **Projects**: Project oversight and monitoring
- **Incidents**: Incident tracking and resolution

## API Endpoints

### Admin Statistics
```http
GET /admin/stats
Authorization: Bearer {admin_token}
```

### User Management
```http
GET /admin/users?skip=0&limit=100
GET /admin/users/{user_id}
PATCH /admin/users/{user_id}
Authorization: Bearer {admin_token}
```

### Subscription Management  
```http
GET /admin/subscriptions?skip=0&limit=100
Authorization: Bearer {admin_token}
```

### Project Management
```http
GET /admin/projects?skip=0&limit=100
Authorization: Bearer {admin_token}
```

### Incident Management
```http
GET /admin/incidents?skip=0&limit=100&resolved={true|false}
Authorization: Bearer {admin_token}
```

## Security Features

### Access Control
- **Admin-only Access**: All admin endpoints require admin privileges
- **JWT Authentication**: Secure token-based authentication
- **Self-protection**: Admins cannot remove their own admin privileges

### Authorization
- **Role-based Access**: Admin role required for all admin operations
- **Request Validation**: All admin requests are validated and authorized
- **Audit Trail**: Admin actions are logged (can be extended)

## User Interface

### Design Features
- **Modern UI**: Clean, responsive design using Tailwind CSS
- **Real-time Updates**: Dynamic data loading and refresh capabilities
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices
- **Intuitive Navigation**: Tab-based navigation with clear sections

### User Experience
- **Quick Actions**: One-click user activation/deactivation and admin privileges
- **Data Tables**: Sortable, paginated data tables for large datasets
- **Status Indicators**: Color-coded status badges and health indicators
- **Error Handling**: Comprehensive error messages and user feedback

## Troubleshooting

### Common Issues

**Admin button not showing**
- Ensure user has `is_admin = true` in the database
- Check that migration was completed successfully
- Verify JWT token is valid and user is properly authenticated

**403 Forbidden errors**
- Confirm user has admin privileges
- Check that `require_admin_access` is working correctly
- Verify database migration added admin column

**Data not loading**
- Check backend server is running and accessible
- Verify API endpoints are responding
- Check browser console for JavaScript errors

### Database Verification

Verify admin setup in database:
```sql
-- Check admin users
SELECT id, email, is_admin, created_at FROM users WHERE is_admin = true;

-- Check user table structure
DESCRIBE users;
```

## Best Practices

### Security
- **Strong Passwords**: Use strong passwords for admin accounts
- **Limited Admin Users**: Only grant admin privileges when necessary
- **Regular Audits**: Periodically review admin user list
- **Environment Variables**: Keep sensitive configuration in environment variables

### Monitoring
- **Regular Checks**: Monitor system health through the overview dashboard
- **User Activity**: Track user registration and activation trends
- **Incident Response**: Monitor unresolved incidents and response times
- **Subscription Health**: Track conversion rates and subscription status

### Maintenance
- **Database Backups**: Regular backups before making admin changes
- **Log Monitoring**: Monitor application logs for admin activities
- **Performance**: Monitor admin dashboard performance with large datasets
- **Updates**: Keep admin interface updated with latest security patches

## Future Enhancements

### Planned Features
- **Advanced Analytics**: Detailed charts and graphs
- **Export Functionality**: CSV/PDF exports of admin data  
- **Bulk Operations**: Bulk user management operations
- **Audit Logging**: Comprehensive admin action logging
- **Email Notifications**: Admin alerts and notifications
- **Advanced Filtering**: More sophisticated data filtering options

### Integration Opportunities
- **External Analytics**: Google Analytics, Mixpanel integration
- **Monitoring Tools**: Integration with monitoring services
- **Communication**: Slack/Discord admin notifications
- **Backup Systems**: Automated backup integrations