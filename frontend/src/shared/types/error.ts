// Shared technical error types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp?: string;
}

export interface ValidationError extends AppError {
  code: "VALIDATION_ERROR";
  fields: Record<string, string[]>;
}

export interface NetworkError extends AppError {
  code: "NETWORK_ERROR";
  status?: number;
  retryable: boolean;
}

export interface AuthenticationError extends AppError {
  code: "AUTHENTICATION_ERROR";
  authRequired: boolean;
}

export interface AuthorizationError extends AppError {
  code: "AUTHORIZATION_ERROR";
  requiredPermissions?: string[];
}

export interface NotFoundError extends AppError {
  code: "NOT_FOUND";
  resourceType?: string;
  resourceId?: string;
}

export interface ConflictError extends AppError {
  code: "CONFLICT";
  conflictingField?: string;
}

export interface RateLimitError extends AppError {
  code: "RATE_LIMIT_EXCEEDED";
  retryAfter?: number;
}

export interface ServerError extends AppError {
  code: "SERVER_ERROR";
  correlationId?: string;
}

export type ApplicationError = 
  | ValidationError
  | NetworkError
  | AuthenticationError
  | AuthorizationError
  | NotFoundError
  | ConflictError
  | RateLimitError
  | ServerError;