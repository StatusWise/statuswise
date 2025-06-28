# Feature Toggles

StatusWise supports feature toggles that allow you to enable or disable billing and admin functionality based on your deployment needs.

## Environment Variables

Configure these environment variables in your backend `.env` file:

```bash
# Feature Toggles (default: false for secure-by-default)
ENABLE_BILLING=false
ENABLE_ADMIN=false
```

## Features Controlled by Toggles

### Billing Toggle (`ENABLE_BILLING`)

When **enabled** (`ENABLE_BILLING=true`):
- ✅ Subscription management endpoints
- ✅ Lemon Squeezy webhook processing  
- ✅ Project limits based on subscription tier
- ✅ Subscription status display in frontend
- ✅ Upgrade/billing UI components

When **disabled** (`ENABLE_BILLING=false`):
- ❌ All billing endpoints return 503 Service Unavailable
- ❌ Subscription limits are removed (unlimited projects)
- ❌ Frontend hides all billing-related UI
- ❌ Users get "unlimited" tier with all features

### Admin Toggle (`ENABLE_ADMIN`)

When **enabled** (`ENABLE_ADMIN=true`):
- ✅ Admin dashboard endpoints
- ✅ User management functionality
- ✅ System statistics and monitoring
- ✅ Admin navigation in frontend

When **disabled** (`ENABLE_ADMIN=false`):
- ❌ All admin endpoints return 503 Service Unavailable
- ❌ Admin UI components are hidden
- ❌ Admin checks always return false

## Configuration API

The frontend automatically fetches configuration from the backend on startup via:

```
GET /config
```

Response:
```json
{
  "billing_enabled": false,
  "features": {
    "subscription_management": false,
    "billing_webhooks": false,
    "subscription_limits": false
  }
}
```

## Usage Examples

### Personal/Internal Use (No Billing)
```bash
ENABLE_BILLING=false
ENABLE_ADMIN=true
```
- No subscription limits
- Admin functionality for user management
- No payment processing

### SaaS Deployment (Full Features)
```bash
ENABLE_BILLING=true
ENABLE_ADMIN=true
# Lemon Squeezy configuration required
LEMONSQUEEZY_API_KEY=your_key_here
LEMONSQUEEZY_PRO_VARIANT_ID=your_variant_here
```

### Simple Status Page (Minimal)
```bash
ENABLE_BILLING=false
ENABLE_ADMIN=false
```
- Core incident management only
- No user management
- No billing restrictions

## Implementation Details

### Backend
- Feature toggles are checked via the `config.py` module
- Endpoints are conditionally registered at startup
- Disabled endpoints return HTTP 503 with descriptive messages

### Frontend
- Configuration is loaded via React Context from `/config` endpoint
- UI components are conditionally rendered
- Graceful fallbacks when features are disabled

### Security
- Features default to **disabled** for secure-by-default behavior
- Configuration validation prevents invalid states
- Billing requires valid Lemon Squeezy credentials when enabled

## Troubleshooting

### Frontend Shows Loading Screen
- Check that backend is running and accessible
- Verify `/config` endpoint returns valid JSON
- Check browser console for errors

### Features Not Working Despite Being Enabled
- Restart backend after changing environment variables
- Check backend logs for configuration warnings
- Verify all required environment variables are set

### Billing Enabled But Not Working
- Ensure `LEMONSQUEEZY_API_KEY` is set and valid
- Check `LEMONSQUEEZY_PRO_VARIANT_ID` is configured
- Review webhook configuration in Lemon Squeezy dashboard 

## Testing

### Test Cases
1. **Billing Enabled, Admin Disabled**: Verify that billing endpoints are accessible and admin endpoints are not.
2. **Billing Disabled, Admin Enabled**: Verify that billing endpoints are not accessible and admin endpoints are.
3. **Billing Disabled, Admin Disabled**: Verify that neither billing nor admin endpoints are accessible.
4. **Billing Enabled, Admin Enabled**: Verify that both billing and admin endpoints are accessible.

### Test Steps
1. **Set Feature Toggles**: Use the environment variables to control the feature toggles.
2. **Send Requests**: Use tools like `curl` or Postman to send requests to the backend.
3. **Verify Responses**: Check the responses to ensure they match the expected outcomes.
4. **Document Results**: Record the results of each test case.

### Expected Outcomes
1. **Billing Enabled, Admin Disabled**: Billing endpoints should return 200 OK, admin endpoints should return 503 Service Unavailable.
2. **Billing Disabled, Admin Enabled**: Billing endpoints should return 503 Service Unavailable, admin endpoints should return 200 OK.
3. **Billing Disabled, Admin Disabled**: Both billing and admin endpoints should return 503 Service Unavailable.
4. **Billing Enabled, Admin Enabled**: Both billing and admin endpoints should return 200 OK.

### Post-Test Actions
1. **Rollback Feature Toggles**: Reset the feature toggles to their original state.
2. **Verify Rollback**: Ensure that the feature toggles have been reset correctly.
3. **Document Post-Test Actions**: Record any actions taken after the test.

### Documentation
- **Test Case Documentation**: Provide a detailed description of each test case.
- **Test Results**: Record the results of each test case.
- **Post-Test Actions**: Document any actions taken after the test.

### Example Test Case
```bash
# Test Case: Billing Enabled
ENABLE_BILLING=true

# Test Steps
curl -X GET http://localhost:8000/api/config

# Expected Outcome
# The response should include "billing_enabled": true

# Post-Test Action
ENABLE_BILLING=false
ENABLE_ADMIN=false

# Verify Rollback
curl -X GET http://localhost:8000/api/config

# Expected Outcome
# The response should include "billing_enabled": false
``` 