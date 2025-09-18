import { useState } from "react";
import {
  Circle,
  ArrowRight,
  Funnel,
  ArrowLeft,
  Database,
  Buildings,
  Package,
  MapPin,
  Calendar,
  Lightbulb,
} from "@phosphor-icons/react";
import { cn } from "@/utils";
import { useQueryBuilderStore } from "@/store/queryBuilder";

interface NodeType {
  id: string;
  type: "entity" | "relationship" | "property" | "filter" | "return";
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  category: "nodes" | "relationships" | "operations";
}

const nodeTypes: NodeType[] = [
  // Entity nodes
  {
    id: "person",
    type: "entity",
    label: "Person",
    icon: <Circle className="w-4 h-4" />,
    color: "#3B82F6",
    description: "Represents a person or individual",
    category: "nodes",
  },
  {
    id: "organization",
    type: "entity",
    label: "Organization",
    icon: <Buildings className="w-4 h-4" />,
    color: "#EF4444",
    description: "Represents a company or organization",
    category: "nodes",
  },
  {
    id: "product",
    type: "entity",
    label: "Product",
    icon: <Package className="w-4 h-4" />,
    color: "#10B981",
    description: "Represents a product or service",
    category: "nodes",
  },
  {
    id: "location",
    type: "entity",
    label: "Location",
    icon: <MapPin className="w-4 h-4" />,
    color: "#F59E0B",
    description: "Represents a place or location",
    category: "nodes",
  },
  {
    id: "event",
    type: "entity",
    label: "Event",
    icon: <Calendar className="w-4 h-4" />,
    color: "#8B5CF6",
    description: "Represents an event or activity",
    category: "nodes",
  },
  {
    id: "concept",
    type: "entity",
    label: "Concept",
    icon: <Lightbulb className="w-4 h-4" />,
    color: "#6B7280",
    description: "Represents an abstract concept",
    category: "nodes",
  },
  // Relationship
  {
    id: "relationship",
    type: "relationship",
    label: "Relationship",
    icon: <ArrowRight className="w-4 h-4" />,
    color: "#059669",
    description: "Connect nodes with relationships",
    category: "relationships",
  },
  // Operations
  {
    id: "filter",
    type: "filter",
    label: "Filter",
    icon: <Funnel className="w-4 h-4" />,
    color: "#DC2626",
    description: "Add conditions to filter results",
    category: "operations",
  },
  {
    id: "return",
    type: "return",
    label: "Return",
    icon: <ArrowLeft className="w-4 h-4" />,
    color: "#7C3AED",
    description: "Specify what to return from query",
    category: "operations",
  },
];

interface NodePaletteProps {
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function NodePalette({ className, isCollapsed = false, onToggleCollapse }: NodePaletteProps) {
  const [activeCategory, setActiveCategory] = useState<"nodes" | "relationships" | "operations">("nodes");
  const { showNodePalette, toggleNodePalette } = useQueryBuilderStore();

  if (!showNodePalette) {
    return null;
  }

  const categories = [
    { id: "nodes" as const, label: "Nodes", count: nodeTypes.filter(n => n.category === "nodes").length },
    { id: "relationships" as const, label: "Relations", count: nodeTypes.filter(n => n.category === "relationships").length },
    { id: "operations" as const, label: "Operations", count: nodeTypes.filter(n => n.category === "operations").length },
  ];

  const filteredNodeTypes = nodeTypes.filter(node => node.category === activeCategory);

  const handleDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      type: "node-type",
      nodeType,
    }));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className={cn(
      "flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        {!isCollapsed && (
          <h3 className="text-sm font-medium text-gray-900">Node Palette</h3>
        )}
        <button
          onClick={onToggleCollapse || toggleNodePalette}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? (
            <Database className="w-4 h-4" />
          ) : (
            <ArrowLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Category Tabs */}
          <div className="flex border-b border-gray-200">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "flex-1 px-2 py-2 text-xs font-medium border-b-2 transition-colors",
                  activeCategory === category.id
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <div className="text-center">
                  <div>{category.label}</div>
                  <div className="text-xs opacity-75">({category.count})</div>
                </div>
              </button>
            ))}
          </div>

          {/* Node Types */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredNodeTypes.map((nodeType) => (
              <div
                key={nodeType.id}
                draggable
                onDragStart={(e) => handleDragStart(e, nodeType)}
                className="group relative bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start space-x-3">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: nodeType.color }}
                  >
                    {nodeType.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {nodeType.label}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {nodeType.description}
                    </p>
                  </div>
                </div>

                {/* Drag indicator */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-3 h-3 border-2 border-dashed border-gray-400 rounded"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              Drag nodes onto the canvas to build your query
            </p>
          </div>
        </>
      )}

      {/* Collapsed view */}
      {isCollapsed && (
        <div className="p-2 space-y-2">
          {nodeTypes.slice(0, 6).map((nodeType) => (
            <div
              key={nodeType.id}
              draggable
              onDragStart={(e) => handleDragStart(e, nodeType)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
              style={{ backgroundColor: nodeType.color }}
              title={nodeType.label}
            >
              {nodeType.icon}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

NodePalette.displayName = "NodePalette";