// Customer Entity Model
export interface Customer {
  id: string;
  tenantName: string;
  organizationName: string;
  adminEmail: string;
  subscriptionStatus: "active" | "inactive" | "trial" | "suspended";
  createdAt: string;
  lastLogin?: string;
  apiKey?: string;
}