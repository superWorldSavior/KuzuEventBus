// Component-specific test helpers for dashboard and database components

import { screen, within } from '@testing-library/react';
import { expect } from 'vitest';
import userEvent from '@testing-library/user-event';

// Dashboard component test helpers
export const dashboardTestHelpers = {
  // Get dashboard stat cards
  getStatCard: (label: string) => {
    return screen.getByLabelText(label) || screen.getByText(label).closest('[data-testid*="stat"]');
  },
  
  // Verify all stat cards are present
  expectAllStatCards: () => {
    expect(screen.getByText(/total databases/i)).toBeInTheDocument();
    expect(screen.getByText(/storage used/i)).toBeInTheDocument();
    expect(screen.getByText(/queries today/i)).toBeInTheDocument();
    expect(screen.getByText(/avg response time/i)).toBeInTheDocument();
  },
  
  // Check for loading states
  expectLoadingState: () => {
    expect(screen.getByTestId('dashboard-loading') || screen.getByText(/loading/i)).toBeInTheDocument();
  },
  
  // Check for error states
  expectErrorState: (message?: string) => {
    const errorElement = screen.getByRole('alert') || screen.getByText(/error/i);
    expect(errorElement).toBeInTheDocument();
    if (message) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
  },
  
  // Verify chart is rendered
  expectChartToBeVisible: () => {
    const chart = screen.getByTestId('performance-chart') || document.querySelector('[data-chart]');
    expect(chart).toBeInTheDocument();
  }
};

// Database component test helpers
export const databaseTestHelpers = {
  // Get database list
  getDatabaseList: () => {
    return screen.getByTestId('database-list') || screen.getByRole('list');
  },
  
  // Get specific database item
  getDatabaseItem: (name: string) => {
    return screen.getByText(name).closest('[data-testid*="database-item"]') ||
           screen.getByText(name).closest('li');
  },
  
  // Click database to view details
  clickDatabase: async (name: string) => {
    const user = userEvent.setup();
    const databaseItem = databaseTestHelpers.getDatabaseItem(name);
    await user.click(databaseItem!);
  },
  
  // Verify database properties
  expectDatabaseProperties: (name: string, expectedProps: Record<string, any>) => {
    const item = databaseTestHelpers.getDatabaseItem(name);
    expect(item).toBeInTheDocument();
    
    Object.entries(expectedProps).forEach(([_, value]) => {
      if (typeof value === 'string') {
        expect(within(item as HTMLElement).getByText(value)).toBeInTheDocument();
      } else if (typeof value === 'number') {
        expect(within(item as HTMLElement).getByText(value.toString())).toBeInTheDocument();
      }
    });
  },
  
  // Check create database button
  getCreateButton: () => {
    return screen.getByRole('button', { name: /create database/i }) ||
           screen.getByTestId('create-database-btn');
  },
  
  // Fill database creation form
  fillCreateForm: async (data: { name: string; description?: string }) => {
    const user = userEvent.setup();
    
    const nameInput = screen.getByLabelText(/database name/i) ||
                     screen.getByPlaceholderText(/database name/i);
    await user.type(nameInput, data.name);
    
    if (data.description) {
      const descInput = screen.getByLabelText(/description/i) ||
                       screen.getByPlaceholderText(/description/i);
      await user.type(descInput, data.description);
    }
  }
};

// Query component test helpers
export const queryTestHelpers = {
  // Get query editor
  getQueryEditor: () => {
    return screen.getByTestId('query-editor') ||
           screen.getByRole('textbox', { name: /query/i }) ||
           screen.getByPlaceholderText(/enter your query/i);
  },
  
  // Type query
  typeQuery: async (query: string) => {
    const user = userEvent.setup();
    const editor = queryTestHelpers.getQueryEditor();
    await user.clear(editor);
    await user.type(editor, query);
  },
  
  // Execute query
  executeQuery: async () => {
    const user = userEvent.setup();
    const executeBtn = screen.getByRole('button', { name: /run|execute/i });
    await user.click(executeBtn);
  },
  
  // Get results table
  getResultsTable: () => {
    return screen.getByTestId('query-results') ||
           screen.getByRole('table') ||
           document.querySelector('[data-results]');
  },
  
  // Verify results
  expectResults: (expectedRowCount?: number) => {
    const table = queryTestHelpers.getResultsTable();
    expect(table).toBeInTheDocument();
    
    if (expectedRowCount !== undefined) {
      const rows = within(table!).getAllByRole('row');
      // Subtract 1 for header row
      expect(rows.length - 1).toBe(expectedRowCount);
    }
  },
  
  // Check query execution status
  expectQueryStatus: (status: 'running' | 'success' | 'error') => {
    const statusIndicator = screen.getByTestId(`query-status-${status}`) ||
                           screen.getByText(new RegExp(status, 'i'));
    expect(statusIndicator).toBeInTheDocument();
  },
  
  // Get query history
  getQueryHistory: () => {
    return screen.getByTestId('query-history') ||
           screen.getByText(/recent queries/i).closest('div');
  }
};

