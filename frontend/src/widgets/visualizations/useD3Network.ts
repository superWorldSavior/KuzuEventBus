import { useRef, useEffect, useCallback, useState } from "react";
import * as d3 from "d3";
import {
  GraphData,
  GraphNode,
  GraphLink,
  LayoutOptions,
  createForceSimulation,
  calculateOptimalLayout,
} from "@/shared/lib/d3-helpers";

interface UseD3NetworkOptions extends Partial<LayoutOptions> {
  enableDrag?: boolean;
  enableZoom?: boolean;
  onTick?: (nodes: GraphNode[], links: GraphLink[]) => void;
  onEnd?: () => void;
}

interface UseD3NetworkReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<SVGSVGElement>;
  simulation: d3.Simulation<GraphNode, GraphLink> | null;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  restart: () => void;
  updateData: (data: GraphData) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  centerView: () => void;
}

export function useD3Network(
  data: GraphData,
  options: UseD3NetworkOptions = {}
): UseD3NetworkReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const {
    width = 800,
    height = 600,
    enableDrag = true,
    enableZoom = true,
    onTick,
    onEnd,
    ...layoutOptions
  } = options;

  // Initialize D3 simulation
  const initializeSimulation = useCallback(() => {
    if (!data.nodes.length) return;

    // Calculate optimal layout options
    const optimalOptions = {
      width,
      height,
      ...calculateOptimalLayout(data),
      ...layoutOptions,
    };

    // Create simulation
    const simulation = createForceSimulation(data.nodes, data.links, optimalOptions);
    simulationRef.current = simulation;

    // Set up tick handler
    simulation.on("tick", () => {
      onTick?.(data.nodes, data.links);
    });

    // Set up end handler
    simulation.on("end", () => {
      setIsRunning(false);
      onEnd?.();
    });

    setIsRunning(true);
    return simulation;
  }, [data, width, height, layoutOptions, onTick, onEnd]);

  // Initialize zoom behavior
  const initializeZoom = useCallback(() => {
    if (!svgRef.current || !enableZoom) return;

    const svg = d3.select(svgRef.current);
    const container = svg.select(".zoom-container");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    return zoom;
  }, [enableZoom]);

  // Control functions
  const start = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.restart();
      setIsRunning(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop();
      setIsRunning(false);
    }
  }, []);

  const restart = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
      setIsRunning(true);
    }
  }, []);

  const updateData = useCallback((newData: GraphData) => {
    if (!simulationRef.current) return;

    // Update simulation with new data
    simulationRef.current
      .nodes(newData.nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(newData.links)
        .id(d => d.id)
        .distance(layoutOptions.linkDistance || 80)
        .strength(layoutOptions.linkStrength || 0.3)
      );

    restart();
  }, [layoutOptions.linkDistance, layoutOptions.linkStrength, restart]);

  const zoomIn = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(zoomRef.current.scaleBy, 1.5);
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(zoomRef.current.scaleBy, 0.67);
    }
  }, []);

  const zoomReset = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  const centerView = useCallback(() => {
    if (!svgRef.current || !data.nodes.length) return;

    // Calculate center of nodes
    const centerX = d3.mean(data.nodes, d => d.x || 0) || width / 2;
    const centerY = d3.mean(data.nodes, d => d.y || 0) || height / 2;

    // Transform to center the view
    const transform = d3.zoomIdentity
      .translate(width / 2 - centerX, height / 2 - centerY);

    if (zoomRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(zoomRef.current.transform, transform);
    }
  }, [data.nodes, width, height]);

  // Initialize simulation when data changes
  useEffect(() => {
    const simulation = initializeSimulation();
    return () => {
      if (simulation) {
        simulation.stop();
      }
    };
  }, [initializeSimulation]);

  // Initialize zoom when enabled
  useEffect(() => {
    if (enableZoom) {
      initializeZoom();
    }
  }, [enableZoom, initializeZoom]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, []);

  return {
    containerRef,
    svgRef,
    simulation: simulationRef.current,
    isRunning,
    start,
    stop,
    restart,
    updateData,
    zoomIn,
    zoomOut,
    zoomReset,
    centerView,
  };
}