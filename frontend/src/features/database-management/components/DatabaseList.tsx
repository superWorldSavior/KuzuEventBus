import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlass,
  Funnel,
  SortAscending,
  GridFour,
  ListBullets,
  Plus,
  DownloadSimple,
  Trash,
  Database as DatabaseIcon,
} from "@phosphor-icons/react";
import { cn } from "@/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { DatabaseCard } from "./DatabaseCard";
import { CreateDatabaseModal } from "./CreateDatabaseModal";
import { Badge } from "@/shared/ui/badge";

export interface Database {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  sizeGB: number;
  nodeCount: number;
  relationshipCount: number;
  status: "active" | "uploading" | "error" | "maintenance";
  createdAt: Date;
  lastQueried: Date | null;
  tags?: string[];
  owner?: string;
}

interface DatabaseListProps {
  databases: Database[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onDatabaseDelete?: (databaseId: string) => void;
  onBulkDelete?: (databaseIds: string[]) => void;
  className?: string;
}

type ViewMode = "grid" | "list";
type SortOption = "name" | "size" | "created" | "lastQueried" | "nodeCount";
type StatusFilter = "all" | "active" | "uploading" | "error" | "maintenance";

export function DatabaseList({
  databases,
  isLoading = false,
  error = null,
  onRefresh,
  onDatabaseDelete,
  onBulkDelete,
  className,
}: DatabaseListProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Filter and sort databases
  const filteredAndSortedDatabases = useMemo(() => {
    let filtered = databases;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (db) =>
          db.name.toLowerCase().includes(query) ||
          db.displayName?.toLowerCase().includes(query) ||
          db.description?.toLowerCase().includes(query) ||
          db.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((db) => db.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = (a.displayName || a.name).localeCompare(b.displayName || b.name);
          break;
        case "size":
          comparison = a.sizeGB - b.sizeGB;
          break;
        case "created":
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case "lastQueried":
          const aTime = a.lastQueried?.getTime() || 0;
          const bTime = b.lastQueried?.getTime() || 0;
          comparison = aTime - bTime;
          break;
        case "nodeCount":
          comparison = a.nodeCount - b.nodeCount;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [databases, searchQuery, statusFilter, sortBy, sortDirection]);

  const statusCounts = useMemo(() => {
    return databases.reduce(
      (counts, db) => {
        counts[db.status] = (counts[db.status] || 0) + 1;
        return counts;
      },
      {} as Record<Database["status"], number>
    );
  }, [databases]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(option);
      setSortDirection("asc");
    }
  };

  const handleSelectDatabase = (databaseId: string) => {
    setSelectedDatabases((prev) =>
      prev.includes(databaseId)
        ? prev.filter((id) => id !== databaseId)
        : [...prev, databaseId]
    );
  };

  const handleBulkDelete = () => {
    if (selectedDatabases.length > 0 && onBulkDelete) {
      onBulkDelete(selectedDatabases);
      setSelectedDatabases([]);
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <DatabaseIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load databases</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={onRefresh} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Databases</h1>
          <p className="text-gray-500 mt-1">
            Manage your graph databases and uploaded datasets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Database
          </Button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search databases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Funnel className="w-4 h-4 mr-2" />
                Status
                {statusFilter !== "all" && (
                  <Badge className="ml-2">
                    {statusCounts[statusFilter] || 0}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All ({databases.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                Active ({statusCounts.active || 0})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("uploading")}>
                Uploading ({statusCounts.uploading || 0})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("maintenance")}>
                Maintenance ({statusCounts.maintenance || 0})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("error")}>
                Error ({statusCounts.error || 0})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SortAscending className="w-4 h-4 mr-2" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSort("name")}>
                Name {sortBy === "name" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("size")}>
                Size {sortBy === "size" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("created")}>
                Created {sortBy === "created" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("lastQueried")}>
                Last Queried {sortBy === "lastQueried" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("nodeCount")}>
                Node Count {sortBy === "nodeCount" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode */}
          <div className="flex border border-gray-200 rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <GridFour className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none border-l"
            >
              <ListBullets className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedDatabases.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700">
            {selectedDatabases.length} database{selectedDatabases.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedDatabases([])}>
              Clear
            </Button>
            <Button size="sm" variant="outline">
              <DownloadSimple className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Database Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : filteredAndSortedDatabases.length === 0 ? (
        <div className="text-center py-12">
          <DatabaseIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || statusFilter !== "all" ? "No databases found" : "No databases yet"}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Create your first database to get started"}
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Create Database
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          )}
        >
          {filteredAndSortedDatabases.map((database) => (
            <DatabaseCard
              key={database.id}
              database={{
                ...database,
                displayName: database.displayName || database.name,
              }}
              isSelected={selectedDatabases.includes(database.id)}
              onSelect={() => handleSelectDatabase(database.id)}
              onView={() => navigate(`/databases/${database.id}`)}
              onDelete={() => onDatabaseDelete?.(database.id)}
            />
          ))}
        </div>
      )}

      {/* Create Database Modal */}
      <CreateDatabaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          onRefresh?.();
        }}
      />
    </div>
  );
}

DatabaseList.displayName = "DatabaseList";