import * as d3 from "d3";
import { QueryNode, QueryConnection } from "@/features/query-execution/stores/queryBuilder";

/**
 * Utility functions specifically for the enhanced query builder D3 integration
 */

export interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  label: string;
  variable?: string;
  radius: number;
  color: string;
  textColor: string;
  selected?: boolean;
}

export interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  label?: string;
  type: string;
}

/**
 * Convert query builder nodes to D3 simulation nodes
 */
export function transformNodesToD3(nodes: QueryNode[], selectedNodeIds: string[] = []): D3Node[] {
  const nodeColors = {
    entity: "#3B82F6",
    relationship: "#EF4444", 
    property: "#10B981",
    filter: "#F59E0B",
    return: "#8B5CF6",
  };

  const nodeRadii = {
    entity: 25,
    relationship: 20,
    property: 15,
    filter: 18,
    return: 22,
  };

  return nodes.map(node => ({
    ...node,
    radius: nodeRadii[node.type] || 20,
    color: nodeColors[node.type] || "#6B7280",
    textColor: "#FFFFFF",
    selected: selectedNodeIds.includes(node.id),
  }));
}

/**
 * Convert query builder connections to D3 simulation links
 */
export function transformConnectionsToD3(connections: QueryConnection[]): D3Link[] {
  return connections.map(conn => ({
    id: conn.id,
    source: conn.sourceId,
    target: conn.targetId,
    label: conn.label,
    type: conn.type,
  }));
}

/**
 * Calculate optimal force parameters based on graph characteristics
 */
export function calculateForceParameters(nodeCount: number, linkCount: number) {
  const density = linkCount / Math.max(nodeCount, 1);
  
  return {
    linkDistance: Math.max(60, Math.min(120, 80 + (density * 20))),
    chargeStrength: Math.max(-800, -200 - (nodeCount * 5)),
    centerStrength: Math.max(0.05, 0.3 - (nodeCount * 0.01)),
    collisionRadius: Math.max(15, Math.min(35, 25 + (5 / Math.max(density, 0.1)))),
    velocityDecay: Math.max(0.2, 0.4 - (nodeCount * 0.002)),
  };
}

/**
 * Create an optimized force simulation
 */
export function createOptimizedSimulation(
  nodes: D3Node[],
  links: D3Link[],
  width: number,
  height: number
): d3.Simulation<D3Node, D3Link> {
  const params = calculateForceParameters(nodes.length, links.length);
  
  const simulation = d3.forceSimulation<D3Node>(nodes)
    .force("link", d3.forceLink<D3Node, D3Link>(links)
      .id(d => d.id)
      .distance(params.linkDistance)
      .strength(0.3)
    )
    .force("charge", d3.forceManyBody()
      .strength(params.chargeStrength)
    )
    .force("center", d3.forceCenter(width / 2, height / 2)
      .strength(params.centerStrength)
    )
    .force("collision", d3.forceCollide()
      .radius((d: any) => d.radius + 5)
      .strength(0.8)
    )
    .velocityDecay(params.velocityDecay)
    .alphaDecay(0.02);

  return simulation;
}

/**
 * Create drag behavior with performance optimizations
 */
export function createOptimizedDragBehavior(
  simulation: d3.Simulation<D3Node, D3Link>,
  onNodeUpdate?: (nodeId: string, x: number, y: number) => void
) {
  function dragstarted(event: d3.D3DragEvent<SVGElement, D3Node, D3Node>, d: D3Node) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event: d3.D3DragEvent<SVGElement, D3Node, D3Node>, d: D3Node) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event: d3.D3DragEvent<SVGElement, D3Node, D3Node>, d: D3Node) {
    if (!event.active) simulation.alphaTarget(0);
    
    // Update store with final position
    if (onNodeUpdate && d.x !== undefined && d.y !== undefined) {
      onNodeUpdate(d.id, d.x, d.y);
    }
    
    d.fx = null;
    d.fy = null;
  }

  return d3.drag<SVGElement, D3Node>()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

