# Frontend Testing Infrastructure Guide

## Overview
This testing infrastructure provides comprehensive utilities for testing React components, API interactions, user flows, and performance in the Kuzu Event Bus frontend application.

## Testing Stack
- **Vitest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **jsdom**: Browser environment simulation
- **user-event**: User interaction simulation

## File Structure
```
src/test/
├── setup.ts                 # Global test setup
├── utils.tsx                 # Basic render utilities
├── advanced-utils.tsx        # Advanced testing utilities
├── component-helpers.tsx     # Component-specific test helpers
└── examples/                 # Example test files
    ├── Dashboard.test.tsx
    └── Query.test.tsx
```

## Key Features

### 1. Enhanced Render Function
```typescript
import { renderWithProviders } from '@/test/advanced-utils';

const { user, queryClient } = renderWithProviders(<Component />, {
  queryClientOptions: { /* custom options */ },
  initialEntries: ['/dashboard'],
  preloadedQueries: {
    'dashboard.stats': mockData
  }
});
```

### 2. Mock API Utilities
```typescript
import { createMockApi } from '@/test/advanced-utils';

const mockApi = createMockApi();
mockApi.mockSuccessfulDashboardStats();
mockApi.mockApiError(500, 'Server Error');
```

### 3. Component-Specific Test Helpers
```typescript
import { testHelpers } from '@/test/component-helpers';

// Dashboard testing
testHelpers.dashboard.expectAllStatCards();
testHelpers.dashboard.expectChartToBeVisible();

// Query testing
await testHelpers.query.typeQuery('MATCH (n) RETURN n');
await testHelpers.query.executeQuery();
testHelpers.query.expectResults(10);

// Navigation testing
await testHelpers.navigation.goToDashboard();
testHelpers.navigation.expectCurrentPage('dashboard');
```

### 4. Mock Data Factories
```typescript
import { createTestDatabase, createTestQueryResult } from '@/test/advanced-utils';

const database = createTestDatabase({
  name: 'custom-db',
  size_bytes: 2048576
});

const queryResult = createTestQueryResult({
  resultCount: 50,
  executionTime: 150
});
```

### 5. Performance Testing
```typescript
import { measureComponentRenderTime } from '@/test/advanced-utils';

const performance = await measureComponentRenderTime(() => {
  render(<ExpensiveComponent data={largeDataset} />);
}, 10);

expect(performance.average).toBeLessThan(100); // ms
```

### 6. Accessibility Testing
```typescript
import { checkAccessibility } from '@/test/advanced-utils';

const { container } = render(<Component />);
const issues = await checkAccessibility(container);
expect(issues).toHaveLength(0);
```

### 7. WebSocket Testing
```typescript
import { createMockWebSocket } from '@/test/advanced-utils';

const mockWs = createMockWebSocket();
mockWs.triggerMessage({ type: 'query_update', data: {...} });
expect(mockWs.send).toHaveBeenCalledWith(expectedMessage);
```

## Testing Patterns

### Unit Testing
```typescript
describe('Component', () => {
  it('should render correctly', () => {
    const { } = renderWithProviders(<Component />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### Integration Testing
```typescript
describe('User Flow', () => {
  it('should complete dashboard to query flow', async () => {
    const { user } = renderWithProviders(<App />);
    
    await testHelpers.navigation.goToDashboard();
    await testHelpers.navigation.goToQueries();
    await testHelpers.query.typeQuery('MATCH (n) RETURN n');
    await testHelpers.query.executeQuery();
    
    testHelpers.query.expectResults();
  });
});
```

### Error Testing
```typescript
describe('Error Handling', () => {
  it('should handle API errors gracefully', async () => {
    mockApi.mockApiError(500, 'Server Error');
    
    renderWithProviders(<Component />);
    
    await waitFor(() => {
      testHelpers.notification.expectNotification('Server Error', 'error');
    });
  });
});
```

### Loading State Testing
```typescript
describe('Loading States', () => {
  it('should show loading indicator', () => {
    renderWithProviders(<Component />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

## Best Practices

### 1. Test Structure
- Group related tests in describe blocks
- Use descriptive test names
- Setup/cleanup in beforeEach/afterEach
- One assertion per test when possible

### 2. Mocking Strategy
- Mock external dependencies
- Use realistic mock data
- Reset mocks between tests
- Mock time-dependent functions

### 3. User-Centric Testing
- Test user interactions, not implementation details
- Use accessible queries (getByRole, getByLabelText)
- Test keyboard navigation
- Verify screen reader compatibility

### 4. Performance Testing
- Test with realistic data sizes
- Measure render times for complex components
- Test memory usage for data-heavy components
- Verify lazy loading works correctly

### 5. Error Scenarios
- Test all error states
- Verify error boundaries work
- Test network failures
- Test validation errors

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test Dashboard.test.tsx

# Run tests matching pattern
npm run test -- --grep "dashboard"
```

## Coverage Thresholds
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Example Test Commands

```bash
# Test dashboard components
npm run test src/components/dashboard

# Test API hooks
npm run test src/hooks/useApi

# Test with UI (for debugging)
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Debugging Tests
- Use `screen.debug()` to see rendered HTML
- Use `logRoles(container)` to see available roles
- Use `--reporter=verbose` for detailed output
- Use VS Code debugger with test files

This infrastructure provides a solid foundation for comprehensive frontend testing with realistic scenarios, performance monitoring, and accessibility validation.