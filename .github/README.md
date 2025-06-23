# GitHub Actions Workflows

This directory contains comprehensive GitHub Actions workflows for the StatusWise SaaS application. These workflows automate testing, building, deployment, and project management tasks.

## 📋 Workflow Overview

### 1. **CI/CD Pipeline** (`ci.yml`)
**Triggers**: Push to `main`/`develop`, Pull Requests
**Purpose**: Main continuous integration and deployment pipeline

**Jobs**:
- **Test Backend**: Runs Python tests with PostgreSQL
- **Test Frontend**: Runs Node.js tests with coverage
- **Lint Backend**: Code quality checks (flake8, black, isort, mypy)
- **Lint Frontend**: ESLint checks
- **Build**: Docker image building and pushing
- **Deploy Staging**: Automatic deployment to staging
- **Deploy Production**: Automatic deployment to production
- **Notify**: Team notifications

### 2. **Dependency Management** (`dependencies.yml`)
**Triggers**: Weekly schedule, Manual dispatch
**Purpose**: Automated dependency updates and security checks

**Jobs**:
- **Check Dependencies**: Scans for outdated and vulnerable dependencies
- **Update Dependencies**: Creates PRs for dependency updates
- **Create Issues**: Automatically creates issues for dependency updates

### 3. **Release Management** (`release.yml`)
**Triggers**: Tag push (v*)
**Purpose**: Automated release creation and Docker image publishing

**Jobs**:
- **Build and Push**: Creates Docker images for release
- **Create Release**: Generates changelog and GitHub release
- **Notify Release**: Release notifications

### 4. **Code Quality** (`code-quality.yml`)
**Triggers**: Push to `main`/`develop`, Pull Requests
**Purpose**: Advanced code quality and security analysis

**Jobs**:
- **SonarCloud Analysis**: Code quality and coverage analysis
- **Code Coverage**: Coverage reporting and artifacts
- **Security Scan**: Bandit and npm audit
- **Quality Gate**: PR quality gate checks

### 5. **Test Environments** (`test-environments.yml`)
**Triggers**: Push to `main`/`develop`, Pull Requests, Weekly schedule
**Purpose**: Comprehensive testing across different environments

**Jobs**:
- **Test Python Versions**: Tests across Python 3.9-3.12
- **Test Node.js Versions**: Tests across Node.js 16-20
- **Test Database Versions**: Tests across PostgreSQL 13-16
- **Test Docker Compose**: Integration testing
- **Performance Tests**: Load testing with Locust
- **Security Tests**: Security scanning
- **Accessibility Tests**: A11y testing

### 6. **Deployment** (`deploy.yml`)
**Triggers**: Push to `main`/`develop`, Manual dispatch
**Purpose**: Environment-specific deployments with rollback

**Jobs**:
- **Validate Deployment**: Determines deployment environment
- **Deploy Staging**: Staging environment deployment
- **Deploy Production**: Production environment deployment
- **Rollback**: Automatic rollback on failure
- **Notify Deployment**: Deployment status notifications
- **Cleanup**: Resource cleanup

### 7. **Automation** (`automation.yml`)
**Triggers**: Issues, Pull Requests, Push to `main`/`develop`
**Purpose**: Automated project management and maintenance

**Jobs**:
- **Auto Label**: Automatic issue/PR labeling
- **Auto Assign**: Automatic assignment based on labels
- **Stale Issues**: Mark stale issues and PRs
- **Dependency Updates**: Check for dependency updates
- **PR Checks**: PR quality analysis
- **Release Notes**: Generate release notes

## 🔧 Configuration

### Required Secrets

Set these secrets in your GitHub repository settings:

```bash
# GitHub Container Registry
GITHUB_TOKEN                    # Automatically provided

# SonarCloud (for code quality analysis)
SONAR_TOKEN                     # Your SonarCloud token

# Deployment (examples)
KUBECONFIG                      # Kubernetes config for deployments
DOCKER_REGISTRY_TOKEN           # Docker registry token
SLACK_WEBHOOK                   # Slack webhook for notifications

# Environment-specific
STAGING_DATABASE_URL            # Staging database URL
PRODUCTION_DATABASE_URL         # Production database URL
```

### Environment Variables

Configure these in your repository settings:

