# Technical Specification: Dashboard & Navigation Implementation

**Phase 2 Current Sprint** - Kuzu EventBus Frontend  
**Estimated Duration**: 1-2 weeks  
**Priority**: High (Core UX Foundation)

## 🎯 Sprint Objectives

Create a fully functional dashboard with modern SaaS navigation patterns, real-time metrics, and responsive design that serves as the foundation for all other features.

## 📋 User Stories

### Epic: Dashboard Navigation

- **As a user**, I want to easily navigate between different sections of the application
- **As a user**, I want to switch between my tenant accounts seamlessly
- **As a user**, I want to see my current location in the application at all times

### Epic: Dashboard Metrics

- **As a user**, I want to see an overview of my database usage and performance
- **As a user**, I want to quickly access common actions from the dashboard
- **As a user**, I want to see recent activity and system status

## 🏗️ Technical Architecture

### Component Hierarchy

```
DashboardLayout
├── Sidebar
│   ├── Navigation
│   ├── TenantSwitcher
│   └── UserMenu
├── Header
│   ├── Breadcrumbs
│   ├── SearchBar
│   └── NotificationBell
└── MainContent
    ├── DashboardPage
    │   ├── MetricsGrid
    │   ├── RecentActivity
    │   └── QuickActions
    └── [Other Pages]
```

### State Management

- **Navigation Store**: Active routes, sidebar state, breadcrumbs
- **Dashboard Store**: Metrics data, recent activity, quick actions
- **UI Store**: Theme, layout preferences, mobile responsiveness

## 📝 Detailed Implementation Plan

---

## Task 1: Enhanced Layout System

### 1.1 Sidebar Component (`src/components/layout/Sidebar.tsx`)

**Features:**

- Collapsible navigation with smooth animations
- Active route highlighting
- Icon + text navigation items
- Responsive behavior (overlay on mobile)

**Props Interface:**

```typescript
interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}
```

**Navigation Items:**

- Dashboard (Home icon)
- Databases (Database icon)
- Queries (Code icon)
- Analytics (BarChart icon)
- Settings (Settings icon)

### 1.2 Header Component (`src/components/layout/Header.tsx`)

**Features:**

- Breadcrumb navigation
- Global search bar
- Notification center
- User profile menu
- Tenant switcher

**Props Interface:**

```typescript
interface HeaderProps {
  showMobileMenu: boolean;
  onMobileMenuToggle: () => void;
}
```

### 1.3 Tenant Switcher (`src/components/layout/TenantSwitcher.tsx`)

**Features:**

- Dropdown with tenant list
- Search/filter tenants
- "Add Tenant" option
- Current tenant indicator

**API Integration:**

- Fetch user's tenants from `/api/v1/customers/tenants`
- Switch tenant context globally
- Update API authorization headers

### 1.4 User Menu (`src/components/layout/UserMenu.tsx`)

**Features:**

- User profile information
- Account settings link
- API keys management
- Logout functionality

---

## Task 2: Dashboard Metrics & Widgets

### 2.1 MetricsCard Component (`src/components/dashboard/MetricsCard.tsx`)

**Features:**

- Loading skeleton states
- Icon + title + value layout
- Trend indicators (up/down arrows)
- Click-through navigation

**Props Interface:**

```typescript
interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    direction: "up" | "down";
    percentage: number;
  };
  isLoading?: boolean;
  onClick?: () => void;
}
```

### 2.2 Database Stats Widget (`src/components/dashboard/DatabaseStatsWidget.tsx`)

**Metrics to Display:**

- Total Databases
- Total Storage Used
- Queries Executed Today
- Average Query Time

**API Endpoints:**

- `GET /api/v1/dashboard/stats`
- Real-time updates via SSE

### 2.3 Recent Queries Widget (`src/components/dashboard/RecentQueriesWidget.tsx`)

**Features:**

- List of last 10 queries
- Query status indicators
- Execution time display
- Quick re-run buttons

### 2.4 Activity Timeline (`src/components/dashboard/ActivityTimeline.tsx`)

**Features:**

- Chronological activity feed
- Activity type icons
- Relative timestamps
- "View All" expansion

**Activity Types:**

- Database created/deleted
- Query executed
- File uploaded
- User login/logout

### 2.5 Chart Components (`src/components/charts/`)

**BarChart.tsx Features:**

- Recharts integration
- Responsive sizing
- Customizable colors
- Tooltip support

**LineChart.tsx Features:**

- Time-series data visualization
- Multiple data series
- Zoom and pan functionality
- Export options

---

## Task 3: Navigation State Management

### 3.1 Navigation Store (`src/store/navigation.ts`)

**State Shape:**

```typescript
interface NavigationState {
  sidebarCollapsed: boolean;
  currentPath: string;
  breadcrumbs: Breadcrumb[];
  mobileMenuOpen: boolean;
}

interface NavigationActions {
  toggleSidebar: () => void;
  setCurrentPath: (path: string) => void;
  updateBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  toggleMobileMenu: () => void;
}
```

### 3.2 Navigation Hook (`src/hooks/useNavigation.ts`)

**Functionality:**

- Route change detection
- Breadcrumb generation
- Navigation helpers
- Mobile responsiveness

---

## Task 4: Responsive Design Implementation

### 4.1 Breakpoint Strategy

- **Mobile**: < 768px (Overlay sidebar, stacked metrics)
- **Tablet**: 768px - 1024px (Collapsed sidebar, 2-column metrics)
- **Desktop**: > 1024px (Full sidebar, multi-column layout)

