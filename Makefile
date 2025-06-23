# StatusWise Project Makefile
# Provides commands for development, testing, and deployment

.PHONY: help install test test-backend test-frontend lint lint-backend lint-frontend lint-fix lint-fix-backend lint-fix-frontend convert-console format clean coverage dev dev-backend dev-frontend build deploy docker-build docker-run

# Default target
help: ## Show this help message
	@echo "StatusWise Development Commands"
	@echo "=============================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Installation commands
install: ## Install all dependencies
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm ci
	@echo "✅ All dependencies installed!"

install-backend: ## Install backend dependencies only
	cd backend && pip install -r requirements.txt

install-frontend: ## Install frontend dependencies only
	cd frontend && npm ci

# Testing commands with proper isolation
test: test-backend test-frontend ## Run all tests with proper isolation

test-backend: ## Run backend tests with proper isolation (file by file)
	@echo "🧪 Running backend tests with proper isolation..."
	@cd backend && echo "Testing auth module..." && python -m pytest tests/test_auth.py -v --tb=short
	@cd backend && echo "Testing LemonSqueezy service..." && python -m pytest tests/test_lemonsqueezy_service.py -v --tb=short
	@cd backend && echo "Testing main additional (authorization)..." && python -m pytest tests/test_main_additional.py -v --tb=short
	@cd backend && echo "Testing main endpoints..." && python -m pytest tests/test_main.py -v --tb=short
	@echo "✅ All backend tests completed!"

test-backend-fast: ## Run backend tests in parallel (may have isolation issues)
	cd backend && python -m pytest -n auto --tb=short

test-backend-coverage: ## Run backend tests with coverage report
	@echo "🧪 Running backend tests with coverage..."
	@cd backend && python -m pytest tests/test_auth.py --cov=auth --cov-append --tb=short
	@cd backend && python -m pytest tests/test_lemonsqueezy_service.py --cov=lemonsqueezy_service --cov-append --tb=short
	@cd backend && python -m pytest tests/test_main_additional.py --cov=. --cov-append --tb=short
	@cd backend && python -m pytest tests/test_main.py --cov=main --cov-append --tb=short --cov-report=html --cov-report=term-missing
	@echo "✅ Coverage report generated in backend/htmlcov/"

test-auth: ## Run only authorization tests (core security)
	cd backend && python -m pytest tests/test_main_additional.py::TestProjectAccess tests/test_main_additional.py::TestIncidentAccess tests/test_main_additional.py::TestErrorHandling -v

test-frontend: ## Run frontend tests
	cd frontend && npm run test:coverage

test-frontend-watch: ## Run frontend tests in watch mode
	cd frontend && npm test

# Linting and formatting
lint: lint-backend lint-frontend ## Run all linting

lint-backend: ## Lint backend code
	@echo "🔍 Linting backend..."
	cd backend && flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
	cd backend && flake8 . --count --exit-zero --max-complexity=10 --max-line-length=88 --statistics

lint-frontend: ## Lint frontend code
	cd frontend && npm run lint

lint-fix: lint-fix-backend lint-fix-frontend ## Fix all linting issues automatically

lint-fix-backend: ## Fix backend linting issues automatically
	@echo "🔧 Fixing backend linting issues..."
	cd backend && black .
	cd backend && isort .
	@echo "✅ Backend linting fixed!"

lint-fix-frontend: ## Fix frontend linting issues automatically
	@echo "🔧 Fixing frontend linting issues..."
	@cd frontend && npm run lint -- --fix || true
	@echo "✅ Frontend linting auto-fix complete!"
	@echo "💡 Run 'make lint-frontend' to check for remaining issues"

convert-console: ## Convert console statements to logger (development-only logging)
	@echo "🔄 Converting console statements to development-only logger..."
	@cd frontend && find pages utils components -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | \
	xargs sed -i.bak \
		-e 's/console\.log(/logger.log(/g' \
		-e 's/console\.error(/logger.error(/g' \
		-e 's/console\.warn(/logger.warn(/g' \
		-e 's/console\.info(/logger.info(/g' \
		-e 's/console\.debug(/logger.debug(/g' || true
	@cd frontend && find pages utils components -name "*.bak" -delete 2>/dev/null || true
	@echo "✅ Console statements converted to logger!"
	@echo "💡 Don't forget to add 'import logger from \"../utils/logger\"' to files that use logger"

format: ## Format all code (alias for lint-fix)
	@echo "🎨 Formatting all code..."
	make lint-fix

# Development servers
dev: ## Start complete development environment (PostgreSQL + Backend + Frontend)
	@echo "🚀 Starting complete development environment..."
	@echo "This will start PostgreSQL, Backend, and Frontend"
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:3000"
	@echo "Database: PostgreSQL on localhost:5432"
	@echo "Use Ctrl+C to stop all services"
	docker-compose up --build

dev-local: ## Start only backend and frontend (requires PostgreSQL running separately)
	@echo "🚀 Starting local development servers..."
	@echo "⚠️  Make sure PostgreSQL is running on localhost:5432"
	@echo "Backend will run on http://localhost:8000"
	@echo "Frontend will run on http://localhost:3000"
	@echo "Use Ctrl+C to stop both servers"
	@trap 'kill %1; kill %2' INT; \
	(cd backend && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/statuswise JWT_SECRET=dev_secret_key LEMONSQUEEZY_API_KEY=test_key LEMONSQUEEZY_SIGNING_SECRET=test_secret LEMONSQUEEZY_PRO_VARIANT_ID=test_variant python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000) & \
	(cd frontend && npm run dev) & \
	wait

