# KuzuEventBus Frontend-Backend Integration Plan

## 📋 Executive Summary

This document outlines the plan to complete the integration between the KuzuEventBus frontend and backend systems. Based on the comprehensive audit performed, we have identified critical gaps in backend endpoints and several integration issues that need to be resolved.

**Current Integration Status: 7/10**

- Authentication: ✅ Complete (5/5)
- Database Management: ⚠️ Partial (3/5)
- Query Execution: ⚠️ Partial (3/5)
- Analytics: ❌ Missing (1/5)
- Error Handling: ✅ Excellent (5/5)

## 🎯 Immediate Priorities (Sprint 1)

### Phase 1: Fix Current Integration Issues

#### 1.1 Backend Route Conflicts [HIGH PRIORITY]

**Issue:** Route conflict between databases and queries routers causing database endpoints to be inaccessible.

**Current Problem:**

```python
# In main.py - Route mounting order issue
app.include_router(databases.router, prefix="/api/v1/databases", tags=["databases"])
app.include_router(queries.router, prefix="/api/v1", tags=["queries"])  # Overrides databases
```

**Solution:**

- [x] Identified the conflict
- [x] Fixed router mounting with proper prefixes
- [ ] Test all database endpoints are accessible
- [ ] Verify query endpoints still work correctly

#### 1.2 Frontend API Response Mapping [HIGH PRIORITY]

**Issue:** Field name mismatches between frontend entities and backend responses.

**Backend Response (snake_case):**

```json
{
  "database_id": "123",
  "tenant_id": "tenant-1",
  "created_at": "2025-09-21T10:00:00Z",
  "size_bytes": 1024,
  "table_count": 5,
  "last_accessed": "2025-09-21T09:00:00Z"
}
```

**Frontend Entity (camelCase):**

```typescript
interface Database {
  id: string;
  tenantId: string;
  createdAt: string;
  sizeBytes: number;
  tableCount: number;
  lastAccessed: string;
}
```

**Action Items:**

- [ ] Verify transformation logic in `databaseApi.ts`
- [ ] Test with real backend responses
- [ ] Add response validation

#### 1.3 Test Real Backend Integration [HIGH PRIORITY]

**Tasks:**

- [ ] Start backend services (`make dev-up`)
- [ ] Test database CRUD operations via API
- [ ] Test query submission and status tracking
- [ ] Verify frontend can connect to real backend
- [ ] Test error handling with real backend errors

## 🚀 Major Feature Implementation (Sprint 2-3)

### Phase 2: Missing Backend Endpoints

#### 2.1 Analytics Endpoints [CRITICAL - No backend implementation]

**Missing Endpoints:**

```python
# To be implemented
@router.get("/api/v1/dashboard/stats")
async def get_dashboard_stats():
    """Return aggregated dashboard statistics."""
    pass

@router.get("/api/v1/queries/recent")
async def get_recent_queries(limit: int = 10):
    """Return recent query executions."""
    pass

@router.get("/api/v1/activity/recent")
async def get_recent_activity(limit: int = 10):
    """Return recent platform activity."""
    pass

@router.get("/api/v1/analytics/query-performance")
async def get_query_performance_metrics():
    """Return query performance analytics."""
    pass
```

**Frontend Impact:**

- Dashboard page shows empty/mock data
- Analytics widgets are non-functional
- Performance metrics unavailable

**Implementation Priority:** HIGH

#### 2.2 Query Results & Management [CRITICAL]

**Missing Endpoints:**

```python
@router.get("/api/v1/queries/{transaction_id}/results")
async def get_query_results(transaction_id: UUID):
    """Return query execution results."""
    pass

@router.post("/api/v1/queries/{transaction_id}/cancel")
async def cancel_query(transaction_id: UUID):
    """Cancel a running query."""
    pass

@router.get("/api/v1/databases/{database_id}/queries/history")
async def get_query_history(database_id: UUID, limit: int = 50):
    """Return query history for a database."""
    pass
```

**Frontend Impact:**

- Users can submit queries but can't see results
- No way to cancel long-running queries
- No query history functionality

**Implementation Priority:** CRITICAL

#### 2.3 Database Management Completion [MEDIUM]

**Missing Endpoints:**

```python
@router.get("/api/v1/databases")
async def list_databases():
    """List all databases for tenant."""
    pass

@router.put("/api/v1/databases/{database_id}")
async def update_database(database_id: UUID, data: DatabaseUpdate):
    """Update database metadata."""
    pass

@router.get("/api/v1/databases/{database_id}/stats")
async def get_database_stats(database_id: UUID):
    """Get database statistics and schema info."""
    pass
```

#### 2.4 System Status & Search [LOW PRIORITY]

**Missing Endpoints:**

```python
@router.get("/api/v1/system/status")
async def get_system_status():
    """Return system health and status."""
    pass

@router.post("/api/v1/search")
async def search_content(query: SearchRequest):
    """Search across databases and content."""
    pass
```

## 🔧 Technical Implementation Details

### Database Schema Requirements

**Analytics Tables Needed:**

