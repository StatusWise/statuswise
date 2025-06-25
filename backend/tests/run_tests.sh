#!/bin/bash

echo "🧪 Running StatusWise Backend Tests"
echo "=================================="

# Run all tests with coverage
echo "Running pytest with coverage..."
pytest . --cov=. --cov-report=html --cov-report=term-missing -v

# Check if tests passed
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo "📊 Coverage report generated in htmlcov/index.html"
    echo ""
    echo "🔧 Test Coverage Summary:"
    echo "- Authentication & Authorization: test_auth.py, test_admin_authorization.py"
    echo "- Main API endpoints: test_main.py, test_main_additional.py"
    echo "- Admin dashboard: test_admin.py"
    echo "- LemonSqueezy integration: test_lemonsqueezy_service.py"
    echo "- Performance tests: performance_test.py"
else
    echo "❌ Some tests failed!"
    exit 1
fi 