# Peninsula Health Shift Happens - Test Documentation

## Overview
This document provides comprehensive information about the testing strategy, test suites, and how to run tests for the Peninsula Health Shift Happens application.

## Test Architecture

### 1. Backend API Tests
- **Location**: `/backend/src/server.test.js`
- **Framework**: Jest + Supertest
- **Coverage**: All REST API endpoints

### 2. Frontend Component Tests
- **Location**: `/frontend/src/**/*.test.tsx`
- **Framework**: Jest + React Testing Library
- **Coverage**: React components and user interactions

### 3. End-to-End Tests
- **Location**: `/e2e-tests.js`
- **Framework**: Puppeteer
- **Coverage**: Complete user workflows

## Running Tests

### Quick Start
```bash
# Install all dependencies
npm run install:all

# Run all tests
npm test

# Run specific test suites
npm run test:backend    # Backend tests only
npm run test:frontend   # Frontend tests only
npm run test:e2e       # E2E tests only
```

### Backend Tests

#### Setup
```bash
cd backend
npm install
```

#### Run Tests
```bash
# Run all backend tests with coverage
npm test

# Watch mode for development
npm run test:watch

# Verbose output
npm run test:verbose
```

#### Test Coverage Areas
- **Server Setup**: CORS, middleware, health checks
- **Config Management**: Load, save, reload configuration
- **Doctor Management**: CRUD operations for doctors
- **Shift Management**: CRUD operations for shifts
- **Roster Generation**: Generate, validate, save rosters
- **Reports**: Statistics, doctor stats, vacant shifts
- **Email Service**: Send roster emails, test emails
- **Error Handling**: 404s, malformed JSON, validation

### Frontend Tests

#### Setup
```bash
cd frontend
npm install
```

#### Run Tests
```bash
# Run all frontend tests
npm test

# Run without watch mode
npm test -- --watchAll=false

# Run with coverage
npm test -- --coverage
```

#### Test Coverage Areas
- **App Component**: Routing, authentication flow
- **DoctorsPage**: Doctor list, add/edit/delete, search/filter
- **SchedulePage**: Calendar view, roster generation, drag-drop
- **ReportsPage**: Statistics, charts, export functionality
- **Authentication**: Login/logout, session management
- **Error Handling**: Loading states, error boundaries

### End-to-End Tests

#### Setup
```bash
# Install Puppeteer
npm install puppeteer
```

#### Run Tests
```bash
# Run E2E tests
node e2e-tests.js

# Or using npm script
npm run test:e2e
```

#### Test Scenarios
1. **User Authentication**: Login/logout flow
2. **Doctor Management**: Add, edit, view doctors
3. **Roster Generation**: Create new rosters
4. **Shift Modification**: Edit shift assignments
5. **Reports Generation**: View and export reports
6. **Email Functionality**: Send roster emails
7. **Configuration Management**: Update system config
8. **Data Persistence**: Verify data saves correctly
9. **API Health Check**: Backend availability

## Test Data

### Default Test Credentials
- Username: `admin`
- Password: `admin123`

### Sample Test Data
Test suites use mock data for:
- Doctors with various shift preferences
- Rosters with different date ranges
- Shift configurations
- Report statistics

## Continuous Integration

### GitHub Actions Workflow (Optional)
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm run install:all
      - run: npm test
```

## Test Best Practices

### Writing New Tests
1. **Unit Tests**: Test individual functions/components in isolation
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete user workflows
4. **Mock External Dependencies**: Use jest.mock() for API calls
5. **Test Both Success and Failure Cases**
6. **Use Descriptive Test Names**

### Test Organization
```
describe('Component/Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  test('should do something specific', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Coverage Reports

### Generate Coverage Reports
```bash
# Backend coverage
cd backend && npm test -- --coverage

# Frontend coverage
cd frontend && npm test -- --coverage
```

### Coverage Metrics
- **Statements**: % of code statements executed
- **Branches**: % of conditional branches tested
- **Functions**: % of functions called
- **Lines**: % of lines executed

### Coverage Goals
- Minimum 80% coverage for critical paths
- 100% coverage for utility functions
- E2E tests for all major user workflows

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill
lsof -ti:3001 | xargs kill
```

#### Test Timeout Issues
- Increase timeout in test files: `jest.setTimeout(30000)`
- For E2E tests, adjust TIMEOUT constant in e2e-tests.js

#### Mock Data Issues
- Clear jest cache: `npm test -- --clearCache`
- Reset mocks in beforeEach/afterEach hooks

#### E2E Test Failures
- Ensure servers are not already running
- Check Puppeteer browser installation
- Verify network connectivity

## Test Maintenance

### Regular Tasks
1. **Update Test Data**: Keep mock data realistic
2. **Review Failed Tests**: Fix flaky tests promptly
3. **Add Tests for New Features**: Maintain coverage
4. **Refactor Test Code**: Keep tests maintainable
5. **Update Dependencies**: Keep testing libraries current

### Performance Testing
For load testing and performance monitoring:
```bash
# Install artillery for load testing
npm install -g artillery

# Create load test script
artillery quick --count 10 --num 100 http://localhost:3001/api/health
```

## Security Testing

### API Security Tests
- Authentication/authorization checks
- Input validation testing
- SQL injection prevention
- XSS protection verification

### Frontend Security Tests
- CSRF protection
- Secure data storage
- Session management
- Input sanitization

## Accessibility Testing

### Manual Testing
1. Keyboard navigation
2. Screen reader compatibility
3. Color contrast verification
4. ARIA labels and roles

### Automated Testing
```bash
# Install accessibility testing tools
npm install --save-dev @axe-core/react

# Add to component tests
import axe from '@axe-core/react';
```

## Contact & Support

For test-related questions or issues:
1. Check this documentation
2. Review existing test files
3. Contact the development team

## Appendix

### Test File Structure
```
/
├── backend/
│   ├── src/
│   │   └── server.test.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.test.tsx
│   │   └── components/
│   │       ├── DoctorsPage/
│   │       │   └── DoctorsPage.test.tsx
│   │       ├── SchedulePage/
│   │       │   └── SchedulePage.test.tsx
│   │       └── ReportsPage/
│   │           └── ReportsPage.test.tsx
│   └── package.json
├── e2e-tests.js
├── run-all-tests.sh
└── package.json
```

### NPM Scripts Reference
```json
{
  "test": "Run all tests",
  "test:backend": "Run backend tests",
  "test:frontend": "Run frontend tests",
  "test:e2e": "Run E2E tests",
  "test:watch": "Run tests in watch mode"
}
```

---

Last Updated: January 2025
Version: 2.0.0