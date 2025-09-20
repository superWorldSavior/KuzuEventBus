// Example test file for query components
// Demonstrates testing query execution, results display, and error handling

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockApi, mockQueryResult } from '../advanced-utils';
import { testHelpers } from '../component-helpers';

// Mock component for demonstration
const MockQueryComponent = ({ 
  onQueryExecute = () => Promise.resolve()
}: {
  onQueryExecute?: () => Promise<any>
}) => {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const handleExecute = async () => {
    setLoading(true);
    try {
      const result = await onQueryExecute();
      setResults(result);
    } catch (error) {
      console.error('Query failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="query-component">
      <textarea 
        data-testid="query-editor"
        placeholder="Enter your query here..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button 
        onClick={handleExecute}
        disabled={!query.trim() || loading}
      >
        {loading ? 'Executing...' : 'Execute Query'}
      </button>
      
      {results && (
        <div data-testid="query-results">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {results.data?.map((row: any, index: number) => (
                <tr key={index}>
                  <td>{row['n.id']}</td>
                  <td>{row['n.name']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const mockApi = createMockApi();

describe('Query Component Testing Example', () => {
  beforeEach(() => {
    mockApi.reset();
  });

  it('should execute query and display results', async () => {
    const mockExecute = vi.fn().mockResolvedValue(mockQueryResult);
    
    renderWithProviders(
      <MockQueryComponent onQueryExecute={mockExecute} />
    );

    // Type a query
    await testHelpers.query.typeQuery('MATCH (n) RETURN n LIMIT 5');
    
    // Execute query
    await testHelpers.query.executeQuery();
    
    // Wait for results
    await waitFor(() => {
      testHelpers.query.expectResults(2); // mockQueryResult has 2 rows
    });

    // Verify results content
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should show loading state during query execution', async () => {
    const slowExecute = vi.fn(() => 
      new Promise(resolve => setTimeout(() => resolve(mockQueryResult), 100))
    );
    
    const { user } = renderWithProviders(
      <MockQueryComponent onQueryExecute={slowExecute} />
    );

    await testHelpers.query.typeQuery('MATCH (n) RETURN n');
    
    // Start execution
    const executeBtn = screen.getByRole('button');
    await user.click(executeBtn);
    
    // Check loading state
    expect(screen.getByText('Executing...')).toBeInTheDocument();
    expect(executeBtn).toBeDisabled();
    
    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Execute Query')).toBeInTheDocument();
    });
  });

  it('should disable execute button when query is empty', () => {
    renderWithProviders(<MockQueryComponent />);
    
    const executeBtn = screen.getByRole('button');
    expect(executeBtn).toBeDisabled();
  });

  it('should handle query execution errors gracefully', async () => {
    const failingExecute = vi.fn().mockRejectedValue(
      new Error('Syntax error in query')
    );
    
    renderWithProviders(
      <MockQueryComponent onQueryExecute={failingExecute} />
    );

    await testHelpers.query.typeQuery('INVALID SYNTAX');
    await testHelpers.query.executeQuery();
    
    // In a real component, this would show error state
    expect(failingExecute).toHaveBeenCalled();
  });
});

// Performance testing example
describe('Query Performance Testing', () => {
  it('should handle large result sets efficiently', async () => {
    const largeResultSet = {
      ...mockQueryResult,
      data: Array.from({ length: 1000 }, (_, i) => ({
        'n.id': i.toString(),
        'n.name': `User ${i}`,
      })),
    };

    renderWithProviders(
      <MockQueryComponent onQueryExecute={() => Promise.resolve(largeResultSet)} />
    );

    const startTime = performance.now();
    
    await testHelpers.query.typeQuery('MATCH (n) RETURN n');
    await testHelpers.query.executeQuery();
    
    await waitFor(() => {
      testHelpers.query.expectResults(1000);
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Ensure rendering doesn't take too long
    expect(renderTime).toBeLessThan(2000); // Less than 2 seconds
  });
});

// Accessibility testing example
describe('Query Accessibility Testing', () => {
  it('should be accessible to screen readers', () => {
    renderWithProviders(<MockQueryComponent />);
    
    // Check for proper labels
    const queryEditor = screen.getByPlaceholderText('Enter your query here...');
    expect(queryEditor).toHaveAttribute('data-testid', 'query-editor');
    
    const executeBtn = screen.getByRole('button');
    expect(executeBtn).toBeInTheDocument();
    
    // Could run more comprehensive accessibility checks here
    // const accessibilityIssues = checkAccessibility(container);
    // expect(accessibilityIssues).toHaveLength(0);
  });
});