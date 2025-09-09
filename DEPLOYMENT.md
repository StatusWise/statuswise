# StatusWise Deployment Guide

This guide provides multiple deployment options for StatusWise, including easy deployment without cloning the repository.

## Quick Deploy (No Repository Clone Needed)

For the easiest deployment experience, you can use the pre-built Docker images:

### Prerequisites
- Docker and Docker Compose installed
- Google OAuth credentials ([setup guide](GOOGLE_OAUTH_SETUP.md))

### Steps

1. **Download the production compose file**:
   ```bash
   curl -O https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/statuswise/main/docker-compose.yml
   curl -O https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/statuswise/main/env.prod.example
   ```

2. **Configure environment**:
   ```bash
   cp env.prod.example .env
   # Edit .env with your actual values (see configuration section below)
   ```

3. **Deploy**:
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Database: localhost:5432

## Configuration

### Required Configuration

Update these values in your `.env` file:

```bash
# Generate strong random strings for these
SECRET_KEY=your-super-secret-key-change-this
JWT_SECRET=your-jwt-secret-change-this

# From Google OAuth Console
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Your admin email
ADMIN_EMAIL=admin@yourdomain.com
```

### Optional Configuration

```bash
# Feature toggles
ENABLE_BILLING=false  # Set to true to enable Lemon Squeezy billing
ENABLE_ADMIN=true     # Admin dashboard access

# Port customization
BACKEND_PORT=8000
FRONTEND_PORT=3000
DB_PORT=5432

# For production deployments
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Development Deployment

If you want to develop or customize StatusWise:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/statuswise.git
   cd statuswise
   ```

2. **Set up environment files**:
   ```bash
   cp backend/env.example backend/.env
   cp frontend/env.example frontend/.env
   # Edit the files with your configuration
   ```

3. **Build and run**:
   ```bash
   docker-compose up -d
   ```

## Production Deployment

### Using Docker Images (Recommended)

1. Use the `docker-compose.prod.yml` file as shown in the Quick Deploy section
2. Update the image names in the compose file to match your repository
3. Configure proper domain names and SSL certificates
4. Set up proper backup procedures for the database volume

### Building from Source

1. Clone the repository
2. Build the images: `docker-compose build`
3. Deploy: `docker-compose up -d`

## Health Checks

After deployment, verify everything is working:

```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs backend
docker-compose logs frontend

# Test API health
curl http://localhost:8000/health

# Test frontend
curl http://localhost:3000
```

## Updating

To update to the latest version:

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

1. **Services won't start**: Check logs with `docker-compose logs [service-name]`
2. **Database connection errors**: Ensure the database is healthy before other services start
3. **OAuth errors**: Verify your Google OAuth configuration and redirect URLs
4. **Port conflicts**: Change ports in your `.env` file if needed

### Getting Help

- Check the logs: `docker-compose logs`
- Verify environment variables: `docker-compose config`
- Ensure all required environment variables are set

## Reverse Proxy Setup (Production)

For production deployments, you'll want to expose your application securely through a reverse proxy. We recommend Cloudflare Tunnels for the easiest setup, but also provide nginx instructions.

### Cloudflare Tunnels (Recommended)

Cloudflare Tunnels provide secure, encrypted connections without opening ports on your firewall and include automatic SSL certificates.

#### Prerequisites
- Cloudflare account
- Domain pointed to Cloudflare DNS

#### Setup Steps

1. **Install cloudflared**:
   ```bash
   # Linux/macOS
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   
   # Or use package manager
   # Ubuntu/Debian: sudo apt install cloudflared
   # macOS: brew install cloudflared
   # Windows: Download from GitHub releases
   ```

2. **Authenticate with Cloudflare**:
   ```bash
   cloudflared tunnel login
   ```

3. **Create a tunnel**:
   ```bash
   cloudflared tunnel create statuswise
   ```

4. **Create tunnel configuration** (`~/.cloudflared/config.yml`):
   ```yaml
   tunnel: statuswise
   credentials-file: /home/user/.cloudflared/<tunnel-id>.json
   
   ingress:
     # Main application
     - hostname: statuswise.yourdomain.com
       service: http://localhost:3000
     
     # API endpoint
     - hostname: api.statuswise.yourdomain.com
       service: http://localhost:8000
     
     # Catch-all rule (required)
     - service: http_status:404
   ```

