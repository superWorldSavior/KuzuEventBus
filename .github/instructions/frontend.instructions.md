# GitHub Copilot Instructions for KuzuEventBus Frontend

## Project Overview

KuzuEventBus is a modern web application with a React/TypeScript frontend and Python FastAPI backend. The frontend uses Vite as the build tool and follows a clean architecture pattern with clear separation of concerns.

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

## Architecture Patterns

### File Structure

```
src/
├── components/         # Reusable UI components
│   ├── charts/        # Chart components (Recharts, D3)
│   ├── dashboard/     # Dashboard-specific components
│   ├── layout/        # Layout components
│   └── ui/            # Base UI components (shadcn/ui style)
├── hooks/             # Custom React hooks
├── pages/             # Page components (route-level)
│   ├── auth/          # Authentication pages
│   ├── dashboard/     # Dashboard pages
│   ├── databases/     # Database management pages
│   ├── queries/       # Query management pages
│   └── settings/      # Settings pages
├── services/          # API and external service clients
├── store/             # Zustand stores
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

### Import Conventions

- Use path aliases defined in `tsconfig.json` and `vite.config.ts`
- Prefer `@/` prefix for all internal imports
- Import types using `import type { }` syntax
- Group imports: external packages, then internal modules

### Component Patterns

1. **Functional Components**: Use function declarations with TypeScript
2. **Props Interface**: Always define props interface above component
3. **Export Pattern**: Use named exports, avoid default exports except for pages
4. **Styling**: Use Tailwind CSS classes with `cn()` utility for conditional styling

### State Management

- **Zustand**: For global state (auth, navigation)
- **React Query**: For server state management
- **Local State**: useState for component-specific state
- **Form State**: React Hook Form for complex forms

### Type Safety

- Always provide explicit types for props, state, and return values
- Use Zod schemas for runtime validation
- Leverage TypeScript's strict mode configuration
- Define API response types in `types/` directory

## Coding Standards

### React/TypeScript Best Practices

1. **Component Structure**:

   ```typescript
   interface ComponentProps {
     title: string;
     isVisible?: boolean;
     onAction?: () => void;
   }

   export function Component({
     title,
     isVisible = true,
     onAction,
   }: ComponentProps) {
     // Component logic
     return (
       <div className={cn("base-styles", { "conditional-styles": isVisible })}>
         {title}
       </div>
     );
   }
   ```

2. **Custom Hooks**:

   - Start with `use` prefix
   - Return objects for multiple values
   - Include proper TypeScript return types

3. **API Integration**:

   - Use React Query for data fetching
   - Implement proper error handling
   - Use axios interceptors for common logic

4. **Form Handling**:
   ```typescript
   const form = useForm<FormData>({
     resolver: zodResolver(schema),
     defaultValues: {
       /* ... */
     },
   });
   ```

### Styling Guidelines

- Use Tailwind CSS utility classes
- Implement responsive design with Tailwind breakpoints
- Use `cn()` utility from `@/utils` for conditional classes
- Follow shadcn/ui component patterns
- Maintain consistent spacing and typography scales

### Code Organization

- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use proper TypeScript interfaces and types
- Implement proper error boundaries
- Follow consistent naming conventions

## Security and Performance

- Validate all user inputs with Zod schemas
- Implement proper authentication checks
- Use React.lazy() for code splitting
- Optimize bundle size with proper imports
- Implement proper loading and error states

## Testing Considerations

- Write components to be easily testable
- Use proper data attributes for testing
- Implement proper error handling
- Mock external dependencies in tests

## Common Patterns to Follow

1. **Protected Routes**: Use authentication wrapper pattern
2. **Data Loading**: Implement loading, error, and success states
3. **Form Validation**: Use Zod schemas with React Hook Form
4. **State Updates**: Use immutable update patterns
5. **API Calls**: Implement proper error handling and retry logic

## Code Generation Preferences

When generating code, prioritize:

- TypeScript strict typing
- Responsive design
- Accessibility best practices
- Performance optimization
- Clean, readable code structure
- Consistent formatting and naming
- Proper error handling
- Modern React patterns (hooks, functional components)
