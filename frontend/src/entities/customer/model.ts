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

export interface CustomerRegistration {
  tenantName: string;
  organizationName: string;
  adminEmail: string;
}

export interface CustomerUpdate {
  organizationName?: string;
  adminEmail?: string;
  subscriptionStatus?: "active" | "inactive" | "trial" | "suspended";
}