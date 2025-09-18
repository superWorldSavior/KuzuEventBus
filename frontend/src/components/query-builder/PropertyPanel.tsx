import { useState } from "react";
import {
  X,
  Plus,
  Trash,
  ArrowRight,
  Circle,
  Funnel,
} from "@phosphor-icons/react";
import { cn } from "@/utils";
import { useQueryBuilderStore, QueryConstraint } from "@/store/queryBuilder";

interface PropertyPanelProps {
  className?: string;
}

const operators = [
  { value: "=", label: "Equals" },
  { value: "!=", label: "Not equals" },
  { value: ">", label: "Greater than" },
  { value: "<", label: "Less than" },
  { value: ">=", label: "Greater than or equal" },
  { value: "<=", label: "Less than or equal" },
  { value: "CONTAINS", label: "Contains" },
  { value: "STARTS_WITH", label: "Starts with" },
  { value: "ENDS_WITH", label: "Ends with" },
];

const commonProperties = [
  "id",
  "name",
  "title", 
  "description",
  "email",
  "age",
  "created_at",
  "updated_at",
  "status",
  "type",
];

export function PropertyPanel({ className }: PropertyPanelProps) {
  const {
    currentPattern,
    selectedNodeIds,
    updateNode,
    showPropertyPanel,
    togglePropertyPanel,
  } = useQueryBuilderStore();

  const [newPropertyKey, setNewPropertyKey] = useState("");
  const [newPropertyValue, setNewPropertyValue] = useState("");
  const [newConstraintProperty, setNewConstraintProperty] = useState("");
  const [newConstraintOperator, setNewConstraintOperator] = useState("=");
  const [newConstraintValue, setNewConstraintValue] = useState("");

  if (!showPropertyPanel) {
    return null;
  }

  const selectedNode = selectedNodeIds.length === 1 
    ? currentPattern.nodes.find((n: any) => n.id === selectedNodeIds[0]) 
    : null;
  const nodeConstraints = selectedNode?.constraints || [];

  const handleUpdateNodeProperty = (key: string, value: any) => {
    if (!selectedNode) return;

    const updatedProperties = { ...selectedNode.properties };
    if (value === "" || value === null || value === undefined) {
      delete updatedProperties[key];
    } else {
      updatedProperties[key] = value;
    }

    updateNode(selectedNode.id, { properties: updatedProperties });
  };

  const handleAddProperty = () => {
    if (!selectedNode || !newPropertyKey.trim()) return;

    const updatedProperties = {
      ...selectedNode.properties,
      [newPropertyKey.trim()]: newPropertyValue || "",
    };

    updateNode(selectedNode.id, { properties: updatedProperties });
    setNewPropertyKey("");
    setNewPropertyValue("");
  };

  const handleAddConstraint = () => {
    if (!selectedNode || !newConstraintProperty.trim()) return;

    const newConstraint: QueryConstraint = {
      id: `constraint_${Date.now()}`,
      property: newConstraintProperty.trim(),
      operator: newConstraintOperator as any,
      value: newConstraintValue || null,
      type: "string",
    };

    const updatedConstraints = [...nodeConstraints, newConstraint];
    updateNode(selectedNode.id, { constraints: updatedConstraints });
    setNewConstraintProperty("");
    setNewConstraintOperator("=");
    setNewConstraintValue("");
  };

  const handleUpdateConstraint = (constraintId: string, updates: Partial<QueryConstraint>) => {
    if (!selectedNode) return;

    const updatedConstraints = nodeConstraints.map((c: any) => 
      c.id === constraintId ? { ...c, ...updates } : c
    );
    updateNode(selectedNode.id, { constraints: updatedConstraints });
  };

  const handleRemoveConstraint = (constraintId: string) => {
    if (!selectedNode) return;

    const updatedConstraints = nodeConstraints.filter((c: any) => c.id !== constraintId);
    updateNode(selectedNode.id, { constraints: updatedConstraints });
  };

  const handleUpdateNodeVariable = (variable: string) => {
    if (!selectedNode) return;
    updateNode(selectedNode.id, { variable: variable.trim() });
  };

  const handleUpdateNodeLabel = (label: string) => {
    if (!selectedNode) return;
    updateNode(selectedNode.id, { label: label.trim() });
  };

  return (
    <div className={cn(
      "flex flex-col w-80 bg-white border-l border-gray-200",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Properties</h3>
        <button
          onClick={togglePropertyPanel}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedNode ? (
          <div className="p-4 space-y-6">
            {/* Node Info */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-blue-500">
                  {selectedNode.type === "entity" && <Circle className="w-4 h-4" />}
                  {selectedNode.type === "relationship" && <ArrowRight className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedNode.type === "entity" ? "Entity Node" : "Relationship Node"}
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {selectedNode.id.slice(0, 8)}...
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="space-y-2">
                <label htmlFor="node-label" className="text-sm font-medium">Label</label>
                <input
                  id="node-label"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedNode.label}
                  onChange={(e) => handleUpdateNodeLabel(e.target.value)}
                  placeholder="Node label"
                />
              </div>

              {/* Variable */}
              <div className="space-y-2 mt-4">
                <label htmlFor="node-variable" className="text-sm font-medium">Variable</label>
                <input
                  id="node-variable"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedNode.variable || ""}
                  onChange={(e) => handleUpdateNodeVariable(e.target.value)}
                  placeholder="Variable name (optional)"
                />
              </div>
            </div>

            {/* Properties */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Properties</h4>
              
              {/* Existing Properties */}
              {selectedNode.properties && Object.entries(selectedNode.properties).length > 0 ? (
                <div className="space-y-2 mb-4">
                  {Object.entries(selectedNode.properties).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        className="flex h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue={key}
                        onChange={(e) => {
                          const oldKey = key;
                          const newKey = e.target.value;
                          if (newKey !== oldKey) {
                            const props = { ...selectedNode.properties };
                            delete props[oldKey];
                            props[newKey] = value;
                            updateNode(selectedNode.id, { properties: props });
                          }
                        }}
                        placeholder="Property name"
                      />
                      <input
                        className="flex h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue={typeof value === "string" ? value : JSON.stringify(value)}
                        onChange={(e) => handleUpdateNodeProperty(key, e.target.value)}
                        placeholder="Value"
                      />
                      <button
                        onClick={() => handleUpdateNodeProperty(key, null)}
                        className="p-2 text-red-500 hover:text-red-700 border border-gray-300 rounded"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 mb-4 text-center py-4 border border-dashed border-gray-300 rounded-lg">
                  No properties added yet
                </div>
              )}

              {/* Add Property */}
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Plus className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Add Property</span>
                </div>
                <div className="space-y-2">
                  <select 
                    value={newPropertyKey} 
                    onChange={(e) => setNewPropertyKey(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    <option value="">Select property...</option>
                    {commonProperties.map((prop) => (
                      <option key={prop} value={prop}>
                        {prop}
                      </option>
                    ))}
                  </select>
                  <input
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPropertyKey}
                    onChange={(e) => setNewPropertyKey(e.target.value)}
                    placeholder="Or type custom property name"
                  />
                  <input
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPropertyValue}
                    onChange={(e) => setNewPropertyValue(e.target.value)}
                    placeholder="Property value"
                  />
                  <button
                    onClick={handleAddProperty}
                    disabled={!newPropertyKey.trim()}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Property
                  </button>
                </div>
              </div>
            </div>

            {/* Constraints/Filters */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Funnel className="w-4 h-4 mr-2" />
                Constraints
              </h4>

              {/* Existing Constraints */}
              {nodeConstraints.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {nodeConstraints.map((constraint: any) => (
                    <div key={constraint.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <input
                        className="flex h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue={constraint.property}
                        onChange={(e) => handleUpdateConstraint(constraint.id, { property: e.target.value })}
                        placeholder="Property"
                      />
                      <select
                        value={constraint.operator}
                        onChange={(e) => handleUpdateConstraint(constraint.id, { operator: e.target.value as any })}
                        className="w-32 p-2 border border-gray-300 rounded"
                      >
                        {operators.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                      <input
                        className="flex h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue={constraint.value || ""}
                        onChange={(e) => handleUpdateConstraint(constraint.id, { value: e.target.value || null })}
                        placeholder="Value"
                        disabled={constraint.operator === "IS NULL" || constraint.operator === "IS NOT NULL"}
                      />
                      <button
                        onClick={() => handleRemoveConstraint(constraint.id)}
                        className="p-2 text-red-500 hover:text-red-700 border border-gray-300 rounded"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 mb-4 text-center py-4 border border-dashed border-gray-300 rounded-lg">
                  No constraints added yet
                </div>
              )}

              {/* Add Constraint */}
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Plus className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Add Constraint</span>
                </div>
                <div className="space-y-2">
                  <input
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newConstraintProperty}
                    onChange={(e) => setNewConstraintProperty(e.target.value)}
                    placeholder="Property name"
                  />
                  <select 
                    value={newConstraintOperator} 
                    onChange={(e) => setNewConstraintOperator(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    {operators.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newConstraintValue}
                    onChange={(e) => setNewConstraintValue(e.target.value)}
                    placeholder="Value"
                    disabled={newConstraintOperator === "IS NULL" || newConstraintOperator === "IS NOT NULL"}
                  />
                  <button
                    onClick={handleAddConstraint}
                    disabled={!newConstraintProperty.trim()}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Constraint
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            {selectedNodeIds.length === 0 ? (
              <div>
                <Circle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Select a node to edit its properties</p>
              </div>
            ) : (
              <div>
                <Circle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Multiple nodes selected</p>
                <p className="text-xs text-gray-400 mt-1">
                  Select a single node to edit properties
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

PropertyPanel.displayName = "PropertyPanel";