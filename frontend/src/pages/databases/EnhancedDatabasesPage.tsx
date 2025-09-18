import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { usePageMeta } from "@/hooks/useNavigation";
import { useNotifications } from "@/hooks/useNotifications";
import { DatabaseList, type Database } from "@/components/databases/DatabaseList";
import { DatabaseMetricsOverview, type DatabaseMetrics } from "@/components/databases/DatabaseMetricsOverview";
import { DatabaseDetailsPage } from "./DatabaseDetailsPage";

// Mock database data - would come from API in real app
const mockDatabases: Database[] = [
  {
    id: "db-1",
    name: "user-analytics",
    displayName: "User Analytics",
    description: "Customer behavior and analytics data",
    sizeGB: 2.3,
    nodeCount: 45000,
    relationshipCount: 120000,
    status: "active",
    createdAt: new Date("2024-01-15"),
    lastQueried: new Date("2024-03-10T14:30:00"),
    tags: ["analytics", "users", "production"],
    owner: "analytics-team",
  },
  {
    id: "db-2",
    name: "product-catalog",
    displayName: "Product Catalog",
    description: "E-commerce product and inventory data",
    sizeGB: 1.8,
    nodeCount: 32000,
    relationshipCount: 85000,
    status: "active",
    createdAt: new Date("2024-02-01"),
    lastQueried: new Date("2024-03-09T09:15:00"),
    tags: ["products", "e-commerce", "inventory"],
    owner: "product-team",
  },
  {
    id: "db-3",
    name: "social-network",
    displayName: "Social Network",
    description: "User connections and social interactions",
    sizeGB: 4.2,
    nodeCount: 78000,
    relationshipCount: 250000,
    status: "maintenance",
    createdAt: new Date("2024-01-08"),
    lastQueried: new Date("2024-03-08T16:45:00"),
    tags: ["social", "connections", "dev"],
    owner: "social-team",
  },
  {
    id: "db-4",
    name: "recommendation-engine",
    displayName: "Recommendation Engine",
    description: "ML-powered recommendation system data",
    sizeGB: 0.9,
    nodeCount: 15000,
    relationshipCount: 45000,
    status: "uploading",
    createdAt: new Date("2024-03-10"),
    lastQueried: null,
    tags: ["ml", "recommendations", "experimental"],
    owner: "ml-team",
  },
  {
    id: "db-5",
    name: "financial-transactions",
    displayName: "Financial Transactions",
    description: "Transaction and fraud detection data",
    sizeGB: 3.1,
    nodeCount: 56000,
    relationshipCount: 180000,
    status: "error",
    createdAt: new Date("2024-02-20"),
    lastQueried: new Date("2024-03-05T11:20:00"),
    tags: ["finance", "fraud-detection", "security"],
    owner: "finance-team",
  },
];

// Mock metrics data
const mockMetrics: DatabaseMetrics = {
  totalDatabases: 5,
  totalStorageGB: 12.3,
  totalNodes: 226000,
  totalRelationships: 680000,
  avgQueryTimeMs: 245,
  queriesLastHour: 147,
  queriesLast24Hours: 2834,
  activeConnections: 8,
  healthyDatabases: 2,
  warningDatabases: 1,
  errorDatabases: 1,
  storageUsedGB: 12.3,
  storageCapacityGB: 50.0,
  lastQueryTime: new Date("2024-03-10T14:30:00"),
  mostActiveDatabase: "user-analytics",
  queryTrends: [
    { timestamp: new Date("2024-03-09T00:00:00"), queries: 234, avgResponseTime: 198 },
    { timestamp: new Date("2024-03-09T06:00:00"), queries: 456, avgResponseTime: 234 },
    { timestamp: new Date("2024-03-09T12:00:00"), queries: 789, avgResponseTime: 267 },
    { timestamp: new Date("2024-03-09T18:00:00"), queries: 543, avgResponseTime: 298 },
    { timestamp: new Date("2024-03-10T00:00:00"), queries: 321, avgResponseTime: 245 },
  ],
  storageTrends: [
    { timestamp: new Date("2024-03-01"), storage: 8.2 },
    { timestamp: new Date("2024-03-05"), storage: 9.8 },
    { timestamp: new Date("2024-03-10"), storage: 12.3 },
  ],
};

export function DatabasesPage() {
  const { setPageTitle } = usePageMeta();
  const { addSuccessNotification } = useNotifications();
  const showMetrics = true;
  
  // In a real app, these would come from API calls
  const [databases, setDatabases] = useState<Database[]>(mockDatabases);
  const [metrics] = useState<DatabaseMetrics>(mockMetrics);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // Set page title
  setPageTitle("Databases");

  const handleRefresh = () => {
    // In real app, refetch data from API
    addSuccessNotification("Databases refreshed", "Database list has been updated");
  };

  const handleDatabaseDelete = (databaseId: string) => {
    setDatabases(prev => prev.filter(db => db.id !== databaseId));
    addSuccessNotification(
      "Database deleted", 
      `Database has been removed successfully`,
      "/databases"
    );
  };

  const handleBulkDelete = (databaseIds: string[]) => {
    setDatabases(prev => prev.filter(db => !databaseIds.includes(db.id)));
    addSuccessNotification(
      "Databases deleted", 
      `${databaseIds.length} databases have been removed`,
      "/databases"
    );
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="space-y-6">
            {/* Metrics Overview */}
            {showMetrics && (
              <DatabaseMetricsOverview 
                metrics={metrics} 
                isLoading={isLoading}
                className="mb-6" 
              />
            )}

            {/* Database List */}
            <DatabaseList
              databases={databases}
              isLoading={isLoading}
              error={error}
              onRefresh={handleRefresh}
              onDatabaseDelete={handleDatabaseDelete}
              onBulkDelete={handleBulkDelete}
            />
          </div>
        }
      />
      <Route path="/:databaseId/*" element={<DatabaseDetailsPage />} />
    </Routes>
  );
}

DatabasesPage.displayName = "DatabasesPage";