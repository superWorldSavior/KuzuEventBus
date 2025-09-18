import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/services/api";
import type { LoginRequest, CustomerRegistrationRequest } from "@/types/api";

export function useAuth() {
  const { user, token, isAuthenticated, isLoading, login, logout, setLoading } =
    useAuthStore();

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);

      // Check if we have a stored token
      if (token && user) {
        try {
          // Validate token by making a test API call
          await apiClient.get("/health/");
          setLoading(false);
        } catch (error) {
          // Token is invalid, clear auth state
          logout();
        }
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [token, user, logout, setLoading]);

  const handleLogin = async (credentials: LoginRequest) => {
    try {
      setLoading(true);

      // For now, simulate login since the backend doesn't have login endpoint
      // In the real implementation, this would call POST /api/v1/auth/login
      const mockUser = {
        id: "mock-user-id",
        email: credentials.email,
        tenant_id: "default-tenant",
        tenant_name: "default-tenant",
        organization_name: "Mock Organization",
        role: "admin",
      };

      const mockToken = "mock-jwt-token";

      // Set up API client with token
      apiClient.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${mockToken}`;

      login(mockUser, mockToken);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  };

  const handleRegister = async (
    registrationData: CustomerRegistrationRequest
  ) => {
    try {
      setLoading(true);

      // Call the actual registration endpoint
      const response = await apiClient.post(
        "/api/v1/customers/register",
        registrationData
      );

      const user = {
        id: response.data.customer_id,
        email: response.data.admin_email,
        tenant_id: response.data.customer_id,
        tenant_name: response.data.tenant_name,
        organization_name: response.data.organization_name,
        role: "admin",
      };

      // Use API key as token for now
      const token = response.data.api_key;

      // Set up API client with API key
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      login(user, token);
      return { success: true, data: response.data };
    } catch (error: any) {
      setLoading(false);
      return {
        success: false,
        error:
          error.response?.data?.detail ||
          error.message ||
          "Registration failed",
      };
    }
  };

  const handleLogout = () => {
    // Clear API client authorization
    delete apiClient.defaults.headers.common["Authorization"];
    logout();
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
}
