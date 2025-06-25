# StatusWise Testing Documentation

This document outlines the comprehensive testing strategy for StatusWise, including backend API tests, frontend component tests, and admin dashboard testing.

## 🧪 Testing Overview

StatusWise uses a multi-layered testing approach with:
- **Backend API Testing**: Python/pytest for FastAPI endpoints
- **Frontend Component Testing**: Jest/React Testing Library for React components
- **Integration Testing**: End-to-end API and UI interactions
- **Authorization Testing**: Role-based access control validation

## 📁 Test Structure

### Backend Tests (`backend/tests/`)

```
backend/tests/
├── test_auth.py                  # Authentication & JWT testing
├── test_main.py                  # Core API endpoints
├── test_main_additional.py       # Extended API functionality
├── test_admin.py                 # Admin dashboard API testing
├── test_admin_authorization.py   # Admin access control testing
├── test_lemonsqueezy_service.py  # Billing integration testing
├── performance_test.py           # Performance & load testing
└── run_tests.sh                  # Test runner script
```

### Frontend Tests (`frontend/__tests__/`)

```
frontend/__tests__/
├── pages/
│   ├── dashboard.test.js         # User dashboard testing
│   ├── admin.test.js            # Admin dashboard testing
│   ├── login.test.js            # Authentication UI testing
│   ├── signup.test.js           # Registration UI testing
│   ├── subscription.test.js     # Billing UI testing
│   └── status/
│       └── [projectId].test.js  # Public status page testing
└── simple.test.js               # Basic component tests
```

## 🛡️ Admin Dashboard Testing

### Backend Admin Tests (`test_admin.py`)

**Test Coverage:**
- ✅ **Authorization Control**: Admin-only endpoint access
- ✅ **System Statistics**: User counts, subscription metrics, project/incident stats
- ✅ **User Management**: List, view, activate/deactivate, grant/revoke admin privileges
- ✅ **Subscription Management**: View all subscriptions with billing details
- ✅ **Project Oversight**: Cross-platform project monitoring with incident counts
- ✅ **Incident Management**: Global incident tracking with filtering
- ✅ **Pagination**: All endpoints support proper pagination
- ✅ **Error Handling**: 403/404/422 error responses

**Key Test Classes:**
```python
class TestAdminAuthorization      # Access control validation
class TestAdminStats             # System statistics testing
class TestAdminUsers             # User management operations
class TestAdminSubscriptions     # Billing oversight testing
class TestAdminProjects          # Project management testing
class TestAdminIncidents         # Incident tracking testing
class TestAdminEdgeCases         # Error conditions & edge cases
```

### Admin Authorization Tests (`test_admin_authorization.py`)

**Test Coverage:**
- ✅ **Access Control**: Admin vs regular user permissions
- ✅ **Edge Cases**: Missing/invalid admin flags
- ✅ **User Flag Management**: Admin promotion/demotion
- ✅ **Integration Scenarios**: Multiple admins, mixed user types

**Key Test Classes:**
```python
class TestAdminAccessControl        # Core access validation
class TestUserAdminFlag            # Admin flag functionality
class TestAdminAuthorizationEdgeCases  # Edge case handling
class TestAdminAuthorizationIntegration # Real-world scenarios
```

### Frontend Admin Tests (`admin.test.js`)

**Test Coverage:**
- ✅ **Authentication**: Token validation, admin access checks
- ✅ **Navigation**: Tab switching, loading states
- ✅ **Overview Tab**: Statistics display, health metrics
- ✅ **Users Tab**: User management UI, status updates
- ✅ **Subscriptions Tab**: Billing information display
- ✅ **Projects Tab**: Project health monitoring
- ✅ **Incidents Tab**: Global incident management
- ✅ **Error Handling**: API failures, network errors
- ✅ **User Interactions**: Button clicks, form submissions

**Key Test Groups:**
```javascript
describe('Authentication and Authorization')  // Access control
describe('Dashboard Loading and Navigation')  // UI behavior
describe('Overview Tab')                     // Statistics display
describe('Users Tab')                        // User management
describe('Subscriptions Tab')                // Billing management
describe('Projects Tab')                     // Project oversight
describe('Incidents Tab')                    // Incident tracking
describe('Error Handling')                   // Error scenarios
```

## 🔧 Running Tests

### Backend Tests

```bash
# Run all backend tests
cd backend
source venv/bin/activate
./tests/run_tests.sh

# Run specific test files
pytest tests/test_admin.py -v
pytest tests/test_admin_authorization.py -v

# Run with coverage
pytest --cov=. --cov-report=html --cov-report=term-missing
```

### Frontend Tests

```bash
# Run all frontend tests
cd frontend
npm test

# Run specific test files
npm test admin.test.js
npm test dashboard.test.js

# Run with coverage
npm test -- --coverage
```

### Admin-Specific Tests

