# KuzuEventBus Backend-Frontend Integration Implementation Plan

**Document Version**: 1.0  
**Date**: September 20, 2025  
**Branch**: `front-dev`  
**Status**: Implementation Ready

## 📊 Executive Summary

This document outlines the complete implementation plan to remove mock data dependencies and establish real backend-frontend integration for KuzuEventBus. The plan prioritizes core user functionality while maintaining Feature-Sliced Design (FSD) architecture compliance.

### Current Integration Status
- ✅ **Backend API**: 6 endpoint groups fully implemented (FastAPI)
- ✅ **Authentication**: Customer registration + API key auth working
- ✅ **Health Checks**: Basic monitoring endpoints active
- ❌ **Database Operations**: ~80% mock data dependency
- ❌ **Query Execution**: Partial integration with fallbacks
- ❌ **Real-time Events**: SSE implemented but needs data integration
- ❌ **Analytics**: No backend equivalent (100% mocked)

## 🎯 Implementation Phases

### Phase 1: Core Database Operations (HIGH PRIORITY)
**Timeline**: 1-2 days  
**Dependencies**: None - backend endpoints ready

#### 1.1 Database API Integration
**File**: `frontend/src/features/database-management/services/databaseApi.ts`  
**Status**: 369 lines, ~80% mock data  
**Backend Endpoints**: 
- `GET /api/v1/databases` - List databases
- `POST /api/v1/databases` - Create database  
- `POST /api/v1/databases/{id}/provision` - Provision resources

**Implementation Steps**:
1. **Remove Mock Data Blocks**:
   ```typescript
   // Remove these mock data arrays (lines 8-40)
   const mockData: Database[] = [
     { id: "db-1", name: "social-network", ... },
     // ... more mock databases
   ];
   ```

2. **Update Response Mapping**:
   ```typescript
   // Current mock fallback pattern to remove:
   } catch (error) {
     return handleApiError(endpoint, error, mockData);
   }
   
   // Replace with proper error handling:
   } catch (error) {
     throw handleApiError(endpoint, error);
   }
   ```

3. **Schema Alignment**:
   - Backend returns: `{ database_id, name, description, tenant_id, created_at, size_bytes, table_count }`
   - Frontend expects: `{ id, name, description, tenantId, createdAt, sizeBytes, tableCount }`
   - Update transformation logic to match

**Acceptance Criteria**:
- [ ] All mock data arrays removed
- [ ] Real API responses properly transformed
- [ ] Error handling without mock fallbacks
- [ ] Database CRUD operations work with backend
- [ ] Loading states show during API calls

#### 1.2 Database Management UI Updates
**Files**: 
- `frontend/src/features/database-management/hooks/useDatabases.ts`
- `frontend/src/pages/databases/DatabasesPage.tsx`
- `frontend/src/pages/databases/DatabaseDetailsPage.tsx`

**Implementation Steps**:
1. **Remove Mock Statistics Generation**:
   ```typescript
   // Remove from DatabasesPage.tsx (lines 32-33)
   nodeCount: Math.floor(Math.random() * 10000), // Mock data since not in API yet
   relationshipCount: Math.floor(Math.random() * 50000), // Mock data since not in API yet
   ```

2. **Update useDatabases Hook**:
   - Remove mock data dependencies
   - Implement proper loading states
   - Add real error handling without fallbacks

3. **Database Creation Flow**:
   - Update forms to match backend schemas
   - Add proper validation for required fields
   - Implement creation success/error feedback

**Acceptance Criteria**:
- [ ] No mock data in database listing
- [ ] Real database creation works end-to-end
- [ ] Proper loading states during operations
- [ ] Error messages show real backend errors
- [ ] Database details page shows real data

### Phase 2: Query Execution System (HIGH PRIORITY)
**Timeline**: 2-3 days  
**Dependencies**: Phase 1 completion recommended

#### 2.1 Query API Integration  
**File**: `frontend/src/features/query-execution/services/queryApi.ts`  
**Status**: 331 lines with mock fallbacks  
**Backend Endpoints**:
- `POST /api/v1/databases/{id}/query` - Submit async query (returns transaction_id)
- `GET /api/v1/jobs/{transaction_id}` - Get query status
- `POST /api/v1/queries/{transaction_id}/cancel` - Cancel query

