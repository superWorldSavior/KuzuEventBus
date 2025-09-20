import { z } from "zod";

// Customer validation schemas
export const CustomerSchema = z.object({
  id: z.string().min(1),
  tenantName: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, {
    message: "Tenant name must contain only lowercase letters, numbers, and hyphens",
  }),
  organizationName: z.string().min(1).max(100),
  adminEmail: z.string().email(),
  subscriptionStatus: z.enum(["active", "inactive", "trial", "suspended"]),
  createdAt: z.string(),
  lastLogin: z.string().optional(),
  apiKey: z.string().optional(),
});

export const CustomerRegistrationSchema = z.object({
  tenantName: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, {
    message: "Tenant name must contain only lowercase letters, numbers, and hyphens",
  }),
  organizationName: z.string().min(1).max(100),
  adminEmail: z.string().email(),
});

export const CustomerUpdateSchema = z.object({
  organizationName: z.string().min(1).max(100).optional(),
  adminEmail: z.string().email().optional(),
  subscriptionStatus: z.enum(["active", "inactive", "trial", "suspended"]).optional(),
});

// Export types from schemas
export type CustomerSchemaType = z.infer<typeof CustomerSchema>;
export type CustomerRegistrationSchemaType = z.infer<typeof CustomerRegistrationSchema>;
export type CustomerUpdateSchemaType = z.infer<typeof CustomerUpdateSchema>;