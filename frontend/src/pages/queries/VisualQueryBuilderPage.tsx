import { NodePalette } from "@/components/query-builder/NodePalette";
import { QueryCanvas } from "@/components/query-builder/QueryCanvas";
import { PropertyPanel } from "@/components/query-builder/PropertyPanel";

export function VisualQueryBuilderPage() {
  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Visual Query Builder</h1>
            <p className="text-sm text-gray-600 mt-1">
              Drag and drop nodes to build complex graph queries visually
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Kuzu EventBus
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        <NodePalette />

        {/* Query Canvas */}
        <QueryCanvas />

        {/* Property Panel */}
        <PropertyPanel />
      </div>
    </div>
  );
}

VisualQueryBuilderPage.displayName = "VisualQueryBuilderPage";