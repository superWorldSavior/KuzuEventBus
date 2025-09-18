import * as d3 from "d3";

export interface GraphNode {
  id: string;
  label: string;
  type: "person" | "organization" | "product" | "location" | "event" | "concept";
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  metadata?: Record<string, any>;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string;
  type?: string;
  weight?: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface LayoutOptions {
  width: number;
  height: number;
  centerForce?: number;
  linkDistance?: number;
  linkStrength?: number;
  chargeStrength?: number;
  collisionRadius?: number;
  velocityDecay?: number;
}

// Color scheme for different node types
export const nodeColors = {
  person: "#3B82F6", // Blue
  organization: "#EF4444", // Red
  product: "#10B981", // Green
  location: "#F59E0B", // Yellow
  event: "#8B5CF6", // Purple
  concept: "#6B7280", // Gray
} as const;

// Size scale for nodes based on importance/connections
export const nodeSizeScale = d3.scaleLinear()
  .domain([1, 100])
  .range([8, 32]);

// Create force simulation with customizable parameters
export function createForceSimulation(
  nodes: GraphNode[],
  links: GraphLink[],
  options: LayoutOptions
): d3.Simulation<GraphNode, GraphLink> {
  const {
    width,
    height,
    centerForce = 0.1,
    linkDistance = 80,
    linkStrength = 0.3,
    chargeStrength = -300,
    collisionRadius = 20,
    velocityDecay = 0.3,
  } = options;

  return d3.forceSimulation(nodes)
    .force("link", d3.forceLink<GraphNode, GraphLink>(links)
      .id(d => d.id)
      .distance(linkDistance)
      .strength(linkStrength)
    )
    .force("charge", d3.forceManyBody().strength(chargeStrength))
    .force("center", d3.forceCenter(width / 2, height / 2).strength(centerForce))
    .force("collision", d3.forceCollide().radius(collisionRadius))
    .velocityDecay(velocityDecay);
}

// Zoom behavior configuration
export function createZoomBehavior(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  container: d3.Selection<SVGGElement, unknown, null, undefined>
) {
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 10])
    .on("zoom", (event) => {
      container.attr("transform", event.transform);
    });

  svg.call(zoom);
  
  // Add zoom controls
  return {
    zoom,
    zoomIn: () => svg.transition().call(zoom.scaleBy, 1.5),
    zoomOut: () => svg.transition().call(zoom.scaleBy, 0.67),
    zoomReset: () => svg.transition().call(zoom.transform, d3.zoomIdentity),
  };
}

// Drag behavior for nodes
export function createDragBehavior(
  simulation: d3.Simulation<GraphNode, GraphLink>
) {
  function dragstarted(event: d3.D3DragEvent<SVGElement, GraphNode, GraphNode>, d: GraphNode) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event: d3.D3DragEvent<SVGElement, GraphNode, GraphNode>, d: GraphNode) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event: d3.D3DragEvent<SVGElement, GraphNode, GraphNode>, d: GraphNode) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return d3.drag<SVGElement, GraphNode>()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// Link force calculation for custom layouts
export function calculateLinkForce(link: GraphLink): number {
  // Base strength on link type or weight
  const baseStrength = 0.3;
  const weight = link.weight || 1;
  return baseStrength * Math.sqrt(weight);
}

// Node positioning utilities
export function constrainNodePosition(node: GraphNode, width: number, height: number) {
  const radius = nodeSizeScale(node.size || 10);
  node.x = Math.max(radius, Math.min(width - radius, node.x || 0));
  node.y = Math.max(radius, Math.min(height - radius, node.y || 0));
}

// Calculate optimal layout based on graph characteristics
export function calculateOptimalLayout(data: GraphData): Partial<LayoutOptions> {
  const nodeCount = data.nodes.length;
  const linkCount = data.links.length;
  const avgDegree = linkCount / nodeCount;

  // Adjust forces based on graph density
  const chargeStrength = nodeCount < 50 ? -500 : -300;
  const linkDistance = avgDegree > 3 ? 100 : 80;
  const centerForce = nodeCount > 100 ? 0.05 : 0.1;

  return {
    chargeStrength,
    linkDistance,
    centerForce,
    collisionRadius: Math.max(15, Math.min(30, 300 / nodeCount)),
  };
}

// Export utility for SVG
export function exportSVG(svgElement: SVGSVGElement): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgElement);
}

// Data transformation utilities
export function transformQueryResultToGraph(queryResult: any[]): GraphData {
  // This would transform actual query results into graph format
  // For now, returning mock data structure
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Extract nodes and relationships from query results
  queryResult.forEach((row, index) => {
    // Example transformation - would be customized based on actual data structure
    if (row.node) {
      nodes.push({
        id: row.node.id || `node_${index}`,
        label: row.node.name || row.node.label || `Node ${index}`,
        type: row.node.type || "concept",
        size: row.node.size || Math.random() * 20 + 10,
        metadata: row.node,
      });
    }

    if (row.relationship) {
      links.push({
        id: `link_${index}`,
        source: row.relationship.from,
        target: row.relationship.to,
        label: row.relationship.type,
        type: row.relationship.type,
        weight: row.relationship.weight || 1,
        metadata: row.relationship,
      });
    }
  });

  return { nodes, links };
}

// Mock data generator for development
export function generateMockGraphData(nodeCount: number = 20): GraphData {
  const nodeTypes: GraphNode["type"][] = ["person", "organization", "product", "location", "event", "concept"];
  
  const nodes: GraphNode[] = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node_${i}`,
    label: `Node ${i}`,
    type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
    size: Math.random() * 30 + 10,
    metadata: {
      created: new Date().toISOString(),
      importance: Math.random(),
    },
  }));

  const linkCount = Math.floor(nodeCount * 1.5);
  const links: GraphLink[] = Array.from({ length: linkCount }, (_, i) => {
    const source = nodes[Math.floor(Math.random() * nodeCount)];
    let target = nodes[Math.floor(Math.random() * nodeCount)];
    
    // Avoid self-loops
    while (target === source) {
      target = nodes[Math.floor(Math.random() * nodeCount)];
    }

    return {
      id: `link_${i}`,
      source: source.id,
      target: target.id,
      label: `relates_to`,
      type: "relationship",
      weight: Math.random() * 5 + 1,
    };
  });

  return { nodes, links };
}