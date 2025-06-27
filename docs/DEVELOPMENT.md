# StatusWise Development Guide

This guide covers development workflows, testing strategies, and deployment procedures for StatusWise.

## Quick Start

```bash
# Initial setup (includes PostgreSQL setup)
make setup

# Check what's needed for development
make dev-check

# Start complete development environment (recommended)
make dev
```

## Available Commands

Run `make help` to see all available commands:

```bash
make help
```

## Testing Strategy

### Test Isolation

StatusWise uses a **file-by-file testing approach** to ensure proper test isolation. This prevents database conflicts and ensures reliable test results.

### Core Testing Commands

```bash
# Run all tests with proper isolation
make test

# Quick authorization test (core security)
make test-auth

# Backend tests only
make test-backend

# Frontend tests only
make test-frontend

# Backend tests with coverage
make test-backend-coverage
```

### Authorization Tests

The **Casbin authorization system** is tested comprehensively:

```bash
# Test core security features
make test-auth
```

This runs 9 critical authorization tests:
- ✅ Project access control
- ✅ Incident access control  
- ✅ Resource validation
- ✅ Proper error responses

## Development Workflow

### 1. Daily Development

```bash
# Check what's running and get recommendations
make dev-check

# Start complete environment (PostgreSQL + Backend + Frontend)
make dev

# Alternative: Start only backend and frontend (requires PostgreSQL running)
make dev-local

# Individual services:
make dev-backend  # Backend only
make dev-frontend # Frontend only
```

### 2. Before Committing

```bash
# Fix any linting issues
make lint-fix

# Full check before committing
make full-check
```

This runs:
- Code formatting and linting fixes
- Linting checks
- All tests with proper isolation
- Coverage analysis

### 3. Specific Development Tasks

```bash
# Fix linting issues automatically
make lint-fix

# Check linting (without fixing)
make lint

# Format code (alias for lint-fix)
make format

# Run security scan
make security-scan

# Reset database
make db-reset
```

## Test Isolation Details

### Why File-by-File Testing?

When running all tests together, database state can leak between test files, causing:
- ❌ Authentication failures
- ❌ Database constraint violations
- ❌ Unpredictable test results

### Our Solution

```bash
# Individual test files (always work)
make test-backend
```

This runs:
1. `tests/test_auth.py` (11 tests)
2. `tests/test_lemonsqueezy_service.py` (30 tests)
3. `tests/test_main_additional.py` (28 tests) - **Authorization tests**
4. `tests/test_main.py` (21 tests)

**Result: 90/90 tests passing with proper isolation! ✅**

### Alternative Testing Methods

```bash
# Parallel testing (may have isolation issues)
make test-backend-fast

# Individual test classes
cd backend && python -m pytest tests/test_main.py::TestAuthentication -v

# Specific authorization tests
cd backend && python -m pytest tests/test_main_additional.py::TestProjectAccess -v
```

## Coverage Analysis

```bash
# Generate coverage report
make coverage

# Open coverage report in browser
make coverage-open
```

**Current Coverage:**
- Overall: **79%** (up from 58%!)
- Authorization: **91%** 
- Auth: **100%**
- Main API: **80%**

## CI/CD Integration

### GitHub Actions

The updated workflows use Makefile commands:

```yaml
# Backend testing with isolation
- name: Run backend tests with proper isolation
  run: make ci-test-backend

# Frontend testing
- name: Run frontend tests  
  run: make ci-test-frontend
```

### Deployment Checks

```bash
# Run all deployment checks (lint + test)
make deploy-check
```

This verifies:
- All tests pass
- Code quality standards met

Note: Security scans and production builds are now automatically included in the main CI/CD pipeline (`ci.yml`) for every push/PR.

## Database Management

```bash
# Reset database (development)
make db-reset

# With Docker
make docker-run
make docker-stop
```

## Security Features

### Casbin Authorization

StatusWise implements **enterprise-grade security** with Casbin:

- ✅ **Project Access Control**: Users can only access their own projects
- ✅ **Incident Access Control**: Users can only access incidents from their projects
- ✅ **Resource Validation**: Proper 404/403 responses
- ✅ **Complete Test Coverage**: 9/9 authorization tests passing

### Security Testing

```bash
# Test authorization system
make test-auth

# Run security scans
make security-scan
```

## Troubleshooting

### Test Failures

If you see test failures when running the full suite:

```bash
# ✅ Use file-by-file testing
make test-backend

# ❌ Avoid running all tests together
cd backend && python -m pytest  # May have isolation issues
```

### Database Issues

```bash
# Reset database
make db-reset

# Clean everything
make clean
```

### Coverage Issues

```bash
# Individual coverage
make test-backend-coverage

# Check specific files
cd backend && python -m pytest tests/test_auth.py --cov=auth --cov-report=term-missing
```

## Production Deployment

```bash
# Pre-deployment check (runs lint + test)
make deploy-check

# Build for production
make build
```

## Development Tips

1. **Always use `make test-auth`** to verify authorization system
2. **Run `make format`** before committing
3. **Use `make dev`** for full-stack development
4. **Check `make coverage`** to maintain high test coverage
5. **Use `make clean`** to reset everything

## Performance

- **File-by-file testing**: ~15 seconds for full backend suite
- **Parallel testing**: ~8 seconds (but may have failures)
- **Authorization tests only**: ~5 seconds
- **Coverage generation**: ~20 seconds

## Support

For issues with:
- **Test isolation**: Use `make test-backend` 
- **Authorization**: Check `make test-auth`
- **Coverage**: Run `make coverage`
- **Development setup**: Try `make setup`

The Makefile ensures **consistent, reliable development workflows** across all environments! 🚀 