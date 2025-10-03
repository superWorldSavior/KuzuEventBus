import { useEffect, useMemo, useRef, useState } from "react";
import Sigma from "sigma";
import Graph from "graphology";
import { LayoutControlPanel } from "@/features/graph/components/LayoutControlPanel";
import { useGraphData } from "@/features/graph/hooks/useGraphData";

type Props = {
  databaseId: string | null;
  snapshotId: string | null;
  previewResults?: any[];
};

export function GraphView({ databaseId, snapshotId, previewResults }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphObjRef = useRef<Graph | null>(null);

  // Layout controls
  const [controlsOpen, setControlsOpen] = useState<boolean>(true);
  const [nodeSize, setNodeSize] = useState<number>(12);
  const [repulse, setRepulse] = useState<number>(80); // stronger => more spacing
  const [centerForce, setCenterForce] = useState<number>(0.05); // stronger => closer to center
  const [edgeSpring, setEdgeSpring] = useState<number>(0.3); // 0..1 attraction along edges

  const { graph: liveGraph } = useGraphData(databaseId, snapshotId);

  // Build a lightweight graph from preview results (if provided)
  const previewGraph = useMemo(() => {
    if (!previewResults || previewResults.length === 0) return null;
    const g = new Graph();

    const total = previewResults.length;
    let nodeSeq = 0;
    let edgeSeq = 0;

    const extractNode = (obj: any): { id: string; label?: string } | null => {
      if (!obj || typeof obj !== 'object') return null;
      const idObj = obj._id ?? obj.id;
      let id: string | null = null;
      if (idObj && typeof idObj === 'object' && 'table' in idObj && 'offset' in idObj) {
        id = `node-${idObj.table}-${idObj.offset}`;
      } else if (typeof idObj === 'string' || typeof idObj === 'number') {
        id = String(idObj);
      }
      if (!id) {
        // As a last resort, derive a stable-ish id from significant fields
        const parts = [obj._label, obj.label, obj.name, obj.key, obj.uuid].filter(Boolean);
        if (parts.length > 0) {
          id = `auto-${parts.join(':')}`;
        }
      }
      const label = obj._label || obj.label || obj.name || undefined;
      return id ? { id, label } : null;
    };

    const ensureNode = (id: string, label?: string) => {
      if (!g.hasNode(id)) {
        // Simple circular layout
        const angle = (2 * Math.PI * (nodeSeq % Math.max(1, total))) / Math.max(1, total);
        const radius = 4; // closer spacing
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        g.addNode(id, { label: label || id, size: 12, x, y, color: '#2563eb' }); // Larger & colored
        nodeSeq++;
      }
    };

    const ensureEdge = (source: string, target: string, type?: string) => {
      const eid = `e-${source}->${target}-${edgeSeq++}`;
      if (!g.hasEdge(eid)) {
        g.addEdge(source, target, { label: type || '', size: 1 });
      }
    };

    const handleValue = (v: any) => {
      if (!v) return;
      if (Array.isArray(v)) {
        v.forEach(handleValue);
        return;
      }
      if (typeof v === 'object') {
        // Explicit nodes/edges shape
        if (Array.isArray((v as any).nodes) || Array.isArray((v as any).edges)) {
          const nodesArr = (v as any).nodes || [];
          const edgesArr = (v as any).edges || [];
          nodesArr.forEach((n: any) => {
            const nn = extractNode(n);
            if (nn) ensureNode(nn.id, nn.label);
          });
          edgesArr.forEach((e: any) => {
            const s = extractNode(e.source || e.from || e.start);
            const t = extractNode(e.target || e.to || e.end);
            const tlabel = e.type || e._type || e.label;
            if (s && t) ensureEdge(s.id, t.id, tlabel);
          });
          return;
        }
        // Relation tuple: a, r, b
        if (('a' in v || 'start' in v) && ('b' in v || 'end' in v)) {
          const a = (v as any).a ?? (v as any).start;
          const b = (v as any).b ?? (v as any).end;
          const r = (v as any).r ?? (v as any).rel;
          const nA = extractNode(a);
          const nB = extractNode(b);
          const rType = r?._type || r?.type || undefined;
          if (nA) ensureNode(nA.id, nA.label);
          if (nB) ensureNode(nB.id, nB.label);
          if (nA && nB) ensureEdge(nA.id, nB.id, rType);
          return;
        }
        // Single-key node row e.g., { n: {...} }
        const keys = Object.keys(v);
        if (keys.length === 1 && typeof (v as any)[keys[0]] === 'object') {
          const n1 = extractNode((v as any)[keys[0]]);
          if (n1) { ensureNode(n1.id, n1.label); return; }
        }
        // Node-like object
        const n = extractNode(v);
        if (n) ensureNode(n.id, n.label);
      }
    };

    try {
      for (const row of previewResults) {
        const vals = Object.values(row ?? {});
        vals.forEach(handleValue);
      }
    } catch (err) {
      console.error('[GraphView] Error building preview graph:', err);
    }

    console.log(`[GraphView] Built preview graph: ${g.order} nodes, ${g.size} edges`);
    return g;
  }, [previewResults]);

  // Choose which graph to render: preview (if any) else live
  const graph = previewGraph || liveGraph;

  // Create Sigma instance when graph changes
  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous instance
    if (sigmaRef.current) {
      sigmaRef.current.kill();
      sigmaRef.current = null;
    }

    if (!graph || graph.order === 0) return;

    // Clone the graph so Sigma can own it safely
    const g = (graph instanceof Graph ? graph : new Graph()) as Graph;

    const sigma = new Sigma(g, containerRef.current, {
      renderLabels: true,
      enableEdgeEvents: true,
      zIndex: true,
      allowInvalidContainer: false,
      // Labels
      labelSize: 16,
      labelRenderedSizeThreshold: 0, // always render labels
      // Colors
      defaultNodeColor: '#2563eb', // blue-600
      defaultEdgeColor: '#94a3b8', // slate-400
      // Camera
      minCameraRatio: 0.02,
      maxCameraRatio: 10,
      // Nodes
      defaultNodeType: 'circle',
    });

    sigmaRef.current = sigma;
    graphObjRef.current = g;

    // Fit
    try {
      const camera = sigma.getCamera();
      camera.animatedReset({ duration: 800 });
      // Zoom in a bit more after reset for better visibility
      setTimeout(() => {
        try {
          camera.animatedZoom({ factor: 0.6, duration: 400 });
        } catch {}
      }, 850);
    } catch {
      // no-op
    }

    return () => {
      try { sigma.kill(); } catch {}
      sigmaRef.current = null;
      graphObjRef.current = null;
    };
  }, [graph]);

  // Persist layout controls to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('graph_layout_controls');
      if (saved) {
        const obj = JSON.parse(saved);
        if (typeof obj.nodeSize === 'number') setNodeSize(obj.nodeSize);
        if (typeof obj.repulse === 'number') setRepulse(obj.repulse);
        if (typeof obj.centerForce === 'number') setCenterForce(obj.centerForce);
        if (typeof obj.edgeSpring === 'number') setEdgeSpring(obj.edgeSpring);
        if (typeof obj.controlsOpen === 'boolean') setControlsOpen(obj.controlsOpen);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('graph_layout_controls', JSON.stringify({ nodeSize, repulse, centerForce, edgeSpring, controlsOpen }));
    } catch {}
  }, [nodeSize, repulse, centerForce, edgeSpring, controlsOpen]);

  // Apply simple force simulation when controls change
  useEffect(() => {
    const g = graphObjRef.current;
    const sigma = sigmaRef.current;
    if (!g || !sigma) return;

    // Ensure node sizes follow control
    g.forEachNode((n, attr) => {
      g.setNodeAttribute(n, 'size', nodeSize);
    });

    const iterations = 200;
    const dt = 0.02; // step factor
    for (let it = 0; it < iterations; it++) {
      const disp: Record<string, { dx: number; dy: number }> = {};
      g.forEachNode((n) => { disp[n] = { dx: 0, dy: 0 }; });

      const nodes = g.nodes();
      // Repulsive forces between all pairs
      for (let i = 0; i < nodes.length; i++) {
        const ni = nodes[i];
        const xi = g.getNodeAttribute(ni, 'x') || 0;
        const yi = g.getNodeAttribute(ni, 'y') || 0;
        for (let j = i + 1; j < nodes.length; j++) {
          const nj = nodes[j];
          const xj = g.getNodeAttribute(nj, 'x') || 0;
          const yj = g.getNodeAttribute(nj, 'y') || 0;
          let dx = xj - xi;
          let dy = yj - yi;
          let dist = Math.hypot(dx, dy) + 0.001;
          const force = (repulse) / (dist * dist); // inverse-square
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          disp[ni].dx -= fx;
          disp[ni].dy -= fy;
          disp[nj].dx += fx;
          disp[nj].dy += fy;
        }
      }

      // Attractive spring along edges
      const restLen = Math.max(3, nodeSize); // pixels
      g.forEachEdge((e, u, v) => {
        const xu = g.getNodeAttribute(u, 'x') || 0;
        const yu = g.getNodeAttribute(u, 'y') || 0;
        const xv = g.getNodeAttribute(v, 'x') || 0;
        const yv = g.getNodeAttribute(v, 'y') || 0;
        let dx = xv - xu;
        let dy = yv - yu;
        let dist = Math.hypot(dx, dy) + 0.001;
        // Hooke: F = k * (dist - L)
        const k = edgeSpring; // 0..1
        const force = k * (dist - restLen);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        disp[u].dx += fx;
        disp[u].dy += fy;
        disp[v].dx -= fx;
        disp[v].dy -= fy;
      });

      // Centering force towards (0,0)
      g.forEachNode((n) => {
        const x = g.getNodeAttribute(n, 'x') || 0;
        const y = g.getNodeAttribute(n, 'y') || 0;
        disp[n].dx += -centerForce * x;
        disp[n].dy += -centerForce * y;
      });

      // Apply displacements
      g.forEachNode((n) => {
        const x = g.getNodeAttribute(n, 'x') || 0;
        const y = g.getNodeAttribute(n, 'y') || 0;
        const nx = x + disp[n].dx * dt;
        const ny = y + disp[n].dy * dt;
        g.setNodeAttribute(n, 'x', nx);
        g.setNodeAttribute(n, 'y', ny);
      });
    }

    sigma.refresh();
  }, [nodeSize, repulse, centerForce, edgeSpring, graph]);

  const resetLayout = () => {
    const g = graphObjRef.current;
    const sigma = sigmaRef.current;
    if (!g || !sigma) return;
    const total = Math.max(1, g.order);
    let i = 0;
    g.forEachNode((n) => {
      const angle = (2 * Math.PI * (i % total)) / total;
      const radius = 4;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      g.setNodeAttribute(n, 'x', x);
      g.setNodeAttribute(n, 'y', y);
      i++;
    });
    sigma.refresh();
  };

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
          {previewResults ? (
            <>
              <span className="mx-2">•</span>
              <span>Preview</span>
            </>
          ) : null}
        </div>
        {/* Controls moved to parent (DashboardPage) */}
      </div>
      <div className="relative flex-1 w-full rounded-lg border border-gray-200 bg-white overflow-hidden" data-testid="graph-view">
        {/* Sigma container */}
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{ overscrollBehavior: 'contain' }}
        />

        <LayoutControlPanel
          open={controlsOpen}
          onToggle={() => setControlsOpen(!controlsOpen)}
          nodeSize={nodeSize}
          onNodeSizeChange={setNodeSize}
          repulse={repulse}
          onRepulseChange={setRepulse}
          centerForce={centerForce}
          onCenterForceChange={setCenterForce}
          edgeSpring={edgeSpring}
          onEdgeSpringChange={setEdgeSpring}
          onReset={resetLayout}
        />

        {/* Skeleton when no data to render */}
        {(!graph || graph.order === 0) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3/4 max-w-xl">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="h-24 bg-gray-100 rounded" />
                  <div className="h-24 bg-gray-100 rounded" />
                  <div className="h-24 bg-gray-100 rounded" />
                </div>
                <div className="text-center text-xs text-gray-500 mt-2">
                  {previewResults ? "Aucune donnée de preview pour cet instant" : "Chargement ou aucune donnée"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}
