import { useRef, useEffect, useCallback, useState } from "react";
import * as d3 from "d3";
import {
  Play,
  Copy,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Target,
  Trash,
  Plus,
  Gear,
  ArrowRight,
  Circle,
} from "@phosphor-icons/react";
import { cn } from "@/utils";
import { useQueryBuilderStore } from "@/features/query-execution/stores/queryBuilder";

// Enhanced node interface for D3 simulation
interface D3QueryNode extends d3.SimulationNodeDatum {
  id: string;
  type: "entity" | "relationship" | "property" | "filter" | "return";
  label: string;
  variable?: string;
  properties?: Record<string, any>;
  constraints?: any[];
  selected?: boolean;
  radius: number;
  color: string;
  textColor: string;
}

interface D3QueryConnection extends d3.SimulationLinkDatum<D3QueryNode> {
  id: string;
  sourceId: string;
  targetId: string;
  type: "path" | "property" | "filter";
  label?: string;
  properties?: Record<string, any>;
}

interface QueryCanvasProps {
  className?: string;
}

// Node type configuration
const nodeConfig = {
  entity: {
    color: "#3B82F6",
    textColor: "#FFFFFF",
    radius: 25,
    icon: Circle,
  },
  relationship: {
    color: "#EF4444", 
    textColor: "#FFFFFF",
    radius: 20,
    icon: ArrowRight,
  },
  property: {
    color: "#10B981",
    textColor: "#FFFFFF", 
    radius: 15,
    icon: Gear,
  },
  filter: {
    color: "#F59E0B",
    textColor: "#000000",
    radius: 18,
    icon: Plus,
  },
  return: {
    color: "#8B5CF6",
    textColor: "#FFFFFF",
    radius: 22,
    icon: Target,
  },
};

