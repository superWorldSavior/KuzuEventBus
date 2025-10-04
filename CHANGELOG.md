# Changelog - Kuzu Event Bus

## [Unreleased] - 2025-10-04

### 🎉 Major Features

#### Database Branching (Git-like versioning)
- **Branch management**: Create isolated copies of databases for testing/development
- **Safe testing**: Test migrations on branches without affecting production
- **Merge or discard**: Merge branches back or discard them
- **Clean Architecture**: Full refactoring with domain entities, use cases, and thin controllers

**Backend**:
- Domain: `Branch` entity, `BranchName` value object with validation
- Application: 4 use cases (`CreateBranchUseCase`, `MergeBranchUseCase`, `DeleteBranchUseCase`, `ListBranchesUseCase`)
- Presentation: Thin controllers in `api/branches/`
- Endpoints:
  - `POST /api/v1/branches/` - Create branch
  - `POST /api/v1/branches/{branch}/merge` - Merge branch
  - `DELETE /api/v1/branches/{branch}` - Delete branch
  - `GET /api/v1/branches/of/{database}` - List branches

**SDK** (v0.4.0):
```typescript
const branch = await client.branches.create({
  sourceDatabase: 'prod-db',
  branchName: 'test-migration',
  fromSnapshot: 'latest'
});

await client.executeQuery(branch.fullName, '...');
await client.branches.merge(branch.fullName, { targetDatabase: 'prod-db' });
```

#### Time Travel API (PITR - Point-In-Time Recovery)
- **Automatic tracking**: All changes tracked via snapshots + WAL
- **Preview mode**: Non-destructive preview of past states
- **Precise restore**: Restore to any timestamp (second precision)
- **Human timestamps**: Support for 'yesterday', '2 hours ago', etc.

**Backend**:
- PITR endpoints for timeline, preview, and restore
- Bookmark management for named restore points

**SDK** (v0.3.0+):
```typescript
// View history
const history = await client.timeTravel.viewHistory('my-db', {
  from: 'yesterday',
  includeQueries: true
});

// Preview (safe)
const preview = await client.timeTravel.preview('my-db', {
  at: '2 hours ago',
  query: 'MATCH (n) RETURN count(n)'
});

// Restore
await client.timeTravel.goBackTo('my-db', '2 hours ago');
```

#### Database Name Resolution
- **UUID or Name**: All endpoints now accept database names OR UUIDs
- **User-friendly**: Use `'my-social-network'` instead of `'550e8400-...'`
- **Tenant-scoped**: Names are unique per tenant

**Backend**:
- `resolve_database_id()` helper in all routes
- Automatic resolution from name to UUID

**SDK**:
```typescript
// Works with names everywhere
await client.getDatabase('my-db');
await client.executeQuery('my-db', 'MATCH (n) RETURN n');
await client.deleteDatabase('my-db');
```

#### Settings Page (Frontend)
- **API Key display**: Fetch and display user's API key
- **YAGNI design**: Only API URL and API Key (no mock features)
- **Copy functionality**: One-click copy for URL and key
- **Show/Hide**: Toggle API key visibility

**Backend**:
- New endpoint: `GET /api/v1/auth/me` - Returns customer profile + API key

**Frontend**:
- Simplified `SettingsPage.tsx` with clean UI
- Fetches API key via `/auth/me`

### 🔧 Improvements

- **SDK v0.4.0**: Branches API + complete examples
- **SDK v0.3.0**: Time Travel API (simplified, no checkpoints)
- **SDK v0.2.0**: Aligned types with backend DTOs
- **Validation**: Database name uniqueness check on creation
- **Documentation**: Complete README updates with all features

### 📦 SDK Changes

**v0.4.0**:
- Added `client.branches.*` API
- Git-like branching for databases
- Complete workflow examples

**v0.3.0**:
- Added `client.timeTravel.*` API
- Removed checkpoints (YAGNI - automatic PITR is enough)
- Human-friendly timestamps

**v0.2.0**:
- Fixed `listDatabases()` mapping
- Added `getJobResults()` method
- `executeQuery()` now polls and fetches results automatically

### 🏗️ Architecture

**Clean Architecture refactoring**:
- Domain layer: `domain/branching/` with entities and value objects
- Application layer: `application/usecases/branching/` with 4 use cases
- Presentation layer: Thin controllers in `presentation/api/branches/`
- Dependency injection via FastAPI `Depends()`

**Benefits**:
- Testable use cases
- Clear separation of concerns
- DDD-compliant
- Easily extensible

### 🗂️ Files Created/Modified

**Backend**:
- `domain/branching/` (new)
- `application/dtos/branching.py` (new)
- `application/usecases/branching/` (new)
- `presentation/api/branches/` (new)
- `presentation/api/auth/routes.py` (modified - added `/me`)
- `presentation/api/databases/routes.py` (modified - name resolution)
- `presentation/api/queries/routes.py` (modified - name resolution)

**Frontend**:
- `pages/settings/SettingsPage.tsx` (simplified)
- `shared/api/client.ts` (added `getMe()`)

**SDK**:
- `src/branches.ts` (new)
- `src/timeTravel.ts` (new)
- `src/client.ts` (modified - added branches + timeTravel)
- `examples/complete-workflow.ts` (new)

### 🧪 Tests

- Unit tests for `resolve_database_id()` (3/3 passed)
- All existing tests still passing
- Domain validation tests for `BranchName`

### 📚 Documentation

- Complete README updates for all features
- PUBLISH.md with GitHub Packages instructions
- Inline JSDoc for all SDK methods
- Examples for common workflows

---

## Previous versions

See git history for changes before 2025-10-04.
