import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/services/api";
import { getDefaultDemoUser } from "@/utils/demo-users";
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
      console.log("Login attempt with:", credentials);
      setLoading(true);

      // Demo user credentials for development
      const defaultDemoUser = getDefaultDemoUser();
      console.log("Default demo user:", defaultDemoUser);

      // For now, simulate login since the backend doesn't have login endpoint
      // Accept any email/password combination for demo purposes
      const isValidLogin =
        (credentials.email === defaultDemoUser.email &&
          credentials.password === defaultDemoUser.password) ||
        credentials.email.includes("@"); // Accept any valid email format

      console.log("Is valid login:", isValidLogin);

      if (!isValidLogin) {
        throw new Error("Invalid email or password");
      }

      // Create mock user based on login credentials
      const mockUser = {
        id:
          credentials.email === defaultDemoUser.email
            ? "demo-user-id"
            : "user-" + Date.now(),
        email: credentials.email,
        tenant_id:
          credentials.email === defaultDemoUser.email
            ? "demo-tenant"
            : "user-tenant",
        tenant_name:
          credentials.email === defaultDemoUser.email
            ? "Demo Organization"
            : "User Organization",
        organization_name:
          credentials.email === defaultDemoUser.email
            ? "Demo Organization"
            : "User Organization",
        role: "admin",
      };

      const mockToken =
        credentials.email === defaultDemoUser.email
          ? "demo-jwt-token"
          : "user-jwt-token";

      // Set up API client with token
      apiClient.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${mockToken}`;

      console.log("About to call login with:", mockUser, mockToken);
      login(mockUser, mockToken);
      console.log("Login successful");
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
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
