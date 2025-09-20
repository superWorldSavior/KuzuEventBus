# GitHub Copilot Instructions for KuzuEventBus Frontend

## Project Overview

KuzuEventBus is a modern web application with a React/TypeScript frontend and Python FastAPI backend. The frontend follows **Feature-Sliced Design (FSD)** architecture principles, providing clear business feature boundaries and scalable organization for the multi-tenant SaaS application.

### Development Methodologies

- **TDD (Test-Driven Development)**: Tests first, code second
- **XP (eXtreme Programming)**: Continuous integration, permanent refactoring
- **DDD (Domain-Driven Design)**: Business-centered modeling
- **Fail Fast**: Quick error detection, strict validation
- **Feature-Sliced Design**: Business feature-driven architecture with clear layers

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand for global state
- **Data Fetching**: Axios with React Query (@tanstack/react-query)
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives with custom styling
- **Icons**: Lucide React
- **Charts**: Recharts and D3.js
- **Code Editor**: Monaco Editor

## Architecture Patterns - Feature-Sliced Design (FSD)

### FSD Layer Structure

The frontend follows **Feature-Sliced Design** with the following layer hierarchy:

```
src/
├── app/               # Application layer - routing, providers, global setup
│   ├── providers/     # Context providers (RealTimeProvider)
│   └── stores/        # App-level state (navigation, notifications, toasts)
├── pages/             # Page compositions - route entry points
│   ├── auth/          # Authentication pages
│   ├── dashboard/     # Dashboard page compositions
│   ├── databases/     # Database management pages
│   ├── queries/       # Query execution pages
│   ├── analytics/     # Analytics pages
│   ├── search/        # Search pages
│   ├── settings/      # Settings pages
│   └── visualizations/ # Visualization pages
├── widgets/           # Complex UI blocks - dashboard widgets, sections
│   ├── dashboard/     # Dashboard-specific widgets
│   ├── visualizations/ # Visualization widgets
│   └── charts/        # Chart widgets
├── features/          # Business features - core functionality
│   ├── auth/          # Authentication feature
│   │   ├── components/# Feature-specific components
│   │   ├── hooks/     # Feature-specific hooks
│   │   ├── services/  # Feature API calls
│   │   ├── stores/    # Feature state management
│   │   └── types/     # Feature type definitions
│   ├── auth/          # Authentication feature
│   ├── database-management/  # Database CRUD operations
│   ├── query-execution/      # Query running and results
│   ├── analytics/    # Analytics and reporting
│   └── search/       # Search functionality
├── entities/          # Business entities - domain models
│   ├── customer/      # Customer entity (types, validation)
│   ├── database/      # Database entity
│   ├── query/         # Query entity
│   └── tenant/        # Tenant entity
├── shared/            # Shared resources across features
│   ├── ui/            # Design system components (shadcn/ui)
│   ├── api/           # API client configuration
│   ├── hooks/         # Shared hooks and utilities
│   ├── lib/           # Utility functions and helpers
│   ├── types/         # Technical type definitions
│   ├── config/        # Configuration constants
│   └── dev/           # Development tools and debugging
```

### FSD Layer Rules (STRICT)

1. **Import Direction**: Higher layers can import from lower layers only

   ```
   app → pages → widgets → features → entities → shared
   ```

2. **Feature Isolation**: Features should not import from other features directly

   - Use `entities/` for shared business logic
   - Use `shared/` for technical utilities

3. **Business Logic Location**:
   - **Features**: Feature-specific business logic, components, and state
   - **Entities**: Cross-feature business models and validation
   - **Shared**: Technical utilities without business context

### Current Migration Status

**✅ FSD Migration Complete (100% FSD-compliant):**

The frontend has been successfully migrated to full FSD compliance with the following structure:

```
src/
├── app/              # ✅ Application layer
│   ├── providers/    # Context providers (RealTimeProvider)
│   └── stores/       # App-level state (navigation, notifications, toasts)
├── pages/            # ✅ Page compositions (already correct)
├── widgets/          # ✅ Complex UI blocks
│   ├── dashboard/    # Dashboard widgets (migrated from components/dashboard/)
│   ├── visualizations/ # Visualization widgets (migrated from components/visualizations/)
│   └── charts/       # Chart widgets (migrated from components/charts/)
├── features/         # ✅ Business features
│   ├── auth/         # Authentication (existing + migrated components)
│   ├── database-management/ # Database CRUD (existing structure)
│   ├── query-execution/     # Query running (existing + migrated stores)
│   ├── analytics/    # Analytics & reporting (existing structure)
│   └── search/       # Search functionality (migrated from components/search/)
├── entities/         # ✅ Business entities (already well-structured)
├── shared/           # ✅ Shared resources
│   ├── ui/           # Design system components (shadcn/ui)
│   ├── api/          # API client (migrated from services/api.ts)
│   ├── hooks/        # Shared hooks (migrated from hooks/)
│   ├── lib/          # Utilities (existing structure)
│   ├── types/        # Technical types (migrated from types/)
│   └── dev/          # Development tools (migrated from components/debug/)
```

