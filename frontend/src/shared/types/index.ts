// Shared types barrel exports
export type {
  ApiResponse,
  ErrorResponse,
  PaginatedResponse,
  HealthCheck,
  ServiceHealth,
  RequestOptions,
  FileUploadProgress,
  FileUploadResponse
} from "./api";

export type {
  AppError,
  ValidationError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  ApplicationError
} from "./error";