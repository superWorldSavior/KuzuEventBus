import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Dashboard stats query hook
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      // Mock API response for now
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      return {
        totalDatabases: 12,
        totalStorageGB: 4.7,
        queriesToday: 247,
        avgQueryTimeMs: 89,
        activeConnections: 5,
        lastUpdated: new Date().toISOString(),
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}

// Recent queries hook
export function useRecentQueries() {
  return useQuery({
    queryKey: ["recent-queries"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      
      return [
        {
          id: "1",
          query: "MATCH (n:Person) RETURN n.name LIMIT 10",
          status: "success" as const,
          executionTime: 45,
          createdAt: new Date(Date.now() - 1000 * 60 * 5),
          database: "social-network",
          resultCount: 8,
        },
        {
          id: "2", 
          query: "MATCH (p:Product)-[:BELONGS_TO]->(c:Category) RETURN p.name, c.name",
          status: "success" as const,
          executionTime: 123,
          createdAt: new Date(Date.now() - 1000 * 60 * 15),
          database: "ecommerce",
          resultCount: 156,
        },
        {
          id: "3",
          query: "MATCH (u:User)-[:FOLLOWS]->(f:User) WHERE u.id = $userId RETURN f",
          status: "error" as const,
          createdAt: new Date(Date.now() - 1000 * 60 * 30),
          database: "social-network",
        },
        {
          id: "4",
          query: "MATCH path = (a)-[*1..3]-(b) RETURN path LIMIT 100",
          status: "running" as const,
          createdAt: new Date(Date.now() - 1000 * 30),
          database: "knowledge-graph",
        }
      ];
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

// Recent activity hook
export function useRecentActivity() {
  return useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      return [
        {
          id: "1",
          type: "query_executed" as const,
          title: "Query executed successfully",
          description: "MATCH (n:Person) RETURN n.name LIMIT 10",
          timestamp: new Date(Date.now() - 1000 * 60 * 2),
          metadata: { database: "social-network", resultCount: 8 }
        },
        {
          id: "2",
          type: "database_created" as const,
          title: "New database created",
          description: "customer-analytics database has been uploaded",
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          metadata: { database: "customer-analytics", sizeGB: 2.4 }
        },
        {
          id: "3",
          type: "user_login" as const,
          title: "User logged in",
          description: "demo@kuzu-eventbus.com signed in",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          metadata: { userAgent: "Chrome 120.0" }
        },
        {
          id: "4",
          type: "query_error" as const,
          title: "Query execution failed",
          description: "Syntax error in Cypher query",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
          metadata: { database: "ecommerce", error: "Invalid syntax" }
        }
      ];
    },
    refetchInterval: 15000,
    staleTime: 8000,
  });
}

// Database list hook
export function useDatabases() {
  return useQuery({
    queryKey: ["databases"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      
      return [
        {
          id: "1",
          name: "social-network",
          displayName: "Social Network",
          sizeGB: 1.8,
          nodeCount: 15420,
          relationshipCount: 89203,
          status: "active" as const,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
          lastQueried: new Date(Date.now() - 1000 * 60 * 5),
        },
        {
          id: "2",
          name: "ecommerce",
          displayName: "E-Commerce Platform",
          sizeGB: 2.1,
          nodeCount: 8923,
          relationshipCount: 34567,
          status: "active" as const,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
          lastQueried: new Date(Date.now() - 1000 * 60 * 15),
        },
        {
          id: "3",
          name: "knowledge-graph",
          displayName: "Knowledge Graph",
          sizeGB: 0.8,
          nodeCount: 3456,
          relationshipCount: 12890,
          status: "uploading" as const,
          createdAt: new Date(Date.now() - 1000 * 60 * 60),
          lastQueried: null,
        }
      ];
    },
    staleTime: 60000, // Databases don't change as frequently
  });
}

// Mutation for running queries
export function useRunQuery() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ query, database }: { query: string; database: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      return {
        id: Date.now().toString(),
        query,
        status: "success" as const,
        executionTime: Math.floor(Math.random() * 200) + 50,
        createdAt: new Date(),
        database,
        resultCount: Math.floor(Math.random() * 100) + 1,
      };
    },
    onSuccess: () => {
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["recent-queries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
    },
  });
}

// Hook for error handling and retry logic
export function useApiError() {
  const handleError = (error: any) => {
    console.error("API Error:", error);
    
    // You could integrate with a toast/notification system here
    if (error?.response?.status >= 500) {
      // Server error
      return "Server error occurred. Please try again later.";
    } else if (error?.response?.status === 401) {
      // Authentication error
      return "Authentication required. Please log in.";
    } else if (error?.response?.status === 403) {
      // Permission error
      return "You don't have permission to perform this action.";
    } else {
      // Generic error
      return error?.message || "An unexpected error occurred.";
    }
  };

  return { handleError };
}