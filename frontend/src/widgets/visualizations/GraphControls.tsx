import { useState } from "react";
import {
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  ArrowsOutSimple,
  ArrowCounterClockwise,
  Play,
  Pause,
  Download,
  Sliders,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { cn } from "@/shared/lib";

interface GraphControlsProps {
  className?: string;
  isSimulationRunning?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onToggleSimulation?: () => void;
  onRestartSimulation?: () => void;
  onExport?: () => void;
  onLayoutChange?: (layout: string) => void;
  showLabels?: boolean;
  onToggleLabels?: () => void;
  showAdvanced?: boolean;
}

const layoutOptions = [
  { value: "force", label: "Force-directed" },
  { value: "circular", label: "Circular" },
  { value: "hierarchical", label: "Hierarchical" },
  { value: "grid", label: "Grid" },
];

export function GraphControls({
  className,
  isSimulationRunning = false,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleSimulation,
  onRestartSimulation,
  onExport,
  onLayoutChange,
  showLabels = true,
  onToggleLabels,
  showAdvanced = false,
}: GraphControlsProps) {
  const [selectedLayout, setSelectedLayout] = useState("force");
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  const handleLayoutChange = (layout: string) => {
    setSelectedLayout(layout);
    onLayoutChange?.(layout);
    setShowLayoutMenu(false);
  };

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {/* Zoom Controls */}
      <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={onZoomIn}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-l-lg transition-colors"
          title="Zoom In"
        >
          <MagnifyingGlassPlus className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-200" />
        <button
          onClick={onZoomOut}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          title="Zoom Out"
        >
          <MagnifyingGlassMinus className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-200" />
        <button
          onClick={onZoomReset}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-r-lg transition-colors"
          title="Reset Zoom"
        >
          <ArrowsOutSimple className="w-4 h-4" />
        </button>
      </div>

      {/* Simulation Controls */}
      <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={onToggleSimulation}
          className={cn(
            "p-2 rounded-l-lg transition-colors",
            isSimulationRunning
              ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
          title={isSimulationRunning ? "Pause Simulation" : "Resume Simulation"}
        >
          {isSimulationRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <div className="w-px h-6 bg-gray-200" />
        <button
          onClick={onRestartSimulation}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-r-lg transition-colors"
          title="Restart Layout"
        >
          <ArrowCounterClockwise className="w-4 h-4" />
        </button>
      </div>

      {/* Layout Selector */}
      {showAdvanced && (
        <div className="relative">
          <button
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            title="Change Layout"
          >
            <Sliders className="w-4 h-4" />
            <span className="text-sm font-medium">
              {layoutOptions.find(l => l.value === selectedLayout)?.label}
            </span>
          </button>

          {showLayoutMenu && (
            <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-full">
              {layoutOptions.map((layout) => (
                <button
                  key={layout.value}
                  onClick={() => handleLayoutChange(layout.value)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors",
                    selectedLayout === layout.value
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {layout.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Controls */}
      <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={onToggleLabels}
          className={cn(
            "p-2 rounded-lg transition-colors",
            showLabels
              ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
          title={showLabels ? "Hide Labels" : "Show Labels"}
        >
          {showLabels ? <Eye className="w-4 h-4" /> : <EyeSlash className="w-4 h-4" />}
        </button>
      </div>

      {/* Export */}
      <button
        onClick={onExport}
        className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        title="Export as SVG"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}

GraphControls.displayName = "GraphControls";