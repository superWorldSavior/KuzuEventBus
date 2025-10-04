interface GraphViewerControlsProps {
  mode: 'graph' | 'table';
  setMode: (mode: 'graph' | 'table') => void;
}

export function GraphViewerControls({ mode, setMode }: GraphViewerControlsProps) {
  return (
    <div className="absolute right-3 top-3 z-20 flex items-center space-x-1">
      <button
        type="button"
        className={`px-2 py-1 text-xs rounded border ${mode === 'graph' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300'}`}
        onClick={() => setMode('graph')}
      >
        Graph
      </button>
      <button
        type="button"
        className={`px-2 py-1 text-xs rounded border ${mode === 'table' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300'}`}
        onClick={() => setMode('table')}
        data-testid="graph-table-toggle"
      >
        Table
      </button>
    </div>
  );
}
