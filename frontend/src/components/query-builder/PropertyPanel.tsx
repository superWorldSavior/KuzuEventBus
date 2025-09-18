import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash,
  Eye,
  TextT,
  Hash,
  Calendar,
  ToggleLeft,
  Gear,
} from "@phosphor-icons/react";
import { cn } from "@/utils";
import { useQueryBuilderStore } from "@/store/queryBuilder";
import type { QueryConstraint } from "@/store/queryBuilder";

interface PropertyPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

const propertyTypes = [
  { value: "string", label: "Text", icon: TextT },
  { value: "number", label: "Number", icon: Hash },
  { value: "boolean", label: "Boolean", icon: ToggleLeft },
  { value: "date", label: "Date", icon: Calendar },
];

const operators = [
  { value: "=", label: "Equals" },
  { value: "!=", label: "Not equals" },
  { value: ">", label: "Greater than" },
  { value: "<", label: "Less than" },
  { value: ">=", label: "Greater or equal" },
  { value: "<=", label: "Less or equal" },
  { value: "CONTAINS", label: "Contains" },
  { value: "STARTS_WITH", label: "Starts with" },
  { value: "ENDS_WITH", label: "Ends with" },
];

export function PropertyPanel({ isOpen, onClose, className }: PropertyPanelProps) {
  const {
    currentPattern,
    selectedNodeIds,
    selectedConnectionIds,
    updateNode,
    updateConnection,
    showPropertyPanel,
  } = useQueryBuilderStore();

  // If isOpen is provided, use it; otherwise use the store's showPropertyPanel
  const isVisible = isOpen !== undefined ? isOpen : showPropertyPanel;

  const [activeTab, setActiveTab] = useState<"properties" | "constraints">("properties");
  const [selectedElements, setSelectedElements] = useState<{
    nodes: any[];
    connections: any[];
  }>({ nodes: [], connections: [] });

  useEffect(() => {
    const nodes = currentPattern?.nodes?.filter(node => 
      selectedNodeIds.includes(node.id)
    ) || [];
    
    const connections = currentPattern?.connections?.filter(conn => 
      selectedConnectionIds.includes(conn.id)
    ) || [];

    setSelectedElements({ nodes, connections });
  }, [currentPattern, selectedNodeIds, selectedConnectionIds]);

  const hasSelection = selectedElements.nodes.length > 0 || selectedElements.connections.length > 0;

  const handlePropertyChange = (elementId: string, elementType: 'node' | 'connection', property: string, value: any) => {
    if (elementType === 'node') {
      updateNode(elementId, { [property]: value });
    } else {
      updateConnection(elementId, { [property]: value });
    }
  };

  const addProperty = (elementId: string, elementType: 'node' | 'connection') => {
    const newProperty = { name: "", value: "", type: "string" };
    const element = elementType === 'node' 
      ? selectedElements.nodes.find(n => n.id === elementId)
      : selectedElements.connections.find(c => c.id === elementId);
    
    if (element) {
      const updatedProperties = [...(element.properties || []), newProperty];
      handlePropertyChange(elementId, elementType, 'properties', updatedProperties);
    }
  };

  const removeProperty = (elementId: string, elementType: 'node' | 'connection', propertyIndex: number) => {
    const element = elementType === 'node' 
      ? selectedElements.nodes.find(n => n.id === elementId)
      : selectedElements.connections.find(c => c.id === elementId);
    
    if (element) {
      const updatedProperties = element.properties?.filter((_: any, index: number) => index !== propertyIndex) || [];
      handlePropertyChange(elementId, elementType, 'properties', updatedProperties);
    }
  };

  const addConstraint = (elementId: string, elementType: 'node' | 'connection') => {
    const newConstraint: QueryConstraint = {
      id: `constraint_${Date.now()}`,
      property: "",
      operator: "=",
      value: "",
      type: "string"
    };
    
    const element = elementType === 'node' 
      ? selectedElements.nodes.find(n => n.id === elementId)
      : selectedElements.connections.find(c => c.id === elementId);
    
    if (element) {
      const updatedConstraints = [...(element.constraints || []), newConstraint];
      handlePropertyChange(elementId, elementType, 'constraints', updatedConstraints);
    }
  };

  const removeConstraint = (elementId: string, elementType: 'node' | 'connection', constraintId: string) => {
    const element = elementType === 'node' 
      ? selectedElements.nodes.find(n => n.id === elementId)
      : selectedElements.connections.find(c => c.id === elementId);
    
    if (element) {
      const updatedConstraints = element.constraints?.filter((c: QueryConstraint) => c.id !== constraintId) || [];
      handlePropertyChange(elementId, elementType, 'constraints', updatedConstraints);
    }
  };

  const updateConstraint = (elementId: string, elementType: 'node' | 'connection', constraintId: string, updates: Partial<QueryConstraint>) => {
    const element = elementType === 'node' 
      ? selectedElements.nodes.find(n => n.id === elementId)
      : selectedElements.connections.find(c => c.id === elementId);
    
    if (element) {
      const updatedConstraints = element.constraints?.map((c: QueryConstraint) => 
        c.id === constraintId ? { ...c, ...updates } : c
      ) || [];
      handlePropertyChange(elementId, elementType, 'constraints', updatedConstraints);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={cn("w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-sm", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Gear className="w-5 h-5 mr-2 text-blue-600" />
            Properties
          </h2>
          <button
            onClick={onClose || (() => {})}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("properties")}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === "properties"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Properties
          </button>
          <button
            onClick={() => setActiveTab("constraints")}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === "constraints"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Constraints
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasSelection ? (
          <div className="p-4 text-center text-gray-500">
            <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a node or relationship</p>
            <p className="text-xs">to edit its properties</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Nodes */}
            {selectedElements.nodes.map((node) => (
              <div key={node.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center mb-3">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs mr-2"
                    style={{ backgroundColor: node.color || "#3B82F6" }}
                  >
                    •
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{node.label || "Node"}</h3>
                    <p className="text-xs text-gray-500">ID: {node.id}</p>
                  </div>
                </div>

                {/* Variable Name */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Variable Name
                  </label>
                  <input
                    type="text"
                    value={node.variable || ""}
                    onChange={(e) => handlePropertyChange(node.id, 'node', 'variable', e.target.value)}
                    placeholder="e.g., person, product"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {activeTab === "properties" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-700">Properties</label>
                      <button
                        onClick={() => addProperty(node.id, 'node')}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(node.properties || []).map((prop: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={prop.name || ""}
                            onChange={(e) => {
                              const updated = [...(node.properties || [])];
                              updated[index] = { ...prop, name: e.target.value };
                              handlePropertyChange(node.id, 'node', 'properties', updated);
                            }}
                            placeholder="Name"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={prop.value || ""}
                            onChange={(e) => {
                              const updated = [...(node.properties || [])];
                              updated[index] = { ...prop, value: e.target.value };
                              handlePropertyChange(node.id, 'node', 'properties', updated);
                            }}
                            placeholder="Value"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => removeProperty(node.id, 'node', index)}
                            className="p-1 text-red-400 hover:text-red-600 rounded"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "constraints" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-700">Constraints</label>
                      <button
                        onClick={() => addConstraint(node.id, 'node')}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(node.constraints || []).map((constraint: QueryConstraint) => (
                        <div key={constraint.id} className="space-y-2 p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={constraint.property || ""}
                              onChange={(e) => updateConstraint(node.id, 'node', constraint.id, { property: e.target.value })}
                              placeholder="Property"
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                            <select
                              value={constraint.operator}
                              onChange={(e) => updateConstraint(node.id, 'node', constraint.id, { operator: e.target.value as any })}
                              className="px-2 py-1 border border-gray-300 rounded text-xs"
                            >
                              {operators.map(op => (
                                <option key={op.value} value={op.value}>{op.label}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeConstraint(node.id, 'node', constraint.id)}
                              className="p-1 text-red-400 hover:text-red-600 rounded"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={constraint.value || ""}
                              onChange={(e) => updateConstraint(node.id, 'node', constraint.id, { value: e.target.value })}
                              placeholder="Value"
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                            <select
                              value={constraint.type}
                              onChange={(e) => updateConstraint(node.id, 'node', constraint.id, { type: e.target.value as any })}
                              className="px-2 py-1 border border-gray-300 rounded text-xs"
                            >
                              {propertyTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Connections */}
            {selectedElements.connections.map((connection) => (
              <div key={connection.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center mb-3">
                  <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs mr-2 bg-red-500">
                    →
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{connection.label || "Relationship"}</h3>
                    <p className="text-xs text-gray-500">ID: {connection.id}</p>
                  </div>
                </div>

                {/* Variable Name */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Relationship Type
                  </label>
                  <input
                    type="text"
                    value={connection.type || ""}
                    onChange={(e) => handlePropertyChange(connection.id, 'connection', 'type', e.target.value)}
                    placeholder="e.g., KNOWS, WORKS_AT"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Properties and constraints similar to nodes */}
                {activeTab === "properties" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-700">Properties</label>
                      <button
                        onClick={() => addProperty(connection.id, 'connection')}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(connection.properties || []).map((prop: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={prop.name || ""}
                            onChange={(e) => {
                              const updated = [...(connection.properties || [])];
                              updated[index] = { ...prop, name: e.target.value };
                              handlePropertyChange(connection.id, 'connection', 'properties', updated);
                            }}
                            placeholder="Name"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={prop.value || ""}
                            onChange={(e) => {
                              const updated = [...(connection.properties || [])];
                              updated[index] = { ...prop, value: e.target.value };
                              handlePropertyChange(connection.id, 'connection', 'properties', updated);
                            }}
                            placeholder="Value"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => removeProperty(connection.id, 'connection', index)}
                            className="p-1 text-red-400 hover:text-red-600 rounded"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {hasSelection && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 space-y-1">
            <p className="font-medium">Selected:</p>
            <p>• {selectedElements.nodes.length} node(s)</p>
            <p>• {selectedElements.connections.length} relationship(s)</p>
          </div>
        </div>
      )}
    </div>
  );
}

PropertyPanel.displayName = "PropertyPanel";