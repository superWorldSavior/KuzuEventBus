import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Database,
  Graph,
  Play,
  Download,
  Trash,
  Gear,
  Clock,
  HardDrives,
  Users,
} from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { SchemaViewer } from "@/features/database-management/components/SchemaViewer";
import { useDatabase, useDatabaseStats } from "@/features/database-management/hooks/useDatabases";

export function DatabaseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use real hooks to fetch database data
  const { data: database, isLoading: isDatabaseLoading, error: databaseError } = useDatabase(id!);
  const { data: stats, isLoading: isStatsLoading } = useDatabaseStats(id!);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: "active" | "inactive" | "error") => {
    const statusConfig = {
      active: { label: "Active", className: "bg-green-50 text-green-700 border-green-200" },
      inactive: { label: "Inactive", className: "bg-gray-50 text-gray-700 border-gray-200" },
      error: { label: "Error", className: "bg-red-50 text-red-700 border-red-200" },
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  // Show error state
  if (databaseError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Database size={48} className="text-gray-400" />
        <h2 className="text-lg font-semibold">Database not found</h2>
        <p className="text-gray-600">The database you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/databases')}>
          <ArrowLeft size={16} className="mr-2" />
          Back to Databases
        </Button>
      </div>
    );
  }

  // Loading state
  if (isDatabaseLoading || isStatsLoading || !database) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="w-48 h-8 bg-gray-200 rounded animate-pulse" />
              <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="w-24 h-10 bg-gray-200 rounded animate-pulse" />
            <div className="w-24 h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-6">
              <div className="w-full h-4 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        
        {/* Content skeleton */}
        <div className="bg-white rounded-lg border p-6">
          <div className="w-full h-96 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/databases")}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                <span>{database.name}</span>
                {getStatusBadge("active")} {/* All databases are active by default */}
              </h1>
              <p className="text-gray-600">{database.description || "No description provided"}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Play className="w-4 h-4 mr-2" />
            Query
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Gear className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Database Size</p>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(database.sizeBytes)}</p>
            </div>
            <HardDrives className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tables</p>
              <p className="text-2xl font-bold text-gray-900">
                {database.tableCount.toLocaleString()}
              </p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Queries</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.queryCount?.toLocaleString() || '0'}
              </p>
            </div>
            <Graph className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Accessed</p>
              <p className="text-sm font-bold text-gray-900">{formatDateTime(database.lastAccessed)}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Main Content - Schema */}
      <div className="bg-white rounded-lg border">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Graph className="w-5 h-5 mr-2" />
            Database Schema
          </h2>
        </div>
        
        <div className="p-6">
          <SchemaViewer databaseId={database.id} />
        </div>
      </div>
    </div>
  );
}

DatabaseDetailsPage.displayName = "DatabaseDetailsPage";