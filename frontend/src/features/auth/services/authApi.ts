import { apiClient } from "@/shared/api/client";
import { handleApiError, markEndpointWorking } from "@/shared/lib/errorHandling";
import type { Customer } from "@/entities/customer";
import { validateApiKeyFormat, updateAuthTimestamp, clearAuthTimestamp } from "../utils/validation";

// Auth-specific API calls with enhanced validation
export const authApi = {
  // Customer registration (acts as signup in this system)
  async registerCustomer(data: {
    tenant_name: string;
    organization_name: string;
    admin_email: string;
  }): Promise<{
    customer_id: string;
    tenant_name: string;
    organization_name: string;
    admin_email: string;
    api_key: string;
    subscription_status: string;
    created_at: string;
  }> {
    const endpoint = "POST /api/v1/customers/register";
    
    try {
      const response = await apiClient.post("/api/v1/customers/register", data);
      markEndpointWorking(endpoint);
      
      // Store API key and customer info for future requests
      if (response.data?.api_key) {
        // Validate received API key format
        const validation = validateApiKeyFormat(response.data.api_key);
        if (!validation.isValid) {
          throw new Error(`Server returned invalid API key: ${validation.error}`);
        }

        localStorage.setItem('kuzu_api_key', response.data.api_key);
        localStorage.setItem('kuzu_customer_id', response.data.customer_id);
        localStorage.setItem('kuzu_tenant_name', response.data.tenant_name);
        updateAuthTimestamp(); // Track when credentials were stored
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  },

  // Get current customer account info
  async getCurrentCustomer(): Promise<Customer | null> {
    const endpoint = "GET /api/v1/customers/{customerId}";
    
    try {
      const customerId = localStorage.getItem('kuzu_customer_id');
      if (!customerId) return null;

      const response = await apiClient.get(`/api/v1/customers/${customerId}`);
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      console.error('Failed to get current customer:', error);
      // Don't throw error for this method to maintain backwards compatibility
      return null;
    }
  },

  // Login with existing credentials (API key)
  async loginWithApiKey(apiKey: string): Promise<Customer> {
    // Client-side validation before making API call
    const validation = validateApiKeyFormat(apiKey);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Store the API key
    localStorage.setItem('kuzu_api_key', apiKey);
    updateAuthTimestamp(); // Track when credentials were stored
    
    // Try to get customer info to validate the key
    const customer = await this.getCurrentCustomer();
    
    if (!customer) {
      // Clear invalid API key
      this.logout();
      throw new Error('Invalid API key');
    }
    
    return customer;
  },

  // Logout - clear stored credentials and timestamp
  async logout(): Promise<void> {
    localStorage.removeItem('kuzu_api_key');
    localStorage.removeItem('kuzu_customer_id');
    localStorage.removeItem('kuzu_tenant_name');
    localStorage.removeItem('auth_token'); // Legacy token support
    clearAuthTimestamp(); // Clear authentication timestamp
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('kuzu_api_key');
  },

  // Get stored API key
  getApiKey(): string | null {
    return localStorage.getItem('kuzu_api_key');
  },

  // Get stored customer ID
  getCustomerId(): string | null {
    return localStorage.getItem('kuzu_customer_id');
  },

  // Get stored tenant name
  getTenantName(): string | null {
    return localStorage.getItem('kuzu_tenant_name');
  },

  // Validate current session
  async validateSession(): Promise<boolean> {
    try {
      const customer = await this.getCurrentCustomer();
      return !!customer;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  },

  // Update customer profile
  async updateCustomer(data: {
    organization_name?: string;
    admin_email?: string;
  }): Promise<Customer> {
    const endpoint = "PUT /api/v1/customers/{customerId}";
    
    try {
      const customerId = localStorage.getItem('kuzu_customer_id');
      if (!customerId) {
        throw new Error('No customer ID found');
      }

      const response = await apiClient.put(`/api/v1/customers/${customerId}`, data);
      markEndpointWorking(endpoint);
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  },
};