5. **Update your environment variables**:
   ```bash
   # In your .env file
   FRONTEND_URL=https://statuswise.yourdomain.com
   NEXT_PUBLIC_API_URL=https://api.statuswise.yourdomain.com
   ```

6. **Create DNS records**:
   ```bash
   cloudflared tunnel route dns statuswise statuswise.yourdomain.com
   cloudflared tunnel route dns statuswise api.statuswise.yourdomain.com
   ```

7. **Run the tunnel**:
   ```bash
   # Test first
   cloudflared tunnel run statuswise
   
   # Install as service (recommended)
   sudo cloudflared service install
   sudo systemctl start cloudflared
   sudo systemctl enable cloudflared
   ```

#### Cloudflare Tunnel Benefits
- ✅ Automatic SSL certificates
- ✅ DDoS protection
- ✅ No open firewall ports needed
- ✅ Built-in analytics
- ✅ Easy domain management
- ✅ Free for personal use

### Nginx (Alternative)

If you prefer traditional reverse proxy setup or need more control:

#### Prerequisites
- Nginx installed
- SSL certificate (Let's Encrypt recommended)

#### Nginx Configuration

1. **Create nginx configuration** (`/etc/nginx/sites-available/statuswise`):
   ```nginx
   # Redirect HTTP to HTTPS
   server {
       listen 80;
       server_name statuswise.yourdomain.com api.statuswise.yourdomain.com;
       return 301 https://$server_name$request_uri;
   }
   
   # Frontend
   server {
       listen 443 ssl http2;
       server_name statuswise.yourdomain.com;
   
       ssl_certificate /path/to/ssl/cert.pem;
       ssl_certificate_key /path/to/ssl/private.key;
       
       # SSL configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
       ssl_prefer_server_ciphers off;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   
   # API Backend
   server {
       listen 443 ssl http2;
       server_name api.statuswise.yourdomain.com;
   
       ssl_certificate /path/to/ssl/cert.pem;
       ssl_certificate_key /path/to/ssl/private.key;
       
       location / {
           proxy_pass http://localhost:8000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           
           # Handle CORS if needed
           add_header Access-Control-Allow-Origin "*" always;
           add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
           add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;
           
           if ($request_method = 'OPTIONS') {
               return 204;
           }
       }
   }
   ```

2. **Enable the site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/statuswise /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **Set up SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d statuswise.yourdomain.com -d api.statuswise.yourdomain.com
   ```

4. **Update environment variables**:
   ```bash
   # In your .env file
   FRONTEND_URL=https://statuswise.yourdomain.com
   NEXT_PUBLIC_API_URL=https://api.statuswise.yourdomain.com
   ```

### Domain Configuration

Regardless of your reverse proxy choice, you'll need:

1. **DNS Records**:
   ```
   Type: A
   Name: statuswise
   Value: your-server-ip
   
   Type: A  
   Name: api.statuswise
   Value: your-server-ip
   ```

2. **Google OAuth Update**:
   - Add your production URLs to Google OAuth console
   - Authorized redirect URIs: `https://statuswise.yourdomain.com/auth/callback`
   - Authorized JavaScript origins: `https://statuswise.yourdomain.com`

### Production Checklist

- [ ] Reverse proxy configured (Cloudflare Tunnel or Nginx)
- [ ] SSL certificates active
- [ ] DNS records pointing to your server
- [ ] Environment variables updated with production URLs
- [ ] Google OAuth configured for production domains
- [ ] Firewall configured (if using nginx)
- [ ] Database backups configured
- [ ] Log rotation configured
- [ ] Monitoring setup (optional)

## Security Notes

- Always use strong, unique values for `SECRET_KEY` and `JWT_SECRET`
- In production, use HTTPS and proper SSL certificates
- Regularly backup your database
- Keep your Docker images updated
- Use Cloudflare Tunnels for enhanced security and easier management
- Enable fail2ban if using nginx with open ports
- Regularly update your reverse proxy and SSL certificates
