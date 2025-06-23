# GitHub Actions Workflows

This document provides a comprehensive overview of the GitHub Actions workflows used in the StatusWise project. These workflows automate everything from testing and code quality to deployment and release management.

## 📋 Workflow Overview

Our CI/CD and automation processes are managed by the following six workflows:

1.  **`ci.yml` (CI/CD Pipeline)**: The core pipeline for continuous integration. It runs tests and linters for both the frontend and backend on every push and pull request to provide fast feedback.
2.  **`code-quality.yml` (Code Quality)**: Performs a deeper static analysis of the codebase, including linting checks that are not covered in the main CI pipeline.
3.  **`test-environments.yml` (Test Environments)**: A comprehensive test suite that validates the application across a matrix of different Python, Node.js, and database versions. To save resources, this workflow is triggered manually on pull requests by adding a specific label.
4.  **`automation.yml` (Automation)**: Handles project management and repository automation tasks, such as auto-labeling issues and pull requests, auto-assigning reviewers, and checking for stale issues.
5.  **`deploy.yml` (Deployment)**: Manages the deployment of the application to different environments.
6.  **`release.yml` (Release Management)**: Automates the process of creating new releases when a version tag is pushed.

**Note**: Dependency management is now handled by [Dependabot](https://docs.github.com/en/code-security/dependabot), which automatically creates pull requests for dependency updates.

---

## 🚀 Usage and Triggers

### Continuous Integration (Fast Feedback)

On every push to the `main` or `develop` branches, and on every commit to a pull request targeting these branches, the following workflows run automatically:

*   `ci.yml`
*   `code-quality.yml`

These workflows are designed to give you rapid feedback on your changes. To save resources, if you push new commits to a pull request, any existing runs for that PR will be automatically canceled.

### Comprehensive Testing (Manual Trigger)

The `test-environments.yml` workflow runs a much more extensive set of tests and is therefore much slower and more expensive. To avoid running this on every single commit, it is triggered manually on pull requests.

**To run the comprehensive test suite on a pull request, add the label `run-compat-tests`.**

This workflow will also run automatically on pushes to `main` and `develop` and on a weekly schedule to ensure ongoing compatibility.

### Release Process

Creating a new release is a manual process that triggers the `release.yml` workflow.

1.  Ensure your changes are on the `main` branch.
2.  Create and push a new version tag:
    ```bash
    git tag v1.0.0
    git push origin v1.0.0
    ```
3.  The workflow will then automatically build the release assets and create a new GitHub Release.

---

## 🔧 Detailed Workflow Breakdown

### `ci.yml`

*   **Purpose**: Core testing and linting.
*   **Triggers**: `push` to `main`/`develop`, `pull_request` to `main`/`develop`.
*   **Jobs**:
    *   `test-backend`: Runs backend tests using `pytest`.
    *   `test-frontend`: Runs frontend tests using `npm test`.
    *   `lint-backend`: Runs `flake8`, `black`, and `isort`.
    *   `lint-frontend`: Runs `eslint`.

### `code-quality.yml`

*   **Purpose**: Static analysis and code quality checks.
*   **Triggers**: `push` to `main`/`develop`, `pull_request` to `main`/`develop`.
*   **Jobs**:
    *   `code-quality`: Runs a combined set of linting tools for both frontend and backend.

### `test-environments.yml`

*   **Purpose**: Ensure compatibility across different environments.
*   **Triggers**:
    *   `push` to `main`/`develop`.
    *   `schedule` (weekly).
    *   `pull_request` when `labeled` with `run-compat-tests`.
*   **Jobs**:
    *   `test-python-versions`: Tests against multiple Python versions (3.9-3.12).
    *   `test-node-versions`: Tests against multiple Node.js versions (18, 20).
    *   `test-database-versions`: Tests against multiple PostgreSQL versions (13-16).
    *   `test-docker-compose`: Runs integration tests using Docker Compose.
    *   `test-performance`: Runs performance tests against the main branch.

### `automation.yml`

*   **Purpose**: Repository management and automation.
*   **Triggers**: `issues`, `pull_request`, `push` to `main`/`develop`.
*   **Jobs**:
    *   `auto-label`: Automatically adds labels to issues and PRs based on their content and file paths.
    *   `auto-assign`: Automatically assigns team members based on labels.
    *   `stale-issues`: Marks and closes stale issues and PRs after a period of inactivity.
    *   `pr-checks`: Adds a comment to pull requests with a quality checklist.

### `deploy.yml`

*   **Purpose**: Application deployment.
*   **Triggers**: `workflow_dispatch` (manual).
*   **Jobs**:
    *   `build-and-push-backend`: Builds and pushes the backend Docker image.
    *   `build-and-push-frontend`: Builds and pushes the frontend Docker image.

### `release.yml`

*   **Purpose**: Automated release creation.
*   **Triggers**: `push` of tags matching `v*`.
*   **Jobs**:
    *   `release`: Creates a new GitHub Release with a static changelog.

---

## ⚙️ Configuration

The following secrets may be required for the workflows to run successfully. These should be configured in your repository's "Settings" > "Secrets and variables" > "Actions".

*   `GITHUB_TOKEN`: Provided automatically by GitHub.
*   `CODECOV_TOKEN`: Required for uploading test coverage reports to Codecov.
*   `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN`: Required if you are pushing images to Docker Hub in the `deploy.yml` workflow.

### Auto-Assign Configuration

The `automation.yml` workflow includes auto-assignment functionality that can automatically assign team members to issues and pull requests based on labels. To configure this:

*   `BACKEND_MAINTAINER`: GitHub username for backend-related issues/PRs
*   `FRONTEND_MAINTAINER`: GitHub username for frontend-related issues/PRs  
*   `DEVOPS_MAINTAINER`: GitHub username for devops/infrastructure-related issues/PRs
*   `SECURITY_MAINTAINER`: GitHub username for security-related issues/PRs

**Note**: If these secrets are not configured, the workflow will default to assigning the repository owner (`argakiig`). Make sure the configured usernames have access to the repository.

#### Setting Up Auto-Assign Secrets

1. Go to your repository's "Settings" > "Secrets and variables" > "Actions"
2. Click "New repository secret" for each maintainer role
3. Add the following secrets with actual GitHub usernames:
   - `BACKEND_MAINTAINER`: Username for backend issues
   - `FRONTEND_MAINTAINER`: Username for frontend issues  
   - `DEVOPS_MAINTAINER`: Username for devops/infrastructure issues
   - `SECURITY_MAINTAINER`: Username for security issues

**Example**: If your backend maintainer's GitHub username is `john-doe`, set `BACKEND_MAINTAINER` to `john-doe`.

The auto-assign functionality will now work when issues or PRs are labeled with `backend`, `frontend`, `devops`, or `security`.

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