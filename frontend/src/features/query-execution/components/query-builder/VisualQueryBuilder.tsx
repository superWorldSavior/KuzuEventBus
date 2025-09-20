import { useState, useCallback } from "react";
import { cn } from "@/utils";
import { useQueryBuilderStore } from "@/features/query-execution/stores/queryBuilder";
import { QueryCanvas } from "./QueryCanvas";
import { NodePalette } from "./NodePalette";
import { PropertyPanel } from "./PropertyPanel";

interface VisualQueryBuilderProps {
  className?: string;
}

export function VisualQueryBuilder({ className }: VisualQueryBuilderProps) {
  const {
    showNodePalette,
    showPropertyPanel,
    toggleNodePalette,
    togglePropertyPanel,
    currentPattern,
    generatedCypher,
    isValidQuery,
    queryErrors,
  } = useQueryBuilderStore();

  const [activePanel, setActivePanel] = useState<"nodes" | "properties" | null>(
    showNodePalette ? "nodes" : null
  );

  const handleToggleNodePalette = useCallback(() => {
    if (activePanel === "nodes") {
      setActivePanel(null);
    } else {
      setActivePanel("nodes");
    }
    toggleNodePalette();
  }, [activePanel, toggleNodePalette]);

  const handleTogglePropertyPanel = useCallback(() => {
    if (activePanel === "properties") {
      setActivePanel(null);
    } else {
      setActivePanel("properties");
    }
    togglePropertyPanel();
  }, [activePanel, togglePropertyPanel]);

  const handleCloseNodePalette = useCallback(() => {
    setActivePanel(null);
    if (showNodePalette) {
      toggleNodePalette();
    }
  }, [showNodePalette, toggleNodePalette]);

  const handleClosePropertyPanel = useCallback(() => {
    setActivePanel(null);
    if (showPropertyPanel) {
      togglePropertyPanel();
    }
  }, [showPropertyPanel, togglePropertyPanel]);

  return (
    <div className={cn("h-full flex flex-col bg-gray-50", className)}>
      {/* Header with query status */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-gray-900">
              Visual Query Builder
            </h1>
            
            {/* Query status indicator */}
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isValidQuery ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-sm text-gray-600">
                {isValidQuery ? "Valid Query" : "Invalid Query"}
              </span>
              
              {queryErrors.length > 0 && (
                <span className="text-xs text-red-600">
                  ({queryErrors.length} error{queryErrors.length !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>

          {/* Pattern stats */}
          <div className="text-sm text-gray-500">
            {currentPattern?.nodes.length || 0} nodes, {currentPattern?.connections.length || 0} connections
          </div>
        </div>

        {/* Error messages */}
        {queryErrors.length > 0 && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-800">
              <strong>Query Errors:</strong>
              <ul className="mt-1 list-disc list-inside">
                {queryErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Left sidebar - Node Palette */}
        {activePanel === "nodes" && (
          <NodePalette
            isOpen={showNodePalette}
            onClose={handleCloseNodePalette}
            className="flex-shrink-0"
          />
        )}

        {/* Center - Query Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          <QueryCanvas className="flex-1" />
        </div>

        {/* Right sidebar - Properties Panel */}
        {activePanel === "properties" && (
          <PropertyPanel
            isOpen={showPropertyPanel}
            onClose={handleClosePropertyPanel}
            className="flex-shrink-0"
          />
        )}
      </div>

      {/* Floating action buttons for panel toggles */}
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 space-y-2 z-10">
        {!showNodePalette && (
          <button
            onClick={handleToggleNodePalette}
            className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            title="Show Node Palette"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 space-y-2 z-10">
        {!showPropertyPanel && (
          <button
            onClick={handleTogglePropertyPanel}
            className="w-12 h-12 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
            title="Show Properties Panel"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Mini query preview (when query is valid) */}
      {generatedCypher && isValidQuery && (
        <div className="fixed bottom-4 right-4 max-w-md z-20">
          <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Generated Query</h4>
              <button
                onClick={() => navigator.clipboard.writeText(generatedCypher)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Copy
              </button>
            </div>
            <pre className="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded overflow-x-auto max-h-32">
              {generatedCypher.length > 200 
                ? generatedCypher.substring(0, 200) + "..."
                : generatedCypher
              }
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

VisualQueryBuilder.displayName = "VisualQueryBuilder";