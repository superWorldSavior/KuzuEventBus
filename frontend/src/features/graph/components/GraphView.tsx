import { useEffect, useRef } from "react";
import Sigma from "sigma";
import Graph from "graphology";
import { useGraphData } from "@/features/graph/hooks/useGraphData";

type Props = {
  databaseId: string | null;
  snapshotId: string | null;
};

export function GraphView({ databaseId, snapshotId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);

  const { graph, isLoading } = useGraphData(databaseId, snapshotId);

  // Create Sigma instance when graph changes
  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous instance
    if (sigmaRef.current) {
      sigmaRef.current.kill();
      sigmaRef.current = null;
    }

    if (!graph) return;

    // Clone the graph so Sigma can own it safely
    const g = (graph instanceof Graph ? graph : new Graph()) as Graph;

    const sigma = new Sigma(g, containerRef.current, {
      renderLabels: true,
      enableEdgeEvents: true,
      zIndex: true,
      allowInvalidContainer: false,
      labelDensity: 0.08,
      labelGridCellSize: 60,
      minCameraRatio: 0.02,
      maxCameraRatio: 10,
      defaultNodeType: "circle",
      defaultEdgeType: "line",
      nodeReducer: (_node, data) => ({ ...data, size: Math.max(1.5, Number(data.size) || 2) }),
    });

    sigmaRef.current = sigma;

    // Fit the camera nicely
    try {
      sigma.getCamera().animatedReset({ duration: 800 });
    } catch {
      // no-op
    }

    return () => {
      sigma.kill();
      sigmaRef.current = null;
    };
  }, [graph]);

  // Resize observer for container
  useEffect(() => {
    if (!containerRef.current) return;

    const updateHeight = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const bottomPadding = 16; // px
      const h = Math.max(120, window.innerHeight - rect.top - bottomPadding);
      el.style.height = `${h}px`;
      sigmaRef.current?.refresh();
    };

    // Initial
    updateHeight();

    // Observe element size changes
    const ro = new ResizeObserver(() => updateHeight());
    ro.observe(containerRef.current);

    // Window resize
    window.addEventListener('resize', updateHeight);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">
          <span>Nodes: {graph ? graph.order : 0}</span>
          <span className="mx-2">•</span>
          <span>Edges: {graph ? graph.size : 0}</span>
          {snapshotId ? (
            <>
              <span className="mx-2">•</span>
              <span>Snapshot: {snapshotId}</span>
            </>
          ) : null}
        </div>
      </div>
      <div
        ref={containerRef}
        className="flex-1 w-full rounded-lg border border-gray-200 bg-white overflow-hidden"
        style={{ overscrollBehavior: 'contain' }}
      />
      {isLoading && (
        <div className="mt-2 text-xs text-gray-500">Loading graph…</div>
      )}
    </div>
  );
}
