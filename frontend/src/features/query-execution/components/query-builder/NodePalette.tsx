import React, { useState } from "react";
import {
  Circle,
  ArrowRight,
  Gear,
  Plus,
  Target,
  Database,
  X,
  MagnifyingGlass,
  Tag,
} from "@phosphor-icons/react";
import { cn } from "@/utils";

interface NodeType {
  type: "entity" | "relationship" | "property" | "filter" | "return";
  label: string;
  description: string;
  color: string;
  icon: React.ElementType;
  category: "basic" | "advanced" | "filter";
}

interface NodePaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

const nodeTypes: NodeType[] = [
  // Basic nodes
  {
    type: "entity",
    label: "Entity",
    description: "A node in the graph (Person, Product, etc.)",
    color: "#3B82F6",
    icon: Circle,
    category: "basic",
  },
  {
    type: "relationship",
    label: "Relationship",
    description: "A connection between entities",
    color: "#EF4444",
    icon: ArrowRight,
    category: "basic",
  },
  
  // Advanced nodes
  {
    type: "property",
    label: "Property",
    description: "Node or relationship property",
    color: "#10B981",
    icon: Gear,
    category: "advanced",
  },
  {
    type: "return",
    label: "Return",
    description: "Values to return from query",
    color: "#8B5CF6",
    icon: Target,
    category: "advanced",
  },
  
  // Filter nodes
  {
    type: "filter",
    label: "Filter",
    description: "Conditions and constraints",
    color: "#F59E0B",
    icon: Plus,
    category: "filter",
  },
];

const categories = [
  { id: "all", label: "All Nodes", icon: Database },
  { id: "basic", label: "Basic", icon: Circle },
  { id: "advanced", label: "Advanced", icon: Gear },
  { id: "filter", label: "Filters", icon: Plus },
];

export function NodePalette({ isOpen, onClose, className }: NodePaletteProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Default to always visible if isOpen not provided
  const isVisible = isOpen !== undefined ? isOpen : true;

  const filteredNodes = nodeTypes.filter((node) => {
    const matchesCategory = selectedCategory === "all" || node.category === selectedCategory;
    const matchesSearch = searchTerm === "" || 
      node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const handleDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ nodeType }));
    e.dataTransfer.effectAllowed = "copy";
    
    // Add visual feedback
    const dragImage = document.createElement("div");
    dragImage.className = "inline-flex items-center px-3 py-2 bg-white border-2 border-blue-500 rounded-lg shadow-lg";
    dragImage.innerHTML = `
      <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs mr-2" style="background-color: ${nodeType.color}">
        •
      </div>
      <span class="text-sm font-medium">${nodeType.label}</span>
    `;
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // Clean up drag image
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Database className="w-5 h-5 mr-2 text-blue-600" />
            Node Palette
          </h2>
          <button
            onClick={onClose || (() => {})}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="p-4 border-b border-gray-200">
        <div className="space-y-1">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  selectedCategory === category.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {category.label}
                <span className="ml-auto text-xs">
                  {category.id === "all" 
                    ? nodeTypes.length 
                    : nodeTypes.filter(n => n.category === category.id).length
                  }
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredNodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No nodes found</p>
              {searchTerm && (
                <p className="text-xs">Try a different search term</p>
              )}
            </div>
          ) : (
            filteredNodes.map((nodeType) => {
              const Icon = nodeType.icon;
              return (
                <div
                  key={nodeType.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, nodeType)}
                  className="group p-3 border border-gray-200 rounded-lg cursor-grab hover:border-gray-300 hover:shadow-sm active:cursor-grabbing transition-all bg-white"
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-medium flex-shrink-0 group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: nodeType.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {nodeType.label}
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {nodeType.description}
                      </p>
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {nodeType.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 space-y-1">
          <p className="font-medium">How to use:</p>
          <p>• Drag nodes to the canvas to add them</p>
          <p>• Click nodes to select and edit properties</p>
          <p>• Connect nodes to build query patterns</p>
        </div>
      </div>
    </div>
  );
}

NodePalette.displayName = "NodePalette";