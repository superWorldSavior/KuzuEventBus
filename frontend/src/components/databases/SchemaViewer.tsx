import { useState, useEffect } from "react";
import {
  Graph,
  Circle,
  ArrowRight,
  Eye,
  Hash,
  TextT,
  Calendar,
  ToggleLeft,
} from "@phosphor-icons/react";
import { cn } from "@/utils";
import { LoadingSkeleton } from "../ui/LoadingSkeleton";

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
  isLoading?: boolean;
  className?: string;
}

export function SchemaViewer({ 
  databaseId, 
  isLoading = false, 
  className 
}: SchemaViewerProps) {
  const [nodes, setNodes] = useState<SchemaNode[]>([]);
  const [relationships, setRelationships] = useState<SchemaRelationship[]>([]);
  const [selectedNode, setSelectedNode] = useState<SchemaNode | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<SchemaRelationship | null>(null);

  // Mock schema data
  const mockNodes: SchemaNode[] = [
    {
      id: "person",
      label: "Person",
      count: 1250,
      properties: [
        { name: "id", type: "INTEGER", nullable: false },
        { name: "name", type: "STRING", nullable: false },
        { name: "email", type: "STRING", nullable: true },
        { name: "age", type: "INTEGER", nullable: true },
        { name: "created_at", type: "TIMESTAMP", nullable: false },
      ],
    },
    {
      id: "company",
      label: "Company",
      count: 85,
      properties: [
        { name: "id", type: "INTEGER", nullable: false },
        { name: "name", type: "STRING", nullable: false },
        { name: "industry", type: "STRING", nullable: true },
        { name: "founded", type: "DATE", nullable: true },
      ],
    },
    {
      id: "product",
      label: "Product",
      count: 450,
      properties: [
        { name: "id", type: "INTEGER", nullable: false },
        { name: "name", type: "STRING", nullable: false },
        { name: "price", type: "FLOAT", nullable: false },
        { name: "active", type: "BOOLEAN", nullable: false },
      ],
    },
  ];

  const mockRelationships: SchemaRelationship[] = [
    {
      id: "works_at",
      type: "WORKS_AT",
      fromNode: "person",
      toNode: "company",
      count: 980,
      properties: [
        { name: "position", type: "STRING", nullable: true },
        { name: "start_date", type: "DATE", nullable: false },
        { name: "salary", type: "FLOAT", nullable: true },
      ],
    },
    {
      id: "owns",
      type: "OWNS",
      fromNode: "company",
      toNode: "product",
      count: 450,
      properties: [
        { name: "acquired_date", type: "DATE", nullable: true },
      ],
    },
    {
      id: "uses",
      type: "USES",
      fromNode: "person",
      toNode: "product",
      count: 2340,
      properties: [
        { name: "rating", type: "INTEGER", nullable: true },
        { name: "review", type: "STRING", nullable: true },
      ],
    },
  ];

  useEffect(() => {
    if (!isLoading) {
      // Simulate loading schema data
      setTimeout(() => {
        setNodes(mockNodes);
        setRelationships(mockRelationships);
      }, 500);
    }
  }, [databaseId, isLoading]);

  const getPropertyIcon = (type: SchemaProperty["type"]) => {
    switch (type) {
      case "STRING":
        return <TextT className="w-4 h-4" />;
      case "INTEGER":
      case "FLOAT":
        return <Hash className="w-4 h-4" />;
      case "BOOLEAN":
        return <ToggleLeft className="w-4 h-4" />;
      case "DATE":
      case "TIMESTAMP":
        return <Calendar className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getPropertyTypeColor = (type: SchemaProperty["type"]) => {
    switch (type) {
      case "STRING":
        return "text-green-600 bg-green-50";
      case "INTEGER":
      case "FLOAT":
        return "text-blue-600 bg-blue-50";
      case "BOOLEAN":
        return "text-purple-600 bg-purple-50";
      case "DATE":
      case "TIMESTAMP":
        return "text-orange-600 bg-orange-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <LoadingSkeleton width="12rem" height="2rem" />
          <LoadingSkeleton width="8rem" height="2.5rem" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-6">
                <LoadingSkeleton width="8rem" height="1.5rem" className="mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <LoadingSkeleton key={j} width="100%" height="1rem" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="bg-white rounded-lg border p-6">
              <LoadingSkeleton width="6rem" height="1.5rem" className="mb-4" />
              <LoadingSkeleton width="100%" height="12rem" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Graph className="w-8 h-8 mr-3 text-blue-600" />
            Database Schema
          </h2>
          <p className="text-gray-600 mt-1">
            {nodes.length} node types, {relationships.length} relationship types
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            <Eye className="w-4 h-4" />
            <span>Export Schema</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schema Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Node Types */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Node Types</h3>
            <div className="space-y-4">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className={cn(
                    "bg-white rounded-lg border p-6 transition-all cursor-pointer",
                    "hover:shadow-md hover:border-gray-300",
                    selectedNode?.id === node.id && "ring-2 ring-blue-500 border-blue-300"
                  )}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Circle className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {node.label}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {node.count.toLocaleString()} nodes
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Properties:</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {node.properties.slice(0, 4).map((prop) => (
                        <div
                          key={prop.name}
                          className="flex items-center space-x-2 text-sm"
                        >
                          {getPropertyIcon(prop.type)}
                          <span className="font-medium text-gray-900">{prop.name}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            getPropertyTypeColor(prop.type)
                          )}>
                            {prop.type}
                          </span>
                        </div>
                      ))}
                    </div>
                    {node.properties.length > 4 && (
                      <p className="text-xs text-gray-500">
                        +{node.properties.length - 4} more properties
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Relationship Types */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Relationship Types</h3>
            <div className="space-y-4">
              {relationships.map((rel) => {
                const fromNode = nodes.find(n => n.id === rel.fromNode);
                const toNode = nodes.find(n => n.id === rel.toNode);
                
                return (
                  <div
                    key={rel.id}
                    className={cn(
                      "bg-white rounded-lg border p-6 transition-all cursor-pointer",
                      "hover:shadow-md hover:border-gray-300",
                      selectedRelationship?.id === rel.id && "ring-2 ring-blue-500 border-blue-300"
                    )}
                    onClick={() => setSelectedRelationship(rel)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">
                            {fromNode?.label}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">
                            {toNode?.label}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {rel.count.toLocaleString()} relationships
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                        {rel.type}
                      </span>
                    </div>
                    
                    {rel.properties.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-700">Properties:</h5>
                        <div className="flex flex-wrap gap-2">
                          {rel.properties.map((prop) => (
                            <div
                              key={prop.name}
                              className="flex items-center space-x-1 text-xs"
                            >
                              {getPropertyIcon(prop.type)}
                              <span className="font-medium text-gray-900">{prop.name}</span>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-xs",
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
                );
              })}
            </div>
          </section>
        </div>

        {/* Details Panel */}
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

SchemaViewer.displayName = "SchemaViewer";