# Frontend Integration Guide

## 🎯 Quick Start

This guide helps you understand and work with the Kuzu Event Bus frontend's backend integration.

## 🔗 API Integration Overview

The frontend uses a service layer (`/src/services/api.ts`) that automatically handles:
- ✅ API key authentication  
- ✅ Error handling and mock data fallbacks
- ✅ Endpoint status tracking
- ✅ Request/response typing

## 🔐 Authentication Setup

### Automatic API Key Management
```typescript
// 1. Register customer (stores API key automatically)
const response = await apiService.registerCustomer({
  tenant_name: "my-startup",
  organization_name: "My Startup Inc", 
  admin_email: "dev@mystartup.com"
});
// API key automatically stored in localStorage as 'kuzu_api_key'

// 2. All subsequent API calls automatically include the API key
const databases = await apiService.getDatabases();
```

### Manual API Key Management
```typescript
// Set API key manually
apiService.setApiKey('kb_your_api_key_here');

// Get current API key  
const currentKey = apiService.getApiKey();

// Clear API key (logout)
apiService.clearApiKey();
```

## 📊 Working with Backend Status

### Check Integration Status
```typescript
import { getBackendIntegrationStatus } from '@/services/api';

// Get status of all endpoints
const status = getBackendIntegrationStatus();

// Filter by status type
const notImplemented = status.filter(s => s.status === 'not_implemented');
const missing = status.filter(s => s.status === 'missing');

console.table(notImplemented);
```

### Handle Different Backend States
```typescript
async function handleDatabaseOperation() {
  try {
    // This will work if backend is implemented
    const databases = await apiService.getDatabases();
    return databases;
  } catch (error) {
    if (error.message.includes('not yet implemented')) {
      // Show user that feature is coming soon
      showNotification('Database management is coming soon!', 'info');
    } else if (error.message.includes('Backend unavailable')) {
      // Show user that backend is down
      showNotification('Service temporarily unavailable', 'error');
    }
    throw error;
  }
}
```

## 🚀 Using the API Service

### Health Checks (✅ Working)
```typescript
// Check if backend is healthy
const health = await apiService.checkHealth();
// Returns: { status: "healthy", service: "kuzu-event-bus" }

// Check if backend is ready
const ready = await apiService.checkReadiness(); 
// Returns: { status: "ready", service: "kuzu-event-bus" }
```

### Customer Management (✅ Working)
```typescript
// Register new customer
const customer = await apiService.registerCustomer({
  tenant_name: "my-company",
  organization_name: "My Company Inc",
  admin_email: "admin@mycompany.com"
});
// Returns: CustomerRegistrationResponse with API key
```

### Database Operations (🚧 Mock Data)
```typescript
// Get databases (returns mock data currently)
const databases = await apiService.getDatabases();

// Create database (simulated currently)
const newDb = await apiService.createDatabase({
  name: "my-graph-db",
  description: "My graph database"
});

// Get specific database (mock data)
const database = await apiService.getDatabase("db-123");

// Update database (simulated)
const updated = await apiService.updateDatabase("db-123", {
  name: "updated-name",
  description: "Updated description"  
});

// Delete database (simulated)
await apiService.deleteDatabase("db-123");
```

### Query Execution (⚠️ Partial)
```typescript
// Submit query (✅ works, returns transaction_id)
const queryResponse = await apiService.submitQuery("db-123", {
  query: "MATCH (n) RETURN count(n) as node_count",
  parameters: {},
  timeout_seconds: 30
});
// Returns: { transaction_id: "uuid", status: "pending", ... }

// Check query status (✅ works)  
const status = await apiService.getQueryStatus(queryResponse.transaction_id);
// Returns: QueryStatusResponse with current status

// Get query results (❌ not implemented yet)
try {
  const results = await apiService.getQueryResults(queryResponse.transaction_id);
} catch (error) {
  // Will throw error - endpoint doesn't exist yet
}

// Cancel query (❌ not implemented yet)
try {
  await apiService.cancelQuery(queryResponse.transaction_id);
} catch (error) {  
  // Will throw error - endpoint doesn't exist yet
}
```

### File Upload (❌ Mock Only)
```typescript
// Upload file (simulated with progress)
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
const file = fileInput.files[0];

const result = await apiService.uploadDatabaseFile(
  "db-123", 
  file,
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
  }
);
// Returns simulated success response
```

### Analytics & Dashboard (❌ Mock Data Only)
```typescript
// Dashboard stats (mock data)
const stats = await apiService.getDashboardStats();

// Recent queries (mock data)
const recentQueries = await apiService.getRecentQueries(10);

// Recent activity (mock data)  
const activity = await apiService.getRecentActivity(10);

// Performance metrics (mock data)
const metrics = await apiService.getPerformanceMetrics("7d");
```

