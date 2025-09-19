# Kuzu EventBus Frontend

Modern React TypeScript frontend for the Kuzu EventBus SaaS platform - a comprehensive graph database management solution.

## 🎯 Overview

**Status:** Development Phase - UI Complete, Backend Integration In Progress  
**Backend Integration:** 30% Complete (6/20 endpoints working)  
**Mock Data Strategy:** Enabled for seamless UI development  

### 🎨 UI Completeness
- ✅ **Full UI Implementation:** All components and pages complete
- ✅ **Real-time Integration:** Server-Sent Events working
- ✅ **Authentication Flow:** API key management implemented
- ✅ **Error Handling:** Graceful fallbacks and user feedback

### 🔗 Backend Integration Status
- ✅ **Working:** Health checks, customer registration, query submission
- 🚧 **In Progress:** Database management, query results, analytics  
- ❌ **Planned:** File uploads, advanced analytics, admin features

> **For Developers:** See `/docs/backend-integration-status.md` for detailed endpoint status and `/docs/integration-guide.md` for usage patterns.

## 🎯 Features

### 🔐 Authentication & Multi-tenancy

- Secure login/registration with JWT
- Multi-tenant architecture with tenant switching
- API key management and permissions
- Protected routes and role-based access

### 📊 Dashboard & Analytics

- Real-time database metrics and usage analytics
- Interactive charts and visualizations
- Query performance monitoring
- Storage usage tracking

### 🗄️ Database Management

- Create, upload, and manage Kuzu databases
- Database schema visualization
- File upload/download with progress tracking
- Database backup and versioning

### 🔍 Advanced Search & Filtering

- Global search across databases, queries, and results
- Faceted filtering with real-time suggestions
- Saved searches and query templates
- Full-text search capabilities

### ⚡ Cypher Query Builder

- Visual query builder with drag-and-drop interface
- Monaco Editor with syntax highlighting and autocomplete
- Query validation and parameter management
- Query templates and snippets library

### 🌐 Network Visualizations (D3.js)

- Interactive node-link diagrams for query results
- Database schema visualization
- Zoom, pan, and selection interactions
- Customizable layouts and filtering
- Export to SVG/PNG

### 🔄 Real-time Features

- Server-Sent Events for live query updates
- Real-time collaboration and notifications
- Live query execution status
- Background task monitoring

## 🏗️ Architecture

### Tech Stack

- **React 18** + **TypeScript** for type-safe development
- **Vite** for fast development and building
- **shadcn/ui** + **Tailwind CSS** for modern, accessible UI
- **React Router v6** for client-side routing
- **Zustand** for lightweight state management
- **TanStack Query** for server state management
- **D3.js** for custom data visualizations
- **Monaco Editor** for advanced code editing
- **Axios** for HTTP client with interceptors

### Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui base components
│   ├── charts/          # D3.js visualization components
│   ├── forms/           # Form components with validation
│   ├── layout/          # Navigation, sidebars, headers
│   └── query-builder/   # Cypher query building interface
├── pages/               # Route-level page components
│   ├── auth/            # Login/register pages
│   ├── dashboard/       # Main dashboard
│   ├── databases/       # Database management
│   ├── queries/         # Query builder and execution
│   └── settings/        # Account/tenant settings
├── hooks/               # Custom React hooks
├── store/               # Zustand state management
├── services/            # API and external services
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

## � Backend Integration

### Current Status
The frontend is designed to work with the Kuzu Event Bus backend API. Integration is in progress:

| Feature | Status | Description |
|---------|--------|-------------|
| Health Checks | ✅ Working | API health monitoring |
| Customer Registration | ✅ Working | Account creation with API keys |
| Query Execution | ⚠️ Partial | Submit queries, check status |
| Database Management | 🚧 Mock Data | CRUD operations simulated |
| Analytics Dashboard | ❌ Mock Data | Performance metrics simulated |
| File Upload | ❌ Mock Data | Data import simulated |

### Development Mode
The frontend automatically falls back to mock data when backend endpoints are not available:

```typescript
// Automatic fallback strategy
try {
  const data = await apiService.getDatabases();
  return data; // Real data from backend
} catch (error) {
  if (error.status === 501) {
    console.info('Using mock data - endpoint not yet implemented');
    return mockData; // Realistic mock data
  }
  throw error; // Real error
}
```

### API Key Authentication
- ✅ **Automatic Storage:** API keys stored securely after registration  
- ✅ **Auto-Inclusion:** All requests automatically include API key
- ✅ **Header Format:** Uses `X-API-Key` header as expected by backend
- ✅ **Validation:** Checks for correct `kb_` prefix format

### Real-time Features
- ✅ **Server-Sent Events:** Live updates from `/api/v1/events/stream`
- ✅ **WebSocket Support:** Ready for real-time query results
- ✅ **Connection Management:** Automatic reconnection and error handling

