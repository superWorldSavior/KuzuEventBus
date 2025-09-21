import { apiClient } from "@/shared/api/client";
import { handleApiError, markEndpointWorking } from "@/shared/lib/errorHandling";
import type { Customer } from "@/entities/customer";
import { updateAuthTimestamp, clearAuthTimestamp } from "../utils/validation";

// Helper: normalize backend status (string) to strong union type
function normalizeSubscriptionStatus(s?: string): Customer['subscriptionStatus'] {
  const allowed: Customer['subscriptionStatus'][] = ['active', 'inactive', 'trial', 'suspended'];
  if (s && (allowed as string[]).includes(s)) {
    return s as Customer['subscriptionStatus'];
  }
  return 'active';
}

// Auth-specific API calls with enhanced validation
export const authApi = {
  // Login with email/password
  async loginWithCredentials(
    data: { email: string; password: string }
  ): Promise<any> {
    const endpoint = "POST /api/v1/auth/login";
    
    try {
      const response = await apiClient.post("/api/v1/auth/login", data);
      markEndpointWorking(endpoint);
      
      // Store API key and customer info for future requests (trust backend)
      if (response.data?.api_key) {
        localStorage.setItem('kuzu_api_key', response.data.api_key);
        localStorage.setItem('kuzu_customer_id', response.data.customer_id);
        localStorage.setItem('kuzu_tenant_name', response.data.tenant_name);
        updateAuthTimestamp();
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(endpoint, error);
    }
  },

  // Customer registration (acts as signup in this system)
  async registerCustomer(data: {
    tenant_name: string;
    organization_name: string;
    admin_email: string;
    password?: string;
  }): Promise<any> {
    const endpoint = "POST /api/v1/auth/register";
    
    try {
      const response = await apiClient.post("/api/v1/auth/register", data);
      markEndpointWorking(endpoint);
      
      // Store API key and customer info for future requests (trust backend)
      if (response.data?.api_key) {
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

      const d: {
        customer_id?: string;
        tenant_name?: string;
        admin_email?: string;
        subscription_status?: string;
        created_at?: string;
        organization_name?: string;
      } = response.data || {};
      if (!d.customer_id) {
        return null;
      }
      const customer: Customer = {
        id: d.customer_id,
        tenantName: d.tenant_name || '',
        organizationName: d.organization_name || 'default',
        adminEmail: d.admin_email || '',
        subscriptionStatus: normalizeSubscriptionStatus(d.subscription_status),
        createdAt: d.created_at ?? new Date().toISOString(),
      };
      return customer;
    } catch (error) {
      console.error('Failed to get current customer:', error);
      // Don't throw error for this method to maintain backwards compatibility
      return null;
    }
  },

  // Logout - clear stored credentials and timestamp
  async logout(): Promise<void> {
    localStorage.removeItem('kuzu_api_key');
    localStorage.removeItem('kuzu_customer_id');
    localStorage.removeItem('kuzu_tenant_name');
    clearAuthTimestamp(); // Clear authentication timestamp
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!(localStorage.getItem('kuzu_api_key'));
  },

  // Get stored API key
  getApiKey(): string | null {
    return localStorage.getItem('kuzu_api_key');
  },

  // Set API key (helper for tests/dev)
  setApiKey(key: string): void {
    localStorage.setItem('kuzu_api_key', key);
  },

  // Get stored customer ID
  getCustomerId(): string | null {
    return localStorage.getItem('kuzu_customer_id');
  },

  // Set customer ID (helper for tests/dev)
  setCustomerId(id: string): void {
    localStorage.setItem('kuzu_customer_id', id);
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
