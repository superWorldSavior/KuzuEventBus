// Backend API Types matching the FastAPI DTOs

export interface CustomerRegistrationRequest {
  tenant_name: string;
  organization_name: string;
  admin_email: string;
}

export interface CustomerRegistrationResponse {
  customer_id: string;
  tenant_name: string;
  organization_name: string;
  admin_email: string;
  api_key: string;
  subscription_status: string;
  created_at: string;
}

export interface CustomerAccountResponse {
  customer_id: string;
  tenant_name: string;
  organization_name: string;
  admin_email: string;
  subscription_status: string;
  created_at: string;
  last_login?: string;
}

export interface ApiKeyCreateRequest {
  key_name: string;
  permissions: string[];
}

export interface ApiKeyCreateResponse {
  api_key: string;
  key_name: string;
  created_at: string;
  permissions: string[];
  last_used?: string;
}

export interface ApiKeyListResponse {
  api_keys: Array<{
    api_key: string;
    key_name: string;
    created_at: string;
    permissions: string[];
    last_used?: string;
    is_active: boolean;
  }>;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SuccessResponse {
  message: string;
  data?: Record<string, unknown>;
}

// Health check responses
export interface HealthResponse {
  status: string;
  service?: string;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  tenant_id: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  tenant_id: string;
  tenant_name: string;
  organization_name: string;
  role: string;
}
