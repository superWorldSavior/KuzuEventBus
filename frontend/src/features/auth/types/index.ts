// Auth feature types
import type { Customer } from "@/entities/customer";

export interface LoginCredentials {
  apiKey: string;
}

export interface RegistrationData {
  tenantName: string;
  organizationName: string;
  adminEmail: string;
}

export interface AuthUser extends Customer {
  // Extend Customer entity with auth-specific properties if needed
  lastLoginAt?: string;
  sessionExpiry?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}

export interface LoginResponse {
  customer: Customer;
  apiKey: string;
  expiresAt?: string;
}

export interface RegistrationResponse {
  customer_id: string;
  tenant_name: string;
  organization_name: string;
  admin_email: string;
  api_key: string;
  subscription_status: string;
  created_at: string;
}

// Auth form types
export interface LoginFormData {
  apiKey: string;
}

export interface RegistrationFormData {
  tenantName: string;
  organizationName: string;
  adminEmail: string;
  agreeToTerms: boolean;
}

// Auth error types
export interface AuthError {
  code: string;
  message: string;
  details?: unknown;
}

// Demo user type (for development)
export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantName: string;
}