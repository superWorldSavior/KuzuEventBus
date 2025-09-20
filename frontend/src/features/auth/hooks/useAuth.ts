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

      if (authApi.isAuthenticated()) {
        try {
          // Validate current session
          const isValid = await authApi.validateSession();
          if (isValid) {
            const customer = await authApi.getCurrentCustomer();
            if (customer) {
              login(customer, authApi.getApiKey() || '');
              log.info("User session restored", { customerId: customer.id });
            }
          } else {
            // Invalid session, logout
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

      const customer = await authApi.loginWithApiKey(credentials.apiKey);
      login(customer, credentials.apiKey);
      
      log.info("User logged in successfully", { customerId: customer.id });
      return { success: true, data: customer };
    } catch (error) {
      const authError: AuthError = {
        code: 'LOGIN_FAILED',
        message: error instanceof Error ? error.message : 'Login failed',
        details: error
      };
      
      setError(authError.message);
      log.error("Login failed", { error: authError });
      
      return {
        success: false,
        error: authError
      };
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

  // Logout
  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
      storeLogout();
      log.info("User logged out successfully");
    } catch (error) {
      log.error("Logout failed", { error });
      // Still clear the store even if API call fails
      storeLogout();
    }
  }, [storeLogout]);

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