**Migration Complete**: All legacy directories (`components/`, `hooks/`, `services/`, `store/`, `types/`, `contexts/`) have been removed and content properly distributed to FSD layers.

### File Structure Guidelines

### Import Conventions (FSD-compliant)

- **Path Aliases**: Use FSD-aware path aliases defined in `tsconfig.json`

  ```typescript
  // Correct FSD imports
  import { Button } from "@/shared/ui/button";
  import { useAuth } from "@/features/auth/hooks/useAuth";
  import { CustomerEntity } from "@/entities/customer";
  import { DashboardMetrics } from "@/widgets/dashboard/DashboardMetrics";
  import { apiClient } from "@/shared/api/client";
  import { useNotifications } from "@/shared/hooks/useNotifications";
  ```

- **Layer Import Rules**:

  ```typescript
  // ✅ ALLOWED - Higher to lower layer imports
  import { AuthForm } from "@/features/auth/components/AuthForm"; // pages → features
  import { CustomerType } from "@/entities/customer"; // features → entities
  import { cn } from "@/shared/lib/utils"; // any → shared

  // ❌ FORBIDDEN - Cross-feature imports
  import { DatabaseService } from "@/features/database-management/services"; // features → features

  // ✅ CORRECT - Use entities for cross-feature communication
  import { DatabaseEntity } from "@/entities/database"; // features → entities
  ```

- **Import Grouping Order**:
  1. External packages
  2. Internal app imports (higher layers)
  3. Same-layer imports
  4. Lower layer imports (entities, shared)
  5. Type imports (with `import type`)

### Component Patterns (FSD-Enhanced)

1. **Feature Components**: Components within features should be focused on that feature's domain

   ```typescript
   // features/auth/components/LoginForm.tsx
   interface LoginFormProps {
     onSuccess?: () => void;
   }

   export function LoginForm({ onSuccess }: LoginFormProps) {
     // Feature-specific login logic
     return <form>...</form>;
   }
   ```

2. **Widget Components**: Complex UI blocks that compose multiple features

   ```typescript
   // widgets/dashboard/MetricsWidget.tsx
   import { useAuth } from "@/features/auth/hooks/useAuth";
   import { useDashboardMetrics } from "@/features/analytics/hooks/useDashboardMetrics";

   export function MetricsWidget() {
     // Compose multiple features into a widget
   }
   ```

3. **Shared UI Components**: Reusable, business-agnostic components

   ```typescript
   // shared/ui/button.tsx
   interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
     variant?: "primary" | "secondary";
   }

   export function Button({ variant = "primary", ...props }: ButtonProps) {
     return <button className={cn(buttonVariants({ variant }))} {...props} />;
   }
   ```

4. **Entity Models**: Business domain objects with validation

   ```typescript
   // entities/customer/model.ts
   import { z } from "zod";

   export const CustomerSchema = z.object({
     id: z.string(),
     name: z.string().min(1),
     email: z.string().email(),
   });

   export type Customer = z.infer<typeof CustomerSchema>;
   ```

### State Management (FSD-Distributed)

- **Feature Stores**: Keep feature-specific state within the feature

  ```typescript
  // features/auth/stores/authStore.ts
  export const useAuthStore = create<AuthState>(() => ({
    user: null,
    isAuthenticated: false,
  }));
  ```

  ```typescript
  // features/query-execution/stores/queryBuilder.ts
  export const useQueryBuilderStore = create<QueryBuilderState>(() => ({
    nodes: [],
    connections: [],
  }));
  ```

- **App-Level Stores**: Cross-cutting concerns in app layer

  ```typescript
  // app/stores/navigation.ts
  export const useNavigationStore = create<NavigationState>(() => ({
    currentPath: "/",
    breadcrumbs: [],
  }));
  ```

  ```typescript
  // app/stores/notifications.ts
  export const useNotificationStore = create<NotificationState>(() => ({
    notifications: [],
  }));
  ```