```bash
# Application
DATABASE_URL                    # Database connection string
JWT_SECRET                      # JWT signing secret
STRIPE_SECRET_KEY              # Stripe API key

# Docker
REGISTRY                        # Container registry (default: ghcr.io)
IMAGE_NAME                      # Image name (default: github.repository)
```

## 🚀 Usage

### Manual Workflow Triggers

You can manually trigger workflows from the Actions tab:

1. **Dependency Updates**: Manually update dependencies
2. **Deployment**: Deploy to specific environment
3. **Test Environments**: Run comprehensive tests

### Branch Strategy

- **`main`**: Production deployments
- **`develop`**: Staging deployments
- **Feature branches**: CI checks only

### Release Process

1. Create and push a tag: `git tag v1.0.0 && git push origin v1.0.0`
2. Workflow automatically:
   - Builds Docker images
   - Creates GitHub release
   - Generates changelog
   - Notifies team

## 📊 Monitoring and Notifications

### Built-in Notifications

- **Slack**: Deployment status, failures, releases
- **GitHub Issues**: Dependency updates, security alerts
- **PR Comments**: Quality analysis, checklist

### Metrics and Reports

- **Code Coverage**: Uploaded to Codecov
- **Security Reports**: Artifacts available for download
- **Performance Reports**: Locust test results
- **Quality Gates**: SonarCloud integration

## 🔒 Security Features

### Automated Security Checks

- **Dependency Scanning**: Safety (Python), npm audit (Node.js)
- **Code Scanning**: Bandit for Python security
- **Secret Scanning**: GitHub's built-in secret detection

### Security Best Practices

- **Environment Protection**: Production deployments require approval
- **Secret Management**: Secure handling of sensitive data
- **Access Control**: Role-based access to environments
- **Audit Trail**: Complete deployment history

## 🛠️ Customization

### Adding New Environments

1. Add environment in GitHub repository settings
2. Update workflow conditions
3. Add deployment logic
4. Configure secrets and variables

### Custom Notifications

Modify notification steps in workflows:

```yaml
- name: Custom Notification
  run: |
    curl -X POST -H 'Content-type: application/json' \
      --data '{"text":"Custom message"}' \
      ${{ secrets.SLACK_WEBHOOK }}
```

### Adding New Tests

1. Create test files in appropriate directories
2. Update workflow to run new tests
3. Configure test environment if needed
4. Add test results to artifacts

## 📈 Performance Optimization

### Caching Strategies

- **Dependencies**: npm and pip caching
- **Docker Layers**: Multi-stage builds
- **Test Results**: Coverage and artifact caching

### Parallel Execution

- **Matrix Testing**: Multiple versions simultaneously
- **Independent Jobs**: Parallel job execution
- **Resource Optimization**: Efficient resource usage

## 🐛 Troubleshooting

### Common Issues

1. **Backend Tests Failing**
   - Check PostgreSQL service is running
   - Verify all dependencies are installed
   - Check test database configuration

2. **Frontend Tests Failing**
   - Verify Node.js version (18.x)
   - Check Jest configuration
   - Ensure all test dependencies are installed

3. **Linting Failures**
   - Backend: Check Python code formatting with black/isort
   - Frontend: Check JavaScript/TypeScript with ESLint

4. **Docker Build Failures**
   - Verify Dockerfile syntax
   - Check for missing files in build context
   - Ensure registry permissions

### Environment Variables

Required secrets for deployment:
- `GITHUB_TOKEN`: Automatically provided
- Add custom secrets as needed for your deployment targets

### Local Testing

To test workflows locally:

```bash
# Backend tests
cd backend
pip install -r requirements.txt
pytest

# Frontend tests
cd frontend
npm install
npm test
npm run lint
```

### Debugging

1. Check workflow logs in GitHub Actions tab
2. Look for specific error messages
3. Verify file paths and dependencies
4. Test locally if possible

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Security Best Practices](https://security.github.com/)

## 🤝 Contributing

When adding new workflows or modifying existing ones:

1. Follow the established patterns
2. Add comprehensive documentation
3. Include proper error handling
4. Test thoroughly before merging
5. Update this README if needed

---

*This documentation is automatically generated and maintained as part of the StatusWise project.* 