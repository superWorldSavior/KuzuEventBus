import React from "react";

interface LayoutControlPanelProps {
  open: boolean;
  onToggle(): void;
  nodeSize: number;
  onNodeSizeChange(value: number): void;
  repulse: number;
  onRepulseChange(value: number): void;
  centerForce: number;
  onCenterForceChange(value: number): void;
  edgeSpring: number;
  onEdgeSpringChange(value: number): void;
  onReset(): void;
}

export function LayoutControlPanel({
  open,
  onToggle,
  nodeSize,
  onNodeSizeChange,
  repulse,
  onRepulseChange,
  centerForce,
  onCenterForceChange,
  edgeSpring,
  onEdgeSpringChange,
  onReset,
}: LayoutControlPanelProps) {
  return (
    <div className="absolute top-3 right-3 z-30 text-xs">
      <div className="bg-white/90 backdrop-blur rounded shadow border border-gray-200 min-w-[180px]">
        <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100">
          <span className="font-medium text-gray-700">Layout</span>
          <button className="text-gray-500 hover:text-gray-800" onClick={onToggle} aria-label="Toggle layout panel">
            {open ? '−' : '+'}
          </button>
        </div>
        {open && (
          <div className="p-2 space-y-2">
            <div>
              <div className="flex justify-between mb-1"><span>Node size</span><span className="text-gray-500">{nodeSize}</span></div>
              <input type="range" min={6} max={24} value={nodeSize} onChange={(e) => onNodeSizeChange(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <div className="flex justify-between mb-1"><span>Repulse</span><span className="text-gray-500">{repulse}</span></div>
              <input type="range" min={10} max={200} step={5} value={repulse} onChange={(e) => onRepulseChange(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <div className="flex justify-between mb-1"><span>Center</span><span className="text-gray-500">{centerForce.toFixed(2)}</span></div>
              <input type="range" min={0.01} max={0.2} step={0.01} value={centerForce} onChange={(e) => onCenterForceChange(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <div className="flex justify-between mb-1"><span>Edge spring</span><span className="text-gray-500">{edgeSpring.toFixed(2)}</span></div>
              <input type="range" min={0} max={1} step={0.05} value={edgeSpring} onChange={(e) => onEdgeSpringChange(Number(e.target.value))} className="w-full" />
            </div>
            <div className="pt-1">
              <button className="w-full px-2 py-1 rounded bg-gray-800 text-white hover:bg-gray-700" onClick={onReset}>Reset layout</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
