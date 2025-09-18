import { useState, useMemo } from "react";
import { NetworkDiagram } from "@/components/visualizations/NetworkDiagram";
import { GraphNode, GraphLink, generateMockGraphData } from "@/utils/d3-helpers";
import { Button } from "@/components/ui/button";
import { Shuffle, Database, Code, ChartBar } from "@phosphor-icons/react";

export function NetworkVisualizationPage() {
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [nodeCount, setNodeCount] = useState(15);
  
  // Generate mock data
  const graphData = useMemo(() => generateMockGraphData(nodeCount), [nodeCount]);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNodes(prev => {
      if (prev.includes(node.id)) {
        return prev.filter(id => id !== node.id);
      } else {
        return [...prev, node.id];
      }
    });
  };

  const handleNodeHover = (node: GraphNode | null) => {
    if (node) {
      // Find connected nodes
      const connectedNodeIds: string[] = [];
      graphData.links.forEach(link => {
        if (link.source === node.id || (link.source as GraphNode).id === node.id) {
          connectedNodeIds.push(typeof link.target === "string" ? link.target : link.target.id);
        }
        if (link.target === node.id || (link.target as GraphNode).id === node.id) {
          connectedNodeIds.push(typeof link.source === "string" ? link.source : link.source.id);
        }
      });
      setHighlightedNodes([node.id, ...connectedNodeIds]);
    } else {
      setHighlightedNodes([]);
    }
  };

  const handleLinkClick = (link: GraphLink) => {
    const sourceId = typeof link.source === "string" ? link.source : link.source.id;
    const targetId = typeof link.target === "string" ? link.target : link.target.id;
    setSelectedNodes([sourceId, targetId]);
  };

  const regenerateData = () => {
    setSelectedNodes([]);
    setHighlightedNodes([]);
    // Force re-render by changing nodeCount slightly
    setNodeCount(prev => prev === 15 ? 16 : 15);
  };

  const clearSelection = () => {
    setSelectedNodes([]);
    setHighlightedNodes([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Network Visualizations
          </h1>
          <p className="text-gray-600">
            Interactive graph visualizations for query results and database schemas
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex items-center space-x-4">
          <Button onClick={regenerateData} className="flex items-center space-x-2">
            <Shuffle className="w-4 h-4" />
            <span>Generate New Data</span>
          </Button>
          
          <Button variant="outline" onClick={clearSelection}>
            Clear Selection
          </Button>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Node Count:</label>
            <select
              value={nodeCount}
              onChange={(e) => setNodeCount(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value={10}>10 nodes</option>
              <option value={15}>15 nodes</option>
              <option value={25}>25 nodes</option>
              <option value={50}>50 nodes</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Nodes</p>
                <p className="text-2xl font-bold text-gray-900">{graphData.nodes.length}</p>
              </div>
              <Database className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Links</p>
                <p className="text-2xl font-bold text-gray-900">{graphData.links.length}</p>
              </div>
              <Code className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Selected Nodes</p>
                <p className="text-2xl font-bold text-gray-900">{selectedNodes.length}</p>
              </div>
              <ChartBar className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Main Visualization */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Interactive Network Diagram
          </h2>
          
          <NetworkDiagram
            data={graphData}
            width={1000}
            height={700}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            onLinkClick={handleLinkClick}
            selectedNodes={selectedNodes}
            highlightedNodes={highlightedNodes}
            showControls={true}
            className="border border-gray-100 rounded-lg"
          />
        </div>

        {/* Smaller Variations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compact View */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Compact View
            </h3>
            <NetworkDiagram
              data={{ 
                nodes: graphData.nodes.slice(0, 8), 
                links: graphData.links.slice(0, 10) 
              }}
              width={480}
              height={360}
              showControls={false}
              layoutOptions={{
                chargeStrength: -200,
                linkDistance: 60,
              }}
            />
          </div>

          {/* Dense Network */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Dense Network
            </h3>
            <NetworkDiagram
              data={generateMockGraphData(12)}
              width={480}
              height={360}
              showControls={false}
              layoutOptions={{
                chargeStrength: -150,
                linkDistance: 40,
                centerForce: 0.2,
              }}
            />
          </div>
        </div>

        {/* Selected Nodes Info */}
        {selectedNodes.length > 0 && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Selected Nodes ({selectedNodes.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedNodes.map(nodeId => {
                const node = graphData.nodes.find(n => n.id === nodeId);
                if (!node) return null;
                
                return (
                  <div key={nodeId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: node.color || "#6B7280" }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{node.label}</p>
                        <p className="text-sm text-gray-500 capitalize">{node.type}</p>
                        {node.metadata?.importance && (
                          <p className="text-xs text-gray-400">
                            Importance: {Math.round(node.metadata.importance * 100)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

NetworkVisualizationPage.displayName = "NetworkVisualizationPage";