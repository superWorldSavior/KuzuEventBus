interface DemoUser {
  name: string;
  email: string;
  password: string;
  role: string;
  description: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    name: "Demo Admin",
    email: "demo@kuzu-eventbus.com",
    password: "demo123",
    role: "admin",
    description:
      "Full access to all features - ideal for exploring the platform",
  },
  {
    name: "Database Manager",
    email: "manager@kuzu-eventbus.com",
    password: "manager123",
    role: "manager",
    description: "Can manage databases and run queries",
  },
  {
    name: "Query User",
    email: "user@kuzu-eventbus.com",
    password: "user123",
    role: "user",
    description: "Can run queries and view results",
  },
];

export const getDefaultDemoUser = (): DemoUser => {
  return {
    name: "Demo Admin",
    email: import.meta.env.VITE_DEMO_EMAIL || "demo@kuzu-eventbus.com",
    password: import.meta.env.VITE_DEMO_PASSWORD || "demo123",
    role: "admin",
    description: "Default demo user with full access",
  };
};
