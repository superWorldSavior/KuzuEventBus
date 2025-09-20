import { memo } from "react";
import { GraphNode, nodeSizeScale, nodeColors } from "@/shared/lib/d3-helpers";

interface NodeRendererProps {
  node: GraphNode;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick?: (node: GraphNode) => void;
  onHover?: (node: GraphNode | null) => void;
}

export const NodeRenderer = memo(function NodeRenderer({
  node,
  isSelected = false,
  isHighlighted = false,
  onClick,
  onHover,
}: NodeRendererProps) {
  const size = nodeSizeScale(node.size || 10);
  const color = node.color || nodeColors[node.type] || nodeColors.concept;
  
  let strokeColor = "#fff";
  let strokeWidth = 2;
  
  if (isSelected) {
    strokeColor = "#2563eb";
    strokeWidth = 3;
  } else if (isHighlighted) {
    strokeColor = "#f59e0b";
    strokeWidth = 3;
  }

  return (
    <g
      className="graph-node-group"
      transform={`translate(${node.x || 0}, ${node.y || 0})`}
      style={{ cursor: "pointer" }}
      onClick={() => onClick?.(node)}
      onMouseEnter={() => onHover?.(node)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Node circle */}
      <circle
        r={size}
        fill={color}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        className="transition-all duration-200 hover:opacity-80"
      />
      
      {/* Node icon or text */}
      <text
        textAnchor="middle"
        dy="0.35em"
        fontSize="10"
        fill="#fff"
        fontWeight="bold"
        pointerEvents="none"
      >
        {node.type.charAt(0).toUpperCase()}
      </text>
      
      {/* Node label */}
      <text
        textAnchor="middle"
        y={size + 15}
        fontSize="12"
        fontWeight="500"
        fill="#333"
        pointerEvents="none"
        className="node-label"
      >
        {node.label}
      </text>
      
      {/* Selection indicator */}
      {(isSelected || isHighlighted) && (
        <circle
          r={size + 5}
          fill="none"
          stroke={isSelected ? "#2563eb" : "#f59e0b"}
          strokeWidth="2"
          strokeDasharray="4,2"
          opacity="0.8"
          className="animate-pulse"
        />
      )}
    </g>
  );
});

NodeRenderer.displayName = "NodeRenderer";