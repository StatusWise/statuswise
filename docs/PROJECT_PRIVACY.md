# Project Privacy Controls

StatusWise supports public and private status pages for projects, giving you control over who can access your incident reports.

## Public vs Private Projects

### Public Projects (Default)
- **Accessible to anyone** with the status page URL
- No authentication required to view incidents
- Perfect for external customer-facing status pages
- URL format: `https://yourdomain.com/status/{project_id}`

### Private Projects
- **Hidden from public access**
- Attempting to access returns a "Status Page Not Available" message
- Suitable for internal projects or sensitive incident tracking
- Only project owners can view incidents through the authenticated dashboard

## Managing Project Privacy

### Setting Privacy During Project Creation

When creating a new project in the dashboard:

1. Enter your project name
2. Check or uncheck "Public status page" 
3. Click "Create"

**Default**: New projects are private by default for security.

### Changing Privacy for Existing Projects

In your dashboard project list:

1. Find the project you want to modify
2. Look for the privacy status badge (Public/Private)
3. Click the "Make Private" or "Make Public" button
4. The change takes effect immediately

### Visual Indicators

- **Green badge**: Public project with link to public status page
- **Yellow badge**: Private project (no public access)

## Use Cases

### Public Projects
- Customer-facing service status pages
- Open-source project incident tracking  
- Community service status updates
- External SLA monitoring

### Private Projects
- Internal infrastructure monitoring
- Pre-launch service testing
- Sensitive customer incidents
- Development environment tracking

## Technical Details

### API Changes

New endpoint for updating project privacy:
```
PATCH /projects/{project_id}
{
  "is_public": true|false
}
```

### Database Schema

Projects table now includes:
- `is_public` (Boolean, default: true)

### Database Schema

The projects table includes:
- `is_public` (Boolean, default: false) - Private by default for security

For development, reset the database to pick up schema changes:
```bash
make db-reset
```

## Security Considerations

- Private projects return HTTP 404 when accessed publicly (same as non-existent projects)
- No information is leaked about private project existence
- Project owners retain full access through authenticated dashboard
- Privacy changes are logged for audit purposes

## Best Practices

1. **Start Public**: Begin with public projects for transparency
2. **Review Regularly**: Periodically review which projects should be private
3. **Document Access**: Inform team members about private project access
4. **Monitor Usage**: Use public links to verify public projects are accessible

## Troubleshooting

### "Status Page Not Available" Error
- Verify the project exists and you have the correct URL
- Check if the project owner has set it to private
- Contact the project owner for access to private status pages

### Privacy Toggle Not Working
- Ensure you're logged in and own the project
- Check browser console for authentication errors
- Verify your subscription supports project management features 