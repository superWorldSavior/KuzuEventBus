# Testing Dependencies for Kuzu EventBus Frontend

Add these dependencies to package.json:

## DevDependencies to add:

```json
{
  "devDependencies": {
    // ... existing devDependencies
    "@testing-library/jest-dom": "^6.1.4",
    "@testing-library/react": "^14.1.2", 
    "@testing-library/user-event": "^14.5.1",
    "@vitest/ui": "^1.0.4",
    "jsdom": "^23.0.1",
    "vitest": "^1.0.4"
  }
}
```

## Scripts to add:

```json
{
  "scripts": {
    // ... existing scripts
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

## Installation command:

```bash
npm install --save-dev @testing-library/jest-dom @testing-library/react @testing-library/user-event @vitest/ui jsdom vitest
```

## Usage:

- `npm test` - Run tests in watch mode
- `npm run test:ui` - Open Vitest UI for interactive testing
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:watch` - Run tests in watch mode (same as npm test)

## Test file patterns:

- `*.test.tsx` - React component tests
- `*.test.ts` - Utility/logic tests  
- `__tests__/*.tsx` - Test files in __tests__ folders

## Coverage reports will be in:

- `coverage/` - HTML coverage reports
- View at `coverage/index.html`