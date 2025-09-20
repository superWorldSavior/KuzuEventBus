import { useState } from "react";
import { 
  FloppyDisk as Save,
  Folder,
  Star,
  FileText,
  Clock,
  Plus,
} from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib";
import { useRecentQueries, useDatabases } from "@/shared/hooks/useApi";
import { QueryExecutor } from "@/features/query-execution/components/QueryExecutor";
import { QueryResultsViewer } from "@/features/query-execution/components/QueryResultsViewer";

interface QueryResult {
  id: string;
  status: "success" | "error" | "running";
  executionTime?: number;
  resultCount?: number;
  error?: string;
  data?: Array<Record<string, any>>;
}

export function QueriesPage() {
  const [currentQuery, setCurrentQuery] = useState("");
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [savedQueries] = useState([
    {
      id: "1",
      name: "Top 10 Users",
      query: "MATCH (n:Person) RETURN n.name, n.age ORDER BY n.age DESC LIMIT 10",
      database: "social-network",
      createdAt: new Date(Date.now() - 86400000),
      favorite: true
    },
    {
      id: "2", 
      name: "Product Categories",
      query: "MATCH (p:Product)-[:BELONGS_TO]->(c:Category) RETURN c.name, COUNT(p) as productCount",
      database: "ecommerce",
      createdAt: new Date(Date.now() - 172800000),
      favorite: false
    }
  ]);

  const { data: recentQueries = [] } = useRecentQueries();
  const { data: databases = [] } = useDatabases();
  
  // Suppress unused variable warning - will be used for database validation
  void databases;

  const handleExecutionComplete = (results: any) => {
    // Use real query results from the API response
    const queryResult: QueryResult = {
      id: results.transactionId || Date.now().toString(),
      status: "success",
      executionTime: results.results?.executionTimeMs || 0,
      resultCount: results.results?.totalCount || 0,
      data: results.results?.rows || []
    };
    setQueryResult(queryResult);
  };

  const handleExecutionError = (error: string) => {
    setQueryResult({
      id: Date.now().toString(),
      status: "error",
      error,
    });
  };

  const loadQuery = (query: string) => {
    setCurrentQuery(query);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Query Console</h1>
          <p className="text-gray-600">Build and execute Cypher queries with Monaco editor</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Save size={16} className="mr-2" />
            Save Query
          </Button>
          <Button variant="outline" size="sm">
            <Folder size={16} className="mr-2" />
            Templates
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Saved Queries & History */}
        <div className="space-y-6">
          {/* Saved Queries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Saved Queries</h3>
              <Button size="sm" variant="ghost" className="text-xs">
                <Plus size={14} className="mr-1" />
                New
              </Button>
            </div>
            
            <div className="space-y-2">
              {savedQueries.map((query) => (
                <div
                  key={query.id}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    loadQuery(query.query);
                    setSelectedDatabase(query.database);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">{query.name}</h4>
                        {query.favorite && (
                          <Star size={14} className="text-yellow-500 fill-current" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                        {query.query}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge className="bg-gray-100 text-gray-600 text-xs">
                          {query.database}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {query.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Queries */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Queries</h3>
            <div className="space-y-2">
              {recentQueries.slice(0, 5).map((query: any) => (
                <div
                  key={query.id}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => loadQuery(query.query)}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <FileText size={14} className="text-gray-400" />
                    <Badge className={cn(
                      "text-xs",
                      query.status === "success" ? "bg-green-100 text-green-700" :
                      query.status === "error" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    )}>
                      {query.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 font-mono truncate">
                    {query.query}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{query.database}</span>
                    <div className="flex items-center space-x-1 text-xs text-gray-400">
                      <Clock size={12} />
                      <span>{query.executionTime}ms</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Monaco Editor and Query Execution */}
        <div className="lg:col-span-3 space-y-6">
          {/* Query Executor with Monaco Editor */}
          <QueryExecutor
            initialQuery={currentQuery}
            selectedDatabase={selectedDatabase}
            onQueryChange={setCurrentQuery}
            onDatabaseChange={setSelectedDatabase}
            onExecutionComplete={handleExecutionComplete}
            onExecutionError={handleExecutionError}
            className="w-full"
          />

          {/* Query Results Display */}
          {queryResult && (
            <QueryResultsViewer
              results={queryResult.data || []}
              query={currentQuery}
              executionTime={queryResult.executionTime}
              totalRows={queryResult.resultCount}
              className="w-full"
            />
          )}

          {/* Empty State */}
          {!queryResult && !currentQuery && (
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Welcome to the Query Console
                </h3>
                <p className="text-gray-600 mb-4">
                  Start by selecting a database and writing your Cypher query using our Monaco editor
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Badge className="text-sm border border-gray-300 bg-gray-50">
                    Monaco Editor
                  </Badge>
                  <Badge className="text-sm border border-gray-300 bg-gray-50">
                    Cypher Syntax Highlighting
                  </Badge>
                  <Badge className="text-sm border border-gray-300 bg-gray-50">
                    Auto-completion
                  </Badge>
                  <Badge className="text-sm border border-gray-300 bg-gray-50">
                    Real-time Results
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}