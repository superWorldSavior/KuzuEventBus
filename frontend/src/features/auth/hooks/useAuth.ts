import { useEffect, useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import { authApi } from "../services/authApi";
import { log } from "@/shared/lib/logger";
import type { RegistrationData, LoginCredentials, AuthError } from "../types";
import type { Customer } from "@/entities/customer";

export function useAuth() {
  const { 
    user, 
    token, 
    isAuthenticated, 
    isLoading, 
    error,
    login, 
    logout: storeLogout, 
    setLoading, 
    setError,
    clearError
  } = useAuthStore();

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      clearError();

      // Check if user has stored credentials
      const storedApiKey = authApi.getApiKey();
      const storedCustomerId = authApi.getCustomerId();

      if (storedApiKey && storedCustomerId) {
        try {
          // Validate API key format first
          if (!storedApiKey.startsWith('kb_') || storedApiKey.length < 10) {
            log.warn("Invalid stored API key format, clearing credentials");
            await authApi.logout();
            storeLogout();
            setLoading(false);
            return;
          }

          // Validate current session with backend
          const isValid = await authApi.validateSession();
          if (isValid) {
            const customer = await authApi.getCurrentCustomer();
            if (customer && customer.id === storedCustomerId) {
              login(customer, storedApiKey);
              log.info("User session restored", { customerId: customer.id });
            } else {
              // Customer data doesn't match stored ID - security issue
              log.warn("Customer ID mismatch, clearing session");
              await authApi.logout();
              storeLogout();
            }
          } else {
            // Invalid session, logout
            log.info("Invalid session detected, logging out");
            await authApi.logout();
            storeLogout();
          }
        } catch (error) {
          log.warn("Session validation failed", { error });
          await authApi.logout();
          storeLogout();
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []); // Empty dependency array to run only on mount

  // Login with API key
  const handleLoginWithApiKey = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      clearError();

      // Validate API key format before attempting login
      if (!credentials.apiKey || !credentials.apiKey.startsWith('kb_') || credentials.apiKey.length < 10) {
        throw new Error('Invalid API key format. API keys must start with "kb_" and be at least 10 characters long.');
      }

      const customer = await authApi.loginWithApiKey(credentials.apiKey);
      
      // Additional validation - ensure customer data is complete
      if (!customer.id || !customer.tenantName) {
        throw new Error('Invalid customer data received from server');
      }

      login(customer, credentials.apiKey);
      
      log.info("User logged in successfully", { customerId: customer.id });
      return { success: true, data: customer };
    } catch (error) {
      // Enhanced error handling for authentication failures
      let errorMessage = 'Login failed';
      let errorCode = 'LOGIN_FAILED';

      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Categorize different types of auth errors
        if (error.message.includes('Invalid API key format')) {
          errorCode = 'INVALID_API_KEY_FORMAT';
        } else if (error.message.includes('Invalid API key') || error.message.includes('401')) {
          errorCode = 'INVALID_CREDENTIALS';
          errorMessage = 'Invalid API key. Please check your credentials and try again.';
        } else if (error.message.includes('403')) {
          errorCode = 'ACCESS_FORBIDDEN';
          errorMessage = 'Access forbidden. Your account may be suspended.';
        } else if (error.message.includes('Network Error') || error.message.includes('timeout')) {
          errorCode = 'NETWORK_ERROR';
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      }

      const authError: AuthError = {
        code: errorCode as any,
        message: errorMessage,
        details: error
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

  // Customer registration (signup)
  const handleRegister = useCallback(async (registrationData: RegistrationData) => {
    try {
      setLoading(true);
      clearError();

      const response = await authApi.registerCustomer({
        tenant_name: registrationData.tenantName,
        organization_name: registrationData.organizationName,
        admin_email: registrationData.adminEmail
      });

      // Convert registration response to Customer entity
      const customer: Customer = {
        id: response.customer_id,
        tenantName: response.tenant_name,
        organizationName: response.organization_name,
        adminEmail: response.admin_email,
        subscriptionStatus: response.subscription_status as Customer['subscriptionStatus'],
        createdAt: response.created_at,
      };

      login(customer, response.api_key);
      
      log.info("User registered successfully", { customerId: customer.id });
      return { success: true, data: { customer, apiKey: response.api_key } };
    } catch (error) {
      const authError: AuthError = {
        code: 'REGISTRATION_FAILED',
        message: error instanceof Error ? error.message : 'Registration failed',
        details: error
      };
      
      setError(authError.message);
      log.error("Registration failed", { error: authError });
      
      return {
        success: false,
        error: authError
      };
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
      // Still clear the store and storage even if API call fails
      storeLogout();
      localStorage.removeItem('kuzu_api_key');
      localStorage.removeItem('kuzu_customer_id');
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

  return {
    // State
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    loginWithApiKey: handleLoginWithApiKey,
    register: handleRegister,
    logout: handleLogout,
    updateProfile,
    clearError,
    
    // Utilities
    getApiKey: authApi.getApiKey,
    getCustomerId: authApi.getCustomerId,
    getTenantName: authApi.getTenantName,
  };
}