// Navigation test helpers
export const navigationTestHelpers = {
  // Navigate to dashboard
  goToDashboard: async () => {
    const user = userEvent.setup();
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i }) ||
                         screen.getByTestId('nav-dashboard');
    await user.click(dashboardLink);
  },
  
  // Navigate to databases
  goToDatabases: async () => {
    const user = userEvent.setup();
    const dbLink = screen.getByRole('link', { name: /databases/i }) ||
                  screen.getByTestId('nav-databases');
    await user.click(dbLink);
  },
  
  // Navigate to queries
  goToQueries: async () => {
    const user = userEvent.setup();
    const queryLink = screen.getByRole('link', { name: /queries/i }) ||
                     screen.getByTestId('nav-queries');
    await user.click(queryLink);
  },
  
  // Verify current page
  expectCurrentPage: (pageName: string) => {
    // Check for page title, heading, or URL
    expect(
      screen.getByRole('heading', { name: new RegExp(pageName, 'i') }) ||
      screen.getByTestId(`${pageName.toLowerCase()}-page`) ||
      document.title.toLowerCase().includes(pageName.toLowerCase())
    ).toBeTruthy();
  }
};

// Form test helpers
export const formTestHelpers = {
  // Fill any form field
  fillField: async (label: string, value: string) => {
    const user = userEvent.setup();
    const field = screen.getByLabelText(new RegExp(label, 'i')) ||
                 screen.getByPlaceholderText(new RegExp(label, 'i')) ||
                 screen.getByDisplayValue('') ||
                 screen.getByRole('textbox');
    await user.type(field, value);
  },
  
  // Submit form
  submitForm: async (submitText = /submit|save|create/i) => {
    const user = userEvent.setup();
    const submitBtn = screen.getByRole('button', { name: submitText });
    await user.click(submitBtn);
  },
  
  // Check for validation errors
  expectValidationError: (message: string) => {
    expect(screen.getByText(message)).toBeInTheDocument();
  },
  
  // Check form submission success
  expectSubmissionSuccess: (message?: string) => {
    const successElement = screen.getByTestId('success-message') ||
                          screen.getByRole('alert') ||
                          (message && screen.getByText(message));
    expect(successElement).toBeInTheDocument();
  }
};

// Modal/Dialog test helpers
export const modalTestHelpers = {
  // Get modal
  getModal: () => {
    return screen.getByRole('dialog') ||
           screen.getByTestId('modal') ||
           document.querySelector('[data-modal]');
  },
  
  // Close modal
  closeModal: async () => {
    const user = userEvent.setup();
    const closeBtn = screen.getByRole('button', { name: /close/i }) ||
                    screen.getByTestId('modal-close') ||
                    screen.getByLabelText(/close/i);
    await user.click(closeBtn);
  },
  
  // Verify modal is open
  expectModalOpen: (title?: string) => {
    const modal = modalTestHelpers.getModal();
    expect(modal).toBeInTheDocument();
    
    if (title) {
      expect(within(modal!).getByText(title)).toBeInTheDocument();
    }
  },
  
  // Verify modal is closed
  expectModalClosed: () => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  }
};

// Notification test helpers
export const notificationTestHelpers = {
  // Get notification
  getNotification: (type?: 'success' | 'error' | 'warning' | 'info') => {
    if (type) {
      return screen.getByTestId(`notification-${type}`) ||
             screen.getByRole('alert');
    }
    return screen.getByRole('alert') ||
           screen.getByTestId(/notification/);
  },
  
  // Expect notification with message
  expectNotification: (message: string, type?: string) => {
    const notification = notificationTestHelpers.getNotification(type as any);
    expect(notification).toBeInTheDocument();
    expect(within(notification!).getByText(message)).toBeInTheDocument();
  },
  
  // Dismiss notification
  dismissNotification: async () => {
    const user = userEvent.setup();
    const dismissBtn = screen.getByRole('button', { name: /dismiss|close/i }) ||
                      screen.getByTestId('notification-dismiss');
    await user.click(dismissBtn);
  }
};

// Combine all helpers for easy importing
export const testHelpers = {
  dashboard: dashboardTestHelpers,
  database: databaseTestHelpers,
  query: queryTestHelpers,
  navigation: navigationTestHelpers,
  form: formTestHelpers,
  modal: modalTestHelpers,
  notification: notificationTestHelpers,
};