> **Documentation:** See `/docs/backend-integration-status.md` for detailed endpoint status and `/docs/integration-guide.md` for API usage patterns.

## �🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see ../backend/README.md)

### Installation

1. **Navigate to frontend directory**

   ```bash
   cd frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Create environment file**

   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables**

   ```env
   VITE_API_URL=http://localhost:8000
   VITE_WS_URL=ws://localhost:8000/ws
   ```

5. **Start development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open browser**
   ```
   http://localhost:3000
   ```

### Building for Production

```bash
# Type check
npm run type-check

# Build
npm run build

# Preview production build
npm run preview
```

## 📱 Key Components

### Authentication System

- **LoginPage** - Secure login with email/password
- **RegisterPage** - Customer registration with tenant setup
- **useAuth hook** - Authentication state management
- **Protected routes** - Route guards and role-based access

### Dashboard Components

- **DashboardLayout** - Main application shell
- **MetricsCards** - Database and usage statistics
- **ActivityTimeline** - Recent actions and notifications
- **QuickActions** - Common tasks and shortcuts

### Database Management

- **DatabaseList** - Filterable database listing
- **DatabaseCreator** - New database creation form
- **FileUploader** - Database file upload with progress
- **SchemaViewer** - Visual database schema explorer

### Query Interface

- **QueryBuilder** - Visual Cypher query construction
- **CypherEditor** - Monaco-based code editor
- **ResultsViewer** - Tabular and graph result display
- **QueryHistory** - Previous queries and templates

### Data Visualizations

- **NetworkDiagram** - D3.js force-directed graph
- **SchemaGraph** - Database schema visualization
- **MetricsCharts** - Performance and usage charts
- **GraphExporter** - SVG/PNG export functionality

## 🔧 Development

### Code Style

- **ESLint** + **Prettier** for consistent formatting
- **TypeScript strict mode** for type safety
- **Conventional Commits** for semantic versioning

### Testing Strategy

- **Jest** + **React Testing Library** for unit tests
- **Playwright** for end-to-end testing
- **Storybook** for component documentation
- **MSW** for API mocking

### Performance

- **Code splitting** with React.lazy()
- **Virtual scrolling** for large datasets
- **Debounced search** for real-time filtering
- **Optimistic updates** with TanStack Query
- **Service Worker** for caching and offline support

## 🎨 UI/UX Design

### Design System

- **shadcn/ui** components for consistency
- **Tailwind CSS** for utility-first styling
- **Radix UI** primitives for accessibility
- **Lucide icons** for consistent iconography

### Responsive Design

- **Mobile-first** approach
- **Touch-friendly** interfaces
- **Responsive tables** with horizontal scroll
- **Adaptive navigation** for different screen sizes

### Accessibility

- **WCAG 2.1 AA** compliance
- **Keyboard navigation** support
- **Screen reader** compatibility
- **High contrast** mode support

## 🔗 API Integration

### Backend Connection

- **RESTful API** with typed TypeScript interfaces
- **Error handling** with user-friendly messages
- **Request interceptors** for authentication
- **Response caching** with TanStack Query

### Real-time Updates

- **Server-Sent Events** for live data
- **WebSocket** fallback for older browsers
- **Optimistic updates** for better UX
- **Background sync** for offline actions

## 🚀 Deployment

### Production Build

```bash
# Environment-specific builds
npm run build:staging
npm run build:production

# Docker deployment
docker build -t kuzu-frontend .
docker run -p 80:80 kuzu-frontend
```

### Environment Configuration

```env
# Development
VITE_API_URL=http://localhost:8000

# Staging
VITE_API_URL=https://api-staging.kuzu-eventbus.com

# Production
VITE_API_URL=https://api.kuzu-eventbus.com
```

---

## 🧪 Development Roadmap

### Phase 1: Core Foundation ✅

- [x] Project setup and configuration
- [x] Authentication system
- [x] Basic routing and layout
- [x] API client setup

### Phase 2: Database Management 🚧

- [ ] Database CRUD operations
- [ ] File upload/download
- [ ] Schema visualization
- [ ] Database metrics

### Phase 3: Query Interface 📋

- [ ] Cypher query builder
- [ ] Monaco editor integration
- [ ] Query execution and results
- [ ] Query history and templates

### Phase 4: Data Visualization 📋

- [ ] D3.js network diagrams
- [ ] Interactive schema graphs
- [ ] Performance charts
- [ ] Export functionality

### Phase 5: Advanced Features 📋

- [ ] Real-time collaboration
- [ ] Advanced search and filtering
- [ ] Notification system
- [ ] Mobile optimization

### Phase 6: Polish & Production 📋

- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] CI/CD pipeline

---

**Built with ❤️ using modern React ecosystem and best practices**
