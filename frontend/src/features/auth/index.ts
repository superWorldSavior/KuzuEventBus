// Auth feature barrel exports

// Components
export { AuthLayout, AuthInput, AuthButton } from "./components/AuthFormComponents";
export { DemoUserInfo } from "./components/DemoUserInfo";

// Hooks
export { useAuth } from "./hooks/useAuth";

// Services
export { authApi } from "./services/auth.api";

// Stores
export { useAuthStore } from "./stores/authStore";

// Types
export type {
  LoginCredentials,
  RegistrationData,
  AuthUser,
  AuthState,
  LoginResponse,
  RegistrationResponse,
  LoginFormData,
  RegistrationFormData,
  AuthError
} from "./types";

// Constants
export const AUTH_STORAGE_KEYS = {
  API_KEY: 'kuzu_api_key',
  CUSTOMER_ID: 'kuzu_customer_id', 
  TENANT_NAME: 'kuzu_tenant_name',
  AUTH_TOKEN: 'auth_token', // Legacy support
} as const;

export const AUTH_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
} as const;