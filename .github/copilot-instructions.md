# GitHub Copilot Instructions for Kuzu EventBus

## Project Overview

Kuzu EventBus is a multi-tenant SaaS platform for managing Kuzu graph databases. The project consists of a FastAPI backend and React/TypeScript frontend with modern architecture patterns.

## Architecture & Stack

### Backend (FastAPI + Python)

- **Framework**: FastAPI with Clean Architecture (Domain-Driven Design)
- **Structure**: API → Application → Domain → Infrastructure layers
- **Database**: Currently in-memory for MVP (YAGNI approach), PostgreSQL planned
- **Authentication**: Simple API key based (JWT planned)
- **Multi-tenancy**: Isolated customer accounts with tenant-specific data

### Frontend (React + TypeScript)

- **Framework**: React 18 with TypeScript, Vite build tool
- **UI**: shadcn/ui components + Tailwind CSS
- **State Management**:
  - Zustand for global state (auth, navigation)
  - TanStack Query (React Query) for server state
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts + D3.js for visualizations

## Development Principles

### 1. YAGNI (You Aren't Gonna Need It)

- Start with simplest implementation that works
- Use in-memory storage for MVP validation
- Add complexity only when needed
- Example: Dict storage → PostgreSQL when >100 tenants

### 2. Clean Architecture (Backend)

- **Domain**: Business logic, entities, value objects
- **Application**: Use cases, services, DTOs
- **Infrastructure**: External concerns (DB, auth, notifications)
- **API**: Controllers, middleware, routing

### 3. Type Safety First

- Strict TypeScript configuration
- Pydantic models for all API contracts
- Shared type definitions between frontend/backend
- Runtime validation with Zod

## Code Generation Guidelines

### Backend Patterns

#### API Endpoints

```python
from fastapi import APIRouter, Depends, HTTPException
from src.application.dtos.customer_account import CustomerRequest, CustomerResponse
from src.application.services.customer_account_service import CustomerAccountService

router = APIRouter()

@router.post("/register", response_model=CustomerResponse)
async def register_customer(
    request: CustomerRequest,
    service: CustomerAccountService = Depends(get_customer_service),
) -> CustomerResponse:
    try:
        result = await service.register_customer(**request.model_dump())
        return CustomerResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

#### Service Layer

```python
class CustomerAccountService:
    def __init__(
        self,
        account_repository: AccountRepository,
        auth_service: AuthService,
        notification_service: NotificationService,
    ):
        self._account_repo = account_repository
        self._auth_service = auth_service
        self._notification_service = notification_service

    async def register_customer(self, **kwargs) -> Dict[str, Any]:
        # Business logic here
        pass
```

#### DTOs (Data Transfer Objects)

```python
from pydantic import BaseModel, EmailStr, Field, field_validator

class CustomerRequest(BaseModel):
    tenant_name: str = Field(..., min_length=3, pattern=r"^[a-z0-9][a-z0-9-]*[a-z0-9]$")
    admin_email: EmailStr
    organization_name: str = Field(..., min_length=2, max_length=100)

    @field_validator("tenant_name")
    @classmethod
    def validate_tenant_name(cls, v):
        if "--" in v:
            raise ValueError("Consecutive hyphens not allowed")
        return v.lower()
```

### Frontend Patterns

#### Component Structure

```typescript
interface ComponentProps {
  title: string;
  isLoading?: boolean;
  onAction?: () => void;
  className?: string;
}

export function Component({
  title,
  isLoading = false,
  onAction,
  className,
}: ComponentProps) {
  return (
    <div className={cn("base-styles", className)}>
      {isLoading ? <Skeleton /> : <Content />}
    </div>
  );
}
```

#### API Integration

```typescript
// services/api.ts
export const apiService = {
  async registerCustomer(data: CustomerRegistrationRequest) {
    const response = await apiClient.post("/api/v1/customers/register", data);
    return response.data;
  },
};

// hooks/useApi.ts
export function useCustomerRegistration() {
  return useMutation({
    mutationFn: apiService.registerCustomer,
    onSuccess: (data) => {
      // Handle success
    },
    onError: (error) => {
      // Handle error
    },
  });
}
```

#### State Management

```typescript
// Zustand for global state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: "auth-storage" }
  )
);

// React Query for server state
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiService.getDashboardStats(),
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
```

## File Organization

### Backend Structure

```
src/
├── api/                    # FastAPI routes and middleware
│   ├── main.py            # FastAPI app configuration
│   ├── routers/           # API endpoints
│   └── middleware/        # Auth, CORS, etc.
├── application/           # Application layer
│   ├── dtos/             # Request/Response models
│   ├── services/         # Business logic services
│   └── usecases/         # Use case implementations
├── domain/               # Domain layer
│   ├── entities/         # Business entities
│   ├── value_objects/    # Domain value objects
│   └── ports/           # Interface definitions
└── infrastructure/       # Infrastructure layer
    ├── database/         # Database implementations
    ├── auth/            # Authentication providers
    └── cache/           # Caching implementations
```

### Frontend Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── charts/          # Chart components
│   ├── dashboard/       # Dashboard-specific components
│   ├── layout/          # Layout components
│   └── databases/       # Database management components
├── hooks/               # Custom React hooks
├── pages/               # Page components (route level)
├── services/            # API clients and external services
├── store/               # Zustand stores
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── lib/                # Third-party library configurations
```

## Import Conventions

