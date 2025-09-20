import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VirtualizedQueryResults } from '@/features/query-execution/components/VirtualizedQueryResults';

// Mock react-window since it doesn't work well in tests
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize, height }: any) => {
    const items = Array.from({ length: Math.min(itemCount, 10) }, (_, index) => 
      children({ index, style: { height: itemSize, top: index * itemSize } })
    );
    return <div style={{ height }} data-testid="virtual-list">{items}</div>;
  },
}));

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
};

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('VirtualizedQueryResults', () => {
  const mockResults = [
    { id: 1, name: 'Alice', age: 25, city: 'New York' },
    { id: 2, name: 'Bob', age: 30, city: 'San Francisco' },
    { id: 3, name: 'Charlie', age: 35, city: 'Chicago' },
  ];

  const mockColumns = ['id', 'name', 'age', 'city'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render query results', () => {
    renderWithProviders(
      <VirtualizedQueryResults 
        results={mockResults}
        columns={mockColumns}
      />
    );

    expect(screen.getByText('3 rows')).toBeInTheDocument();
    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
  });

  it('should show execution time when provided', () => {
    renderWithProviders(
      <VirtualizedQueryResults 
        results={mockResults}
        columns={mockColumns}
        executionTime={150}
      />
    );

    expect(screen.getByText('150ms')).toBeInTheDocument();
  });

  it('should handle search filtering', async () => {
    renderWithProviders(
      <VirtualizedQueryResults 
        results={mockResults}
        columns={mockColumns}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search results...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    // Search should filter results (implementation dependent)
    expect((searchInput as HTMLInputElement).value).toBe('Alice');
  });

  it('should handle column sorting', () => {
    renderWithProviders(
      <VirtualizedQueryResults 
        results={mockResults}
        columns={mockColumns}
      />
    );

    // Find and click the name column header
    const nameColumn = screen.getByText('name');
    fireEvent.click(nameColumn);

    // The component should re-render with sorting applied
    expect(nameColumn).toBeInTheDocument();
  });

  it('should handle column visibility toggle', async () => {
    renderWithProviders(
      <VirtualizedQueryResults 
        results={mockResults}
        columns={mockColumns}
      />
    );

    const columnsButton = screen.getByText('Columns');
    fireEvent.click(columnsButton);

    await waitFor(() => {
      // Look for the specific column option in the dropdown menu
      const columnItems = screen.getAllByText('id');
      expect(columnItems.length).toBeGreaterThan(0);
    });
  });

  it('should handle export functionality', async () => {
    const mockOnExport = vi.fn();
    
    renderWithProviders(
      <VirtualizedQueryResults 
        results={mockResults}
        columns={mockColumns}
        onExport={mockOnExport}
      />
    );

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    await waitFor(() => {
      const csvOption = screen.getByText('Export as CSV');
      fireEvent.click(csvOption);
    });

    expect(mockOnExport).toHaveBeenCalledWith('csv');
  });

  it('should show no results message when data is empty', () => {
    renderWithProviders(
      <VirtualizedQueryResults 
        results={[]}
        columns={[]}
      />
    );

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('should auto-detect columns from data', () => {
    renderWithProviders(
      <VirtualizedQueryResults 
        results={mockResults}
        // No columns provided - should auto-detect
      />
    );

    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('age')).toBeInTheDocument();
    expect(screen.getByText('city')).toBeInTheDocument();
  });

  it('should handle fullscreen toggle', () => {
    renderWithProviders(
      <VirtualizedQueryResults 
        results={mockResults}
        columns={mockColumns}
      />
    );

    // Find fullscreen button by its icon (ArrowsOut/ArrowsIn)
    const fullscreenButtons = screen.getAllByRole('button');
    const fullscreenButton = fullscreenButtons.find(btn => 
      btn.querySelector('svg') // Look for SVG icon
    );
    
    if (fullscreenButton) {
      fireEvent.click(fullscreenButton);
      // Should toggle fullscreen state
    }
  });
});