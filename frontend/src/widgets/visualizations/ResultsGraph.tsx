import { useState, useMemo } from "react";
import { NetworkDiagram } from "./NetworkDiagram";
import { GraphControls } from "./GraphControls";
import { transformQueryResultToGraph, generateMockGraphData } from "@/shared/lib/d3-helpers";
import { cn } from "@/utils";

interface ResultsGraphProps {
  queryResults?: any[];
  isLoading?: boolean;
  className?: string;
  height?: number;
  onNodeClick?: (node: any) => void;
  onExportComplete?: (success: boolean) => void;
}

export function ResultsGraph({
  queryResults,
  isLoading = false,
  className,
  height = 500,
  onNodeClick,
  onExportComplete,
}: ResultsGraphProps) {
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [showLabels, setShowLabels] = useState(true);
  const [layoutType, setLayoutType] = useState("force");
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);

  // Transform query results to graph data
  const graphData = useMemo(() => {
    if (queryResults && queryResults.length > 0) {
      return transformQueryResultToGraph(queryResults);
    }
    // Return mock data for demonstration
    return generateMockGraphData(12);
  }, [queryResults]);

  const handleNodeClick = (node: any) => {
    setSelectedNodes(prev => {
      const newSelection = prev.includes(node.id)
        ? prev.filter(id => id !== node.id)
        : [...prev, node.id];
      return newSelection;
    });
    onNodeClick?.(node);
  };

  const handleExport = () => {
    try {
      // Export functionality would be implemented here
      onExportComplete?.(true);
    } catch (error) {
      onExportComplete?.(false);
    }
  };

  const getLayoutOptions = () => {
    switch (layoutType) {
      case "circular":
        return {
          centerForce: 0.3,
          chargeStrength: -100,
          linkDistance: 120,
        };
      case "hierarchical":
        return {
          centerForce: 0.1,
          chargeStrength: -200,
          linkDistance: 80,
        };
      case "grid":
        return {
          centerForce: 0.05,
          chargeStrength: -50,
          linkDistance: 100,
        };
      default: // force
        return {
          centerForce: 0.1,
          chargeStrength: -300,
          linkDistance: 80,
        };
    }
  };

  if (isLoading) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading visualization...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!graphData.nodes.length) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 2v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Graph Data</h3>
            <p className="text-gray-500">
              Execute a query that returns nodes and relationships to see the network visualization.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 overflow-hidden", className)}>
      {/* Header with Controls */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Query Results Graph
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {graphData.nodes.length} nodes, {graphData.links.length} relationships
              {selectedNodes.length > 0 && ` • ${selectedNodes.length} selected`}
            </p>
          </div>

          <GraphControls
            isSimulationRunning={isSimulationRunning}
            onZoomIn={() => {/* Handled by NetworkDiagram */}}
            onZoomOut={() => {/* Handled by NetworkDiagram */}}
            onZoomReset={() => {/* Handled by NetworkDiagram */}}
            onToggleSimulation={() => setIsSimulationRunning(!isSimulationRunning)}
            onRestartSimulation={() => setIsSimulationRunning(true)}
            onExport={handleExport}
            onLayoutChange={setLayoutType}
            showLabels={showLabels}
            onToggleLabels={() => setShowLabels(!showLabels)}
            showAdvanced={true}
          />
        </div>
      </div>

      {/* Graph Visualization */}
      <div className="p-6">
        <NetworkDiagram
          data={graphData}
          width={800}
          height={height}
          onNodeClick={handleNodeClick}
          selectedNodes={selectedNodes}
          showControls={false} // We have external controls
          layoutOptions={getLayoutOptions()}
          className="border border-gray-100 rounded-lg"
        />
      </div>

      {/* Selected Nodes Summary */}
      {selectedNodes.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selectedNodes.length} node{selectedNodes.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedNodes([])}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear selection
            </button>
          </div>
          
          {selectedNodes.length <= 5 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedNodes.map(nodeId => {
                const node = graphData.nodes.find(n => n.id === nodeId);
                if (!node) return null;
                
                return (
                  <span
                    key={nodeId}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {node.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

ResultsGraph.displayName = "ResultsGraph";