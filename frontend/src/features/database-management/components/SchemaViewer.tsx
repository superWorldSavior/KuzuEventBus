import { useState, useMemo } from "react";
import {
  Graph,
  Circle,
  ArrowRight,
  Hash,
  TextT,
  Calendar,
  ToggleLeft,
  MagnifyingGlass,
  Funnel,
  Download,
  ChartBar,
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
import { useDatabase } from "@/shared/hooks/useApi";

interface SchemaNode {
  id: string;
  label: string;
  properties: SchemaProperty[];
  count: number;
}

interface SchemaRelationship {
  id: string;
  type: string;
  fromNode: string;
  toNode: string;
  properties: SchemaProperty[];
  count: number;
}

interface SchemaProperty {
  name: string;
  type: "STRING" | "INTEGER" | "FLOAT" | "BOOLEAN" | "DATE" | "TIMESTAMP";
  nullable: boolean;
}

interface SchemaViewerProps {
  databaseId: string;
  className?: string;
}

export function SchemaViewer({ 
  databaseId, 
  className 
}: SchemaViewerProps) {
  const [selectedNode, setSelectedNode] = useState<SchemaNode | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<SchemaRelationship | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"visual" | "table">("visual");
  const [filterType, setFilterType] = useState<"all" | "nodes" | "relationships">("all");

  const { data: database, isLoading, error } = useDatabase(databaseId);

  // Parse schema from database response
  const { nodes, relationships } = useMemo(() => {
    // TODO: Use separate getDatabaseSchema API call instead of expecting schema in Database entity
    const schema = (database as any)?.schema;
    if (!schema) {
      return { nodes: [], relationships: [] };
    }

    const parsedNodes: SchemaNode[] = schema?.nodes?.map((node: any) => ({
      id: node.label.toLowerCase(),
      label: node.label,
      properties: node.properties || [],
      count: node.count || 0,
    })) || [];

    const parsedRelationships: SchemaRelationship[] = schema?.relationships?.map((rel: any) => ({
      id: `${rel.from}-${rel.type}-${rel.to}`,
      type: rel.type,
      fromNode: rel.from,
      toNode: rel.to,
      properties: rel.properties || [],
      count: rel.count || 0,
    })) || [];

    return { nodes: parsedNodes, relationships: parsedRelationships };
  }, [database]);

  // Filter nodes and relationships based on search
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes;
    return nodes.filter(node => 
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.properties.some(prop => prop.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [nodes, searchQuery]);

  const filteredRelationships = useMemo(() => {
    if (!searchQuery) return relationships;
    return relationships.filter(rel => 
      rel.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rel.fromNode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rel.toNode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [relationships, searchQuery]);

  const getPropertyIcon = (type: string) => {
    switch (type) {
      case "INTEGER":
      case "FLOAT":
        return <Hash className="w-4 h-4 text-blue-500" />;
      case "STRING":
        return <TextT className="w-4 h-4 text-green-500" />;
      case "BOOLEAN":
        return <ToggleLeft className="w-4 h-4 text-purple-500" />;
      case "DATE":
      case "TIMESTAMP":
        return <Calendar className="w-4 h-4 text-orange-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPropertyTypeColor = (type: string) => {
    switch (type) {
      case "INTEGER":
      case "FLOAT":
        return "bg-blue-100 text-blue-800";
      case "STRING":
        return "bg-green-100 text-green-800";
      case "BOOLEAN":
        return "bg-purple-100 text-purple-800";
      case "DATE":
      case "TIMESTAMP":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const exportSchema = () => {
    const schemaData = {
      database: database?.name,
      nodes: filteredNodes,
      relationships: filteredRelationships,
      metadata: {
        totalNodes: filteredNodes.length,
        totalRelationships: filteredRelationships.length,
        totalEntries: filteredNodes.reduce((sum, node) => sum + node.count, 0),
        exportedAt: new Date().toISOString(),
      }
    };

    const blob = new Blob([JSON.stringify(schemaData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${database?.name || 'database'}-schema.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateSchemaStats = () => {
    const totalNodes = filteredNodes.reduce((sum, node) => sum + node.count, 0);
    const totalRelationships = filteredRelationships.reduce((sum, rel) => sum + rel.count, 0);
    const avgPropertiesPerNode = filteredNodes.length > 0 
      ? filteredNodes.reduce((sum, node) => sum + node.properties.length, 0) / filteredNodes.length 
      : 0;

    return {
      totalNodes,
      totalRelationships,
      nodeTypes: filteredNodes.length,
      relationshipTypes: filteredRelationships.length,
      avgPropertiesPerNode: Math.round(avgPropertiesPerNode * 10) / 10,
    };
  };

  const stats = generateSchemaStats();

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="h-6 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-8 text-center", className)}>
        <Graph className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Failed to load schema information</p>
        <p className="text-sm text-gray-400 mt-2">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Database Schema</h2>
          <p className="text-sm text-gray-500 mt-1">
            {database?.name} • {stats.nodeTypes} node types • {stats.relationshipTypes} relationship types
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Funnel className="w-4 h-4 mr-2" />
                {filterType === "all" ? "All" : filterType === "nodes" ? "Nodes" : "Relationships"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterType("all")}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("nodes")}>
                Nodes Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType("relationships")}>
                Relationships Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={exportSchema}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Search and view controls */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search nodes, relationships, properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "visual" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("visual")}
          >
            <Graph className="w-4 h-4 mr-2" />
            Visual
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <ChartBar className="w-4 h-4 mr-2" />
            Table
          </Button>
        </div>
      </div>

      {/* Schema statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.totalNodes.toLocaleString()}</div>
          <div className="text-sm text-blue-600">Total Nodes</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.totalRelationships.toLocaleString()}</div>
          <div className="text-sm text-green-600">Total Relationships</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{stats.nodeTypes}</div>
          <div className="text-sm text-purple-600">Node Types</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{stats.relationshipTypes}</div>
          <div className="text-sm text-orange-600">Relationship Types</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-gray-600">{stats.avgPropertiesPerNode}</div>
          <div className="text-sm text-gray-600">Avg Properties</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schema overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Nodes */}
          {(filterType === "all" || filterType === "nodes") && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Node Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNodes.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-all",
                      selectedNode?.id === node.id
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Circle className="w-5 h-5 text-blue-500" />
                        <span className="font-medium text-gray-900">{node.label}</span>
                      </div>
                      <span className="text-sm font-medium text-blue-600">
                        {node.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {node.properties.length} properties
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relationships */}
          {(filterType === "all" || filterType === "relationships") && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Relationships</h3>
              <div className="space-y-3">
                {filteredRelationships.map((relationship) => (
                  <div
                    key={relationship.id}
                    onClick={() => setSelectedRelationship(relationship)}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-all",
                      selectedRelationship?.id === relationship.id
                        ? "border-orange-500 bg-orange-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">{relationship.fromNode}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-orange-600">{relationship.type}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">{relationship.toNode}</span>
                      </div>
                      <span className="text-sm font-medium text-orange-600">
                        {relationship.count.toLocaleString()}
                      </span>
                    </div>
                    {relationship.properties.length > 0 && (
                      <div className="text-sm text-gray-500">
                        {relationship.properties.length} properties
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Details panel */}
        <div className="space-y-6">
          {selectedNode && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Node Details: {selectedNode.label}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Count:</span>
                  <span className="ml-2 text-lg font-bold text-blue-600">
                    {selectedNode.count.toLocaleString()}
                  </span>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Properties:</h4>
                  <div className="space-y-2">
                    {selectedNode.properties.map((prop) => (
                      <div
                        key={prop.name}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <div className="flex items-center space-x-2">
                          {getPropertyIcon(prop.type)}
                          <span className="font-medium text-gray-900">
                            {prop.name}
                          </span>
                          {!prop.nullable && (
                            <span className="text-xs text-red-600">*</span>
                          )}
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          getPropertyTypeColor(prop.type)
                        )}>
                          {prop.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedRelationship && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Relationship Details: {selectedRelationship.type}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Count:</span>
                  <span className="ml-2 text-lg font-bold text-orange-600">
                    {selectedRelationship.count.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Direction:</span>
                  <div className="mt-2 flex items-center space-x-2 text-sm">
                    <span className="px-2 py-1 bg-gray-100 rounded">{selectedRelationship.fromNode}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className="px-2 py-1 bg-gray-100 rounded">{selectedRelationship.toNode}</span>
                  </div>
                </div>
                
                {selectedRelationship.properties.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Properties:</h4>
                    <div className="space-y-2">
                      {selectedRelationship.properties.map((prop) => (
                        <div
                          key={prop.name}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center space-x-2">
                            {getPropertyIcon(prop.type)}
                            <span className="font-medium text-gray-900">
                              {prop.name}
                            </span>
                            {!prop.nullable && (
                              <span className="text-xs text-red-600">*</span>
                            )}
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            getPropertyTypeColor(prop.type)
                          )}>
                            {prop.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedNode && !selectedRelationship && (
            <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <Graph className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                Click on a node or relationship to see details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}