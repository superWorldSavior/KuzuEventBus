import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  MagnifyingGlass,
  Funnel,
  DownloadSimple,
  Database as DatabaseIcon,
  Trash,
  Eye,
  DotsThree,
} from "@phosphor-icons/react";
import { cn } from "@/shared/lib";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Badge } from "@/shared/ui/badge";
import { CreateDatabaseModal } from "@/features/database-management/components/CreateDatabaseModal";
import { useDatabases, useDeleteDatabase } from "@/shared/hooks/useApi";

// Transform API data to match component expectations
const transformDatabaseData = (apiDatabase: any) => ({
  id: apiDatabase.database_id,
  name: apiDatabase.name,
  displayName: apiDatabase.name,
  sizeGB: (apiDatabase.size_bytes || 0) / (1024 * 1024 * 1024), // Convert bytes to GB
  nodeCount: Math.floor(Math.random() * 10000), // Mock data since not in API yet
  relationshipCount: Math.floor(Math.random() * 50000), // Mock data since not in API yet
  status: "active" as const, // All databases are active for now
  createdAt: new Date(apiDatabase.created_at),
  lastQueried: apiDatabase.last_accessed ? new Date(apiDatabase.last_accessed) : null,
});

// Types for the transformed data structure
interface DatabaseItem {
  id: string;
  name: string;
  displayName: string;
  sizeGB: number;
  nodeCount: number;
  relationshipCount: number;
  status: "active" | "uploading";
  createdAt: Date;
  lastQueried: Date | null;
}

export function DatabasesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "size" | "created_at">("name");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "uploading">("all");

  const { data: rawDatabases = [], isLoading, error } = useDatabases();
  const deleteDatabase = useDeleteDatabase();

  // Transform API data to component format
  const databases = rawDatabases.map(transformDatabaseData);

  // Filter and sort databases
  const filteredDatabases = databases
    .filter((db: DatabaseItem) => {
      const matchesSearch = db.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        db.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || db.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a: DatabaseItem, b: DatabaseItem) => {
      switch (sortBy) {
        case "name":
          return a.displayName.localeCompare(b.displayName);
        case "size":
          return b.sizeGB - a.sizeGB;
        case "created_at":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

  const handleDatabaseClick = (database: DatabaseItem) => {
    navigate(`/databases/${database.id}`);
  };

  const handleDatabaseSelect = (databaseId: string) => {
    setSelectedDatabases((prev: string[]) => 
      prev.includes(databaseId) 
        ? prev.filter((id: string) => id !== databaseId)
        : [...prev, databaseId]
    );
  };

  const handleDeleteDatabase = async (databaseId: string) => {
    if (window.confirm('Are you sure you want to delete this database? This action cannot be undone.')) {
      try {
        await deleteDatabase.mutateAsync(databaseId);
        // Remove from selected if it was selected
        setSelectedDatabases((prev: string[]) => prev.filter((id: string) => id !== databaseId));
      } catch (error) {
        console.error('Failed to delete database:', error);
        alert('Failed to delete database. Please try again.');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDatabases.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedDatabases.length} database(s)? This action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      try {
        await Promise.all(selectedDatabases.map(id => deleteDatabase.mutateAsync(id)));
        setSelectedDatabases([]);
      } catch (error) {
        console.error('Failed to delete databases:', error);
        alert('Failed to delete some databases. Please try again.');
      }
    }
  };

  const formatSize = (sizeGB: number) => {
    if (sizeGB >= 1) {
      return `${sizeGB.toFixed(1)} GB`;
    } else {
      return `${Math.round(sizeGB * 1024)} MB`;
    }
  };

  const getStatusColor = (status: DatabaseItem['status']) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "uploading":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <DatabaseIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load databases</h3>
          <p className="text-gray-600">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Databases</h1>
          <p className="text-gray-600">Manage your graph databases</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Database
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search databases..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Funnel className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                All Databases
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("active")}>
                Active Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("uploading")}>
                Uploading Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort by {sortBy.replace("_", " ")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("name")}>
                Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("size")}>
                Size
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("created_at")}>
                Created Date
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedDatabases.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700">
            {selectedDatabases.length} database{selectedDatabases.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <DownloadSimple className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-600 hover:text-red-700"
              onClick={handleBulkDelete}
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Database Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-8 h-8 bg-gray-200 rounded-md" />
                <div className="w-16 h-4 bg-gray-200 rounded" />
              </div>
              <div className="space-y-2">
                <div className="w-32 h-5 bg-gray-200 rounded" />
                <div className="w-24 h-4 bg-gray-200 rounded" />
                <div className="w-20 h-4 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDatabases.length === 0 ? (
        <div className="text-center py-12">
          <DatabaseIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? "No matching databases" : "No databases found"}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery 
              ? "Try adjusting your search query or filters" 
              : "Create your first database to get started"
            }
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Database
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDatabases.map((database: DatabaseItem) => (
            <div
              key={database.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => handleDatabaseClick(database)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDatabases.includes(database.id)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      e.stopPropagation();
                      handleDatabaseSelect(database.id);
                    }}
                    className="mr-3 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <DatabaseIcon className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="p-1">
                      <DotsThree className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleDatabaseClick(database);
                    }}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <DownloadSimple className="w-4 h-4 mr-2" />
                      Export
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleDeleteDatabase(database.id);
                      }}
                      className="text-red-600"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 truncate">{database.displayName}</h3>
                  <p className="text-sm text-gray-600 truncate">{database.name}</p>
                </div>

                <div className="flex items-center justify-between">
                  <Badge className={cn("text-xs", getStatusColor(database.status))}>
                    {database.status}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatSize(database.sizeGB)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <div className="text-xs text-gray-500">Nodes</div>
                    <div className="text-sm font-medium">{database.nodeCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Relations</div>
                    <div className="text-sm font-medium">{database.relationshipCount.toLocaleString()}</div>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Created {new Date(database.createdAt).toLocaleDateString()}
                  {database.lastQueried && (
                    <span className="block">
                      Last queried {new Date(database.lastQueried).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Database Modal */}
      <CreateDatabaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          // Refresh databases list
        }}
      />
    </div>
  );
}
