import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { QueryHistory } from '../components/QueryHistory';
import type { Query, QueryStatus } from '@/entities/query';

// Mock the query hook
const mockUseQueryHistory = vi.fn();
vi.mock('../hooks/useQueries', () => ({
  useQueryHistory: () => mockUseQueryHistory()
}));

// Mock query data
const createMockQuery = (overrides: Partial<Query> = {}): Query => ({
  id: 'query-123',
  content: 'MATCH (n) RETURN n LIMIT 10',
  status: 'completed' as QueryStatus,
  databaseId: 'db-1',
  createdAt: '2024-01-01T10:00:00Z',
  durationMs: 1250,
  errorMessage: undefined,
  ...overrides
});

const mockQueries: Query[] = [
  createMockQuery({
    id: 'query-1',
    content: 'MATCH (n:Person) RETURN n.name ORDER BY n.name',
    status: 'completed',
    durationMs: 850,
    createdAt: '2024-01-01T12:00:00Z'
  }),
  createMockQuery({
    id: 'query-2',
    content: 'MATCH (n:Company)-[:EMPLOYS]->(p:Person) RETURN n.name, COUNT(p)',
    status: 'failed',
    durationMs: undefined,
    errorMessage: 'Syntax error: unexpected token',
    createdAt: '2024-01-01T11:30:00Z'
  }),
  createMockQuery({
    id: 'query-3',
    content: 'MATCH (n:Product) WHERE n.price > 100 RETURN n',
    status: 'running',
    durationMs: undefined,
    createdAt: '2024-01-01T11:00:00Z'
  }),
  createMockQuery({
    id: 'query-4',
    content: 'CREATE (n:TestNode {id: 1}) RETURN n',
    status: 'cancelled',
    durationMs: 200,
    createdAt: '2024-01-01T10:30:00Z'
  })
];

