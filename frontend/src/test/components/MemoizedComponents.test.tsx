import { describe, it, expect, vi } from 'vitest';
import { MemoizedDatabaseCard, MemoizedDatabaseList, usePerformanceMonitor } from '@/shared/lib/optimization/MemoizedComponents';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

const mockDatabase = {
  database_id: 'db-123',
  name: 'Test Database',
  description: 'A test database for unit tests',
  size_bytes: 1024 * 1024 * 5, // 5MB
  table_count: 3,
  created_at: '2023-01-01T00:00:00Z',
  last_accessed: '2023-12-01T00:00:00Z',
};

describe('MemoizedDatabaseCard', () => {
  it('should render database information', () => {
    render(
      <MemoizedDatabaseCard 
        database={mockDatabase}
      />
    );

    expect(screen.getByText('Test Database')).toBeInTheDocument();
    expect(screen.getByText('A test database for unit tests')).toBeInTheDocument();
    expect(screen.getByText('3 tables')).toBeInTheDocument();
    expect(screen.getByText('5 MB')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    const mockOnSelect = vi.fn();
    
    render(
      <MemoizedDatabaseCard 
        database={mockDatabase}
        onSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('Test Database'));
    expect(mockOnSelect).toHaveBeenCalledWith('db-123');
  });

  it('should call onDelete when delete button is clicked', () => {
    const mockOnDelete = vi.fn();
    
    render(
      <MemoizedDatabaseCard 
        database={mockDatabase}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByTitle('Delete database'));
    expect(mockOnDelete).toHaveBeenCalledWith('db-123');
  });

  it('should show selected state', () => {
    const { container } = render(
      <MemoizedDatabaseCard 
        database={mockDatabase}
        isSelected={true}
      />
    );

    const cardElement = container.firstChild as HTMLElement;
    expect(cardElement).toHaveClass('border-primary', 'bg-primary/10');
  });

  it('should format file sizes correctly', () => {
    const databases = [
      { ...mockDatabase, database_id: 'db-1', size_bytes: 512 },
      { ...mockDatabase, database_id: 'db-2', size_bytes: 1024 },
      { ...mockDatabase, database_id: 'db-3', size_bytes: 1024 * 1024 },
      { ...mockDatabase, database_id: 'db-4', size_bytes: 1024 * 1024 * 1024 },
    ];

    render(
      <div>
        {databases.map(db => (
          <MemoizedDatabaseCard key={db.database_id} database={db} />
        ))}
      </div>
    );

    expect(screen.getByText('512 B')).toBeInTheDocument();
    expect(screen.getByText('1 KB')).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument();
    expect(screen.getByText('1 GB')).toBeInTheDocument();
  });

  it('should format last accessed date correctly', () => {
    const databases = [
      { ...mockDatabase, database_id: 'db-1', last_accessed: undefined },
      { ...mockDatabase, database_id: 'db-2', last_accessed: new Date().toISOString() },
      { ...mockDatabase, database_id: 'db-3', last_accessed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    ];

    render(
      <div>
        {databases.map(db => (
          <MemoizedDatabaseCard key={db.database_id} database={db} />
        ))}
      </div>
    );

    expect(screen.getByText(/Never/)).toBeInTheDocument();
    expect(screen.getByText(/Today/)).toBeInTheDocument();
    expect(screen.getByText(/Yesterday/)).toBeInTheDocument();
  });
});

describe('MemoizedDatabaseList', () => {
  const mockDatabases = [
    { ...mockDatabase, database_id: 'db-1', name: 'Database 1' },
    { ...mockDatabase, database_id: 'db-2', name: 'Database 2' },
    { ...mockDatabase, database_id: 'db-3', name: 'Database 3' },
  ];

  it('should render list of databases', () => {
    render(
      <MemoizedDatabaseList databases={mockDatabases} />
    );

    expect(screen.getByText('Database 1')).toBeInTheDocument();
    expect(screen.getByText('Database 2')).toBeInTheDocument();
    expect(screen.getByText('Database 3')).toBeInTheDocument();
  });

  it('should show empty state when no databases', () => {
    render(
      <MemoizedDatabaseList databases={[]} />
    );

    expect(screen.getByText('No databases found')).toBeInTheDocument();
  });

  it('should handle database selection', () => {
    const mockOnSelect = vi.fn();
    
    render(
      <MemoizedDatabaseList 
        databases={mockDatabases}
        onSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('Database 1'));
    expect(mockOnSelect).toHaveBeenCalledWith('db-1');
  });

  it('should show selected database', () => {
    render(
      <MemoizedDatabaseList 
        databases={mockDatabases}
        selectedDatabase="db-2"
      />
    );

    // The selected database card should have different styling
    const database2Card = screen.getByText('Database 2').closest('[class*="border-primary"]');
    expect(database2Card).toBeInTheDocument();
  });
});

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should track render count and time', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const { result, rerender } = renderHook(() => 
      usePerformanceMonitor('TestComponent')
    );

    expect(result.current.renderCount).toBe(0);
    expect(typeof result.current.lastRenderTime).toBe('number');

    // Trigger re-render
    rerender();
    
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[Performance] TestComponent render #1')
    );

    process.env.NODE_ENV = originalEnv;
  });

  it('should not log in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    renderHook(() => usePerformanceMonitor('TestComponent'));
    
    expect(console.log).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});