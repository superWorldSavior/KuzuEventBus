import { memo } from "react";
import { GraphLink, GraphNode } from "@/shared/lib/d3-helpers";

interface LinkRendererProps {
  link: GraphLink;
  isHighlighted?: boolean;
  onClick?: (link: GraphLink) => void;
}

export const LinkRenderer = memo(function LinkRenderer({
  link,
  isHighlighted = false,
  onClick,
}: LinkRendererProps) {
  const source = link.source as GraphNode;
  const target = link.target as GraphNode;
  
  if (!source?.x || !source?.y || !target?.x || !target?.y) {
    return null;
  }

  const strokeWidth = Math.sqrt(link.weight || 1) * 2;
  const color = link.color || "#999";
  const opacity = isHighlighted ? 1 : 0.6;

  // Calculate midpoint for label
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;

  // Calculate label angle for better readability
  const angle = Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI;
  const labelAngle = angle > 90 || angle < -90 ? angle + 180 : angle;

  return (
    <g
      className="graph-link-group"
      style={{ cursor: "pointer" }}
      onClick={() => onClick?.(link)}
    >
      {/* Main link line */}
      <line
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={opacity}
        className="transition-all duration-200 hover:stroke-opacity-100"
      />
      
      {/* Invisible thick line for easier clicking */}
      <line
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth * 3, 10)}
        className="cursor-pointer"
      />
      
      {/* Arrow marker */}
      <defs>
        <marker
          id={`arrow-${link.id}`}
          viewBox="0 -5 10 10"
          refX="8"
          refY="0"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
          fill={color}
        >
          <path d="M0,-5L10,0L0,5" />
        </marker>
      </defs>
      
      {/* Link with arrow */}
      <line
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={opacity}
        markerEnd={`url(#arrow-${link.id})`}
        className="transition-all duration-200"
      />
      
      {/* Link label */}
      {link.label && (
        <g transform={`translate(${midX}, ${midY})`}>
          {/* Label background */}
          <rect
            x="-20"
            y="-8"
            width="40"
            height="16"
            fill="white"
            stroke="#ddd"
            strokeWidth="1"
            rx="3"
            opacity="0.9"
          />
          
          {/* Label text */}
          <text
            textAnchor="middle"
            dy="0.35em"
            fontSize="10"
            fill="#666"
            fontWeight="500"
            pointerEvents="none"
            transform={`rotate(${labelAngle})`}
          >
            {link.label}
          </text>
        </g>
      )}
      
      {/* Highlight indicator */}
      {isHighlighted && (
        <line
          x1={source.x}
          y1={source.y}
          x2={target.x}
          y2={target.y}
          stroke="#2563eb"
          strokeWidth={strokeWidth + 2}
          strokeOpacity="0.3"
          className="animate-pulse"
        />
      )}
    </g>
  );
});

LinkRenderer.displayName = "LinkRenderer";