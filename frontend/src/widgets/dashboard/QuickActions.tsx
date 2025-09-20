import { useNavigate } from "react-router-dom";
import { 
  Database, 
  Code, 
  ChartBar, 
  Upload, 
  Download, 
  Sparkle,
  ArrowRight 
} from "@phosphor-icons/react";
import { cn } from "@/shared/lib";
import { useRunQuery } from "@/shared/hooks/useApi";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
  badge?: string;
}

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  const navigate = useNavigate();
  const runQueryMutation = useRunQuery();

  const handleQuickQuery = async () => {
    try {
      await runQueryMutation.mutateAsync({
        query: "MATCH (n) RETURN count(n) as node_count",
        databaseId: "default"
      });
      navigate("/queries");
    } catch (error) {
      console.error("Quick query failed:", error);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: "new-database",
      title: "Create Database",
      description: "Upload or create a new graph database",
      icon: <Database className="w-6 h-6" />,
      onClick: () => navigate("/databases/new"),
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
      badge: "Popular"
    },
    {
      id: "query-builder",
      title: "Query Builder",
      description: "Build and execute Cypher queries visually",
      icon: <Code className="w-6 h-6" />,
      onClick: () => navigate("/queries"),
      color: "bg-green-50 border-green-200 hover:bg-green-100"
    },
    {
      id: "quick-query",
      title: "Quick Query",
      description: "Run a sample query to get started",
      icon: <Sparkle className="w-6 h-6" />,
      onClick: handleQuickQuery,
      color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
      badge: runQueryMutation.isPending ? "Running..." : undefined
    },
    {
      id: "analytics",
      title: "View Analytics",
      description: "Explore performance metrics and insights",
      icon: <ChartBar className="w-6 h-6" />,
      onClick: () => navigate("/analytics"),
      color: "bg-orange-50 border-orange-200 hover:bg-orange-100"
    },
    {
      id: "upload-data",
      title: "Upload Data",
      description: "Import CSV or JSON data into your databases",
      icon: <Upload className="w-6 h-6" />,
      onClick: () => navigate("/databases/import"),
      color: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
    },
    {
      id: "export-results",
      title: "Export Results",
      description: "Download query results and visualizations",
      icon: <Download className="w-6 h-6" />,
      onClick: () => navigate("/exports"),
      color: "bg-teal-50 border-teal-200 hover:bg-teal-100"
    }
  ];

  return (
    <section className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          <p className="text-sm text-gray-500">Get started with common tasks</p>
        </div>
        <button
          onClick={() => navigate("/help")}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
        >
          <span>View all features</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.id === "quick-query" && runQueryMutation.isPending}
            className={cn(
              "flex items-start space-x-4 p-4 border rounded-lg transition-all duration-200 text-left",
              "hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              action.color,
              (action.id === "quick-query" && runQueryMutation.isPending) && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex-shrink-0">
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-gray-900 truncate">
                  {action.title}
                </h4>
                {action.badge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {action.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {action.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Tips section */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">💡 Pro Tips</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Use keyboard shortcuts: Ctrl+K for quick search, Ctrl+N for new query</li>
          <li>• Connect your databases via API for real-time data synchronization</li>
          <li>• Export query results as CSV, JSON, or interactive visualizations</li>
        </ul>
      </div>
    </section>
  );
}

QuickActions.displayName = "QuickActions";