```sql
-- Query execution tracking
CREATE TABLE query_executions (
    id UUID PRIMARY KEY,
    transaction_id UUID,
    database_id UUID,
    tenant_id UUID,
    query_text TEXT,
    status VARCHAR(20),
    execution_time_ms INTEGER,
    result_count INTEGER,
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Activity log
CREATE TABLE activity_log (
    id UUID PRIMARY KEY,
    tenant_id UUID,
    activity_type VARCHAR(50),
    title VARCHAR(255),
    description TEXT,
    metadata JSONB,
    user_email VARCHAR(255),
    created_at TIMESTAMP
);

-- Dashboard statistics cache
CREATE TABLE dashboard_stats (
    tenant_id UUID PRIMARY KEY,
    total_databases INTEGER,
    total_storage_bytes BIGINT,
    queries_today INTEGER,
    avg_query_time_ms FLOAT,
    active_connections INTEGER,
    last_updated TIMESTAMP
);
```

### API Response Format Standards

**Success Response:**

```json
{
  "data": {
    /* actual response data */
  },
  "status": "success",
  "timestamp": "2025-09-21T10:00:00Z"
}
```

**Error Response:**

```json
{
  "error": {
    "code": "DATABASE_NOT_FOUND",
    "message": "Database with ID 123 not found",
    "details": {}
  },
  "status": "error",
  "timestamp": "2025-09-21T10:00:00Z"
}
```

## 🧪 Testing Strategy

### Phase 1: Integration Testing

- [ ] Set up test database with sample data
- [ ] Create integration test suite for each endpoint
- [ ] Test frontend components with real backend
- [ ] Validate error handling scenarios

### Phase 2: End-to-End Testing

- [ ] User registration flow
- [ ] Database creation and management
- [ ] Query submission and results retrieval
- [ ] Dashboard analytics display

### Phase 3: Performance Testing

- [ ] Query execution performance
- [ ] Dashboard loading times
- [ ] Concurrent user scenarios

## 📅 Timeline & Milestones

### Week 1: Foundation Fixes

- **Days 1-2:** Fix route conflicts and test basic endpoints
- **Days 3-4:** Verify frontend-backend data mapping
- **Day 5:** Integration testing of existing features

### Week 2: Core Analytics Implementation

- **Days 1-3:** Implement dashboard stats endpoint
- **Days 4-5:** Add query results and history endpoints

### Week 3: Query Management Features

- **Days 1-2:** Implement query cancellation
- **Days 3-4:** Add recent queries and activity endpoints
- **Day 5:** Frontend integration testing

### Week 4: Polish & Performance

- **Days 1-2:** System status and search endpoints
- **Days 3-4:** Performance optimization
- **Day 5:** End-to-end testing and documentation

## 🚨 Risk Assessment

### High Risk

- **Route conflicts breaking existing functionality**
  - _Mitigation:_ Comprehensive endpoint testing
- **Data transformation errors causing frontend crashes**
  - _Mitigation:_ Response validation and error boundaries

### Medium Risk

- **Performance issues with analytics queries**
  - _Mitigation:_ Database indexing and caching
- **Concurrent query execution problems**
  - _Mitigation:_ Proper async handling and queue management

### Low Risk

- **UI/UX inconsistencies**
  - _Mitigation:_ Design system compliance
- **Documentation gaps**
  - _Mitigation:_ API documentation updates

## 📊 Success Metrics

### Technical Metrics

- **API Endpoint Coverage:** 100% (currently ~60%)
- **Integration Test Coverage:** >90%
- **Error Rate:** <1% for critical endpoints
- **Response Time:** <500ms for dashboard endpoints

### User Experience Metrics

- **Dashboard Load Time:** <2 seconds
- **Query Result Display Time:** <1 second after completion
- **Error Recovery Success Rate:** >95%

## 🔍 Monitoring & Observability

### Backend Monitoring

- API response times and error rates
- Database query performance
- Queue processing metrics
- Resource utilization

### Frontend Monitoring

- Page load performance
- API error tracking
- User interaction analytics
- Error boundary triggers

## 📝 Documentation Updates Needed

1. **API Documentation:** OpenAPI spec for all endpoints
2. **Integration Guide:** Frontend-backend setup instructions
3. **Error Handling Guide:** Error codes and recovery strategies
4. **Deployment Guide:** Production configuration steps

## 🎯 Definition of Done

**Sprint 1 Complete When:**

- [ ] All database endpoints accessible and tested
- [ ] Frontend successfully connects to real backend
- [ ] Basic CRUD operations work end-to-end
- [ ] Error handling verified with real backend errors

**Full Integration Complete When:**

- [ ] All critical endpoints implemented (analytics, query results)
- [ ] Frontend mock data replaced with real API calls
- [ ] Integration test suite passes
- [ ] Performance metrics met
- [ ] Documentation updated

---

**Next Action:** Begin Phase 1 implementation with route conflict resolution and endpoint testing.

**Review Date:** Weekly review every Friday at 3 PM
**Stakeholders:** Frontend Team, Backend Team, DevOps, Product Owner
