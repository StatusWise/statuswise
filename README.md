# StatusWise — Open Source Status Page SaaS

**Self-hostable, privacy-first status pages for SaaS, startups, and agencies.**

---

## 🌟 Why StatusWise?

StatusWise provides a powerful, self-hostable alternative to services like Statuspage.io, offering full data control and extensive customization.

*   🚀 **Fast Setup**: Deploy a beautiful, responsive status page in minutes using Docker.
*   🔒 **Privacy-First**: Self-host to keep full ownership and control of your incident and subscriber data.
*   🔐 **Google OAuth**: Secure authentication using Google OAuth - no passwords to manage.
*   🎨 **Custom Branding**: Customize the logo, colors, and layout to match your brand identity.
*   🧩 **Integrations**: Notify your users via Slack, Email, and Webhooks.
*   🌐 **Multi-language Support**: Communicate with your audience in their native language.
*   🖥️ **Developer-Friendly**: Built with a modern tech stack and includes a full-featured API.

---

## 🎯 Use Cases

* SaaS incident reporting
* Internal status dashboards
* Client communication for agencies
* Compliance-friendly public uptime reporting

---

## 🛠 Tech Stack

StatusWise is built with a modern, robust, and scalable technology stack.

*   **Backend**: **Python 3.11+** with **FastAPI** for high-performance API services.
    *   Database ORM: **SQLAlchemy**
    *   Authentication: **Google OAuth 2.0** with **python-jose** for JWT tokens
*   **Frontend**: **Next.js 15+** (React) for a fast, modern user interface.
    *   Styling: **Tailwind CSS** for utility-first CSS
    *   Testing: **Jest** and **React Testing Library**
*   **Database**: **PostgreSQL** for reliable and robust data storage.
*   **Deployment**: **Docker Compose** for easy, reproducible local and production deployments.
*   **Billing**: **Lemon Squeezy** for subscription management in the SaaS version.

---

## 🚀 Quick Deploy (No Repository Clone Needed)

The fastest way to get StatusWise running using pre-built Docker images:

**1. Set up Google OAuth:**

Before running StatusWise, you need to set up Google OAuth:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** or **Google Identity** API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Configure the OAuth consent screen
6. Set **Authorized JavaScript origins**: `http://localhost:3000`
7. Set **Authorized redirect URIs**: `http://localhost:3000`
8. Copy your **Client ID** and **Client Secret**

**2. Download the deployment files:**
```bash
curl -O https://raw.githubusercontent.com/NicklausVega/statuswise/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/NicklausVega/statuswise/main/env.prod.example
```

**3. Configure environment:**
```bash
cp env.prod.example .env
```

**Edit your `.env` file with your Google OAuth credentials:**
```bash
# Required: Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Admin user (automatically becomes admin on first login)
ADMIN_EMAIL=your-email@example.com

# Security (generate strong random strings)
SECRET_KEY=your-super-secret-key-change-this
JWT_SECRET=your-jwt-secret-change-this

# Feature toggles
ENABLE_BILLING=false
ENABLE_ADMIN=true
```

**4. Deploy with Docker Compose:**
```bash
docker-compose up -d
```

**5. Access your instance:**
*   **Frontend**: [http://localhost:3000](http://localhost:3000)
*   **API**: [http://localhost:8000/docs](http://localhost:8000/docs) (Interactive API documentation)

**First Login:**
- Navigate to [http://localhost:3000](http://localhost:3000)
- Click "Sign in with Google" 
- Sign in with the Google account matching your `ADMIN_EMAIL`
- You'll automatically be granted admin privileges
- Access the admin dashboard to manage users and system settings

> 🌐 **For Production Deployment**: See our [**Deployment Guide**](./docs/DEPLOYMENT.md) for production setup with reverse proxies, SSL certificates, and Cloudflare tunnels.

---

## 🛠 Development Setup (Clone Repository)

For development or customization, you can clone the repository and build from source:

**1. Clone the repository:**
```bash
git clone https://github.com/NicklausVega/statuswise.git
cd statuswise
```

**2. Set up environment variables:**
```bash
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env
```

**3. Configure your environment files** (same as above)

**4. Build and run:**
```bash
docker-compose up --build -d
```

---

## ⚙️ Feature Toggles

StatusWise supports configurable features that can be enabled or disabled based on your deployment needs:

### Environment Variables

```bash
# Feature Toggles (default: false for secure-by-default)
ENABLE_BILLING=false    # Enable subscription management and billing
ENABLE_ADMIN=true      # Enable admin dashboard and user management
```

### Deployment Scenarios

**Personal/Internal Use:**
```bash
ENABLE_BILLING=false
ENABLE_ADMIN=true
```
- No subscription limits (unlimited projects)
- Admin functionality for user management
- No payment processing required

**SaaS Deployment:**
```bash
ENABLE_BILLING=true
ENABLE_ADMIN=true
```
- Full subscription management with Lemon Squeezy
- Admin dashboard for system management
- Project limits based on subscription tiers

**Simple Status Page:**
```bash
ENABLE_BILLING=false
ENABLE_ADMIN=false
```
- Core incident management only
- No user management overhead
- Perfect for single-team usage

For detailed configuration instructions, see [`docs/FEATURE_TOGGLES.md`](./docs/FEATURE_TOGGLES.md).

---

## 📁 Project Structure

A high-level overview of the repository structure:

```
.
├── backend/        # FastAPI backend application
├── docs/           # Project and workflow documentation
├── frontend/       # Next.js frontend application
├── .github/        # GitHub Actions workflows
├── docker-compose.yml
└── README.md
```

---

## 🤝 Contributing

We welcome contributions from the community! Whether you want to fix a bug, add a feature, or improve the documentation, your help is appreciated.

*   **Bug Reports & Feature Requests**: Please open an issue on our [GitHub Issues](https://github.com/StatusWise/statuswise/issues) page.
*   **Development**: If you'd like to contribute code, please see our `CONTRIBUTING.md` file for guidelines (coming soon!).

---

## 📄 License

StatusWise is open-source and licensed under the **MIT License**.

---

## 📚 Documentation

Comprehensive documentation for setup, configuration, and development can be found in the [`docs/`](./docs) directory:

- [**Deployment Guide**](./docs/DEPLOYMENT.md) - Production deployment with reverse proxies (Cloudflare, nginx)
- [**Feature Toggles**](./docs/FEATURE_TOGGLES.md) - Configure billing and admin features
- [**Admin Dashboard**](./docs/ADMIN_DASHBOARD.md) - Admin interface setup and usage
- [**Testing Guide**](./docs/TESTING.md) - Testing strategy and running tests
- [**Development Guide**](./docs/DEVELOPMENT.md) - Development setup and workflows
- [**GitHub Actions Workflows**](./docs/actions_workflows.md) - CI/CD pipeline documentation

---

## 🔗 Links

*   **Website**: [https://statuswise.dev](https://statuswise.dev)
*   **Twitter**: [@StatusWiseApp](https://twitter.com/StatusWiseApp)