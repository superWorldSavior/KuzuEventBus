import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";

type Props = {
  databaseId: string | null;
  onExecute?: (query: string) => void;
  isExecuting?: boolean;
  externalQuery?: string | null;
  canRun?: boolean; // controls visibility/enabled state of Run
  readOnly?: boolean; // editor read-only (preview)
  accent?: 'prod' | 'branch' | 'prod-armed'; // run button styling
  onBlur?: () => void; // notify parent when editor loses focus
};

const DEFAULT_QUERY = `// Write your Cypher query here
MATCH (n)
RETURN n
LIMIT 10`;

export function QueryEditor({ databaseId, onExecute, isExecuting = false, externalQuery = null, canRun = true, readOnly = false, accent = 'prod', onBlur }: Props) {
  const [query, setQuery] = useState(DEFAULT_QUERY);

  // Sync with external query (e.g., when selecting a node on the timeline)
  useEffect(() => {
    if (typeof externalQuery === 'string') {
      setQuery(externalQuery);
    }
  }, [externalQuery]);

  const handleExecute = () => {
    if (onExecute && query.trim()) {
      onExecute(query);
    }
  };

  const handleEditorKeyPress = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to execute
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleExecute();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" onBlur={onBlur}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Query Editor</span>
          <span className="text-xs text-gray-500">(Cypher)</span>
        </div>
        <div className="flex items-center space-x-2">
          {canRun && (
            <span className="text-xs text-gray-500">Ctrl+Enter to run</span>
          )}
          {canRun && (
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={!databaseId || !query.trim() || isExecuting}
              className={`flex items-center space-x-1 ${
                accent === 'branch' ? 'bg-violet-600 text-white hover:bg-violet-700' : 
                accent === 'prod-armed' ? 'bg-red-600 text-white hover:bg-red-700' : ''
              }`}
            >
              {isExecuting ? (
                <>
                  <CircleNotch size={16} className="animate-spin" weight="bold" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play size={16} weight="fill" />
                  <span>Run Query</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div onKeyDown={handleEditorKeyPress} onWheel={(e) => e.preventDefault()} className="overflow-hidden">
        <Editor
          height="120px"
          defaultLanguage="sql" // Cypher n'existe pas, SQL est proche
          theme="vs-light"
          value={query}
          onChange={(value) => setQuery(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            scrollbar: {
              vertical: 'hidden',
              horizontal: 'hidden',
              verticalScrollbarSize: 0,
              horizontalScrollbarSize: 0,
              alwaysConsumeMouseWheel: false,
            },
            mouseWheelZoom: false,
            smoothScrolling: false,
            suggest: {
              showKeywords: true,
            },
            readOnly,
          }}
        />
      </div>
    </div>
  );
}