/**
 * Create zoom behavior with constraints
 */
export function createConstrainedZoomBehavior(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  minZoom = 0.2,
  maxZoom = 4
) {
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([minZoom, maxZoom])
    .on("zoom", (event) => {
      container.attr("transform", event.transform);
    });

  svg.call(zoom);
  
  return {
    zoom,
    zoomIn: () => svg.transition().call(zoom.scaleBy, 1.5),
    zoomOut: () => svg.transition().call(zoom.scaleBy, 0.75),
    zoomToFit: (nodes: D3Node[]) => {
      if (nodes.length === 0) return;
      
      const bounds = nodes.reduce(
        (acc, node) => ({
          minX: Math.min(acc.minX, node.x || 0),
          maxX: Math.max(acc.maxX, node.x || 0),
          minY: Math.min(acc.minY, node.y || 0),
          maxY: Math.max(acc.maxY, node.y || 0),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      );
      
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      const svgNode = svg.node();
      if (!svgNode) return;
      
      const svgRect = svgNode.getBoundingClientRect();
      const scale = 0.8 / Math.max(width / svgRect.width, height / svgRect.height);
      const translate = [
        svgRect.width / 2 - scale * centerX,
        svgRect.height / 2 - scale * centerY
      ];
      
      const transform = d3.zoomIdentity
        .translate(translate[0], translate[1])
        .scale(Math.min(scale, maxZoom));
      
      svg.transition()
        .duration(750)
        .call(zoom.transform, transform);
    },
    reset: () => {
      svg.transition()
        .duration(500)
        .call(zoom.transform, d3.zoomIdentity);
    }
  };
}

/**
 * Performance utilities for large graphs
 */
export class GraphPerformanceManager {
  private lastUpdateTime = 0;
  private frameSkipCount = 0;
  private readonly maxFrameSkip = 3;
  
  shouldUpdate(): boolean {
    const now = Date.now();
    const timeSinceUpdate = now - this.lastUpdateTime;
    
    // Limit updates to ~30 FPS for smooth performance
    if (timeSinceUpdate < 33) {
      this.frameSkipCount++;
      return this.frameSkipCount <= this.maxFrameSkip;
    }
    
    this.lastUpdateTime = now;
    this.frameSkipCount = 0;
    return true;
  }
  
  optimizeForNodeCount(nodeCount: number) {
    if (nodeCount > 100) {
      return {
        enableCollision: false,
        enableLabels: false,
        simplifiedRendering: true,
        maxIterations: 100,
      };
    } else if (nodeCount > 50) {
      return {
        enableCollision: true,
        enableLabels: true,
        simplifiedRendering: false,
        maxIterations: 200,
      };
    } else {
      return {
        enableCollision: true,
        enableLabels: true,
        simplifiedRendering: false,
        maxIterations: 300,
      };
    }
  }
}

/**
 * Keyboard shortcuts for query builder
 */
export function setupQueryBuilderKeyboards(callbacks: {
  onDelete?: () => void;
  onSelectAll?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}) {
  function handleKeyDown(event: KeyboardEvent) {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    switch (event.key) {
      case "Delete":
      case "Backspace":
        callbacks.onDelete?.();
        break;
      case "a":
        if (isCtrlOrCmd) {
          event.preventDefault();
          callbacks.onSelectAll?.();
        }
        break;
      case "c":
        if (isCtrlOrCmd) {
          event.preventDefault();
          callbacks.onCopy?.();
        }
        break;
      case "v":
        if (isCtrlOrCmd) {
          event.preventDefault();
          callbacks.onPaste?.();
        }
        break;
      case "z":
        if (isCtrlOrCmd) {
          event.preventDefault();
          if (event.shiftKey) {
            callbacks.onRedo?.();
          } else {
            callbacks.onUndo?.();
          }
        }
        break;
    }
  }
  
  document.addEventListener("keydown", handleKeyDown);
  
  return () => {
    document.removeEventListener("keydown", handleKeyDown);
  };
}