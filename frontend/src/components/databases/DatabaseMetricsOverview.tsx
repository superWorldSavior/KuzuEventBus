import { useMemo } from "react";
import {
  Database,
  Graph,
  HardDrive,
  Clock,
  TrendUp,
  Users,
  Pulse,
  Warning,
} from "@phosphor-icons/react";
import { cn } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

// Simple Card components
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-lg border border-gray-200 shadow-sm", className)}>
    {children}
  </div>
);

const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("p-4 pb-2", className)}>
    {children}
  </div>
);

const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h3 className={cn("text-lg font-semibold text-gray-900", className)}>
    {children}
  </h3>
);

const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("p-4 pt-0", className)}>
    {children}
  </div>
);

// Simple Progress component
const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={cn("w-full bg-gray-200 rounded-full h-2", className)}>
    <div
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

export interface DatabaseMetrics {
  // Basic metrics
  totalDatabases: number;
  totalStorageGB: number;
  totalNodes: number;
  totalRelationships: number;
  
  // Performance metrics
  avgQueryTimeMs: number;
  queriesLastHour: number;
  queriesLast24Hours: number;
  activeConnections: number;
  
  // Health metrics
  healthyDatabases: number;
  warningDatabases: number;
  errorDatabases: number;
  
  // Storage metrics
  storageUsedGB: number;
  storageCapacityGB: number;
  
  // Activity metrics
  lastQueryTime?: Date;
  mostActiveDatabase?: string;
  
  // Trend data
  queryTrends?: Array<{
    timestamp: Date;
    queries: number;
    avgResponseTime: number;
  }>;
  
  storageTrends?: Array<{
    timestamp: Date;
    storage: number;
  }>;
}

interface DatabaseMetricsProps {
  metrics: DatabaseMetrics;
  isLoading?: boolean;
  className?: string;
}

export function DatabaseMetricsOverview({ 
  metrics, 
  isLoading = false, 
  className 
}: DatabaseMetricsProps) {
  const storagePercentage = useMemo(() => {
    if (metrics.storageCapacityGB === 0) return 0;
    return (metrics.storageUsedGB / metrics.storageCapacityGB) * 100;
  }, [metrics.storageUsedGB, metrics.storageCapacityGB]);

  const healthPercentage = useMemo(() => {
    if (metrics.totalDatabases === 0) return 100;
    return (metrics.healthyDatabases / metrics.totalDatabases) * 100;
  }, [metrics.healthyDatabases, metrics.totalDatabases]);

  const formatSize = (sizeGB: number): string => {
    if (sizeGB < 1) {
      return `${Math.round(sizeGB * 1024)} MB`;
    }
    return `${sizeGB.toFixed(1)} GB`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-64 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Databases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Databases</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDatabases}</div>
            <div className="flex items-center pt-2 space-x-2">
              <Badge 
                className={cn(
                  "text-xs",
                  healthPercentage >= 90 ? "bg-green-100 text-green-800" :
                  healthPercentage >= 70 ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                )}
              >
                {healthPercentage.toFixed(0)}% healthy
              </Badge>
              {metrics.warningDatabases > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                  {metrics.warningDatabases} warnings
                </Badge>
              )}
              {metrics.errorDatabases > 0 && (
                <Badge className="bg-red-100 text-red-800 text-xs">
                  {metrics.errorDatabases} errors
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSize(metrics.storageUsedGB)}</div>
            <p className="text-xs text-muted-foreground">
              of {formatSize(metrics.storageCapacityGB)} capacity
            </p>
            <Progress value={storagePercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {storagePercentage.toFixed(1)}% used
            </p>
          </CardContent>
        </Card>

        {/* Graph Data */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graph Elements</CardTitle>
            <Graph className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalNodes)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics.totalRelationships)} relationships
            </p>
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span>Nodes</span>
                <span>Relationships</span>
              </div>
              <div className="flex space-x-1 mt-1">
                <div className="flex-1 bg-blue-200 h-2 rounded" />
                <div className="flex-1 bg-green-200 h-2 rounded" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Pulse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgQueryTimeMs}ms</div>
            <p className="text-xs text-muted-foreground">
              avg query time
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className="bg-blue-100 text-blue-800 text-xs">
                {metrics.activeConnections} active
              </Badge>
              <Badge className="bg-gray-100 text-gray-800 text-xs">
                {metrics.queriesLastHour} queries/hr
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Performance Trends */}
        {metrics.queryTrends && metrics.queryTrends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Query Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">Chart visualization coming soon</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Storage Growth */}
        {metrics.storageTrends && metrics.storageTrends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Storage Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">Chart visualization coming soon</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Last Query</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.lastQueryTime 
                    ? formatDistanceToNow(metrics.lastQueryTime, { addSuffix: true })
                    : "No recent queries"
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <TrendUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium">24h Queries</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.queriesLast24Hours} total
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Active Database</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.mostActiveDatabase || "None"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Alerts */}
      {(metrics.warningDatabases > 0 || metrics.errorDatabases > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Warning className="h-5 w-5 text-yellow-500" />
              <span>Health Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.warningDatabases > 0 && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Warning className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">{metrics.warningDatabases} database(s) need attention</span>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
                </div>
              )}
              
              {metrics.errorDatabases > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Warning className="h-4 w-4 text-red-600" />
                    <span className="text-sm">{metrics.errorDatabases} database(s) have errors</span>
                  </div>
                  <Badge className="bg-red-100 text-red-800">Error</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

DatabaseMetricsOverview.displayName = "DatabaseMetricsOverview";