**Implementation Steps**:
1. **Remove Mock Query Results**:
   ```typescript
   // Remove mock result generation (lines 35-50)
   return {
     transactionId,
     status: "completed" as const,
     results: {
       columns: ["n.name", "n.age"],
       rows: [/* mock data */],
     }
   };
   ```

2. **Implement Real Async Flow**:
   - Submit query → get transaction_id
   - Poll status endpoint until completion
   - Fetch results when ready
   - Handle query cancellation

3. **Update Query History**:
   - Remove mock history generation
   - Implement real query history from backend
   - Add proper pagination

**Acceptance Criteria**:
- [ ] Query submission returns real transaction_id
- [ ] Status polling works with backend jobs endpoint
- [ ] Real query results displayed properly
- [ ] Query cancellation works
- [ ] Query history shows real past queries

#### 2.2 Real-time Query Updates
**Files**:
- `frontend/src/shared/hooks/useSSE.ts`
- `frontend/src/shared/hooks/useEnhancedSSE.ts`
- `frontend/src/features/query-execution/hooks/useQueries.ts`

**Backend Endpoint**: `GET /api/v1/events/stream`

**Implementation Steps**:
1. **Connect SSE to Real Events**:
   - Remove mock event generation
   - Connect to backend SSE stream
   - Handle query status update events

2. **Event-Driven Query Updates**:
   - Listen for query completion events
   - Update query status in real-time
   - Handle connection failures gracefully

**Acceptance Criteria**:
- [ ] SSE connects to real backend stream
- [ ] Query status updates in real-time
- [ ] Connection resilience and reconnection
- [ ] No mock events generated

### Phase 3: Authentication & Session Management (MEDIUM PRIORITY)
**Timeline**: 1 day  
**Dependencies**: None

#### 3.1 Enhanced Authentication
**File**: `frontend/src/features/auth/services/authApi.ts`  
**Current Status**: Partially implemented with localStorage fallbacks

**Implementation Steps**:
1. **Add Missing Endpoints**:
   - Customer profile management
   - API key rotation/revocation
   - Session validation

2. **Remove localStorage-Only Logic**:
   - Validate sessions against backend
   - Implement proper token refresh
   - Add session timeout handling

**Acceptance Criteria**:
- [ ] Session validation against backend
- [ ] API key management functionality
- [ ] Proper authentication error handling
- [ ] Token refresh mechanism

### Phase 4: Search & Navigation (MEDIUM PRIORITY)
**Timeline**: 1-2 days  
**Dependencies**: Backend search endpoints needed

#### 4.1 Global Search Implementation
**Files**:
- `frontend/src/shared/ui/layout/SearchBar.tsx` (28 lines mock data)
- `frontend/src/shared/ui/layout/MobileSearchModal.tsx`

**Backend Status**: Needs new search endpoints

**Implementation Steps**:
1. **Design Backend Search API**:
   - `GET /api/v1/search?q={query}&type={databases,queries,entities}`
   - Return unified search results

2. **Remove Mock Search Results**:
   ```typescript
   // Remove from SearchBar.tsx (lines 28-45)
   const mockSearchResults: SearchResult[] = [
     { id: "1", title: "Social Network Database", ... },
     // ... more mock results
   ];
   ```

3. **Implement Real Search**:
   - Connect to backend search API
   - Add search result routing
   - Implement search suggestions

**Acceptance Criteria**:
- [ ] Backend search endpoints implemented
- [ ] Real search results from backend
- [ ] Search result navigation works
- [ ] Search performance optimized

#### 4.2 Tenant Management
**File**: `frontend/src/shared/ui/layout/TenantSwitcher.tsx`  
**Current Status**: Mock tenant data

**Implementation Steps**:
1. **Integrate with Customer System**:
   - Fetch real tenant data from customer API
   - Implement tenant switching logic
   - Handle multi-tenant permissions

**Acceptance Criteria**:
- [ ] Real tenant data from backend
- [ ] Tenant switching functionality
- [ ] Proper multi-tenant isolation

### Phase 5: Analytics & Metrics (LOW PRIORITY)
**Timeline**: 2-3 days  
**Dependencies**: Backend analytics module needed

#### 5.1 Backend Analytics Endpoints
**Status**: Not implemented - needs new backend module

**Required Endpoints**:
- `GET /api/v1/analytics/usage` - Database usage metrics
- `GET /api/v1/analytics/queries` - Query performance stats
- `GET /api/v1/analytics/tenants` - Tenant statistics

