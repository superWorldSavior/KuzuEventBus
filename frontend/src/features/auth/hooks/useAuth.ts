import { useEffect, useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import { authApi } from "../services/auth.api";
import { log } from "@/shared/lib/logger";
import type { AuthError, RegistrationData, LoginCredentials } from "../types";
import type { Customer } from "@/entities/customer";

export function useAuth() {
  const { 
    user, 
    token, 
    isAuthenticated, 
    isLoading, 
    error,
    isInitialized,
    login, 
    logout: storeLogout, 
    setLoading, 
    setError,
    clearError,
    initializeAuth
  } = useAuthStore();

  // Initialize auth state on app load - called only once via store
  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);


  // Customer registration (signup)
  const handleRegister = useCallback(async (registrationData: RegistrationData) => {
    try {
      setLoading(true);
      clearError();

      const response: any = await authApi.registerCustomer({ 
        tenant_name: registrationData.tenantName,
        organization_name: registrationData.organizationName,
        admin_email: registrationData.adminEmail,
        password: registrationData.password,
      });

      // Support both mocked shape { customer, api_key } and backend shape { customer_id, ... }
      let customer: Customer;
      let apiKey: string;
      if (response?.customer) {
        customer = response.customer as Customer;
        apiKey = response.api_key as string;
      } else {
        customer = {
          id: response.customer_id,
          tenantName: response.tenant_name,
          organizationName: response.organization_name,
          adminEmail: response.admin_email,
          subscriptionStatus: response.subscription_status as Customer['subscriptionStatus'],
          createdAt: response.created_at,
        } as Customer;
        apiKey = response.api_key as string;
      }

      login(customer, apiKey);
      
      log.info("User registered successfully", { customerId: customer.id });
      return { success: true, data: { customer, apiKey: response.api_key } };
    } catch (error) {
      let code: AuthError['code'] = 'REGISTRATION_FAILED';
      let message = error instanceof Error ? error.message : 'Registration failed';

      // Friendly mapping for common backend validation/conflict cases
      const msg = (error as any)?.message?.toString().toLowerCase?.() || '';
      if (msg.includes('422')) {
        message = 'Registration failed (422). Please check Tenant Name formatting (lowercase letters, digits, hyphens; no start/end hyphen; no "--").';
      } else if (msg.includes('email') && (msg.includes('already') || msg.includes('in use'))) {
        code = 'EMAIL_ALREADY_USED' as any;
        message = 'Admin email already in use. Please use a different email address.';
      } else if (msg.includes('tenant') && (msg.includes('already') || msg.includes('exists') || msg.includes('duplicate') || msg.includes('conflict'))) {
        code = 'TENANT_ALREADY_EXISTS' as any;
        message = 'Tenant name already exists. Please choose another tenant name.';
      }

      const authError: AuthError = {
        code,
        message: `Registration failed: ${message}`,
        details: error,
      };
      
      setError(authError.message);
      log.error("Registration failed", { error: authError });
      
      return {
        success: false,
        error: authError
      };
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setError, login]);

  // Enhanced logout with complete cleanup
  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      
      // Clear API credentials first
      await authApi.logout();
      
      // Clear Zustand store
      storeLogout();
      
      // Clear any additional auth-related localStorage items
      localStorage.removeItem('auth_token'); // Legacy token
      
      // Clear any session storage items
      sessionStorage.clear();
      
      log.info("User logged out successfully");
    } catch (error) {
      log.error("Logout failed", { error });
      setError(`Logout failed: ${(error as any)?.message || 'Logout failed'}`);
      // Still clear the store and storage even if API call fails
      storeLogout();
      localStorage.removeItem('kuzu_api_key');
      localStorage.removeItem('kuzu-api-key');
      localStorage.removeItem('kuzu_customer_id');
      localStorage.removeItem('kuzu-customer-id');
      localStorage.removeItem('kuzu_tenant_name');
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
    } finally {
      setLoading(false);
    }
  }, [storeLogout, setLoading]);

  // Update user profile
  const updateProfile = useCallback(async (updates: { organizationName?: string; adminEmail?: string }) => {
    try {
      setLoading(true);
      clearError();

      const updatedCustomer = await authApi.updateCustomer({
        organization_name: updates.organizationName,
        admin_email: updates.adminEmail
      });

      // Update the store with new user data
      login(updatedCustomer, token || '');
      
      log.info("Profile updated successfully", { customerId: updatedCustomer.id });
      return { success: true, data: updatedCustomer };
    } catch (error) {
      const authError: AuthError = {
        code: 'UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Profile update failed',
        details: error
      };
      
      setError(authError.message);
      log.error("Profile update failed", { error: authError });
      
      return {
        success: false,
        error: authError
      };
    }
  }, [setLoading, clearError, setError, login, token]);

  // Login with tenant_name/admin_email for compatibility with tests
  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      clearError();

      const response: any = await authApi.loginWithCredentials({
        email: credentials.email,
        password: credentials.password,
      });

      // Support both mocked shape { customer, api_key } and backend shape
      let customer: Customer;
      let apiKey: string;
      if (response?.customer) {
        customer = response.customer as Customer;
        apiKey = response.api_key as string;
      } else {
        customer = {
          id: response.customer_id,
          tenantName: response.tenant_name,
          organizationName: response.organization_name,
          adminEmail: response.admin_email,
          subscriptionStatus: 'active' as Customer['subscriptionStatus'],
          createdAt: new Date().toISOString(),
        } as Customer;
        apiKey = response.api_key as string;
      }

      login(customer, apiKey);
      
      log.info("User logged in successfully", { customerId: customer.id });
      return { success: true, data: { customer, apiKey: response.api_key } };
    } catch (error) {
      let code: AuthError['code'] = 'LOGIN_FAILED';
      let message = error instanceof Error ? error.message : 'Login failed';

      // Friendly mapping for common login errors
      const msg = (error as any)?.message?.toString().toLowerCase?.() || '';
      if (msg.includes('401') || msg.includes('invalid')) {
        message = 'Invalid email or password';
      }

      const authError: AuthError = {
        code,
        message: `Authentication failed: ${message}`,
        details: error,
      };
      
      setError(authError.message);
      log.error("Login failed", { error: authError });
      
      return {
        success: false,
        error: authError
      };
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setError, login]);

  return {
    // State
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    isInitialized,
    
    // Actions
    handleLogin,
    handleRegister,
    handleLogout,
    updateProfile,
    clearError,
    
    // Utilities
    getApiKey: authApi.getApiKey,
    getCustomerId: authApi.getCustomerId,
    getTenantName: authApi.getTenantName,
  };
}