export function QueryCanvas({ className }: QueryCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<D3QueryNode, D3QueryConnection> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const {
    currentPattern,
    selectedNodeIds,
    addNode,
    updateNode,
    selectNode,
    clearSelection,
    generatedCypher,
  } = useQueryBuilderStore();

  // Transform store data to D3 format
  const transformToD3Data = useCallback((): {
    nodes: D3QueryNode[];
    links: D3QueryConnection[];
  } => {
    const nodes: D3QueryNode[] = (currentPattern?.nodes || []).map((node) => {
      const config = nodeConfig[node.type];
      return {
        ...node,
        radius: config.radius,
        color: config.color,
        textColor: config.textColor,
        selected: selectedNodeIds.includes(node.id),
      };
    });

    const links: D3QueryConnection[] = (currentPattern?.connections || []).map((conn) => ({
      ...conn,
      source: conn.sourceId,
      target: conn.targetId,
    }));

    return { nodes, links };
  }, [currentPattern, selectedNodeIds]);

  // Initialize D3 simulation
  const initializeSimulation = useCallback(() => {
    if (!svgRef.current) return;

    const { nodes, links } = transformToD3Data();
    
    // Create simulation
    const simulation = d3.forceSimulation<D3QueryNode>(nodes)
      .force("link", d3.forceLink<D3QueryNode, D3QueryConnection>(links)
        .id(d => d.id)
        .distance(80)
        .strength(0.3)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => d.radius + 5))
      .alphaDecay(0.02)
      .velocityDecay(0.3);

    simulationRef.current = simulation;
    return simulation;
  }, [dimensions, transformToD3Data]);

  // Setup zoom behavior
  const setupZoom = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = svg.select(".zoom-container");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        container.attr("transform", event.transform);
      });

    svg.call(zoom);
    return zoom;
  }, []);

  // Setup drag behavior
  const setupDrag = useCallback(() => {
    if (!simulationRef.current) return;

    const simulation = simulationRef.current;

    function dragstarted(event: any, d: D3QueryNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: D3QueryNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: D3QueryNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
      
      // Update store with new position
      updateNode(d.id, { x: d.x || 0, y: d.y || 0 });
    }

    return d3.drag<SVGCircleElement, D3QueryNode>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }, [updateNode]);

  // Render the visualization
  const renderVisualization = useCallback(() => {
    if (!svgRef.current || !simulationRef.current) return;

    const svg = d3.select(svgRef.current);
    const simulation = simulationRef.current;
    const { nodes, links } = transformToD3Data();

    // Update simulation data
    simulation.nodes(nodes);
    simulation.force("link", d3.forceLink<D3QueryNode, D3QueryConnection>(links)
      .id(d => d.id)
      .distance(80)
      .strength(0.3)
    );

    // Clear existing content
    svg.select(".zoom-container").selectAll("*").remove();

    const container = svg.select(".zoom-container");

    // Add arrow markers
    const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");
    defs.selectAll("marker" as any).remove();
    
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#666");

    // Add selected marker
    defs.append("marker")
      .attr("id", "arrowhead-selected")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#3B82F6");

    // Render links
    const linkElements = container.selectAll(".link")
      .data(links, (d: any) => d.id)
      .join("g")
      .attr("class", "link");

    linkElements.append("line")
      .attr("stroke", "#666")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)")
      .style("cursor", "pointer")
      .on("click", function(event, _d) {
        event.stopPropagation();
        // Handle link selection
      });

    // Add link labels
    linkElements.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .style("pointer-events", "none")
      .text(d => d.label || d.type);

    // Render nodes
    const nodeElements = container.selectAll(".node")
      .data(nodes, (d: any) => d.id)
      .join("g")
      .attr("class", "node")
      .style("cursor", "grab");

    // Apply drag behavior
    const dragBehavior = setupDrag();
    if (dragBehavior) {
      nodeElements.call(dragBehavior as any);
    }

    nodeElements
      .on("click", function(event, d) {
        event.stopPropagation();
        selectNode(d.id, event.ctrlKey || event.metaKey);
      })
      .on("dblclick", function(event, _d) {
        event.stopPropagation();
        // Open properties panel
      });

    // Node circles
    nodeElements.append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => d.color)
      .attr("stroke", d => d.selected ? "#3B82F6" : "#fff")
      .attr("stroke-width", d => d.selected ? 3 : 2)
      .style("filter", d => d.selected ? "drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))" : "none");

    // Node labels
    nodeElements.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", d => d.textColor)
      .style("pointer-events", "none")
      .text(d => d.label.length > 10 ? d.label.substring(0, 8) + "..." : d.label);

    // Variable labels
    nodeElements.filter((d: any) => d.variable && d.variable.trim() !== "")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", d => d.radius + 15)
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .style("pointer-events", "none")
      .text(d => d.variable!);

    // Update positions on simulation tick
    simulation.on("tick", () => {
      linkElements.select("line")
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkElements.select("text")
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      nodeElements.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Restart simulation
    simulation.alpha(0.3).restart();
  }, [transformToD3Data, setupDrag, selectNode, updateNode]);

  // Handle canvas drop for new nodes
  const handleCanvasDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    try {
      const dropData = event.dataTransfer.getData("application/json");
      if (dropData) {
        const { nodeType } = JSON.parse(dropData);
        const rect = svgRef.current?.getBoundingClientRect();
        
        if (rect) {
          // Apply current zoom transform to get actual canvas coordinates
          const transform = transformRef.current;
          const x = (event.clientX - rect.left - transform.x) / transform.k;
          const y = (event.clientY - rect.top - transform.y) / transform.k;
          
          const newNode = {
            type: nodeType.type as 'entity' | 'relationship' | 'property' | 'filter' | 'return',
            label: nodeType.label,
            x,
            y,
            variable: '',
            properties: {},
          };
          
          addNode(newNode);
        }
      }
    } catch (error) {
      console.error('Failed to handle canvas drop:', error);
    }
  }, [addNode]);

  // Control functions
  const zoomIn = useCallback(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 1.5);
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 0.75);
    }
  }, []);

  const zoomFit = useCallback(() => {
    if (!svgRef.current || !currentPattern?.nodes.length) return;

    const svg = d3.select(svgRef.current);
    const nodes = currentPattern.nodes;
    
    // Calculate bounding box
    const xExtent = d3.extent(nodes, d => d.x) as [number, number];
    const yExtent = d3.extent(nodes, d => d.y) as [number, number];
    
    const width = xExtent[1] - xExtent[0];
    const height = yExtent[1] - yExtent[0];
    const centerX = (xExtent[0] + xExtent[1]) / 2;
    const centerY = (yExtent[0] + yExtent[1]) / 2;
    
    // Calculate scale to fit
    const scale = 0.8 / Math.max(width / dimensions.width, height / dimensions.height);
    const translate = [dimensions.width / 2 - scale * centerX, dimensions.height / 2 - scale * centerY];
    
    const transform = d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale);
    
    svg.transition()
      .duration(750)
      .call(d3.zoom<SVGSVGElement, unknown>().transform, transform);
  }, [currentPattern, dimensions]);

  // Initialize and update visualization
  useEffect(() => {
    const simulation = initializeSimulation();
    setupZoom();
    
    return () => {
      if (simulation) {
        simulation.stop();
      }
    };
  }, []);

  useEffect(() => {
    renderVisualization();
  }, [renderVisualization]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const nodes = currentPattern?.nodes || [];
  const connections = currentPattern?.connections || [];

  return (
    <div className={cn("flex-1 flex flex-col", className)}>
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            disabled={!generatedCypher}
            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 mr-1" />
            Run Query
          </button>
          
          <button
            onClick={() => navigator.clipboard.writeText(generatedCypher || "")}
            disabled={!generatedCypher}
            className="inline-flex items-center px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy Query
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <div className="flex items-center space-x-1 border border-gray-300 rounded-lg">
            <button
              onClick={zoomIn}
              className="p-1.5 hover:bg-gray-100 text-gray-600"
              title="Zoom In"
            >
              <MagnifyingGlassPlus className="w-4 h-4" />
            </button>
            <button
              onClick={zoomOut}
              className="p-1.5 hover:bg-gray-100 text-gray-600"
              title="Zoom Out"
            >
              <MagnifyingGlassMinus className="w-4 h-4" />
            </button>
            <button
              onClick={zoomFit}
              className="p-1.5 hover:bg-gray-100 text-gray-600"
              title="Fit to View"
            >
              <Target className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm text-gray-500">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}, {connections.length} connection{connections.length !== 1 ? 's' : ''}
          </span>
          
          <button
            onClick={clearSelection}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
            title="Clear Selection"
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* D3 Canvas */}
      <div className="flex-1 relative overflow-hidden bg-gray-50">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onDrop={handleCanvasDrop}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onClick={() => clearSelection()}
        >
          <defs>
            {/* Gradient backgrounds */}
            <radialGradient id="nodeGradient" cx="0.3" cy="0.3">
              <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
            </radialGradient>
          </defs>
          
          {/* Grid pattern */}
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.5"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Zoom container */}
          <g className="zoom-container" />
        </svg>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-400">
              <Plus className="w-12 h-12 mx-auto mb-2" />
              <p className="text-lg font-medium">Drop nodes here to start building your query</p>
              <p className="text-sm">Drag nodes from the palette to create your graph query</p>
            </div>
          </div>
        )}
      </div>

      {/* Generated Query Preview */}
      {generatedCypher && (
        <div className="bg-gray-900 text-gray-100 p-3 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Generated Cypher Query</h4>
            <button
              onClick={() => navigator.clipboard.writeText(generatedCypher)}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              Copy
            </button>
          </div>
          <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
            {generatedCypher}
          </pre>
        </div>
      )}
    </div>
  );
}

QueryCanvas.displayName = "QueryCanvas";