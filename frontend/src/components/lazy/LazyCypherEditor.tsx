import { lazy, Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Lazy load the Monaco Editor component
const CypherEditor = lazy(() => import("@/components/queries/CypherEditor"));

interface LazyCypherEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  height?: string | number;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  databaseSchema?: {
    nodeTypes: string[];
    relationshipTypes: string[];
    properties: Record<string, string[]>;
  };
}

export function LazyCypherEditor(props: LazyCypherEditorProps) {
  return (
    <Suspense 
      fallback={
        <div 
          className="flex items-center justify-center border border-gray-300 rounded-md bg-gray-50"
          style={{ height: props.height || "300px" }}
        >
          <div className="flex flex-col items-center space-y-2">
            <LoadingSpinner size="md" />
            <p className="text-sm text-gray-600">Loading editor...</p>
          </div>
        </div>
      }
    >
      <CypherEditor {...props} />
    </Suspense>
  );
}

// Default export for lazy loading
export default LazyCypherEditor;