- **React Query**: Server state management with feature-specific query keys

  ```typescript
  // features/database-management/hooks/useDatabases.ts
  export function useDatabases() {
    return useQuery({
      queryKey: ["databases"],
      queryFn: () => databaseApi.getAll(),
    });
  }
  ```

- **Entity Validation**: Use entities for cross-feature data validation
  ```typescript
  // entities/database/validation.ts
  export const DatabaseSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    tenantId: z.string(),
  });
  ```

### Type Safety (FSD Entity-Driven)

- **Entity Types**: Define business models in entities layer

  ```typescript
  // entities/query/types.ts
  export interface Query {
    id: string;
    content: string;
    databaseId: string;
    status: "pending" | "running" | "completed" | "failed";
  }
  ```

- **Feature-Specific Types**: Keep feature types within features

  ```typescript
  // features/auth/types/index.ts
  export interface LoginCredentials {
    email: string;
    password: string;
  }
  ```

- **Shared Technical Types**: Common technical types in shared layer

  ```typescript
  // shared/types/api.ts
  export interface ApiResponse<T> {
    data: T;
    status: number;
    message?: string;
  }
  ```

  ```typescript
  // shared/types/query-api.ts (migrated from types/query.ts)
  export interface QueryResponse {
    id: string;
    results: any[];
    status: string;
  }
  ```

- **Runtime Validation**: Use Zod schemas in entities for validation
  ```typescript
  // entities/customer/schema.ts
  export const CreateCustomerSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  });
  ```

## Coding Standards

### React/TypeScript Best Practices (FSD-Enhanced)

1. **Feature Component Structure**:

   ```typescript
   // features/auth/components/LoginForm.tsx
   import type { LoginCredentials } from "../types";
   import { useAuthStore } from "../stores/authStore";
   import { Button } from "@/shared/ui/button";

   interface LoginFormProps {
     onSuccess?: () => void;
   }

   export function LoginForm({ onSuccess }: LoginFormProps) {
     const login = useAuthStore((state) => state.login);

     return <form onSubmit={handleSubmit}>{/* Form content */}</form>;
   }
   ```

2. **Widget Composition Pattern**:

   ```typescript
   // widgets/dashboard/QuickActionsWidget.tsx
   import { CreateDatabaseAction } from "@/features/database-management/components/CreateDatabaseAction";
   import { RunQueryAction } from "@/features/query-execution/components/RunQueryAction";

   export function QuickActionsWidget() {
     return (
       <div className="widget-container">
         <CreateDatabaseAction />
         <RunQueryAction />
       </div>
     );
   }
   ```

3. **Entity-Based Custom Hooks**:

   ```typescript
   // features/database-management/hooks/useDatabaseOperations.ts
   import type { Database } from "@/entities/database";
   import { useDatabaseStore } from "../stores/databaseStore";

   export function useDatabaseOperations() {
     const { create, update, delete: remove } = useDatabaseStore();

     return {
       createDatabase: (data: Partial<Database>) => create(data),
       updateDatabase: (id: string, data: Partial<Database>) =>
         update(id, data),
       deleteDatabase: (id: string) => remove(id),
     };
   }
   ```

4. **FSD-Compliant API Integration**:

   ```typescript
   // features/auth/services/authApi.ts
   import type { LoginCredentials } from "../types";
   import type { Customer } from "@/entities/customer";
   import { apiClient } from "@/shared/api/client";

   export const authApi = {
     login: (credentials: LoginCredentials): Promise<Customer> =>
       apiClient.post("/auth/login", credentials),
   };
   ```

   ```typescript
   // shared/hooks/useApi.ts (migrated from hooks/useApi.ts)
   import { apiClient } from "@/shared/api/client";
   import { useQuery, useMutation } from "@tanstack/react-query";

   export function useApiWithErrorHandling() {
     // Shared API utilities
   }
   ```

5. **Form Handling with Feature Isolation**:

   ```typescript
   // features/database-management/components/CreateDatabaseForm.tsx
   import { useForm } from "react-hook-form";
   import { zodResolver } from "@hookform/resolvers/zod";
   import { CreateDatabaseSchema } from "@/entities/database/schema";

   export function CreateDatabaseForm() {
     const form = useForm({
       resolver: zodResolver(CreateDatabaseSchema),
       defaultValues: {
         name: "",
         description: "",
       },
     });

     return <form>...</form>;
   }
   ```

### FSD Code Organization Rules

1. **Feature Boundaries**: Each feature is self-contained with its own:

   - Components (UI elements specific to the feature)
   - Hooks (business logic for the feature)
   - Services (API calls for the feature)
   - Stores (state management for the feature)
   - Types (feature-specific type definitions)

