import { useState, useEffect } from "react";
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

interface DatabaseDetails {
  id: string;
  name: string;
  status: "active" | "inactive" | "error";
  size: string;
  nodeCount: number;
  relationshipCount: number;
  created: string;
  lastAccessed: string;
  description?: string;
}

export function DatabaseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [database, setDatabase] = useState<DatabaseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock database data
  useEffect(() => {
    if (id) {
      setTimeout(() => {
        setDatabase({
          id: id,
          name: `Database ${id}`,
          status: "active",
          size: "127.5 MB",
          nodeCount: 1785,
          relationshipCount: 3570,
          created: "2024-01-15",
          lastAccessed: "2024-01-20 14:30",
          description: "Customer relationship management database containing person, company, and product data with their interconnections.",
        });
        setIsLoading(false);
      }, 800);
    }
  }, [id]);

  const getStatusBadge = (status: DatabaseDetails["status"]) => {
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

  if (isLoading || !database) {
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
                {getStatusBadge(database.status)}
              </h1>
              <p className="text-gray-600">{database.description}</p>
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
              <p className="text-2xl font-bold text-gray-900">{database.size}</p>
            </div>
            <HardDrives className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Nodes</p>
              <p className="text-2xl font-bold text-gray-900">
                {database.nodeCount.toLocaleString()}
              </p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Relationships</p>
              <p className="text-2xl font-bold text-gray-900">
                {database.relationshipCount.toLocaleString()}
              </p>
            </div>
            <Graph className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Accessed</p>
              <p className="text-sm font-bold text-gray-900">{database.lastAccessed}</p>
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