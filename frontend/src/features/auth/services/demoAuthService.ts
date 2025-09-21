import { authApi } from "./authApi";
import { getDefaultDemoUser } from "@/shared/lib/demo-users";
import { log } from "@/shared/lib/logger";
import type { Customer } from "@/entities/customer";

/**
 * Demo authentication service for development and testing
 * Provides pre-configured demo accounts that work out-of-the-box
 */
export const demoAuthService = {
  /**
   * Authenticates with the default demo account
   * Uses a demo-first approach that doesn't depend on backend validation
   */
  async loginWithDemoAccount(): Promise<Customer> {
    const demoUser = getDefaultDemoUser();
    
    log.info("Attempting demo login", { 
      email: demoUser.email,
      tenantName: demoUser.tenantName,
      apiKey: demoUser.apiKey.substring(0, 10) + "..." // Log only prefix for security
    });

    // For demo mode, we prioritize a working demo experience
    // Create a demo customer object that works immediately
    const demoCustomer: Customer = {
      id: demoUser.customerId,
      tenantName: demoUser.tenantName,
      organizationName: "Demo Organization",
      adminEmail: demoUser.email,
      subscriptionStatus: "active",
      createdAt: new Date().toISOString(),
    };

    // Store the demo credentials locally first
    localStorage.setItem('kuzu_api_key', demoUser.apiKey);
    localStorage.setItem('kuzu_customer_id', demoUser.customerId);
    localStorage.setItem('kuzu_tenant_name', demoUser.tenantName);
    
    // Store auth timestamp
    const authUtils = await import("../utils/validation");
    authUtils.updateAuthTimestamp();

    // Try to validate with backend if available, but don't fail if it's not working
    try {
      const backendCustomer = await authApi.loginWithApiKey(demoUser.apiKey);
      log.info("Demo account validated with backend", { customerId: backendCustomer.id });
      return backendCustomer;
    } catch (error) {
      log.warn("Backend validation failed for demo account, using local demo data", { error });
      
      // Try to create a demo account in the backend (non-blocking)
      this.createDemoAccount().catch(createError => {
        log.warn("Failed to create demo account in background", { createError });
      });
    }

    log.info("Using local demo credentials", { customerId: demoCustomer.id });
    return demoCustomer;
  },

  /**
   * Check if demo mode is available (based on environment configuration)
   */
  isDemoModeAvailable(): boolean {
    const demoUser = getDefaultDemoUser();
    return !!(demoUser.apiKey && demoUser.customerId && demoUser.tenantName);
  },

  /**
   * Get demo user information for display purposes
   */
  getDemoUserInfo() {
    return getDefaultDemoUser();
  },

  /**
   * Create or register a demo account with the backend (if needed)
   * This method creates a new demo account using a unique tenant name
   */
  async createDemoAccount(): Promise<{ customer: Customer; apiKey: string }> {
    try {
      const demoUser = getDefaultDemoUser();
      const timestamp = new Date().getTime();
      
      // Create a unique tenant name to avoid conflicts
      const uniqueTenantName = `${demoUser.tenantName}-${timestamp}`;
      
      const registrationData = {
        tenant_name: uniqueTenantName,
        organization_name: "Demo Organization",
        admin_email: `demo+${timestamp}@kuzu-eventbus.com`,
      };

      const response = await authApi.registerCustomer(registrationData);
      
      const customer: Customer = {
        id: response.customer_id,
        tenantName: response.tenant_name,
        organizationName: response.organization_name,
        adminEmail: response.admin_email,
        subscriptionStatus: response.subscription_status as Customer['subscriptionStatus'],
        createdAt: response.created_at,
      };

      log.info("Demo account created via registration", { 
        customerId: customer.id,
        tenantName: customer.tenantName,
        apiKey: response.api_key.substring(0, 10) + "..."
      });

      return { customer, apiKey: response.api_key };
    } catch (error) {
      log.error("Failed to create demo account", { error });
      throw new Error(`Failed to create demo account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};