## 🎨 UI Integration Patterns

### Error Handling in Components
```typescript
import { useState } from 'react';
import { apiService } from '@/services/api';

function DatabaseList() {
  const [databases, setDatabases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDatabases = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiService.getDatabases();
      setDatabases(data);
    } catch (err) {
      if (err.message.includes('not yet implemented')) {
        // Feature coming soon - show with mock data
        setError({ type: 'not_implemented', message: 'Database management coming soon!' });
      } else {
        // Real error
        setError({ type: 'error', message: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error?.type === 'not_implemented' && (
        <div className="bg-blue-50 p-4 rounded">
          <p>🚧 {error.message}</p>
          <p className="text-sm">Mock data shown for UI development</p>
        </div>
      )}
      
      {error?.type === 'error' && (
        <div className="bg-red-50 p-4 rounded">
          <p>❌ {error.message}</p>
        </div>
      )}
      
      {/* Render databases list */}
    </div>
  );
}
```

### Real-time Integration (✅ Working)
```typescript
import { useSSE } from '@/hooks/useSSE';

function RealTimeUpdates() {
  const { data, error, isConnected } = useSSE({
    url: '/api/v1/events/stream',
    onMessage: (event) => {
      console.log('Received event:', event.data);
    }
  });

  return (
    <div>
      Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      {data && <div>Latest: {JSON.stringify(data)}</div>}
    </div>
  );
}
```

## 🛠️ Development Workflow

### Working with Mock Data
1. **UI Development:** Mock data allows full UI development
2. **Testing:** Test all user interactions and edge cases  
3. **Backend Integration:** When backend endpoints are ready, remove mock fallbacks
4. **Error Handling:** Handle both mock and real data scenarios

### Transitioning to Real Backend
```typescript
// Before: Always returns mock data on error
catch (error) {
  console.warn("Using mock data");
  return mockData;
}

// After: Explicit backend status handling
catch (error) {
  return handleBackendError(endpoint, error, mockData);
}

// Future: Remove mock data when backend is ready
catch (error) {
  // No more mock data - handle real errors
  throw error;
}
```

### Testing Backend Integration
```typescript
// Test endpoint status
async function testBackendEndpoints() {
  const endpoints = [
    { name: 'Health', fn: () => apiService.checkHealth() },
    { name: 'Register', fn: () => apiService.registerCustomer(testData) },
    { name: 'Databases', fn: () => apiService.getDatabases() }
  ];

  for (const endpoint of endpoints) {
    try {
      await endpoint.fn();
      console.log(`✅ ${endpoint.name} - Working`);
    } catch (error) {
      if (error.message.includes('not yet implemented')) {
        console.log(`🚧 ${endpoint.name} - Not implemented`);
      } else {
        console.log(`❌ ${endpoint.name} - Error:`, error.message);
      }
    }
  }
}
```

## 📱 User Experience Considerations

### Loading States
```typescript
// Show different loading states based on backend status
if (isLoading) {
  if (endpoint.status === 'not_implemented') {
    return <div>Loading mock data...</div>;
  } else {
    return <div>Loading real data...</div>;
  }
}
```

### User Feedback
```typescript
// Inform users about backend status
function FeatureStatus({ endpoint }) {
  const status = getEndpointStatus(endpoint);
  
  if (status === 'not_implemented') {
    return (
      <div className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
        🚧 Coming Soon
      </div>
    );
  }
  
  return null;
}
```

## 🔍 Debugging

### Common Issues

**"API key not working"**
```typescript
// Check API key is stored and formatted correctly
const apiKey = apiService.getApiKey();
console.log('API Key:', apiKey?.startsWith('kb_') ? 'Valid format' : 'Invalid format');
```

**"Getting mock data instead of real data"**
```typescript
// Check endpoint status
import { getBackendIntegrationStatus } from '@/services/api';
const status = getBackendIntegrationStatus();
const endpoint = status.find(s => s.endpoint === 'GET /api/v1/databases');
console.log('Endpoint status:', endpoint.status);
```

**"Real-time events not working"**
```typescript
// Check SSE connection
const sseStatus = useSSE({ 
  url: '/api/v1/events/stream',
  onOpen: () => console.log('SSE connected'),
  onError: (error) => console.error('SSE error:', error)
});
```

## 🎯 Best Practices

1. **Always handle both mock and real data scenarios**
2. **Provide clear feedback about backend integration status**  
3. **Use TypeScript types for all API interactions**
4. **Test error scenarios and network issues**
5. **Keep mock data realistic and helpful for development**
6. **Monitor backend integration status in development**

---

**Need Help?** 
- Check `/docs/backend-integration-status.md` for current endpoint status
- Use browser dev tools to inspect API calls and responses
- Review backend API docs at `http://localhost:8000/docs`