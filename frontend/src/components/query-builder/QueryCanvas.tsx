import { useRef, useCallback, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Circle,
  ArrowRight,
  X,
  Play,
  Copy,
  Plus,
  Database,
  Gear,
} from "@phosphor-icons/react";
import { cn } from "@/utils";
import { useQueryBuilderStore } from "@/store/queryBuilder";

interface DroppableNodeProps {
  node: any;
  onNodeClick: (node: any) => void;
  onDeleteNode: (nodeId: string) => void;
  isSelected: boolean;
}

function DroppableNode({ node, onNodeClick, onDeleteNode, isSelected }: DroppableNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        left: node.x || 0,
        top: node.y || 0,
      }}
      {...attributes}
      {...listeners}
      className={cn(
        "absolute bg-white border-2 rounded-lg p-3 cursor-pointer min-w-32 shadow-lg transition-all",
        isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300 hover:border-gray-400",
        isDragging && "z-50"
      )}
      onClick={() => onNodeClick(node)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs bg-blue-500">
            {node.type === "entity" && <Circle className="w-4 h-4" />}
            {node.type === "relationship" && <ArrowRight className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {node.label}
            </div>
            {node.variable && (
              <div className="text-xs text-gray-500">
                as {node.variable}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteNode(node.id);
          }}
          className="text-gray-400 hover:text-red-500 p-1"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Properties */}
      {node.properties && Object.keys(node.properties).length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            {Object.entries(node.properties).slice(0, 2).map(([key, value]) => (
              <div key={key}>
                {key}: {typeof value === "string" ? value : JSON.stringify(value)}
              </div>
            ))}
            {Object.keys(node.properties).length > 2 && (
              <div>... +{Object.keys(node.properties).length - 2} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface QueryCanvasProps {
  className?: string;
}

export function QueryCanvas({ className }: QueryCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedNode, setDraggedNode] = useState<any>(null);

  const {
    currentPattern,
    selectedNodeIds,
    addNode,
    updateNode,
    removeNode,
    selectNode,
    clearSelection,
    generatedCypher,
    showNodePalette,
    toggleNodePalette,
    showPropertyPanel,
    togglePropertyPanel,
  } = useQueryBuilderStore();

  const nodes = currentPattern?.nodes || [];
  const connections = currentPattern?.connections || [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const node = nodes.find((n: any) => n.id === active.id);
    if (node) {
      setDraggedNode(node);
    }
  }, [nodes]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    
    setDraggedNode(null);

    // Handle moving existing nodes
    if (active && delta) {
      const activeNode = nodes.find((n: any) => n.id === active.id);
      if (activeNode) {
        updateNode(activeNode.id, {
          x: (activeNode.x || 0) + delta.x,
          y: (activeNode.y || 0) + delta.y,
        });
      }
    }
  }, [nodes, updateNode]);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      const dropData = e.dataTransfer.getData("application/json");
      if (dropData) {
        const { nodeType } = JSON.parse(dropData);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          const newNode = {
            type: nodeType.type as 'entity' | 'relationship',
            label: nodeType.label,
            x,
            y,
            variable: '',
            properties: {},
          };
          
          addNode(newNode);
        }
      }
    } catch (error) {
      console.error('Failed to handle canvas drop:', error);
    }
  }, [addNode]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    if (selectedNodeIds.includes(node.id)) {
      clearSelection();
    } else {
      selectNode(node.id);
    }
  }, [selectedNodeIds, selectNode, clearSelection]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  }, [clearSelection]);

  const cypherQuery = generatedCypher;

  return (
    <div className={cn("flex-1 flex flex-col", className)}>
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Panel toggles */}
          {!showNodePalette && (
            <button
              onClick={toggleNodePalette}
              className="inline-flex items-center px-2 py-1.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200"
              title="Show Node Palette"
            >
              <Database className="w-4 h-4 mr-1" />
              Nodes
            </button>
          )}
          
          <button
            disabled={!cypherQuery}
            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 mr-1" />
            Run Query
          </button>
          
          <button
            onClick={() => navigator.clipboard.writeText(cypherQuery || "")}
            disabled={!cypherQuery}
            className="inline-flex items-center px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy Query
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}, {connections.length} connection{connections.length !== 1 ? 's' : ''}
          </span>
          
          {!showPropertyPanel && (
            <button
              onClick={togglePropertyPanel}
              className="inline-flex items-center px-2 py-1.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200"
              title="Show Properties"
            >
              Properties
              <Gear className="w-4 h-4 ml-1" />
            </button>
          )}
          
          <button
            onClick={clearSelection}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
            title="Clear Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden bg-gray-50">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={canvasRef}
            className="w-full h-full relative"
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
            onClick={handleCanvasClick}
          >
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-30">
              <svg width="100%" height="100%" className="pointer-events-none">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Connections */}
            <svg className="absolute inset-0 pointer-events-none">
              {connections.map((connection: any) => {
                const sourceNode = nodes.find((n: any) => n.id === connection.sourceId);
                const targetNode = nodes.find((n: any) => n.id === connection.targetId);
                
                if (!sourceNode || !targetNode) return null;

                const x1 = (sourceNode.x || 0) + 64; // Center of node
                const y1 = (sourceNode.y || 0) + 24;
                const x2 = (targetNode.x || 0) + 64;
                const y2 = (targetNode.y || 0) + 24;

                return (
                  <g key={connection.id}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#6b7280"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />
                    {connection.label && (
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 - 5}
                        textAnchor="middle"
                        className="text-xs fill-gray-600 bg-white"
                      >
                        {connection.label}
                      </text>
                    )}
                  </g>
                );
              })}
              
              {/* Arrow marker */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#6b7280"
                  />
                </marker>
              </defs>
            </svg>

            {/* Nodes */}
            <SortableContext items={nodes.map((n: any) => n.id)} strategy={verticalListSortingStrategy}>
              {nodes.map((node: any) => (
                <DroppableNode
                  key={node.id}
                  node={node}
                  onNodeClick={handleNodeClick}
                  onDeleteNode={removeNode}
                  isSelected={selectedNodeIds.includes(node.id)}
                />
              ))}
            </SortableContext>

            {/* Drop zone indicator */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Plus className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-lg font-medium">Drop nodes here to start building your query</p>
                  <p className="text-sm">Drag nodes from the palette on the left</p>
                </div>
              </div>
            )}
          </div>

          <DragOverlay>
            {draggedNode && (
              <div className="bg-white border-2 border-blue-500 rounded-lg p-3 shadow-lg opacity-90">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs bg-blue-500">
                    <Circle className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {draggedNode.label}
                  </div>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Generated Query Preview */}
      {cypherQuery && (
        <div className="bg-gray-900 text-gray-100 p-3 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Generated Cypher Query</h4>
            <button
              onClick={() => navigator.clipboard.writeText(cypherQuery)}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              Copy
            </button>
          </div>
          <pre className="text-xs font-mono overflow-x-auto">
            {cypherQuery}
          </pre>
        </div>
      )}
    </div>
  );
}

QueryCanvas.displayName = "QueryCanvas";