#### 5.2 Frontend Analytics Integration
**File**: `frontend/src/features/analytics/services/analyticsApi.ts`

**Implementation Steps**:
1. **Replace Mock Analytics**:
   - Remove all mock data generation
   - Connect to real analytics endpoints
   - Update charts with real data

**Acceptance Criteria**:
- [ ] Backend analytics endpoints implemented
- [ ] Real metrics data displayed
- [ ] Charts and visualizations updated
- [ ] Real-time metrics updates

### Phase 6: Testing & Error Handling (CONTINUOUS)
**Timeline**: Ongoing

#### 6.1 Remove Mock Testing Infrastructure
**Files**: Multiple test files with mock dependencies

**Implementation Steps**:
1. **Update Component Tests**:
   - Remove mock data generators
   - Use real API integration patterns
   - Add integration tests

2. **Clean Up Test Utilities**:
   - Remove unused mock generators
   - Update test helpers
   - Add API error scenario tests

**Acceptance Criteria**:
- [ ] No unused mock generators
- [ ] Integration tests for real API flows
- [ ] Comprehensive error scenario testing

#### 6.2 Enhanced Error Handling
**File**: `frontend/src/shared/lib/errorHandling.ts`

**Implementation Steps**:
1. **Remove Mock Fallbacks**:
   - Remove `hasMockData` logic from error handling
   - Implement proper retry mechanisms
   - Add user-friendly error messages

**Acceptance Criteria**:
- [ ] No mock data fallbacks in error handling
- [ ] Proper retry logic for failed requests
- [ ] Clear user feedback for all error states

## 🔧 Technical Implementation Guidelines

### FSD Architecture Compliance
- **Feature Isolation**: Keep API services in `features/{feature}/services/`
- **Shared Resources**: Common utilities in `shared/api/`
- **Entity Types**: Domain models in `entities/{entity}/`
- **Layer Dependencies**: Maintain proper import hierarchy

### Error Handling Strategy
```typescript
// OLD: Mock fallback pattern (to be removed)
} catch (error) {
  return handleApiError(endpoint, error, mockData);
}

// NEW: Proper error handling
} catch (error) {
  const apiError = handleApiError(endpoint, error);
  throw apiError; // Let components handle appropriately
}
```

### API Response Transformation
```typescript
// Standardize backend → frontend mapping
const transformDatabaseResponse = (backendDb: any): Database => ({
  id: backendDb.database_id,
  name: backendDb.name,
  description: backendDb.description,
  tenantId: backendDb.tenant_id,
  createdAt: backendDb.created_at,
  sizeBytes: backendDb.size_bytes,
  tableCount: backendDb.table_count,
  lastAccessed: backendDb.last_accessed,
});
```

### Testing Strategy
- **Integration Over Unit**: Focus on API integration testing
- **Real Error Scenarios**: Test actual backend error responses
- **Performance Testing**: Measure real API response times
- **End-to-End Flows**: Test complete user workflows

## 📊 Success Metrics

### Phase 1 Success Criteria
- [ ] 0 mock data arrays in database management
- [ ] All database operations use real backend
- [ ] Database creation success rate >95%
- [ ] Loading states work properly

### Phase 2 Success Criteria  
- [ ] Query execution uses async backend flow
- [ ] Real-time status updates via SSE
- [ ] Query cancellation works
- [ ] Query history shows real data

### Overall Success Criteria
- [ ] No mock data in production code paths
- [ ] All user-facing features use real backend
- [ ] Error handling without mock fallbacks
- [ ] Comprehensive integration test coverage
- [ ] Performance metrics within acceptable ranges

## 🚀 Getting Started

### Prerequisites
1. Backend services running (`docker-compose up -d`)
2. Frontend dev server running (`npm run dev`)
3. API key authentication working
4. Backend endpoints returning expected schemas

### Implementation Order
1. Start with Phase 1.1 (Database API Integration)
2. Complete Phase 1 before moving to Phase 2
3. Run tests after each phase completion
4. Deploy to staging environment for validation

### Risk Mitigation
- **Gradual Rollout**: Implement behind feature flags if needed
- **Rollback Plan**: Keep mock data in git history for emergency rollback
- **Monitoring**: Add API performance monitoring
- **User Feedback**: Collect user experience feedback during rollout

---

**Next Steps**: Begin implementation with Phase 1.1 - Database API Integration