#!/bin/bash

echo "🧪 Running StatusWise Backend Tests"
echo "=================================="

# Run tests with coverage
echo "Running pytest with coverage..."
pytest .

# Check if tests passed
if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
    echo "📊 Coverage report generated in htmlcov/index.html"
else
    echo "❌ Some tests failed!"
    exit 1
fi 