```bash
# Backend admin tests
cd backend
pytest tests/test_admin.py tests/test_admin_authorization.py -v

# Frontend admin tests
cd frontend
npm test admin.test.js
```

## 📊 Test Coverage Metrics

### Backend Coverage

| Module | Coverage | Key Areas |
|--------|----------|-----------|
| Admin API | 95%+ | All admin endpoints, authorization |
| Authentication | 98% | JWT, password hashing, user validation |
| Main API | 92% | Projects, incidents, public endpoints |
| Authorization | 96% | Role-based access control |
| LemonSqueezy | 88% | Billing integration, webhooks |

### Frontend Coverage

| Component | Coverage | Key Areas |
|-----------|----------|-----------|
| Admin Dashboard | 90%+ | All tabs, user interactions, error handling |
| User Dashboard | 85% | Project/incident management |
| Authentication | 92% | Login/signup flows |
| Subscription | 88% | Billing UI components |

## 🛠️ Test Patterns & Best Practices

### Backend Testing Patterns

```python
# Fixture-based setup
@pytest.fixture
def admin_user():
    # Create test admin user
    
@pytest.fixture  
def auth_headers(admin_user):
    # Generate auth headers

# Parameterized testing
@pytest.mark.parametrize("role,expected", [
    ("admin", 200),
    ("user", 403)
])
def test_endpoint_access(role, expected):
    # Test different access levels
```

### Frontend Testing Patterns

```javascript
// Mock API responses
mockedAxios.get.mockImplementation((url) => {
  if (url.includes('/admin/stats')) {
    return Promise.resolve({ data: mockStats })
  }
})

// User interaction testing
await act(async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Users' }))
})

await waitFor(() => {
  expect(screen.getByText('User Management')).toBeInTheDocument()
})
```

## 🔍 Test Data & Fixtures

### Backend Test Data

- **Admin Users**: Full privileges, active/inactive states
- **Regular Users**: Limited access, various subscription tiers
- **Projects**: Multiple ownership scenarios
- **Incidents**: Resolved/unresolved, various timestamps
- **Subscriptions**: Different tiers, billing states

### Frontend Mock Data

- **System Statistics**: Realistic user/project/incident counts
- **User Data**: Various roles, subscription states
- **API Responses**: Success/error scenarios
- **Navigation States**: Tab switching, loading states

## 🚨 Critical Test Scenarios

### Security Testing

1. **Admin Access Control**
   - Non-admin users denied access to admin endpoints
   - Token validation on all admin operations
   - Self-privilege removal prevention

2. **Data Isolation**
   - Users only see their own data
   - Admin can see all data
   - Cross-user data access prevention

3. **Input Validation**
   - SQL injection prevention
   - XSS protection
   - Parameter validation

### Performance Testing

1. **Admin Dashboard Load**
   - Large user datasets (1000+ users)
   - Multiple concurrent admin users
   - Complex statistics calculations

2. **API Response Times**
   - Sub-200ms for simple queries
   - Sub-1s for complex aggregations
   - Proper pagination implementation

## 📈 Continuous Integration

### GitHub Actions Integration

Tests run automatically on:
- Pull requests to main branch
- Direct pushes to main branch
- Nightly full test suite execution

### Test Environment Setup

1. **Database**: In-memory SQLite for isolation
2. **Authentication**: Mock JWT tokens
3. **External Services**: Mocked LemonSqueezy API
4. **File System**: Temporary directories

## 🐛 Debugging Failed Tests

### Common Issues

1. **Database State**: Ensure clean state between tests
2. **Async Operations**: Proper await/act usage
3. **Mock Cleanup**: Reset mocks between tests
4. **Timezone Issues**: Use UTC for consistent timestamps

### Debug Commands

```bash
# Run specific failing test
pytest tests/test_admin.py::TestAdminStats::test_admin_stats_with_data -v -s

# Run with debugging
pytest --pdb tests/test_admin.py

# Frontend debugging
npm test -- --verbose admin.test.js
```

## 📝 Adding New Tests

### Backend Test Template

```python
class TestNewFeature:
    def test_feature_success(self, admin_auth_headers):
        response = client.get("/admin/new-endpoint", headers=admin_auth_headers)
        assert response.status_code == 200
        
    def test_feature_authorization(self, user_auth_headers):
        response = client.get("/admin/new-endpoint", headers=user_auth_headers)
        assert response.status_code == 403
```

### Frontend Test Template

```javascript
describe('New Component', () => {
  test('renders correctly', async () => {
    await act(async () => {
      render(<NewComponent />)
    })
    
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

## 🎯 Test Maintenance

### Regular Tasks

- **Weekly**: Review test coverage reports
- **Monthly**: Update test data to reflect real usage patterns
- **Quarterly**: Performance test validation
- **Release**: Full regression test suite

### Test Health Monitoring

- Coverage thresholds: Backend >90%, Frontend >85%
- Performance benchmarks: API <500ms, UI <100ms
- Flaky test identification and remediation