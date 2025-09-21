import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { demoAuthService } from '@/features/auth/services/demoAuthService';

// Mock dependencies
vi.mock('@/features/auth/hooks/useAuth');
vi.mock('@/features/auth/services/demoAuthService');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockUseAuth = {
  loginWithApiKey: vi.fn(),
  loginWithDemo: vi.fn(),
};

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockUseAuth as any);
    vi.mocked(demoAuthService.isDemoModeAvailable).mockReturnValue(true);
  });

  it('should render login form with mode toggle', () => {
    renderLoginPage();

    // Check for mode toggle buttons
    expect(screen.getByText('Email & Password')).toBeInTheDocument();
    expect(screen.getByText('API Key')).toBeInTheDocument();

    // Check for demo info component
    expect(screen.getByText('Demo Account Available')).toBeInTheDocument();

    // Check for form elements (default is credentials mode)
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try demo account/i })).toBeInTheDocument();
  });

  it('should switch to API key mode when clicked', () => {
    renderLoginPage();

    // Click API Key mode
    fireEvent.click(screen.getByText('API Key'));

    // Should show API key input instead of email/password
    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('should handle demo login successfully', async () => {
    mockUseAuth.loginWithDemo.mockResolvedValue({
      success: true,
      data: { id: 'demo-customer' },
    });

    renderLoginPage();

    // Click demo login button
    const demoButton = screen.getByRole('button', { name: /try demo account/i });
    fireEvent.click(demoButton);

    await waitFor(() => {
      expect(mockUseAuth.loginWithDemo).toHaveBeenCalled();
    });
  });

  it('should handle API key login', async () => {
    mockUseAuth.loginWithApiKey.mockResolvedValue({
      success: true,
      data: { id: 'test-customer' },
    });

    renderLoginPage();

    // Switch to API key mode
    fireEvent.click(screen.getByText('API Key'));

    // Fill in API key
    const apiKeyInput = screen.getByLabelText('API Key');
    fireEvent.change(apiKeyInput, { target: { value: 'kb_test_api_key_123456' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUseAuth.loginWithApiKey).toHaveBeenCalledWith({
        apiKey: 'kb_test_api_key_123456',
      });
    });
  });

  it('should handle API key validation errors', async () => {
    renderLoginPage();

    // Switch to API key mode
    fireEvent.click(screen.getByText('API Key'));

    // Fill in invalid API key
    const apiKeyInput = screen.getByLabelText('API Key');
    fireEvent.change(apiKeyInput, { target: { value: 'invalid_key' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid api key format/i)).toBeInTheDocument();
    });

    // Should not call login API
    expect(mockUseAuth.loginWithApiKey).not.toHaveBeenCalled();
  });

  it('should show error message when demo login fails', async () => {
    mockUseAuth.loginWithDemo.mockResolvedValue({
      success: false,
      error: { message: 'Demo login failed' },
    });

    renderLoginPage();

    // Click demo login button
    const demoButton = screen.getByRole('button', { name: /try demo account/i });
    fireEvent.click(demoButton);

    await waitFor(() => {
      expect(screen.getByText('Demo login failed')).toBeInTheDocument();
    });
  });

  it('should hide demo info when demo mode is not available', () => {
    vi.mocked(demoAuthService.isDemoModeAvailable).mockReturnValue(false);

    renderLoginPage();

    expect(screen.queryByText('Demo Account Available')).not.toBeInTheDocument();
  });

  it('should handle credentials mode with API key detection', async () => {
    mockUseAuth.loginWithApiKey.mockResolvedValue({
      success: true,
      data: { id: 'test-customer' },
    });

    renderLoginPage();

    // Should be in credentials mode by default
    const emailInput = screen.getByLabelText('Email address');
    
    // Enter API key in email field (backward compatibility)
    fireEvent.change(emailInput, { target: { value: 'kb_test_api_key_123456' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUseAuth.loginWithApiKey).toHaveBeenCalledWith({
        apiKey: 'kb_test_api_key_123456',
      });
    });
  });

  it('should show error for email/password login (not yet implemented)', async () => {
    renderLoginPage();

    // Fill in email (not API key format)
    const emailInput = screen.getByLabelText('Email address');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    // Fill in password
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email\/password login is not yet implemented/i)).toBeInTheDocument();
    });

    // Should not call login API
    expect(mockUseAuth.loginWithApiKey).not.toHaveBeenCalled();
  });
});