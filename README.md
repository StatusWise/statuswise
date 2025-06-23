# StatusWise — Open Source Status Page SaaS

**Self-hostable, privacy-first status pages for SaaS, startups, and agencies.**

---

## 🌟 Why StatusWise?

StatusWise provides a powerful, self-hostable alternative to services like Statuspage.io, offering full data control and extensive customization.

*   🚀 **Fast Setup**: Deploy a beautiful, responsive status page in minutes using Docker.
*   🔒 **Privacy-First**: Self-host to keep full ownership and control of your incident and subscriber data.
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

*   **Backend**: **Python 3.9+** with **FastAPI** for high-performance API services.
    *   Database ORM: **SQLAlchemy**
    *   Authentication: **python-jose** for JWT tokens
*   **Frontend**: **Next.js 14+** (React) for a fast, modern user interface.
    *   Styling: **Tailwind CSS** for utility-first CSS
    *   Testing: **Jest** and **React Testing Library**
*   **Database**: **PostgreSQL** for reliable and robust data storage.
*   **Deployment**: **Docker Compose** for easy, reproducible local and production deployments.
*   **Billing**: **Stripe** for subscription management in the SaaS version.

---

## 🚀 Quick Start (Self-Hosted)

Get your self-hosted StatusWise instance running in just a few steps.

**1. Clone the repository:**
```bash
git clone https://github.com/StatusWise/statuswise.git
cd statuswise
```

**2. Set up environment variables:**

Copy the example environment files. These contain the default configurations to get you started.
```bash
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env
```
*You can customize the `.env` files later as needed.*

**3. Build and run with Docker Compose:**
```bash
docker compose up --build -d
```

**4. Access your instance:**
*   **Admin UI**: [http://localhost:3000](http://localhost:3000)
*   **API**: [http://localhost:8000/docs](http://localhost:8000/docs) (Interactive API documentation)

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

Detailed documentation for our GitHub Actions workflows and other development processes can be found in the [`docs/`](./docs) directory.

- [**GitHub Actions Workflows**](./docs/actions_workflows.md)

---

## 🔗 Links

*   **Website**: [https://statuswise.dev](https://statuswise.dev)
*   **Twitter**: [@StatusWiseApp](https://twitter.com/StatusWiseApp)