2. **Cross-Feature Communication**: Use entities layer:

   ```typescript
   // ❌ WRONG - Direct feature-to-feature import
   import { DatabaseService } from "@/features/database-management/services";

   // ✅ CORRECT - Use entities for shared business logic
   import { DatabaseEntity } from "@/entities/database";
   ```

3. **Shared Resources**: Technical utilities without business context:

   ```typescript
   // shared/lib/validation.ts - Technical utility
   export function validateEmail(email: string): boolean;

   // entities/customer/validation.ts - Business validation
   export function validateCustomerData(data: CustomerData): boolean;
   ```

4. **Layer Dependency Rules** (STRICT):
   - `app/` can import from: `pages/`, `widgets/`, `features/`, `entities/`, `shared/`
   - `pages/` can import from: `widgets/`, `features/`, `entities/`, `shared/`
   - `widgets/` can import from: `features/`, `entities/`, `shared/`
   - `features/` can import from: `entities/`, `shared/`
   - `entities/` can import from: `shared/`
   - `shared/` cannot import from any higher layers

### Styling Guidelines (FSD-Aware)

- **Shared UI Components**: Use Tailwind CSS with `cn()` utility from `@/shared/lib/utils`

  ```typescript
  // shared/ui/button.tsx
  import { cn } from "@/shared/lib/utils";

  export function Button({ className, ...props }: ButtonProps) {
    return (
      <button className={cn("base-button-styles", className)} {...props} />
    );
  }
  ```

- **Feature-Specific Styles**: Keep feature styles within feature components
- **Responsive Design**: Implement with Tailwind breakpoints
- **Design System**: Maintain in `shared/ui/` following shadcn/ui patterns

### File Naming Conventions (FSD)

```
features/
├── auth/
│   ├── components/
│   │   ├── LoginForm.tsx        # PascalCase for components
│   │   └── AuthGuard.tsx
│   ├── hooks/
│   │   ├── useAuth.ts           # camelCase with 'use' prefix
│   │   └── useAuthValidation.ts
│   ├── services/
│   │   └── authApi.ts           # camelCase with domain suffix
│   ├── stores/
│   │   └── authStore.ts         # camelCase with 'Store' suffix
│   └── types/
│       └── index.ts             # Barrel exports
```

## FSD Best Practices for Code Generation

When adding new code, follow this priority:

1. **New Features**: Create in `features/[feature-name]/` structure
2. **Business Models**: Add to `entities/[entity-name]/`
3. **Shared Components**: Use existing `shared/ui/` components
4. **Cross-Feature Logic**: Place in appropriate `entities/` layer
5. **Technical Utils**: Add to `shared/lib/` or `shared/hooks/`
6. **App-Level State**: Add to `app/stores/`
7. **Development Tools**: Add to `shared/dev/`

### Common FSD Patterns

1. **Feature Entry Point**:

   ```typescript
   // features/database-management/index.ts
   export { DatabaseList } from "./components/DatabaseList";
   export { CreateDatabaseForm } from "./components/CreateDatabaseForm";
   export { useDatabases } from "./hooks/useDatabases";
   export type { Database, CreateDatabaseRequest } from "./types";
   ```

   ```typescript
   // features/search/index.ts (migrated structure)
   export { AdvancedSearch } from "./components/AdvancedSearch";
   export { SearchResults } from "./components/SearchResults";
   export { useSearch } from "./hooks/useSearch";
   export { useSearchStore } from "./stores/search";
   ```

2. **Entity Definition**:

   ```typescript
   // entities/database/index.ts
   export { DatabaseSchema, type Database } from "./model";
   export { validateDatabase } from "./lib";
   export { DATABASE_STATUS } from "./constants";
   ```

3. **Widget Composition**:

   ```typescript
   // widgets/dashboard/QuickActionsWidget.tsx
   import { CreateDatabaseAction } from "@/features/database-management/components/CreateDatabaseAction";
   import { RunQueryAction } from "@/features/query-execution/components/RunQueryAction";

   export function QuickActionsWidget() {
     return (
       <div className="widget-container">
         <CreateDatabaseAction />
         <RunQueryAction />
       </div>
     );
   }
   ```