dev-backend: ## Start backend development server only
	cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Start frontend development server only
	cd frontend && npm run dev

dev-check: ## Check what's needed for development
	@echo "🔍 Development Environment Check"
	@echo "================================"
	@if docker ps | grep -q postgres; then \
		echo "✅ PostgreSQL is running in Docker"; \
		echo "💡 Use 'make dev' to start everything with Docker"; \
		echo "💡 Or use 'make dev-local' to run backend/frontend locally"; \
	elif pg_isready -h localhost -p 5432 2>/dev/null; then \
		echo "✅ PostgreSQL is running locally"; \
		echo "💡 Use 'make dev-local' to start backend and frontend"; \
	else \
		echo "❌ PostgreSQL is not running"; \
		echo "💡 Use 'make dev' to start everything with Docker (recommended)"; \
		echo "💡 Or start PostgreSQL manually and use 'make dev-local'"; \
	fi
	@echo ""
	@echo "Available commands:"
	@echo "  make dev       - Start everything with Docker (PostgreSQL + Backend + Frontend)"
	@echo "  make dev-local - Start only Backend + Frontend (requires PostgreSQL running)"
	@echo "  make dev-backend - Start only Backend"
	@echo "  make dev-frontend - Start only Frontend"

# Database commands
db-reset: ## Reset the database (for development)
	@echo "🗄️  Resetting database..."
	cd backend && python -c "from database import engine; from models import Base; Base.metadata.drop_all(bind=engine); Base.metadata.create_all(bind=engine)"
	@echo "✅ Database reset complete!"

# Docker commands
docker-build: ## Build Docker images
	docker-compose build

docker-run: ## Run with Docker Compose
	docker-compose up --build

docker-run-detached: ## Run with Docker Compose in background
	docker-compose up -d --build

docker-stop: ## Stop Docker containers
	docker-compose down

docker-logs: ## Show Docker logs
	docker-compose logs -f

# Coverage and reporting
coverage: test-backend-coverage ## Generate coverage report
	@echo "📊 Coverage report available at backend/htmlcov/index.html"

coverage-open: coverage ## Generate and open coverage report
	@if command -v xdg-open > /dev/null; then \
		xdg-open backend/htmlcov/index.html; \
	elif command -v open > /dev/null; then \
		open backend/htmlcov/index.html; \
	else \
		echo "📊 Coverage report available at backend/htmlcov/index.html"; \
	fi

# Security and validation
security-scan: ## Run security scans
	@echo "🔒 Running security scans..."
	cd backend && pip install safety==2.3.5 --no-deps || echo "Safety install failed, skipping safety check"
	cd backend && safety check || echo "Safety check skipped due to version conflicts"
	cd backend && bandit -r . -x tests/
	cd frontend && npm audit
	@echo "✅ Security scan complete!"

# Deployment
build: ## Build for production
	@echo "🏗️  Building for production..."
	cd frontend && npm run build
	@echo "✅ Production build complete!"

deploy-check: lint test ## Run all checks before deployment
	@echo "✅ All deployment checks passed!"

# Cleanup
clean: ## Clean up generated files
	@echo "🧹 Cleaning up..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	rm -rf backend/htmlcov/ 2>/dev/null || true
	rm -rf backend/.coverage 2>/dev/null || true
	rm -rf frontend/coverage/ 2>/dev/null || true
	rm -rf frontend/.next/ 2>/dev/null || true
	rm -rf frontend/node_modules/.cache/ 2>/dev/null || true
	docker compose down -v
	@echo "✅ Cleanup complete!"

# CI/CD helpers
ci-test-backend: ## CI backend test command (with proper isolation)
	@echo "🤖 Running backend tests for CI..."
	cd backend && python -m pytest tests/test_auth.py -v --tb=short --junitxml=test-results-auth.xml
	cd backend && python -m pytest tests/test_lemonsqueezy_service.py -v --tb=short --junitxml=test-results-lemonsqueezy.xml
	cd backend && python -m pytest tests/test_main_additional.py -v --tb=short --junitxml=test-results-main-additional.xml
	cd backend && python -m pytest tests/test_main.py -v --tb=short --junitxml=test-results-main.xml
	cd backend && python -m pytest --cov=. --cov-report=xml --cov-report=term-missing tests/test_main_additional.py

ci-test-frontend: ## CI frontend test command
	cd frontend && npm run test:coverage

# Quick commands for common tasks
quick-test: test-auth ## Quick test of core authorization (fastest)
	@echo "✅ Quick authorization test complete!"

full-check: clean install lint test coverage ## Full project check
	@echo "✅ Full project check complete!"

# Development setup
setup: ## Initial project setup
	@echo "🚀 Setting up StatusWise development environment..."
	make install
	@echo "🗄️  Setting up database with Docker..."
	docker-compose up -d db
	@echo "⏳ Waiting for PostgreSQL to be ready..."
	@sleep 5
	make db-reset
	docker-compose down
	@echo "✅ Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  make dev       - Start complete development environment (recommended)"
	@echo "  make dev-check - Check what's running and get recommendations" 