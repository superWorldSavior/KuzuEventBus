// Customer entity barrel exports
export type { 
  Customer, 
  CustomerRegistration, 
  CustomerUpdate 
} from "./model";

export { 
  CustomerSchema, 
  CustomerRegistrationSchema, 
  CustomerUpdateSchema,
  type CustomerSchemaType,
  type CustomerRegistrationSchemaType,
  type CustomerUpdateSchemaType
} from "./schema";

// Customer constants
export const CUSTOMER_SUBSCRIPTION_STATUSES = [
  "active",
  "inactive", 
  "trial",
  "suspended"
] as const;

export const TENANT_NAME_REGEX = /^[a-z0-9-]+$/;