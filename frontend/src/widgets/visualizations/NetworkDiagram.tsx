import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import {
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Download,
  ArrowsOutSimple,
  ArrowCounterClockwise,
  Play,
  Pause,
} from "@phosphor-icons/react";
import { cn } from "@/utils";
import {
  GraphData,
  GraphNode,
  GraphLink,
  LayoutOptions,
  createForceSimulation,
  createZoomBehavior,
  createDragBehavior,
  nodeColors,
  nodeSizeScale,
  constrainNodePosition,
  calculateOptimalLayout,
  exportSVG,
} from "@/shared/lib/d3-helpers";

interface NetworkDiagramProps {
  data: GraphData;
  width?: number;
  height?: number;
  className?: string;
  showControls?: boolean;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  onLinkClick?: (link: GraphLink) => void;
  selectedNodes?: string[];
  highlightedNodes?: string[];
  layoutOptions?: Partial<LayoutOptions>;
}

export function NetworkDiagram({
  data,
  width = 800,
  height = 600,
  className,
  showControls = true,
  onNodeClick,
  onNodeHover,
  onLinkClick,
  selectedNodes = [],
  highlightedNodes = [],
  layoutOptions = {},
}: NetworkDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [zoomControls, setZoomControls] = useState<any>(null);

  // Merge user options with calculated optimal layout
  const finalLayoutOptions: LayoutOptions = {
    width,
    height,
    ...calculateOptimalLayout(data),
    ...layoutOptions,
  };

  const initializeVisualization = useCallback(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content

    // Create main container group
    const container = svg.append("g").attr("class", "main-container");

    // Create links group
    const linksGroup = container.append("g").attr("class", "links");
    
    // Create nodes group
    const nodesGroup = container.append("g").attr("class", "nodes");

    // Create labels group
    const labelsGroup = container.append("g").attr("class", "labels");

    // Set up zoom behavior
    const controls = createZoomBehavior(svg, container);
    setZoomControls(controls);

    // Create simulation
    const simulation = createForceSimulation(data.nodes, data.links, finalLayoutOptions);
    simulationRef.current = simulation;

    // Create drag behavior
    const dragBehavior = createDragBehavior(simulation);

    // Render links
    const links = linksGroup
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("class", "graph-link")
      .attr("stroke", d => d.color || "#999")
      .attr("stroke-width", d => Math.sqrt(d.weight || 1) * 2)
      .attr("stroke-opacity", 0.6)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onLinkClick?.(d);
      });

    // Render link labels
    const linkLabels = labelsGroup
      .selectAll(".link-label")
      .data(data.links.filter(d => d.label))
      .enter()
      .append("text")
      .attr("class", "link-label")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .attr("pointer-events", "none")
      .text(d => d.label || "");

    // Render nodes
    const nodes = nodesGroup
      .selectAll("circle")
      .data(data.nodes)
      .enter()
      .append("circle")
      .attr("class", "graph-node")
      .attr("r", d => nodeSizeScale(d.size || 10))
      .attr("fill", d => d.color || nodeColors[d.type] || nodeColors.concept)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .call(dragBehavior as any)
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick?.(d);
      })
      .on("mouseover", (_, d) => {
        onNodeHover?.(d);
        // Highlight connected nodes and links
        const connectedNodeIds = new Set<string>();
        data.links.forEach(link => {
          if (link.source === d.id || (link.source as GraphNode).id === d.id) {
            connectedNodeIds.add(typeof link.target === "string" ? link.target : link.target.id);
          }
          if (link.target === d.id || (link.target as GraphNode).id === d.id) {
            connectedNodeIds.add(typeof link.source === "string" ? link.source : link.source.id);
          }
        });

        // Dim non-connected elements
        nodes.style("opacity", node => 
          node.id === d.id || connectedNodeIds.has(node.id) ? 1 : 0.3
        );
        links.style("opacity", link => {
          const sourceId = typeof link.source === "string" ? link.source : link.source.id;
          const targetId = typeof link.target === "string" ? link.target : link.target.id;
          return sourceId === d.id || targetId === d.id ? 1 : 0.1;
        });
      })
      .on("mouseout", () => {
        onNodeHover?.(null);
        // Reset opacity
        nodes.style("opacity", 1);
        links.style("opacity", 0.6);
      });

    // Render node labels
    const nodeLabels = labelsGroup
      .selectAll(".node-label")
      .data(data.nodes)
      .enter()
      .append("text")
      .attr("class", "node-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("fill", "#333")
      .attr("pointer-events", "none")
      .text(d => d.label);

    // Update positions on simulation tick
    simulation.on("tick", () => {
      // Constrain nodes to viewport
      data.nodes.forEach(node => {
        constrainNodePosition(node, width, height);
      });

      // Update link positions
      links
        .attr("x1", d => (d.source as GraphNode).x || 0)
        .attr("y1", d => (d.source as GraphNode).y || 0)
        .attr("x2", d => (d.target as GraphNode).x || 0)
        .attr("y2", d => (d.target as GraphNode).y || 0);

      // Update link label positions
      linkLabels
        .attr("x", d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr("y", d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);

      // Update node positions
      nodes
        .attr("cx", d => d.x || 0)
        .attr("cy", d => d.y || 0);

      // Update node label positions
      nodeLabels
        .attr("x", d => d.x || 0)
        .attr("y", d => (d.y || 0) + nodeSizeScale(d.size || 10) + 15);
    });

    // Handle simulation end
    simulation.on("end", () => {
      setIsSimulationRunning(false);
    });

  }, [data, width, height, finalLayoutOptions, onNodeClick, onNodeHover, onLinkClick]);

  // Update selected and highlighted nodes
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    svg.selectAll(".graph-node")
      .attr("stroke", (d: any) => {
        if (selectedNodes.includes(d.id)) return "#2563eb";
        if (highlightedNodes.includes(d.id)) return "#f59e0b";
        return "#fff";
      })
      .attr("stroke-width", (d: any) => {
        if (selectedNodes.includes(d.id) || highlightedNodes.includes(d.id)) return 3;
        return 2;
      });
  }, [selectedNodes, highlightedNodes]);

  // Initialize visualization when data changes
  useEffect(() => {
    initializeVisualization();
  }, [initializeVisualization]);

  // Control functions
  const toggleSimulation = useCallback(() => {
    if (!simulationRef.current) return;
    
    if (isSimulationRunning) {
      simulationRef.current.stop();
      setIsSimulationRunning(false);
    } else {
      simulationRef.current.restart();
      setIsSimulationRunning(true);
    }
  }, [isSimulationRunning]);

  const restartSimulation = useCallback(() => {
    if (!simulationRef.current) return;
    simulationRef.current.alpha(1).restart();
    setIsSimulationRunning(true);
  }, []);

  const exportVisualization = useCallback(() => {
    if (!svgRef.current) return;
    
    const svgString = exportSVG(svgRef.current);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "network-diagram.svg";
    link.click();
    
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className={cn("relative bg-white rounded-lg border border-gray-200", className)}>
      {/* Controls */}
      {showControls && (
        <div className="absolute top-4 right-4 z-10 flex items-center space-x-2 bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <button
            onClick={zoomControls?.zoomIn}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            title="Zoom In"
          >
            <MagnifyingGlassPlus className="w-4 h-4" />
          </button>
          <button
            onClick={zoomControls?.zoomOut}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            title="Zoom Out"
          >
            <MagnifyingGlassMinus className="w-4 h-4" />
          </button>
          <button
            onClick={zoomControls?.zoomReset}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            title="Reset Zoom"
          >
            <ArrowsOutSimple className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-300" />
          <button
            onClick={toggleSimulation}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            title={isSimulationRunning ? "Pause Simulation" : "Resume Simulation"}
          >
            {isSimulationRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={restartSimulation}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            title="Restart Layout"
          >
            <ArrowCounterClockwise className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-300" />
          <button
            onClick={exportVisualization}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            title="Export SVG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SVG Container */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="block"
        style={{ background: "transparent" }}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Node Types</h4>
        <div className="space-y-1">
          {Object.entries(nodeColors).map(([type, color]) => (
            <div key={type} className="flex items-center space-x-2 text-xs">
              <div
                className="w-3 h-3 rounded-full border border-gray-300"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-600 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

NetworkDiagram.displayName = "NetworkDiagram";

export default NetworkDiagram;