4. **Shared Hook Pattern**:

   ```typescript
   // shared/hooks/useNotifications.ts (migrated from hooks/)
   import { useNotificationStore } from "@/app/stores/notifications";

   export function useNotifications() {
     const { notifications, addNotification, removeNotification } =
       useNotificationStore();
     return { notifications, addNotification, removeNotification };
   }
   ```

   ```typescript
   // widgets/dashboard/DatabaseMetricsWidget.tsx
   import { useDatabases } from "@/features/database-management";
   import { MetricCard } from "@/shared/ui/metric-card";

   export function DatabaseMetricsWidget() {
     const { data: databases } = useDatabases();
     return <MetricCard value={databases?.length} />;
   }
   ```

## Security and Performance (FSD-Enhanced)

### Security

- **Input Validation**: Use entity schemas for validation across features
  ```typescript
  // entities/customer/validation.ts
  export const CustomerInputSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
  });
  ```
- **Authentication**: Implement in `features/auth/` with proper guards
- **Feature-Level Guards**: Each feature manages its own access control

### Performance

- **Code Splitting**: Lazy load features, not just pages
  ```typescript
  // app/router/routes.tsx
  const DatabaseManagementFeature = lazy(() =>
    import("@/features/database-management").then((m) => ({
      default: m.DatabaseManagementPage,
    }))
  );
  ```
- **Bundle Optimization**: FSD naturally creates smaller bundles per feature
- **Shared UI Optimization**: Reuse `shared/ui/` components efficiently

## Testing Strategy (FSD-Aligned)

The testing structure mirrors the FSD architecture:

### Feature Testing

```typescript
// features/auth/components/__tests__/LoginForm.test.tsx
import { render, screen } from "@testing-library/react";
import { LoginForm } from "../LoginForm";

describe("LoginForm", () => {
  it("should validate user input", async () => {
    // Feature-specific tests
  });
});
```

```typescript
// features/search/hooks/__tests__/useSearch.test.ts
import { renderHook } from "@testing-library/react";
import { useSearch } from "../useSearch";

describe("useSearch", () => {
  it("should handle search queries", () => {
    // Hook testing
  });
});
```

### Entity Testing

```typescript
// entities/customer/__tests__/validation.test.ts
import { CustomerSchema } from "../schema";

describe("Customer validation", () => {
  it("should validate customer data", () => {
    // Entity validation tests
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/auth-flow.test.tsx
// Test feature interactions through entities
```

## FSD Code Generation Preferences

When generating code, prioritize:

1. **Feature-First Organization**: Place components in appropriate feature
2. **Entity-Driven Types**: Define business types in entities layer
3. **Shared UI Reuse**: Use existing `shared/ui/` components
4. **Clear Layer Boundaries**: Respect FSD import rules
5. **Business Domain Focus**: Name features by business capability
6. **TypeScript Strict**: Full type safety across all layers
7. **Clean Dependencies**: Higher layers import from lower layers only

### Code Generation Templates

**New Feature Structure:**

```
features/[feature-name]/
├── components/          # Feature UI components
├── hooks/              # Feature business logic
├── services/           # Feature API calls
├── stores/             # Feature state management
├── types/              # Feature-specific types
└── index.ts           # Feature barrel exports
```

**New Shared Hook Structure:**

```
shared/hooks/
├── useApi.ts           # Shared API utilities
├── useNotifications.ts # Notification management
├── useNavigation.ts    # Navigation utilities
└── useEnhancedSSE.ts   # Server-sent events
```

**New Entity Structure:**

```
entities/[entity-name]/
├── model.ts           # Core entity definition
├── schema.ts          # Zod validation schemas
├── constants.ts       # Entity-related constants
├── lib.ts            # Entity utility functions
└── index.ts          # Entity barrel exports
```

**Priority Order for Code Placement:**

1. Is this feature-specific? → `features/[feature]/`
2. Is this a business entity? → `entities/[entity]/`
3. Is this a reusable UI component? → `shared/ui/`
4. Is this a technical utility or hook? → `shared/lib/` or `shared/hooks/`
5. Is this a page composition? → `pages/`
6. Is this a complex widget? → `widgets/`
7. Is this app-level state or provider? → `app/stores/` or `app/providers/`

## Important Migration Notes

⚠️ **The frontend has been fully migrated to FSD compliance**. When working with this codebase:

1. **All legacy paths have been updated**: No more `@/components/*`, `@/hooks/*`, `@/services/*`, `@/store/*`
2. **Use the new FSD paths**: `@/features/*`, `@/widgets/*`, `@/shared/*`, `@/app/*`
3. **Follow layer dependencies strictly**: No cross-feature imports, use entities for shared logic
4. **Feature isolation**: Each feature is self-contained with its own components, hooks, services, and stores