### 4.2 Mobile Navigation

- Hamburger menu button
- Overlay sidebar with backdrop
- Touch-friendly tap targets
- Swipe gestures for sidebar

### 4.3 Responsive Metrics Grid

- CSS Grid with responsive columns
- Card stacking on mobile
- Horizontal scroll for tables
- Simplified charts on small screens

---

## 🎨 Design System Integration

### Color Palette

- **Primary**: Blue (#3B82F6) - Navigation, CTAs
- **Secondary**: Gray (#6B7280) - Text, borders
- **Success**: Green (#10B981) - Positive metrics
- **Warning**: Amber (#F59E0B) - Alerts
- **Error**: Red (#EF4444) - Errors, negative trends

### Typography

- **Headings**: Inter, 600 weight
- **Body**: Inter, 400 weight
- **Code**: JetBrains Mono, 400 weight

### Spacing System

- **xs**: 0.25rem (4px)
- **sm**: 0.5rem (8px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)

### Component Variants

- **Card**: Default, elevated, bordered
- **Button**: Primary, secondary, ghost, outline
- **Badge**: Default, success, warning, error

---

## 🔌 API Integration Specifications

### Dashboard Stats Endpoint

```typescript
GET / api / v1 / dashboard / stats;
Response: {
  total_databases: number;
  total_storage_bytes: number;
  queries_today: number;
  avg_query_time_ms: number;
  active_connections: number;
}
```

### Recent Activity Endpoint

```typescript
GET /api/v1/dashboard/activity?limit=10
Response: {
  activities: Array<{
    id: string;
    type: 'database_created' | 'query_executed' | 'file_uploaded';
    message: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
}
```

### Tenant List Endpoint

```typescript
GET / api / v1 / customers / tenants;
Response: {
  tenants: Array<{
    id: string;
    name: string;
    organization_name: string;
    role: string;
    last_accessed: string;
  }>;
}
```

---

## 🧪 Testing Strategy

### Unit Tests

- Component rendering and props
- User interaction handlers
- State management logic
- Utility functions

### Integration Tests

- API data fetching
- Route navigation
- Cross-component communication
- Responsive behavior

### Visual Testing

- Component storybook stories
- Responsive design verification
- Dark/light theme support
- Accessibility compliance

---

## 📱 Mobile-First Implementation

### Mobile UX Considerations

- Thumb-friendly navigation zones
- Simplified metric cards
- Reduced cognitive load
- Touch gesture support

### Progressive Enhancement

- Base functionality works without JavaScript
- Enhanced interactions with React
- Offline capabilities with service worker
- Push notifications for mobile

---

## ⚡ Performance Optimizations

### Code Splitting

```typescript
// Route-based splitting
const DatabasesPage = lazy(() => import("./pages/databases/DatabasesPage"));
const QueriesPage = lazy(() => import("./pages/queries/QueriesPage"));

// Component-based splitting for heavy components
const NetworkDiagram = lazy(
  () => import("./components/visualizations/NetworkDiagram")
);
```

### Memoization Strategy

```typescript
// Expensive calculations
const chartData = useMemo(() => processMetricsData(metrics), [metrics]);

// Component optimization
const MetricsCard = memo(({ title, value, trend }: MetricsCardProps) => {
  // Component implementation
});
```

### Virtual Scrolling

- Activity timeline for large datasets
- Database lists with hundreds of items
- Query history with virtual windowing

---

## 🚀 Deployment Considerations

### Environment Variables

```env
VITE_API_URL=https://api.kuzu-eventbus.com
VITE_WS_URL=wss://api.kuzu-eventbus.com/ws
VITE_SENTRY_DSN=https://sentry.io/projects/kuzu-eventbus
VITE_ANALYTICS_ID=GA_MEASUREMENT_ID
```

### Build Optimization

- Bundle analysis with vite-bundle-analyzer
- Tree shaking for unused code
- Asset optimization for images and fonts
- CDN deployment for static assets

---

## 📈 Success Metrics

### User Experience Metrics

- **Dashboard Load Time**: < 2 seconds
- **Navigation Response**: < 100ms
- **Mobile Usability Score**: 100%
- **Accessibility Score**: > 95%

### Technical Metrics

- **Bundle Size**: < 500KB gzipped
- **Time to Interactive**: < 3 seconds
- **First Contentful Paint**: < 1.5 seconds
- **Cumulative Layout Shift**: < 0.1

### User Behavior Metrics

- **Bounce Rate**: < 10%
- **Time on Dashboard**: > 2 minutes
- **Feature Discovery**: > 80% click-through on quick actions
- **Mobile Usage**: > 30% of total sessions

---

## 🔄 Implementation Workflow

### Week 1: Layout & Navigation

**Days 1-2**: Sidebar and Header components
**Days 3-4**: Responsive behavior and mobile menu
**Day 5**: Navigation state management and routing

### Week 2: Dashboard & Metrics

**Days 1-2**: Metrics cards and dashboard widgets
**Days 3-4**: Charts integration and data fetching
**Day 5**: Testing, polish, and documentation

### Quality Assurance

- Component testing with React Testing Library
- Visual regression testing with Storybook
- Cross-browser compatibility testing
- Mobile device testing on real devices

---

_This technical specification provides the detailed roadmap for implementing Phase 2 of the Kuzu EventBus frontend. Each task includes specific deliverables, technical requirements, and quality metrics to ensure successful completion._