### Backend

```python
# Standard library imports
import os
from datetime import datetime
from typing import Dict, List, Optional

# Third-party imports
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

# Local imports
from src.domain.entities.customer import Customer
from src.application.services.customer_service import CustomerService
```

### Frontend

```typescript
// React and external packages
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

// Internal components and hooks
import { Button } from "@/components/ui/button";
import { useDashboardStats } from "@/hooks/useApi";

// Types (separate import)
import type { User, DashboardStats } from "@/types/api";

// Utils and constants
import { cn, formatDate } from "@/utils";
```

## API Contract Standards

### Request/Response Consistency

```typescript
// Always match backend DTOs exactly
interface CustomerRegistrationRequest {
  tenant_name: string; // snake_case to match Python
  organization_name: string;
  admin_email: string;
}

interface CustomerRegistrationResponse {
  customer_id: string;
  tenant_name: string;
  organization_name: string;
  admin_email: string;
  api_key: string;
  subscription_status: string;
  created_at: string;
}
```

### Error Handling

```typescript
// Frontend error handling
const {
  mutate: register,
  isLoading,
  error,
} = useMutation({
  mutationFn: apiService.registerCustomer,
  onError: (error: AxiosError<ErrorResponse>) => {
    if (error.response?.status === 409) {
      toast.error("Tenant name already exists");
    } else {
      toast.error(error.response?.data?.detail || "Registration failed");
    }
  },
});
```

```python
# Backend error handling
@router.post("/register")
async def register_customer(request: CustomerRequest) -> CustomerResponse:
    try:
        result = await service.register_customer(**request.model_dump())
        return CustomerResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
```

## Testing Guidelines

### Backend Testing

```python
import pytest
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)

def test_register_customer_success():
    response = client.post("/api/v1/customers/register", json={
        "tenant_name": "test-company",
        "organization_name": "Test Company",
        "admin_email": "admin@test.com"
    })
    assert response.status_code == 200
    assert response.json()["tenant_name"] == "test-company"
```

### Frontend Testing

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CustomerRegistration } from "./CustomerRegistration";

test("renders registration form", () => {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <CustomerRegistration />
    </QueryClientProvider>
  );

  expect(screen.getByLabelText(/tenant name/i)).toBeInTheDocument();
});
```

## Performance Considerations

### Frontend Optimization

- Use `React.memo()` for expensive components
- Implement virtual scrolling for large lists
- Use `useMemo()` and `useCallback()` for expensive calculations
- Code splitting with `React.lazy()` for route-level components
- Optimize bundle size with proper tree shaking

### Backend Optimization

- Use async/await for all I/O operations
- Implement proper connection pooling
- Add caching layers (Redis planned)
- Use database indexes for query optimization
- Implement rate limiting for API endpoints

## Security Guidelines

### Backend Security

- Validate all input with Pydantic models
- Implement proper authentication and authorization
- Use HTTPS only in production
- Sanitize all database queries
- Implement rate limiting

### Frontend Security

- Validate all user inputs with Zod schemas
- Sanitize data before rendering
- Use proper CORS configuration
- Store sensitive data securely
- Implement proper logout functionality

## Documentation Standards

### Code Comments

```python
# Backend - focus on business logic
async def register_customer(self, tenant_name: str, **kwargs) -> Dict[str, Any]:
    """
    Register a new customer account with multi-tenant isolation.

    Args:
        tenant_name: Unique identifier for the tenant namespace
        **kwargs: Additional customer data (email, organization, etc.)

    Returns:
        Dictionary containing customer data and generated API key

    Raises:
        ValueError: If tenant_name format is invalid
        ConflictError: If tenant already exists
    """
```

```typescript
// Frontend - focus on component API
interface DashboardStatsProps {
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
  /** Whether to show loading skeleton on initial load */
  showInitialLoading?: boolean;
  /** Callback when data is successfully loaded */
  onDataLoaded?: (stats: DashboardStats) => void;
}

/**
 * Dashboard statistics widget with real-time updates.
 *
 * Displays key metrics like database count, storage usage, and query performance.
 * Automatically refreshes data every 30 seconds.
 */
export function DashboardStats({ refreshInterval = 30000 }: DashboardStatsProps) {
```

## Current Implementation Status

### ✅ Completed (Backend)

- Customer registration endpoint with validation
- Health check endpoints for operational monitoring
- Clean architecture foundation with proper separation
- In-memory storage for MVP validation
- Basic error handling and logging

### ✅ Completed (Frontend)

- React/TypeScript foundation with Vite
- Component library setup (shadcn/ui + Tailwind)
- State management (Zustand + React Query)
- Basic dashboard layout with responsive design
- Authentication store and routing setup

### 🚧 In Progress

- Database management endpoints (create, list, delete)
- Dashboard metrics and widgets
- API integration between frontend and backend
- Query execution interface

### 📋 Planned

- User authentication with JWT tokens
- Query builder with Monaco editor
- D3.js network visualizations
- WebSocket support for real-time updates
- PostgreSQL migration for persistence

When working on this codebase, prioritize:

1. **Type safety** - Always use proper TypeScript/Pydantic types
2. **YAGNI principle** - Implement the simplest solution that works
3. **Consistency** - Follow established patterns and conventions
4. **Testing** - Write tests for business logic and user interactions
5. **Documentation** - Update documentation when adding new features

Focus on completing the current dashboard implementation before adding new features.
