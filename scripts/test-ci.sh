#!/bin/bash

# Test CI components locally
set -e

echo "🧪 Testing CI components locally..."

# Test backend
echo "📦 Testing backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m pytest -v
cd ..

# Test frontend
echo "📦 Testing frontend..."
cd frontend
npm ci
npm run test:coverage
npm run lint
cd ..

# Test Docker builds
echo "🐳 Testing Docker builds..."
docker build -t statuswise-backend-test ./backend
docker build -t statuswise-frontend-test ./frontend

echo "✅ All tests passed!" 