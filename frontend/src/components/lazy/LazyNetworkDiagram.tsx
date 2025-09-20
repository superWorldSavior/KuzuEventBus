import { lazy, Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { GraphData } from "@/utils/d3-helpers";

// Lazy load the D3 Network Diagram component
const NetworkDiagram = lazy(() => import("@/components/visualizations/NetworkDiagram"));

interface LazyNetworkDiagramProps {
  data: GraphData;
  width?: number;
  height?: number;
  onNodeClick?: (node: any) => void;
  onLinkClick?: (link: any) => void;
  className?: string;
}

export function LazyNetworkDiagram(props: LazyNetworkDiagramProps) {
  return (
    <Suspense 
      fallback={
        <div 
          className="flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50"
          style={{ 
            width: props.width || "100%", 
            height: props.height || 400 
          }}
        >
          <div className="flex flex-col items-center space-y-2">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600">Loading network visualization...</p>
          </div>
        </div>
      }
    >
      <NetworkDiagram {...props} />
    </Suspense>
  );
}

export default LazyNetworkDiagram;