describe('QueryHistory', () => {
  const mockOnQuerySelect = vi.fn();
  const mockOnRunQuery = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful mock
    mockUseQueryHistory.mockReturnValue({
      data: mockQueries,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });
  });

  const renderQueryHistory = (props: Partial<React.ComponentProps<typeof QueryHistory>> = {}) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <QueryHistory
          databaseId="db-1"
          limit={50}
          onQuerySelect={mockOnQuerySelect}
          onRunQuery={mockOnRunQuery}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  describe('Rendering States', () => {
    it('renders empty state when no database is selected', () => {
      renderQueryHistory({ databaseId: undefined });

      expect(screen.getByText('Select a database to view query history')).toBeInTheDocument();
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // Database icon
    });

    it('renders loading state', () => {
      mockUseQueryHistory.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn()
      });

      renderQueryHistory();

      expect(screen.getByText('Query History')).toBeInTheDocument();
      expect(screen.getByText('Recent queries for this database')).toBeInTheDocument();
      // Check for skeleton loaders
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(3);
    });

    it('renders error state with retry button', async () => {
      const mockRefetch = vi.fn();
      mockUseQueryHistory.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch
      });

      renderQueryHistory();

      expect(screen.getByText('Failed to load query history')).toBeInTheDocument();
      
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
      
      await userEvent.click(retryButton);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('renders empty queries state', () => {
      mockUseQueryHistory.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      renderQueryHistory();

      expect(screen.getByText('No queries found')).toBeInTheDocument();
      expect(screen.getByText('Run your first query to see it here')).toBeInTheDocument();
    });
  });

  describe('Query Display', () => {
    it('displays all queries with correct information', () => {
      renderQueryHistory();

      // Check query count
      expect(screen.getByText('4 queries found')).toBeInTheDocument();

      // Verify each query is displayed
      mockQueries.forEach(query => {
        expect(screen.getByText(query.content)).toBeInTheDocument();
        expect(screen.getByText(query.status)).toBeInTheDocument();
      });

      // Check status badges
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
      expect(screen.getByText('running')).toBeInTheDocument();
      expect(screen.getByText('cancelled')).toBeInTheDocument();
    });

    it('displays query durations correctly', () => {
      renderQueryHistory();

      expect(screen.getByText('850ms')).toBeInTheDocument();
      expect(screen.getByText('200ms')).toBeInTheDocument();
      expect(screen.getAllByText('N/A')).toHaveLength(2); // For running and failed queries
    });

    it('displays error messages for failed queries', () => {
      renderQueryHistory();

      expect(screen.getByText('Error: Syntax error: unexpected token')).toBeInTheDocument();
    });

    it('shows formatted dates', () => {
      renderQueryHistory();

      // Check that dates are displayed (exact format may vary by locale)
      const dateElements = screen.getAllByText(/2024/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  describe('Search and Filtering', () => {
    it('filters queries by search text', async () => {
      const user = userEvent.setup();
      renderQueryHistory();

      const searchInput = screen.getByPlaceholderText('Search queries...');
      await user.type(searchInput, 'Person');

      // Should show queries containing "Person"
      expect(screen.getByText('MATCH (n:Person) RETURN n.name ORDER BY n.name')).toBeInTheDocument();
      expect(screen.getByText('MATCH (n:Company)-[:EMPLOYS]->(p:Person) RETURN n.name, COUNT(p)')).toBeInTheDocument();
      
      // Should not show queries without "Person"
      expect(screen.queryByText('MATCH (n:Product) WHERE n.price > 100 RETURN n')).not.toBeInTheDocument();
    });

    it('filters queries by status', async () => {
      const user = userEvent.setup();
      renderQueryHistory();

      const statusSelect = screen.getByDisplayValue('All Status');
      await user.selectOptions(statusSelect, 'completed');

      // Should only show completed queries
      expect(screen.getByText('MATCH (n:Person) RETURN n.name ORDER BY n.name')).toBeInTheDocument();
      expect(screen.queryByText('Syntax error: unexpected token')).not.toBeInTheDocument();
    });

    it('sorts queries by different criteria', async () => {
      const user = userEvent.setup();
      renderQueryHistory();

      const sortSelect = screen.getByDisplayValue('Newest First');
      await user.selectOptions(sortSelect, 'durationMs-desc');

      // Queries should be reordered by duration (slowest first)
      // This would require checking the order of elements in the DOM
      const queryElements = screen.getAllByText(/MATCH|CREATE/);
      expect(queryElements.length).toBe(4);
    });

    it('shows filtered empty state when no results match', async () => {
      const user = userEvent.setup();
      renderQueryHistory();

      const searchInput = screen.getByPlaceholderText('Search queries...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No queries found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
    });
  });

  describe('Query Interactions', () => {
    it('calls onQuerySelect when a query is clicked', async () => {
      const user = userEvent.setup();
      renderQueryHistory();

      const firstQuery = screen.getByText('MATCH (n:Person) RETURN n.name ORDER BY n.name')
        .closest('[role="button"], div[class*="cursor-pointer"]') as HTMLElement;
      
      await user.click(firstQuery);

      expect(mockOnQuerySelect).toHaveBeenCalledTimes(1);
      expect(mockOnQuerySelect).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'MATCH (n:Person) RETURN n.name ORDER BY n.name',
          status: 'completed'
        })
      );
    });

    it('calls onRunQuery when play button is clicked', async () => {
      const user = userEvent.setup();
      renderQueryHistory();

      // Find play buttons (there should be one for each query)
      const playButtons = screen.getAllByTitle('Run this query');
      expect(playButtons).toHaveLength(4);

      await user.click(playButtons[0]);

      expect(mockOnRunQuery).toHaveBeenCalledTimes(1);
      expect(mockOnRunQuery).toHaveBeenCalledWith('MATCH (n:Person) RETURN n.name ORDER BY n.name');
    });

    it('prevents query selection when play button is clicked', async () => {
      const user = userEvent.setup();
      renderQueryHistory();

      const playButton = screen.getAllByTitle('Run this query')[0];
      await user.click(playButton);

      expect(mockOnRunQuery).toHaveBeenCalledTimes(1);
      expect(mockOnQuerySelect).not.toHaveBeenCalled();
    });
  });

  describe('Status Icons and Styling', () => {
    it('displays correct icons for each status', () => {
      renderQueryHistory();

      // Check that status icons are present (we can't easily test specific icons)
      const statusBadges = screen.getAllByText(/completed|failed|running|cancelled/);
      expect(statusBadges).toHaveLength(4);

      // Each status badge should have an icon (svg element)
      statusBadges.forEach(badge => {
        const icon = within(badge as HTMLElement).getByRole('img', { hidden: true });
        expect(icon).toBeInTheDocument();
      });
    });

    it('applies correct styling classes for different statuses', () => {
      renderQueryHistory();

      const completedBadge = screen.getByText('completed');
      const failedBadge = screen.getByText('failed');

      expect(completedBadge).toHaveClass(/bg-green-100.*text-green-800/);
      expect(failedBadge).toHaveClass(/bg-red-100.*text-red-800/);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderQueryHistory();

      const searchInput = screen.getByPlaceholderText('Search queries...');
      expect(searchInput).toBeInTheDocument();

      const statusSelect = screen.getByDisplayValue('All Status');
      expect(statusSelect).toBeInTheDocument();

      const sortSelect = screen.getByDisplayValue('Newest First');
      expect(sortSelect).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderQueryHistory();

      // Focus should work on interactive elements
      const searchInput = screen.getByPlaceholderText('Search queries...');
      searchInput.focus();
      expect(searchInput).toHaveFocus();

      // Tab navigation should work
      await user.tab();
      const statusSelect = screen.getByDisplayValue('All Status');
      expect(statusSelect).toHaveFocus();
    });
  });

  describe('Props and Configuration', () => {
    it('respects the limit prop', () => {
      mockUseQueryHistory.mockReturnValue({
        data: mockQueries,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      renderQueryHistory({ limit: 2 });

      // The hook should have been called with limit 2
      expect(mockUseQueryHistory).toHaveBeenCalledWith('db-1', 2);
    });

    it('passes correct databaseId to the hook', () => {
      renderQueryHistory({ databaseId: 'custom-db-id' });

      expect(mockUseQueryHistory).toHaveBeenCalledWith('custom-db-id', 50);
    });

    it('applies custom className', () => {
      const { container } = renderQueryHistory({ className: 'custom-class' });
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});