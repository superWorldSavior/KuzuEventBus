import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database,
  Eye,
  Trash,
  DotsThree,
  Download,
  Upload,
  Graph,
  Clock,
  CheckCircle,
  Warning,
} from "@phosphor-icons/react";
import { cn } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface DatabaseItem {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  sizeGB: number;
  nodeCount: number;
  relationshipCount: number;
  status: "active" | "uploading" | "error" | "maintenance";
  createdAt: Date | string;
  lastQueried: Date | string | null;
  owner?: string;
  isPublic?: boolean;
}

interface DatabaseCardProps {
  database: DatabaseItem;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onView?: (database: DatabaseItem) => void;
  onDelete?: (database: DatabaseItem) => void;
  onExport?: (database: DatabaseItem) => void;
  className?: string;
}

export function DatabaseCard({
  database,
  isSelected = false,
  onSelect,
  onView,
  onDelete,
  onExport,
  className,
}: DatabaseCardProps) {
  const navigate = useNavigate();
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const formatSize = (sizeGB: number) => {
    if (sizeGB >= 1) {
      return `${sizeGB.toFixed(1)} GB`;
    } else {
      return `${Math.round(sizeGB * 1024)} MB`;
    }
  };

  const getStatusInfo = (status: DatabaseItem["status"]) => {
    switch (status) {
      case "active":
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          label: "Active",
          color: "bg-green-100 text-green-700 border-green-200",
        };
      case "uploading":
        return {
          icon: <Upload className="w-4 h-4" />,
          label: "Uploading",
          color: "bg-blue-100 text-blue-700 border-blue-200",
        };
      case "error":
        return {
          icon: <Warning className="w-4 h-4" />,
          label: "Error",
          color: "bg-red-100 text-red-700 border-red-200",
        };
      case "maintenance":
        return {
          icon: <Clock className="w-4 h-4" />,
          label: "Maintenance",
          color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        };
      default:
        return {
          icon: <Database className="w-4 h-4" />,
          label: "Unknown",
          color: "bg-gray-100 text-gray-700 border-gray-200",
        };
    }
  };

  const handleAction = async (action: string, callback?: () => void) => {
    setIsActionLoading(action);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      callback?.();
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleCardClick = () => {
    if (database.status === "active") {
      navigate(`/databases/${database.id}`);
    }
  };

  const statusInfo = getStatusInfo(database.status);
  const createdDate = typeof database.createdAt === "string" 
    ? new Date(database.createdAt) 
    : database.createdAt;
  const lastQueriedDate = database.lastQueried 
    ? typeof database.lastQueried === "string" 
      ? new Date(database.lastQueried) 
      : database.lastQueried
    : null;

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200",
        "hover:shadow-md hover:border-gray-300",
        database.status === "active" && "cursor-pointer",
        isSelected && "ring-2 ring-blue-500 border-blue-300",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(database.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          
          <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 
                className="text-lg font-semibold text-gray-900 truncate"
                onClick={handleCardClick}
              >
                {database.displayName}
              </h3>
              {database.isPublic && (
                <Badge className="text-xs border border-gray-300 text-gray-600">
                  Public
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 truncate">
              {database.description || `Database: ${database.name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className={cn("flex items-center space-x-1", statusInfo.color)}>
            {statusInfo.icon}
            <span>{statusInfo.label}</span>
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <DotsThree className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handleAction("view", () => onView?.(database))}
              >
                <Eye className="w-4 h-4 mr-2" />
                {isActionLoading === "view" ? "Loading..." : "View Details"}
              </DropdownMenuItem>
              
              {database.status === "active" && (
                <DropdownMenuItem 
                  onClick={() => navigate(`/databases/${database.id}/schema`)}
                >
                  <Graph className="w-4 h-4 mr-2" />
                  View Schema
                </DropdownMenuItem>
              )}
              
              {database.status === "active" && (
                <DropdownMenuItem 
                  onClick={() => handleAction("export", () => onExport?.(database))}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isActionLoading === "export" ? "Exporting..." : "Export"}
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={() => handleAction("delete", () => onDelete?.(database))}
                className="text-red-600 focus:text-red-600"
              >
                <Trash className="w-4 h-4 mr-2" />
                {isActionLoading === "delete" ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {database.nodeCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Nodes</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {database.relationshipCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Relationships</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {formatSize(database.sizeGB)}
          </div>
          <div className="text-xs text-gray-500">Size</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-1">
          <span>Created</span>
          <span>{formatDistanceToNow(createdDate, { addSuffix: true })}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          {lastQueriedDate ? (
            <>
              <span>Queried</span>
              <span>{formatDistanceToNow(lastQueriedDate, { addSuffix: true })}</span>
            </>
          ) : (
            <span>Never queried</span>
          )}
        </div>
      </div>

      {/* Owner info */}
      {database.owner && (
        <div className="mt-2 text-xs text-gray-400">
          Owner: {database.owner}
        </div>
      )}
    </div>
  );
}

DatabaseCard.displayName = "DatabaseCard";