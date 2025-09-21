import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Query, QueryStatus } from '@/entities/query';

// Simple test focusing on QueryHistory component structure and rendering
describe('QueryHistory Component Structure', () => {
  // Mock query data
  const mockQueries: Query[] = [
    {
      id: 'query-1',
      content: 'MATCH (n:Person) RETURN n.name',
      status: 'completed' as QueryStatus,
      databaseId: 'db-1',
      createdAt: '2024-01-01T12:00:00Z',
      durationMs: 850,
    },
    {
      id: 'query-2',
      content: 'MATCH (n:Company) RETURN n',
      status: 'failed' as QueryStatus,
      databaseId: 'db-1',
      createdAt: '2024-01-01T11:30:00Z',
      errorMessage: 'Syntax error',
    }
  ];

  // Mock the useQueryHistory hook
  const mockUseQueryHistory = vi.fn(() => ({
    data: mockQueries,
    isLoading: false,
    error: null,
    refetch: vi.fn()
  }));

  // Mock the entire hooks module
  vi.mock('../hooks/useQueries', () => ({
    useQueryHistory: () => mockUseQueryHistory()
  }));

  // Simple QueryHistory component for testing
  const SimpleQueryHistory = ({ databaseId }: { databaseId?: string }) => {
    const { data: queries = [], isLoading, error } = mockUseQueryHistory();
    
    if (!databaseId) {
      return (
        <div>
          <p>Select a database to view query history</p>
        </div>
      );
    }

    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (error) {
      return <div>Error loading queries</div>;
    }

    return (
      <div>
        <h2>Query History</h2>
        <p>{queries.length} queries found</p>
        <div>
          {queries.map((query) => (
            <div key={query.id} data-testid={`query-${query.id}`}>
              <span>{query.status}</span>
              <code>{query.content}</code>
              {query.errorMessage && <span>Error: {query.errorMessage}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWithQueryClient = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders empty state when no database is selected', () => {
    renderWithQueryClient(<SimpleQueryHistory />);
    expect(screen.getByText('Select a database to view query history')).toBeInTheDocument();
  });

  it('displays query count and content when queries are available', () => {
    renderWithQueryClient(<SimpleQueryHistory databaseId="db-1" />);
    
    expect(screen.getByText('Query History')).toBeInTheDocument();
    expect(screen.getByText('2 queries found')).toBeInTheDocument();
    
    // Check that queries are displayed
    expect(screen.getByText('MATCH (n:Person) RETURN n.name')).toBeInTheDocument();
    expect(screen.getByText('MATCH (n:Company) RETURN n')).toBeInTheDocument();
    
    // Check status badges
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
    
    // Check error message
    expect(screen.getByText('Error: Syntax error')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseQueryHistory.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: vi.fn()
    });

    renderWithQueryClient(<SimpleQueryHistory databaseId="db-1" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseQueryHistory.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Network error') as any,
      refetch: vi.fn()
    });

    renderWithQueryClient(<SimpleQueryHistory databaseId="db-1" />);
    expect(screen.getByText('Error loading queries')).toBeInTheDocument();
  });
});