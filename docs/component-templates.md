# Component Templates & Development Guidelines

**Purpose**: Ensure consistent patterns and high code quality across all components

## 🧩 Component Template

### Basic Component Template

```typescript
import React from "react";
import { cn } from "@/utils";

interface ComponentNameProps {
  /**
   * Brief description of the prop
   */
  prop1: string;

  /**
   * Optional prop with default value
   */
  prop2?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Children elements
   */
  children?: React.ReactNode;
}

export function ComponentName({
  prop1,
  prop2 = false,
  className,
  children,
}: ComponentNameProps) {
  return (
    <div
      className={cn(
        // Base styles
        "flex items-center justify-center",
        // Conditional styles
        prop2 && "bg-primary text-primary-foreground",
        // Custom classes
        className
      )}
    >
      {children}
    </div>
  );
}

ComponentName.displayName = "ComponentName";
```

### Hook Template

```typescript
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";

interface UseHookNameOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

interface HookReturnType {
  data: DataType | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useHookName(options: UseHookNameOptions = {}): HookReturnType {
  const { enabled = true, refetchInterval = 0 } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["hook-name"],
    queryFn: apiService.getData,
    enabled,
    refetchInterval,
  });

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
```

### Store Template

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StoreState {
  // State properties
  items: Item[];
  selectedItem: Item | null;
  isLoading: boolean;
}

interface StoreActions {
  // Actions
  setItems: (items: Item[]) => void;
  selectItem: (item: Item | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

type Store = StoreState & StoreActions;

const initialState: StoreState = {
  items: [],
  selectedItem: null,
  isLoading: false,
};

export const useStoreStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,

      setItems: (items) => set({ items }),

      selectItem: (selectedItem) => set({ selectedItem }),

      setLoading: (isLoading) => set({ isLoading }),

      reset: () => set(initialState),
    }),
    {
      name: "store-storage",
      partialize: (state) => ({
        // Only persist certain state properties
        items: state.items,
        selectedItem: state.selectedItem,
      }),
    }
  )
);
```

## 🏗️ Priority Components to Implement

### 1. Sidebar Component (`src/components/layout/Sidebar.tsx`)

```typescript
import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Database,
  Code,
  BarChart,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/utils";
import { useNavigationStore } from "@/store/navigation";

const navigationItems = [
  { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/databases", label: "Databases", icon: Database },
  { path: "/queries", label: "Queries", icon: Code },
  { path: "/analytics", label: "Analytics", icon: BarChart },
  { path: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useNavigationStore();

  return (
    <aside
      className={cn(
        // Base styles
        "flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
        // Responsive width
        sidebarCollapsed ? "w-16" : "w-64",
        // Mobile overlay
        "fixed inset-y-0 left-0 z-40 md:relative md:translate-x-0",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1
          className={cn(
            "text-xl font-bold text-gray-900 transition-opacity",
            sidebarCollapsed && "opacity-0 md:opacity-100"
          )}
        >
          {sidebarCollapsed ? "KB" : "Kuzu EventBus"}
        </h1>

        <button
          onClick={toggleSidebar}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            className={cn(
              "w-4 h-4 transition-transform",
              sidebarCollapsed && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  "hover:bg-gray-100 hover:text-gray-900",
                  isActive
                    ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                    : "text-gray-600",
                  sidebarCollapsed && "justify-center"
                )
              }
            >
              <Icon className={cn("w-5 h-5", !sidebarCollapsed && "mr-3")} />
              <span
                className={cn(
                  "transition-opacity",
                  sidebarCollapsed && "opacity-0 md:opacity-0"
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
```

### 2. MetricsCard Component (`src/components/dashboard/MetricsCard.tsx`)

```typescript
import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/utils";

interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    direction: "up" | "down";
    percentage: number;
    period?: string;
  };
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MetricsCard({
  title,
  value,
  icon,
  trend,
  isLoading = false,
  onClick,
  className,
}: MetricsCardProps) {
  const TrendIcon = trend?.direction === "up" ? TrendingUp : TrendingDown;

  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-white rounded-lg border border-gray-200 p-6",
          "animate-pulse",
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-8 h-8 bg-gray-200 rounded" />
          <div className="w-16 h-4 bg-gray-200 rounded" />
        </div>
        <div className="space-y-2">
          <div className="w-24 h-8 bg-gray-200 rounded" />
          <div className="w-32 h-4 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 p-6 transition-all",
        "hover:shadow-md hover:border-gray-300",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-gray-400">{icon}</div>
        {trend && (
          <div
            className={cn(
              "flex items-center text-sm font-medium",
              trend.direction === "up" ? "text-green-600" : "text-red-600"
            )}
          >
            <TrendIcon className="w-4 h-4 mr-1" />
            {trend.percentage}%
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        <div className="text-sm text-gray-500">
          {title}
          {trend?.period && <span className="ml-1">({trend.period})</span>}
        </div>
      </div>
    </div>
  );
}
```

### 3. Navigation Store (`src/store/navigation.ts`)

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Breadcrumb {
  label: string;
  path?: string;
}

interface NavigationState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  currentPath: string;
  breadcrumbs: Breadcrumb[];
}

interface NavigationActions {
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setCurrentPath: (path: string) => void;
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  reset: () => void;
}

type NavigationStore = NavigationState & NavigationActions;

const initialState: NavigationState = {
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  currentPath: "/",
  breadcrumbs: [],
};

export const useNavigationStore = create<NavigationStore>()(
  persist(
    (set) => ({
      ...initialState,

      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),

      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),

      setCurrentPath: (currentPath) => set({ currentPath }),

      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

      reset: () => set(initialState),
    }),
    {
      name: "navigation-storage",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
```

## 📝 Development Guidelines

### TypeScript Best Practices

- Always define explicit interfaces for props
- Use union types for variant props
- Implement proper error handling
- Add JSDoc comments for complex props

### Component Best Practices

- Use forwardRef for components that need DOM access
- Implement proper loading and error states
- Make components composable and reusable
- Follow single responsibility principle

### Styling Guidelines

- Use Tailwind utility classes with `cn()` helper
- Implement responsive design with mobile-first approach
- Use CSS-in-JS only for complex animations
- Follow consistent spacing and color patterns

### Testing Requirements

- Write unit tests for all custom hooks
- Test component rendering and user interactions
- Mock API calls in integration tests
- Test responsive behavior across breakpoints

### Performance Considerations

- Use React.memo for expensive components
- Implement proper dependency arrays in useEffect
- Lazy load heavy components and routes
- Optimize images and assets

---

**Next Steps**: Start implementing the Sidebar component using this template as a foundation. Focus on responsive behavior and proper TypeScript types.
