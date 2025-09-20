// Example test file demonstrating the testing infrastructure
// This shows how to test dashboard components with the new test utilities

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, createMockApi, mockDashboardStats } from '../advanced-utils';
import { testHelpers } from '../component-helpers';

// Mock the API services  
const mockApi = createMockApi();
vi.mock('@/features/analytics', () => ({
  analyticsApi: {
    getDashboardStats: mockApi.get,
  }
}));

vi.mock('@/features/database-management', () => ({
  databaseApi: {
    getDatabases: mockApi.get,
  }
}));

// Mock component (since we don't have the actual component yet)
const MockDashboardComponent = () => (
  <div data-testid="dashboard">
    <h1>Dashboard</h1>
    <div data-testid="stats-grid">
      <div data-testid="stat-card">
        <span>Total Databases</span>
        <span>5</span>
      </div>
      <div data-testid="stat-card">
        <span>Storage Used</span>
        <span>25.4 GB</span>
      </div>
      <div data-testid="stat-card">
        <span>Queries Today</span>
        <span>142</span>
      </div>
      <div data-testid="stat-card">
        <span>Avg Response Time</span>
        <span>234ms</span>
      </div>
    </div>
    <div data-testid="performance-chart">Chart</div>
  </div>
);

describe('Dashboard Component Testing Example', () => {
  beforeEach(() => {
    mockApi.reset();
  });

  it('should render dashboard stats correctly', async () => {
    mockApi.mockSuccessfulDashboardStats();
    
    renderWithProviders(<MockDashboardComponent />, {
      preloadedQueries: {
        'dashboard.stats': mockDashboardStats,
      },
    });

    // Using dashboard test helpers
    testHelpers.dashboard.expectAllStatCards();
    testHelpers.dashboard.expectChartToBeVisible();

    // Verify specific values
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('25.4 GB')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText('234ms')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    const { } = renderWithProviders(<MockDashboardComponent />);
    
    // This would test actual loading states in real components
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    mockApi.mockApiError(500, 'Failed to load dashboard data');
    
    // In a real component, this would trigger error state
    // testHelpers.dashboard.expectErrorState('Failed to load dashboard data');
  });

  it('should refresh data when refresh button is clicked', async () => {
    renderWithProviders(<MockDashboardComponent />);
    
    // This demonstrates user interaction testing
    // const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    // await user.click(refreshBtn);
    
    // Verify API was called again
    // expect(mockApi.get).toHaveBeenCalledTimes(2);
  });
});

describe('Integration Test Example', () => {
  it('should navigate between dashboard and databases', async () => {
    // This would test full navigation flow
    renderWithProviders(<MockDashboardComponent />);
    
    // Start on dashboard
    testHelpers.navigation.expectCurrentPage('dashboard');
    
    // Navigate to databases (in real test)
    // await testHelpers.navigation.goToDatabases();
    // testHelpers.navigation.expectCurrentPage('databases');
  });
});