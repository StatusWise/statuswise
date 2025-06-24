# Lemon Squeezy Setup Guide for StatusWise

This guide will help you set up Lemon Squeezy integration for StatusWise to enable subscriptions and monetization.

## Prerequisites

1. A Lemon Squeezy account (free to start)
2. StatusWise backend and frontend running
3. Database access for running migrations

## Step 1: Create Lemon Squeezy Account & Store

1. Go to [Lemon Squeezy](https://lemonsqueezy.com) and create an account
2. Create a new store in your dashboard
3. Note your Store ID from the store settings

## Step 2: Create Products & Variants

1. In your Lemon Squeezy dashboard, go to Products
2. Create a new subscription product called "StatusWise Pro"
3. Set up pricing (e.g., $9/month or $90/year)
4. Note the Variant ID from the product settings

## Step 3: Get API Keys

1. Go to Settings > API in your Lemon Squeezy dashboard
2. Create a new API key
3. Copy the API key (starts with `lemon_`)

## Step 4: Configure Environment Variables

Update your backend `.env` file with the following:

```env
# Lemon Squeezy Configuration
LEMONSQUEEZY_API_KEY=your_api_key_here
LEMONSQUEEZY_STORE_ID=your_store_id_here
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here
LEMONSQUEEZY_PRO_VARIANT_ID=your_pro_variant_id_here
FRONTEND_URL=http://localhost:3000
```

## Step 5: Set Up Webhooks

1. In Lemon Squeezy dashboard, go to Settings > Webhooks
2. Create a new webhook endpoint: `https://your-domain.com/webhooks/lemonsqueezy`
3. Select these events:
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_resumed`
   - `subscription_expired`
   - `order_created`
4. Copy the webhook secret and add it to your `.env` file

## Step 6: Run Database Migration

Run the migration script to add subscription fields to your database:

```bash
cd backend
source venv/bin/activate
python migrate_subscription.py
```

## Step 7: Test the Integration

1. Start your backend server:
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn main:app --reload
   ```

2. Start your frontend server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Create a test user account
4. Go to the Dashboard and try creating projects (should be limited to 1 on free tier)
5. Click "Upgrade to Pro" to test the checkout flow
6. Use Lemon Squeezy's test card numbers for testing

## Subscription Tiers

### Free Tier
- 1 project maximum
- 5 incidents per project
- Basic status page
- Email notifications

### Pro Tier ($9/month)
- 10 projects maximum
- 100 incidents per project
- All Free tier features plus:
  - Custom domain support
  - Advanced analytics
  - Webhook notifications

## Testing with Test Mode

Lemon Squeezy automatically provides test mode for development:

- Test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC
- Any billing address

## Production Deployment

1. Update `FRONTEND_URL` in your environment variables to your production domain
2. Update webhook endpoint URL to your production API
3. Test the webhook endpoint is accessible
4. Deploy both backend and frontend
5. Test the complete subscription flow

## Troubleshooting

### Webhook Issues
- Ensure your webhook endpoint is publicly accessible
- Check webhook secret matches your environment variable
- Verify webhook events are being sent from Lemon Squeezy dashboard

### API Issues
- Verify API key is correct and has proper permissions
- Check Store ID and Variant ID are correct
- Ensure requests library is installed: `pip install requests`

### Database Issues
- Run the migration script if subscription fields are missing
- Check database connection and permissions
- Verify PostgreSQL is running and accessible

## Support

For Lemon Squeezy specific issues:
- [Lemon Squeezy Documentation](https://docs.lemonsqueezy.com/)
- [Lemon Squeezy API Reference](https://docs.lemonsqueezy.com/api)

For StatusWise integration issues:
- Check the application logs for error messages
- Verify environment variables are correctly set
- Test API endpoints individually using curl or Postman 